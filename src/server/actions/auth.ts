"use server";

import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { signIn, signOut, auth } from "@/server/auth";
import { logAuthentication } from "@/lib/audit";

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Server action for user login with email/username and password.
 */
export async function loginAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const identifierValue = formData.get("username");
  const passwordValue = formData.get("password");

  const identifier =
    typeof identifierValue === "string" ? identifierValue.trim() : null;
  const password = typeof passwordValue === "string" ? passwordValue : null;

  if (!identifier || !password) {
    return {
      success: false,
      error: "Username/email and password are required",
    };
  }

  try {
    // Find user by email or username
    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, identifier), eq(users.username, identifier)))
      .limit(1);

    if (!user?.password) {
      return { success: false, error: "Invalid credentials" };
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { success: false, error: "Invalid credentials" };
    }

    // Sign in using NextAuth credentials provider
    const result = (await signIn("credentials", {
      email: user.email,
      password,
      redirect: false,
    })) as { error?: string } | undefined;

    if (result?.error) {
      // Log failed login attempt (non-blocking)
      void logAuthentication("login_failed", null, {
        identifier,
        error: result.error,
      }).catch((auditError) => {
        console.error("[Auth] Failed to log authentication:", auditError);
      });
      return { success: false, error: String(result.error) };
    }

    // Log successful login (non-blocking)
    void logAuthentication("login", user.id, {
      identifier,
      email: user.email,
    }).catch((auditError) => {
      console.error("[Auth] Failed to log authentication:", auditError);
    });

    // Get callback URL from form data or default to /calculator
    const callbackUrlValue = formData.get("callbackUrl");
    const callbackUrl =
      typeof callbackUrlValue === "string" ? callbackUrlValue : "/calculator";
    redirect(callbackUrl);
  } catch (error) {
    // Log failed login attempt (non-blocking)
    void logAuthentication("login_failed", null, {
      identifier,
      error: error instanceof Error ? error.message : String(error),
    }).catch((auditError) => {
      console.error("[Auth] Failed to log authentication:", auditError);
    });
    console.error("Login error:", error);
    return { success: false, error: "An error occurred during login" };
  }
}

/**
 * Server action for user signup.
 */
export async function signupAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const emailValue = formData.get("email");
  const usernameValue = formData.get("username");
  const passwordValue = formData.get("password");
  const confirmPasswordValue = formData.get("confirmPassword");
  const nameValue = formData.get("name");

  const email =
    typeof emailValue === "string" ? emailValue.trim().toLowerCase() : null;
  const username =
    typeof usernameValue === "string" ? usernameValue.trim() : null;
  const password = typeof passwordValue === "string" ? passwordValue : null;
  const confirmPassword =
    typeof confirmPasswordValue === "string" ? confirmPasswordValue : null;
  const name = typeof nameValue === "string" ? nameValue.trim() : null;

  // Validation
  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match" };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Invalid email format" };
  }

  try {
    // Check if email already exists
    const [existingEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingEmail) {
      return { success: false, error: "Email already registered" };
    }

    // Check if username already exists (if provided)
    if (username) {
      const [existingUsername] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUsername) {
        return { success: false, error: "Username already taken" };
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        username: username ?? null,
        password: hashedPassword,
        name: name ?? null,
        emailVerified: new Date(),
      })
      .returning();

    if (!newUser) {
      return { success: false, error: "Failed to create user" };
    }

    // Sign in the new user
    const result = (await signIn("credentials", {
      email: newUser.email,
      password,
      redirect: false,
    })) as { error?: string } | undefined;

    if (result?.error) {
      return { success: false, error: String(result.error) };
    }

    // Redirect to calculator
    const callbackUrlValue = formData.get("callbackUrl");
    const callbackUrl =
      typeof callbackUrlValue === "string" ? callbackUrlValue : "/calculator";
    redirect(callbackUrl);
  } catch (error) {
    console.error("Signup error:", error);
    return { success: false, error: "An error occurred during signup" };
  }
}

/**
 * Server action for user logout.
 * Signs out the user and redirects to the login page.
 */
export async function logoutAction() {
  "use server";
  // Get user ID before logout
  const session = await auth();
  const userId = session?.user?.id ?? null;

  await signOut({ redirect: false });

  // Log logout (non-blocking)
  void logAuthentication("logout", userId).catch((auditError) => {
    console.error("[Auth] Failed to log authentication:", auditError);
  });

  redirect("/login");
}
