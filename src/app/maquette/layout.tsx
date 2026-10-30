import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./maquette.css";
import { BarreBasMobile, BarreLaterale } from "@/components/ui/navigation";

export const metadata: Metadata = {
  title: "KM VISA — Maquette",
  robots: { index: false, follow: false },
};

// Nouvelle interface (UI) en français. Données fictives : le branchement Supabase viendra à l'étape UX.
export default function MaquetteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="km-root flex" lang="fr" dir="ltr">
      <BarreLaterale />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-6xl">
          <p className="mb-5 rounded-lg bg-sable-100 px-4 py-2.5 text-[13px] text-amber-900">
            Maquette de la nouvelle interface. Les données affichées sont fictives.
          </p>
          {children}
        </div>
      </main>
      <BarreBasMobile />
    </div>
  );
}
