import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { signIn } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { type JSX, type SVGProps } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { signupAction } from "@/server/actions/auth";
import Link from "next/link";

type SearchParams = Promise<{ error?: string }>;

const GoogleIcon = (
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
  </svg>
);

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const params = await searchParams;
  const error = params?.error;

  // Redirect if already logged in
  if (session) {
    redirect("/calculator");
  }

  async function handleSignup(formData: FormData) {
    "use server";
    const result = await signupAction(formData);
    if (!result.success) {
      redirect(`/signup?error=${encodeURIComponent(result.error)}`);
    }
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
        <Card className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
          <CardContent>
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
              <h2 className="text-foreground text-center text-xl font-semibold">
                Create an account
              </h2>
              {error && (
                <div className="bg-destructive/15 text-destructive mt-4 rounded-md p-3 text-sm">
                  {error}
                </div>
              )}
              <form action={handleSignup} className="mt-6 space-y-4">
                <div>
                  <Label
                    htmlFor="name-signup"
                    className="text-foreground dark:text-foreground text-sm font-medium"
                  >
                    Name (Optional)
                  </Label>
                  <Input
                    type="text"
                    id="name-signup"
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="email-signup"
                    className="text-foreground dark:text-foreground text-sm font-medium"
                  >
                    Email
                  </Label>
                  <Input
                    type="email"
                    id="email-signup"
                    name="email"
                    autoComplete="email"
                    placeholder="email@example.com"
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label
                    htmlFor="username-signup"
                    className="text-foreground dark:text-foreground text-sm font-medium"
                  >
                    Username (Optional)
                  </Label>
                  <Input
                    type="text"
                    id="username-signup"
                    name="username"
                    autoComplete="username"
                    placeholder="username"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="password-signup"
                    className="text-foreground dark:text-foreground text-sm font-medium"
                  >
                    Password
                  </Label>
                  <Input
                    type="password"
                    id="password-signup"
                    name="password"
                    autoComplete="new-password"
                    placeholder="**************"
                    className="mt-2"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="confirmPassword-signup"
                    className="text-foreground dark:text-foreground text-sm font-medium"
                  >
                    Confirm Password
                  </Label>
                  <Input
                    type="password"
                    id="confirmPassword-signup"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="**************"
                    className="mt-2"
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" className="mt-4 w-full py-2 font-medium">
                  Sign up
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2">
                    or with
                  </span>
                </div>
              </div>

              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/calculator" });
                }}
              >
                <Button
                  variant="outline"
                  className="flex w-full items-center justify-center space-x-2 py-2"
                  type="submit"
                >
                  <GoogleIcon className="size-5" aria-hidden={true} />
                  <span className="text-sm font-medium">
                    Sign up with Google
                  </span>
                </Button>
              </form>

              <p className="text-muted-foreground dark:text-muted-foreground mt-4 text-xs">
                By signing up, you agree to our{" "}
                <a href="#" className="underline underline-offset-4">
                  terms of service
                </a>{" "}
                and{" "}
                <a href="#" className="underline underline-offset-4">
                  privacy policy
                </a>
                .
              </p>

              <p className="text-muted-foreground dark:text-muted-foreground mt-6 text-center text-sm">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-primary hover:text-primary/90 dark:text-primary hover:dark:text-primary/90 font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

