import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Sign up endpoint
app.post("/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    // Validate password strength
    if (password.length < 6) {
      return c.json(
        { error: "Password must be at least 6 characters long" },
        400,
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      // Handle specific error cases
      const errorCode = (error as { code?: string }).code;
      const errorMessage = error.message || "";

      if (
        errorCode === "email_exists" ||
        errorMessage.includes("already been registered")
      ) {
        console.log("Signup attempt with existing email:", email);
        return c.json(
          {
            error:
              "An account with this email already exists. Please sign in instead.",
          },
          409,
        );
      }

      console.error("User creation error during signup:", error);
      return c.json({ error: errorMessage || "Failed to create account" }, 400);
    }

    console.log("User created successfully:", data.user?.email);
    return c.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.user_metadata?.name,
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Signup endpoint error:", error);
    return c.json(
      { error: "Internal server error during signup", details: errorMessage },
      500,
    );
  }
});

export default app;
