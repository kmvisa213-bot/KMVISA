import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./maquette.css";
import { BarreBasMobile, BarreLaterale } from "@/components/ui/navigation";
import { GardeProprietaire } from "@/components/ui/garde-proprietaire";

export const metadata: Metadata = {
  title: "KM VISA — Maquette",
  robots: { index: false, follow: false },
};

// Nouvelle interface en français, réservée au propriétaire connecté.
// « Demandes » utilise les vraies données ; les autres écrans sont encore fictifs.
export default function MaquetteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="km-root flex" lang="fr" dir="ltr">
      <BarreLaterale />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-6xl">
          <GardeProprietaire>{children}</GardeProprietaire>
        </div>
      </main>
      <BarreBasMobile />
    </div>
  );
}
