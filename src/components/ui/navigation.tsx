"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/maquette", label: "Accueil", icone: "⌂" },
  { href: "/maquette/demandes", label: "Demandes", icone: "☰" },
  { href: "/maquette/clients", label: "Clients", icone: "◉" },
  { href: "/maquette/taches", label: "Tâches", icone: "✓" },
  { href: "/maquette/finances", label: "Finances", icone: "≡" },
];

function estActif(pathname: string, href: string) {
  return href === "/maquette" ? pathname === href : pathname.startsWith(href);
}

export function BarreLaterale() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-navy-900 px-4 py-6 text-white lg:flex">
      <p className="text-lg font-bold tracking-wide">
        KM <span className="text-sable-500">VISA</span>
      </p>
      <p className="mb-8 text-xs text-navy-200">Clients, demandes et finances</p>
      <nav className="flex flex-col gap-1">
        {LIENS.map((l) => {
          const actif = estActif(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={actif ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                actif ? "bg-navy-700 text-white shadow-[inset_3px_0_0_var(--color-sable-500)]" : "text-navy-200 hover:bg-navy-700"
              }`}
            >
              <span aria-hidden className="w-4 text-center">{l.icone}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-auto text-xs text-navy-200">Nouvelle interface · en test</p>
    </aside>
  );
}

export function BarreBasMobile() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 bg-navy-900 px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden">
      {LIENS.map((l) => {
        const actif = estActif(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={actif ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] ${
              actif ? "bg-navy-700 text-white" : "text-navy-200"
            }`}
          >
            <span aria-hidden className="text-lg leading-none">{l.icone}</span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
