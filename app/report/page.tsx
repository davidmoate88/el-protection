"use client";

import { useEffect, useState } from "react";
import type { Study } from "@/lib/types";
import { loadStudy } from "../lib/storage";
import { ReportView } from "../components/ReportView";

export default function ReportPage() {
  const [study, setStudy] = useState<Study | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStudy(loadStudy());
  }, []);

  if (!study) {
    return (
      <main style={{ padding: 24 }}>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div className="report-toolbar">
        {/* next/link crashes here (invalid hook call) in this project's
            vinext/Cloudflare-Workers-simulated dev pipeline — confirmed by
            direct testing, not assumed. A plain anchor is a full page nav,
            not a soft client-side transition, which is fine for this
            low-frequency link. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">&larr; Back to study</a>
        <button type="button" className="primary" onClick={() => window.print()}>
          Print / save as PDF
        </button>
      </div>
      <ReportView study={study} />
    </main>
  );
}
