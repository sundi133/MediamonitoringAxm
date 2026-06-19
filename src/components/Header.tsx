import { Button } from "./ui/button";
import { TrendingDown, LogOut, User, MessageSquare, Clock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface HeaderProps {
  activeTab?: "inquiry" | "timeline";
  onTabChange?: (tab: "inquiry" | "timeline") => void;
}

export function Header({ activeTab = "inquiry", onTabChange }: HeaderProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 p-2">
      <div className="container mx-auto px-6 mb-2 mt-2">
        <div className="relative flex items-center justify-between h-16">
          {/* Logo & Brand - Left */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <TrendingDown className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">
              Media Monitor
            </h1>
          </div>

          {/* Navigation Tabs - True Center */}
          {onTabChange && (
            <nav className="absolute left-[50%] top-[50%] -translate-y-1/2 translate-x-[-50%]">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => onTabChange("inquiry")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-150 ${
                    activeTab === "inquiry"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Inquiry</span>
                </button>
                <button
                  onClick={() => onTabChange("timeline")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-150 ${
                    activeTab === "timeline"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Timeline</span>
                </button>
              </div>
            </nav>
          )}

          {/* User Menu - Right */}
          <div className="flex items-center gap-2">
            {user && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {user.name}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 h-9 px-3 rounded-lg"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
