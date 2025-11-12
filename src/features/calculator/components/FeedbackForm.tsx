"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitFeedback } from "../server/actions";

type FeedbackFormProps = {
  calculationId: string;
};

/**
 * Feedback form component for user satisfaction ratings.
 * Displays star rating (1-5) and optional feedback text.
 */
export function FeedbackForm({ calculationId }: FeedbackFormProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleStarClick = (value: number) => {
    if (!isSubmitted) {
      setRating(value);
    }
  };

  const handleSubmit = async () => {
    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitFeedback(
        calculationId,
        rating,
        feedbackText.trim() || undefined,
      );

      if (result.success) {
        setIsSubmitted(true);
        toast.success("Thank you for your feedback!");
      } else {
        toast.error(result.error ?? "Failed to submit feedback");
      }
    } catch (error) {
      toast.error("Failed to submit feedback");
      console.error("Feedback submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thank You!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Your feedback has been submitted. We appreciate your input!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate This Calculation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Rating</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleStarClick(value)}
                className="focus:ring-primary rounded focus:ring-2 focus:ring-offset-2 focus:outline-none"
                disabled={isSubmitting}
                aria-label={`Rate ${value} out of 5`}
              >
                <Star
                  className={`size-6 transition-colors ${
                    rating && value <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
            {rating && (
              <span className="text-muted-foreground ml-2 text-sm">
                {rating} / 5
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="feedback-text" className="text-sm font-medium">
            Feedback (optional)
          </label>
          <Textarea
            id="feedback-text"
            placeholder="Share your thoughts about this calculation..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            disabled={isSubmitting}
            rows={3}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!rating || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
}
