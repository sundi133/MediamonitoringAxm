import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReportViewerProps {
  content: string;
}

export function ReportViewer({ content }: ReportViewerProps) {
  return <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>;
}
