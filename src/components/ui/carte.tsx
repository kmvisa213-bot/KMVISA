import type { ReactNode } from "react";

export function Carte({ titre, action, children, className = "" }: { titre?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-ligne bg-white p-4 sm:p-5 ${className}`}>
      {(titre || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {titre && <h2 className="text-base font-semibold text-navy-900">{titre}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Indicateur({ label, valeur, aide, alerte = false }: { label: string; valeur: string; aide?: string; alerte?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${alerte ? "border-red-200" : "border-ligne"}`}>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${alerte ? "text-red-700" : "text-navy-900"}`}>{valeur}</p>
      {aide && <p className="mt-0.5 text-xs text-muted">{aide}</p>}
    </div>
  );
}
