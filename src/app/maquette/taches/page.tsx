import { BandeauFictif } from "@/components/ui/bandeau-fictif";
import { Carte } from "@/components/ui/carte";
import { Bouton, EnTetePage } from "@/components/ui/en-tete";
import { ListeTaches } from "@/components/ui/liste-taches";
import { taches } from "@/lib/donnees-fictives";

export default function Taches() {
  const enRetard = taches.filter((t) => t.enRetard);
  const duJour = taches.filter((t) => !t.enRetard);
  return (
    <>
      <BandeauFictif />
      <EnTetePage titre="Tâches" sousTitre="Tâches automatiques (étapes des dossiers) et tâches manuelles" actions={<Bouton variante="secondaire">+ Tâche manuelle</Bouton>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Carte titre={`En retard (${enRetard.length})`} className="border-red-200"><ListeTaches initiales={enRetard} /></Carte>
        <Carte titre={`Aujourd'hui (${duJour.length})`}><ListeTaches initiales={duJour} /></Carte>
      </div>
    </>
  );
}
