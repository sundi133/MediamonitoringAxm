import { useAuth } from "../contexts/AuthContext";
import { AuthForm } from "./AuthForm";
import { AuthenticatedApp } from "./AuthenticatedApp";
import { LoadingSpinner } from "./LoadingSpinner";

export function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <AuthForm />;
  }

  return <AuthenticatedApp />;
}
