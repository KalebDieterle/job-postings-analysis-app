import Link from "next/link";

interface RecentPosting {
  job_id: string;
  title: string;
  company_name: string;
  location: string | null;
  listed_time: Date;
  min_salary: number | null;
  max_salary: number | null;
}

function formatTimeAgo(timestamp: Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}D_AGO`;
  if (diffHours > 0) return `${diffHours}H_AGO`;
  if (diffMins > 0) return `${diffMins}M_AGO`;
  return "JUST_NOW";
}

function formatDate(timestamp: Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + "...";
}

export function RecentActivityFeed({ data }: { data: RecentPosting[] }) {
  return (
    <div className="term-panel h-full flex flex-col">
      {/* Panel header */}
      <div className="term-panel-header">
        <span className="term-panel-title">SYSTEM_LOGS: RECENT_JOB_POSTINGS.log</span>
        <span
          className="text-xs px-2 py-0.5 font-bold"
          style={{
            color: "var(--success)",
            border: "1px solid color-mix(in srgb, var(--success) 40%, transparent 60%)",
            borderRadius: "2px",
            background: "color-mix(in srgb, var(--success) 8%, transparent 92%)",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "10px",
            letterSpacing: "0.1em",
          }}
        >
          LIVE
        </span>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0">
        {data.map((posting) => (
          <Link
            key={posting.job_id}
            href="/roles"
            className="block py-2.5 px-2 border-b transition-colors group"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="group-hover:opacity-100"
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "11px",
                lineHeight: "1.6",
              }}
            >
              {/* Timestamp + prefix */}
              <div className="flex items-start gap-1.5 flex-wrap">
                <span style={{ color: "var(--muted-foreground)" }}>
                  {">>>"}{" "}
                </span>
                <span style={{ color: "var(--muted-foreground)", fontSize: "10px" }}>
                  [{formatDate(posting.listed_time)}]
                </span>
                <span
                  style={{ color: "var(--accent)", fontWeight: 700 }}
                  className="group-hover:text-foreground transition-colors"
                >
                  New Posting:
                </span>
              </div>

              {/* Job info */}
              <div className="ml-5 mt-0.5 space-y-0.5">
                <div className="text-foreground font-semibold group-hover:text-primary transition-colors">
                  {truncate(posting.title, 52)}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span style={{ color: "var(--muted-foreground)" }}>
                    @ {truncate(posting.company_name, 28)}
                  </span>
                  <span style={{ color: "var(--muted-foreground)" }}>
                    [{posting.location ?? "REMOTE"}]
                  </span>
                  {posting.min_salary && posting.max_salary && (
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>
                      ${Math.round(posting.min_salary / 1000)}k–${Math.round(posting.max_salary / 1000)}k
                    </span>
                  )}
                  <span style={{ color: "var(--muted-foreground)", fontSize: "10px" }}>
                    {formatTimeAgo(posting.listed_time)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
