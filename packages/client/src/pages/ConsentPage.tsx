import { Link } from "react-router-dom";

export function ConsentPage() {
  return (
    <div className="flex flex-col gap-4 pt-8">
      <h1 className="text-lg font-semibold tracking-tight">Authorize access</h1>
      <p className="text-sm text-text-muted">
        MCP OAuth consent still runs on the website host. Open this app in a
        browser to approve Claude, ChatGPT, or Gemini.
      </p>
      <Link to="/diary/today" className="text-[17px] font-medium text-accent">
        Back to diary
      </Link>
    </div>
  );
}
