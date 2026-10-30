import type { ReactNode } from "react";

export function EnTetePage({ titre, sousTitre, actions }: { titre: string; sousTitre?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{titre}</h1>
        {sousTitre && <p className="mt-1 text-sm text-muted">{sousTitre}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}

const STYLES = {
  principal: "bg-navy-900 text-white hover:bg-navy-700",
  secondaire: "border border-ligne bg-white text-navy-900 hover:bg-stone-100",
};

export function Bouton({ children, variante = "principal", onClick, type = "button" }: { children: ReactNode; variante?: keyof typeof STYLES; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick} className={`min-h-11 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors ${STYLES[variante]}`}>
      {children}
    </button>
  );
}
