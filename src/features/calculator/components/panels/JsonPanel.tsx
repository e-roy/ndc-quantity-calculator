"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import type { SerializedCalculation } from "../../types";

type JsonPanelProps = {
  calculation: SerializedCalculation;
};

/**
 * JSON panel component that displays formatted calculation JSON with copy functionality.
 */
export function JsonPanel({ calculation }: JsonPanelProps) {
  const [copied, setCopied] = useState(false);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>JSON Data</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
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

