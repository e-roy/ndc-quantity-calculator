"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download } from "lucide-react";
import { exportCalculation } from "../../server/actions";
import type { SerializedCalculation } from "../../types";

type JsonPanelProps = {
  calculation: SerializedCalculation;
};

/**
 * Triggers a file download from a server action response.
 */
async function triggerDownload(
  response: Response,
  filename: string,
): Promise<void> {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * JSON panel component that displays formatted calculation JSON with copy functionality.
 */
export function JsonPanel({ calculation }: JsonPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const jsonString = JSON.stringify(calculation, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      toast.success("JSON copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy JSON");
    }
  };

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const response = await exportCalculation(calculation.id, "json");
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `${calculation.id}-calculation.json`;
      await triggerDownload(response, filename);
      toast.success("JSON exported successfully");
    } catch (error) {
      toast.error("Failed to export JSON");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const response = await exportCalculation(calculation.id, "csv");
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `${calculation.id}-calculation.csv`;
      await triggerDownload(response, filename);
      toast.success("CSV exported successfully");
    } catch (error) {
      toast.error("Failed to export CSV");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>JSON Data</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
              disabled={isExporting}
            >
              {copied ? (
                <>
                  <Check className="size-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              className="gap-2"
              disabled={isExporting}
            >
              <Download className="size-4" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-2"
              disabled={isExporting}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <pre className="max-h-[600px] overflow-auto rounded-lg border bg-muted/50 p-4 text-xs">
            <code>{jsonString}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

