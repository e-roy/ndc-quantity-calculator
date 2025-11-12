/**
 * AI Assist service for ranking NDC candidates.
 * Uses OpenAI API to provide intelligent ranking and rationale.
 * Falls back silently if service is unavailable.
 */

import { withPerformanceLogging } from "@/lib/telemetry";
import type { NdcCandidate, NormalizedSig } from "../../types";
import type { CalculatorInput } from "../schema";

export type RankedCandidatesResult = {
  rankedCandidates: NdcCandidate[];
  rationale: string | null;
  topCandidate: NdcCandidate | null;
};

/**
 * Ranks NDC candidates using AI and provides a one-line rationale.
 * Returns candidates with matchScore (0-1) and rationale for top candidate.
 *
 * @param candidates - Array of NDC candidates to rank
 * @param normalizedSig - Normalized prescription SIG data
 * @param input - Original calculator input
 * @returns Ranked candidates with scores and rationale, or null if unavailable
 */
export async function rankNdcCandidates(
  candidates: NdcCandidate[],
  normalizedSig: NormalizedSig | null,
  input: CalculatorInput,
): Promise<RankedCandidatesResult | null> {
  // Silently return null if no candidates
  if (!candidates || candidates.length === 0) {
    return null;
  }

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Silently fallback - no error thrown
    return null;
  }

  return withPerformanceLogging(
    "ai.rankCandidates",
    async () => {
      try {
        // Build prompt for AI ranking
        const prompt = buildRankingPrompt(candidates, normalizedSig, input);

        // Call OpenAI API
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini", // Cost-effective model
            messages: [
              {
                role: "system",
                content:
                  "You are a pharmacy assistant helping to rank NDC (National Drug Code) candidates for prescriptions. Provide concise, one-line rationales for your top recommendation.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.3, // Lower temperature for more consistent ranking
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          // Log but don't throw - silent fallback
          console.log(
            `[AI Assist] API error: ${response.status} ${response.statusText}`,
          );
          return null;
        }

        const data = (await response.json()) as {
          choices?: Array<{
            message?: {
              content?: string;
            };
          }>;
        };

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          return null;
        }

        // Parse AI response
        const parsed = parseAiResponse(content, candidates);
        return parsed;
      } catch (error) {
        // Log but don't throw - silent fallback
        console.log("[AI Assist] Error:", error);
        return null;
      }
    },
    { candidateCount: candidates.length, hasSig: !!normalizedSig },
  );
}

/**
 * Builds the prompt for AI ranking.
 */
function buildRankingPrompt(
  candidates: NdcCandidate[],
  normalizedSig: NormalizedSig | null,
  input: CalculatorInput,
): string {
  const sigInfo = normalizedSig
    ? `Dose: ${normalizedSig.dose ?? "N/A"} ${normalizedSig.doseUnit ?? ""}, Frequency: ${normalizedSig.frequencyPerDay ?? "N/A"}x/day, Route: ${normalizedSig.route ?? "N/A"}`
    : "Not available";

  const candidatesList = candidates
    .map(
      (c, idx) =>
        `${idx + 1}. NDC: ${c.ndc}, Product: ${c.productName}, Strength: ${c.strength ?? "N/A"}, Unit: ${c.unit ?? "N/A"}, Active: ${c.active ? "Yes" : "No"}`,
    )
    .join("\n");

  return `Rank these NDC candidates for a prescription:

Prescription Details:
- Drug: ${input.drugOrNdc}
- SIG: ${input.sig}
- Days Supply: ${input.daysSupply}
- Parsed Info: ${sigInfo}

NDC Candidates:
${candidatesList}

Please:
1. Rank the candidates from best to worst match (1 = best)
2. Assign a match score from 0.0 to 1.0 for each (1.0 = perfect match)
3. Provide a one-line rationale (max 100 chars) for the top recommendation

Format your response as JSON:
{
  "rankings": [{"ndc": "12345-6789-01", "rank": 1, "score": 0.95, "rationale": "Best match because..."}],
  "topRationale": "One-line explanation for top choice"
}`;
}

/**
 * Parses AI response and updates candidates with scores.
 */
function parseAiResponse(
  content: string,
  candidates: NdcCandidate[],
): RankedCandidatesResult | null {
  try {
    // Extract JSON from response (may have markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.includes("```json")) {
      jsonStr = jsonStr.split("```json")[1]?.split("```")[0]?.trim() ?? jsonStr;
    } else if (jsonStr.includes("```")) {
      jsonStr = jsonStr.split("```")[1]?.split("```")[0]?.trim() ?? jsonStr;
    }

    const parsed = JSON.parse(jsonStr) as {
      rankings?: Array<{
        ndc?: string;
        rank?: number;
        score?: number;
        rationale?: string;
      }>;
      topRationale?: string;
    };

    if (!parsed.rankings || parsed.rankings.length === 0) {
      return null;
    }

    // Create a map of NDC to ranking data
    const rankingMap = new Map<
      string,
      { score: number; rank: number; rationale?: string }
    >();

    for (const ranking of parsed.rankings) {
      if (ranking.ndc && ranking.score !== undefined) {
        // Normalize score to 0-1 range
        const score = Math.max(0, Math.min(1, ranking.score));
        rankingMap.set(ranking.ndc, {
          score,
          rank: ranking.rank ?? 999,
          rationale: ranking.rationale,
        });
      }
    }

    // Update candidates with scores and sort by rank
    const rankedCandidates = candidates
      .map((candidate) => {
        const ranking = rankingMap.get(candidate.ndc);
        return {
          ...candidate,
          matchScore: ranking?.score,
        };
      })
      .sort((a, b) => {
        // Sort by score (higher is better), then by original order
        const scoreA = a.matchScore ?? 0;
        const scoreB = b.matchScore ?? 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return 0;
      });

    // Get top candidate
    const topCandidate =
      rankedCandidates.length > 0 && rankedCandidates[0]?.matchScore !== undefined
        ? rankedCandidates[0] ?? null
        : null;

    // Get rationale (prefer topRationale, fallback to top candidate's rationale)
    const rationale =
      parsed.topRationale?.trim() ??
      (topCandidate
        ? rankingMap.get(topCandidate.ndc)?.rationale?.trim() ?? null
        : null);

    // Limit rationale to 100 chars
    const limitedRationale =
      rationale && rationale.length > 100
        ? `${rationale.substring(0, 97)}...`
        : rationale;

    return {
      rankedCandidates,
      rationale: limitedRationale,
      topCandidate,
    };
  } catch (error) {
    // Log parsing error but don't throw
    console.log("[AI Assist] Failed to parse response:", error);
    return null;
  }
}

