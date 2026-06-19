import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Plus,
  X,
  AlertCircle,
  RotateCcw,
  TestTube2,
  Sparkles,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { initialKeywords } from "../data/mockData";
import { MonitoringSource } from "../types/settings";
import { useAuth } from "../contexts/AuthContext";
import { projectId } from "../utils/supabase/info";
import { Textarea } from "./ui/textarea";
import { settingsService } from "../services/settingsService";

interface MonitoringSettingsProps {
  keywords: string[];
  sources: MonitoringSource[];
  onUpdateKeywords: (keywords: string[]) => void;
  onUpdateSources: (sources: MonitoringSource[]) => void;
}

export function MonitoringSettings({
  keywords,
  sources,
  onUpdateKeywords,
  onUpdateSources,
}: MonitoringSettingsProps) {
  const { accessToken } = useAuth();
  const [newKeyword, setNewKeyword] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [generatingKeywords, setGeneratingKeywords] = useState(false);

  const testAuth = async () => {
    console.log(
      "Testing auth with token:",
      accessToken ? `${accessToken.substring(0, 20)}...` : "NONE",
    );
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/settings/test-auth`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      const data = await response.json();
      console.log("Test auth response:", data);
      if (response.ok) {
        toast.success(`Auth test passed! User: ${data.user.email}`);
      } else {
        toast.error(`Auth test failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Test auth error:", error);
      toast.error("Test auth request failed");
    }
  };

  const addKeyword = () => {
    const trimmedKeyword = newKeyword.trim();

    if (!trimmedKeyword) {
      toast.error("Please enter a keyword");
      return;
    }

    if (keywords.includes(trimmedKeyword)) {
      toast.error("This keyword is already being monitored");
      return;
    }

    if (trimmedKeyword.length < 2) {
      toast.error("Keywords must be at least 2 characters long");
      return;
    }

    onUpdateKeywords([...keywords, trimmedKeyword]);
    setNewKeyword("");
    toast.success(`Added keyword: "${trimmedKeyword}"`);
  };

  const removeKeyword = (keyword: string) => {
    onUpdateKeywords(keywords.filter((k) => k !== keyword));
    toast.success(`Removed keyword: "${keyword}"`);
  };

  const loadDefaultKeywords = () => {
    const newKeywords = initialKeywords.filter((k) => !keywords.includes(k));
    if (newKeywords.length === 0) {
      toast.info("All default keywords are already added");
      return;
    }
    onUpdateKeywords([...keywords, ...newKeywords]);
    toast.success(`Added ${newKeywords.length} default keywords`);
  };

  const resetToDefaultKeywords = () => {
    onUpdateKeywords(initialKeywords);
    toast.success(`Reset to ${initialKeywords.length} default keywords`);
  };

  const clearAllKeywords = () => {
    if (keywords.length === 0) {
      toast.info("No keywords to clear");
      return;
    }
    onUpdateKeywords([]);
    toast.success("All keywords cleared");
  };

  const generateKeywords = async () => {
    setGeneratingKeywords(true);
    try {
      // Use smart keyword generation - searches Tavily first for real articles
      toast.info(
        "Searching for relevant articles to generate better keywords...",
      );
      const result = await settingsService.generateKeywordsSmart(
        accessToken!,
        aiDescription,
        true,
      );

      console.log("Generate smart keywords response:", result);

      if (result.keywords) {
        const newKeywords = result.keywords.filter(
          (k) => !keywords.includes(k),
        );
        if (newKeywords.length === 0) {
          toast.info("No new keywords generated");
          return;
        }
        onUpdateKeywords([...keywords, ...newKeywords]);
        const baseMessage = `Added ${newKeywords.length} new keywords`;
        const suffix = result.usedSearch ? " (based on real articles)" : "";
        toast.success(baseMessage + suffix);
      } else {
        toast.error("Keyword generation failed");
      }
    } catch (error) {
      console.error("Generate keywords error:", error);
      toast.error("Keyword generation request failed");
    } finally {
      setGeneratingKeywords(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Stats */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Active Keywords
                </p>
                <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {keywords.length}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50 rounded-2xl">
                <Plus className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Keywords & Brand Mentions
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={testAuth}
                className="h-7 rounded-lg text-xs"
              >
                <TestTube2 className="w-3 h-3 mr-1" />
                Test Auth
              </Button>
            </div>
            <span className="text-xs font-medium px-3 py-1 bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 rounded-full">
              Auto-saved
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add keyword (e.g., corruption, traffic jam, hospital negligence)"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addKeyword()}
                className="h-12 rounded-xl border-slate-200 dark:border-slate-800 shadow-sm"
              />
              <Button
                onClick={addKeyword}
                disabled={!newKeyword.trim()}
                className="h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDefaultKeywords}
                className="text-xs rounded-xl shadow-sm"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Default Keywords
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaultKeywords}
                className="text-xs rounded-xl shadow-sm"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset to Default
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllKeywords}
                className="text-xs rounded-xl shadow-sm"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            </div>
            {newKeyword.trim() && (
              <div className="text-xs p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                <strong className="text-indigo-700 dark:text-indigo-300">
                  Search Preview:
                </strong>{" "}
                <span className="text-foreground font-medium">
                  "{newKeyword.trim()} issues"
                </span>
                <br />
                <em className="text-muted-foreground">
                  Keywords are enhanced with "issues" and searched across
                  India-based sources for localized coverage
                </em>
              </div>
            )}
          </div>

          {keywords.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl mb-4">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-foreground font-medium">
                No keywords added yet
              </p>
              <p className="text-sm text-muted-foreground">
                Add keywords to start monitoring mentions
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-0 shadow-sm"
                >
                  <span className="font-medium">{keyword}</span>
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="ml-1 hover:bg-red-200 dark:hover:bg-red-800 rounded-full p-1 transition-colors"
                    title={`Remove "${keyword}"`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Keyword Generator */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-3xl"></div>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              AI Keyword Generator
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Describe what you want to monitor, and AI will automatically
            generate relevant keywords for you
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Textarea
              placeholder="Example: I want to monitor healthcare issues, hospital mismanagement, and medical negligence in Assam..."
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              className="min-h-[100px] rounded-xl border-slate-200 dark:border-slate-800 shadow-sm resize-none"
            />
            <Button
              onClick={generateKeywords}
              disabled={!aiDescription.trim() || generatingKeywords}
              className="w-full h-12 rounded-xl bg-black dark:bg-black text-white hover:bg-slate-800 dark:hover:bg-slate-800 shadow-md"
            >
              {generatingKeywords ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Keywords...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Keywords with AI
                </>
              )}
            </Button>
            <div className="text-xs p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl">
              <strong className="text-indigo-700 dark:text-indigo-300">
                💡 Pro Tip:
              </strong>
              <span className="text-muted-foreground ml-1">
                Be specific about the topics, issues, or areas you want to
                monitor for the most relevant keyword suggestions.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Configuration Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {keywords.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                <h4 className="font-semibold mb-2 text-foreground">
                  Active Keywords
                </h4>
                <p className="text-sm text-muted-foreground">
                  {keywords
                    .slice(0, 3)
                    .map((k) => `"${k} issues"`)
                    .join(", ")}
                  {keywords.length > 3 && ` and ${keywords.length - 3} more`}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <em>
                    💡 Keywords are enhanced with "issues" and searched across
                    India-based domains
                  </em>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
