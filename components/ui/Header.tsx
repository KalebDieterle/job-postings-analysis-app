import React from "react";

const Header = () => {
  return (
    <header className="mb-6 md:mb-8">
      {/* Terminal-style breadcrumb label */}
      <p className="term-label mb-3">
        {">"} SKILLMAP_ANALYTICS {">"} OVERVIEW.LOG
      </p>

      <h1 className="text-2xl font-bold md:text-4xl tracking-tight text-foreground mb-2">
        <span className="text-muted-foreground font-normal">SkillMap: </span>
        <span style={{ color: "var(--primary)" }}>Dashboard</span>
        <span className="term-cursor ml-1 text-2xl md:text-4xl" />
      </h1>

      <p className="text-sm text-muted-foreground max-w-2xl">
        {"// "}Real-time job market intelligence — skills, roles, salaries, and hiring trends
        across thousands of live postings.
      </p>

      {/* Horizontal rule in terminal style */}
      <div className="mt-4 h-px" style={{ background: "var(--border)" }} />
    </header>
  );
};

export default Header;
