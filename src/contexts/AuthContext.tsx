import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../utils/supabase/info";

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
);

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  accessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.log(
            "Session error, clearing invalid session:",
            error.message,
          );
          // Clear any invalid session data
          await supabase.auth.signOut();
          setUser(null);
          setAccessToken(null);
        } else if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            name:
              session.user.user_metadata?.name || session.user.email || "User",
          });
          setAccessToken(session.access_token);
        } else {
          // No session exists
          setUser(null);
          setAccessToken(null);
        }
      } catch (error) {
        console.error("Session check error:", error);
        // Clear session on error
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);

      if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        setUser(null);
        setAccessToken(null);
      } else if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          name:
            session.user.user_metadata?.name || session.user.email || "User",
        });
        setAccessToken(session.access_token);
      } else {
        setUser(null);
        setAccessToken(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log("Sign in error:", error.message);
        // Provide user-friendly error messages
        if (error.message.includes("Invalid login credentials")) {
          return {
            success: false,
            error:
              "Invalid email or password. Please check your credentials and try again.",
          };
        }
        return { success: false, error: error.message };
      }

      if (data.session?.user) {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || "",
          name:
            data.session.user.user_metadata?.name ||
            data.session.user.email ||
            "User",
        });
        setAccessToken(data.session.access_token);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Sign in error:", error);
      return {
        success: false,
        error: error.message || "An error occurred during sign in",
      };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);

      // Call our server endpoint for user registration
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password, name }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        console.log(
          "Signup failed with status:",
          response.status,
          "Error:",
          result.error,
        );
        return { success: false, error: result.error || "Registration failed" };
      }

      // After successful registration, sign in the user
      return await signIn(email, password);
    } catch (error: any) {
      console.error("Sign up error:", error);
      return {
        success: false,
        error: error.message || "An error occurred during sign up",
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAccessToken(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
