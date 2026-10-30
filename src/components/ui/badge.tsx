import { STATUTS_DEMANDE, STATUTS_PAIEMENT, type StatutDemande, type StatutPaiement } from "@/lib/statuts";

function Pastille({ label, classes }: { label: string; classes: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function BadgeStatut({ statut }: { statut: StatutDemande }) {
  return <Pastille {...STATUTS_DEMANDE[statut]} />;
}

export function BadgePaiement({ statut }: { statut: StatutPaiement }) {
  return <Pastille {...STATUTS_PAIEMENT[statut]} />;
}
