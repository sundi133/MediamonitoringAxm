import { AuthProvider } from "./contexts/AuthContext";
import { AppContent } from "./components/AppContent";

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
