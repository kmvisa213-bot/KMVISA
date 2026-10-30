import { Carte } from "@/components/ui/carte";
import { EnTetePage } from "@/components/ui/en-tete";
import { NouvelleDemande } from "@/components/ui/nouvelle-demande";
import { TableauDemandes } from "@/components/ui/tableau-demandes";
import { STATUTS_DEMANDE } from "@/lib/statuts";
import { demandes } from "@/lib/donnees-fictives";

const champ = "min-h-11 rounded-lg border border-ligne bg-white px-3 text-sm";

export default function Demandes() {
  return (
    <>
      <EnTetePage titre="Demandes" sousTitre="Chaque service est une demande, avec son propre statut" actions={<NouvelleDemande />} />
      <div className="mb-4 flex flex-wrap gap-2">
        <input type="search" placeholder="Nom, téléphone ou référence" aria-label="Rechercher" className={`${champ} min-w-56 flex-1`} />
        <select aria-label="Statut" className={champ}>
          <option>Tous les statuts</option>
          {Object.values(STATUTS_DEMANDE).map((s) => <option key={s.label}>{s.label}</option>)}
        </select>
        <select aria-label="Type de client" className={champ}>
          <option>Particuliers et agences</option><option>Particuliers (B2C)</option><option>Agences (B2B)</option>
        </select>
      </div>
      <Carte><TableauDemandes demandes={demandes} complet /></Carte>
    </>
  );
}
