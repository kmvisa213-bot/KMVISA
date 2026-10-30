import { BandeauFictif } from "@/components/ui/bandeau-fictif";
import { Carte, Indicateur } from "@/components/ui/carte";
import { EnTetePage } from "@/components/ui/en-tete";
import { dzd, indicateursFinance } from "@/lib/donnees-fictives";

export default function Finances() {
  return (
    <>
      <BandeauFictif />
      <EnTetePage titre="Finances" sousTitre="Montants en dinars algériens (DZD)" />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {indicateursFinance.map((i) => <Indicateur key={i.label} label={i.label} valeur={dzd(i.valeur)} aide={i.aide} />)}
      </div>
      <Carte titre="Rappel des règles">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>Un acompte reçu est une avance client, pas un revenu.</li>
          <li>Une réservation n'est pas une dépense : seule la facture fournisseur l'est.</li>
          <li>Le revenu est reconnu quand le service est terminé.</li>
        </ul>
      </Carte>
    </>
  );
}
