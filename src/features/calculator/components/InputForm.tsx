"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalculatorInputSchema, type CalculatorInput } from "../server/schema";
import { createCalculation } from "../server/actions";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const EXAMPLE_INPUTS: CalculatorInput[] = [
  {
    drugOrNdc: "Lisinopril 10mg",
    sig: "Take 1 tablet by mouth once daily",
    daysSupply: 30,
  },
  {
    drugOrNdc: "68180-515-01",
    sig: "Take 2 tablets by mouth twice daily with food",
    daysSupply: 90,
  },
  {
    drugOrNdc: "Metformin 500mg",
    sig: "Take 1 tablet by mouth twice daily",
    daysSupply: 60,
  },
];

export function InputForm() {
  const form = useForm<CalculatorInput>({
    resolver: zodResolver(CalculatorInputSchema),
    mode: "onBlur",
    defaultValues: {
      drugOrNdc: "",
      sig: "",
      daysSupply: undefined,
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await createCalculation(data);
      // Redirect happens in server action, so we don't need to handle it here
    } catch (error) {
      // Handle errors - server action will throw if validation fails
      console.error("Failed to create calculation:", error);
      // Form validation errors are already handled by react-hook-form
      // For server errors, we could show a toast here in future phases
    }
  });

  const handleClear = () => {
    form.reset({
      drugOrNdc: "",
      sig: "",
      daysSupply: undefined,
    });
  };

  const handleExampleClick = (example: CalculatorInput) => {
    form.setValue("drugOrNdc", example.drugOrNdc);
    form.setValue("sig", example.sig);
    form.setValue("daysSupply", example.daysSupply);
    void form.trigger(); // Trigger validation after setting values
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>NDC Quantity Calculator</CardTitle>
          <CardDescription>
            Enter prescription details to calculate the required quantity
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="drugOrNdc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drug Name or NDC</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Lisinopril 10mg or 68180-515-01"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter either a drug name (e.g., &quot;Lisinopril 10mg&quot;) or an
                      NDC code (e.g., &quot;68180-515-01&quot;)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sig"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SIG (Prescription Instructions)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Take 1 tablet by mouth once daily"
                        className="min-h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the prescription instructions (SIG) as written
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="daysSupply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days Supply</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 30"
                        min={1}
                        max={365}
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? undefined : Number(value));
                        }}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of days the prescription should last (1-365)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium">Example Inputs</p>
                <p className="text-xs text-muted-foreground">
                  Click an example below to populate the form:
                </p>
                <div className="space-y-2">
                  {EXAMPLE_INPUTS.map((example, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleExampleClick(example)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="font-medium">{example.drugOrNdc}</div>
                      <div className="text-xs text-muted-foreground">
                        {example.sig} • {example.daysSupply} days
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={isSubmitting}
              >
                Clear
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Calculate"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

