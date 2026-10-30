"use client";

import { useState } from "react";
import type { TacheFictive } from "@/lib/donnees-fictives";

export function ListeTaches({ initiales }: { initiales: TacheFictive[] }) {
  const [taches, setTaches] = useState(initiales);
  if (taches.length === 0) return <p className="py-6 text-center text-sm text-muted">Aucune tâche pour aujourd'hui.</p>;

  return (
    <ul className="divide-y divide-stone-100">
      {taches.map((t, i) => (
        <li key={t.titre} className="flex items-start gap-3 py-3">
          <input
            type="checkbox"
            checked={t.faite}
            onChange={() => setTaches((l) => l.map((x, j) => (j === i ? { ...x, faite: !x.faite } : x)))}
            aria-label={`Marquer « ${t.titre} » comme faite`}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-emerald-700"
          />
          <div className="min-w-0 flex-1">
            <p className={`text-sm ${t.faite ? "text-muted line-through" : ""}`}>{t.titre}</p>
            <p className="mt-0.5 text-xs text-muted">
              {t.lien} · échéance {t.echeance}
              {t.auto && " · automatique"}
              {t.enRetard && !t.faite && <span className="font-semibold text-red-700"> · en retard</span>}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
