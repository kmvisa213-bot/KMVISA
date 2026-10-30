import Link from "next/link";
import { Carte, Indicateur } from "@/components/ui/carte";
import { EnTetePage } from "@/components/ui/en-tete";
import { ListeTaches } from "@/components/ui/liste-taches";
import { NouvelleDemande } from "@/components/ui/nouvelle-demande";
import { TableauDemandes } from "@/components/ui/tableau-demandes";
import { demandes, dzd, taches } from "@/lib/donnees-fictives";

export default function Accueil() {
  const nouvelles = demandes.filter((d) => d.statut === "inquiry").length;
  const enRetard = taches.filter((t) => t.enRetard && !t.faite).length;
  const resteDu = demandes.reduce((s, d) => s + d.resteDzd, 0);

  return (
    <>
      <EnTetePage titre="Tableau de bord" sousTitre="Vendredi 30 octobre 2026" actions={<NouvelleDemande />} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicateur label="Nouvelles prises de contact" valeur={String(nouvelles)} aide="à rappeler" />
        <Indicateur label="Tâches du jour" valeur={String(taches.length)} aide={`${taches.filter((t) => t.faite).length} terminée(s)`} />
        <Indicateur label="Tâches en retard" valeur={String(enRetard)} aide="à relancer" alerte={enRetard > 0} />
        <Indicateur label="Reste dû clients" valeur={dzd(resteDu)} aide="toutes demandes actives" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Carte titre="Demandes récentes" action={<Link href="/maquette/demandes" className="text-[13px] font-semibold text-navy-700 underline">Voir tout</Link>}>
          <TableauDemandes demandes={demandes.slice(0, 5)} />
        </Carte>
        <Carte titre="Tâches du jour" action={<Link href="/maquette/taches" className="text-[13px] font-semibold text-navy-700 underline">Voir tout</Link>}>
          <ListeTaches initiales={taches} />
        </Carte>
      </div>
    </>
  );
}
