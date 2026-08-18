import * as React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 shadow-card ${className}`}>{children}</div>
  );
}

/** Cabeçalho de seção no padrão do book: barra lime/teal + kicker + título. */
export function SectionHeader({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6 flex gap-3.5">
      <div className="section-accent shrink-0" />
      <div>
        {kicker && <div className="mb-1 text-xs font-bold uppercase tracking-wider text-brand">{kicker}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-gray">{subtitle}</p>}
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, color = '#277471' }: { label: string; value: React.ReactNode; hint?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card" style={{ borderTop: `4px solid ${color}` }}>
      <span className="text-xs font-semibold text-ink">{label}</span>
      <div className="my-2 text-2xl font-extrabold" style={{ color }}>{value}</div>
      <div className="mb-1.5 h-0.5 w-10 rounded" style={{ background: color }} />
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress-track">
      <div className="progress-bar" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Button({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#d6e8e6] bg-[#EFF6F5] px-2.5 py-0.5 text-xs font-semibold text-brand">{children}</span>
  );
}
