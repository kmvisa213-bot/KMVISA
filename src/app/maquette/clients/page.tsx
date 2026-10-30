import { BandeauFictif } from "@/components/ui/bandeau-fictif";
import { Carte } from "@/components/ui/carte";
import { Bouton, EnTetePage } from "@/components/ui/en-tete";
import { clients } from "@/lib/donnees-fictives";

const th = "border-b border-ligne px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted";
const td = "border-b border-stone-100 px-2 py-3";

export default function Clients() {
  return (
    <>
      <BandeauFictif />
      <EnTetePage titre="Clients et agences" sousTitre="Un seul profil par personne ou par agence" actions={<Bouton variante="secondaire">+ Nouveau client</Bouton>} />
      <Carte>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr>
              <th className={th}>Nom</th><th className={th}>Type</th>
              <th className={`${th} hidden sm:table-cell`}>Téléphone</th>
              <th className={`${th} hidden md:table-cell`}>Dernière demande</th>
              <th className={`${th} text-right`}>Demandes</th>
            </tr></thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.nom} className="hover:bg-stone-50">
                  <td className={`${td} font-medium`}>{c.nom}</td>
                  <td className={td}>
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${c.type === "Agence" ? "bg-navy-900 text-white" : "bg-stone-100 text-stone-700"}`}>{c.type}</span>
                  </td>
                  <td className={`${td} hidden sm:table-cell text-muted tabular-nums`}>{c.telephone}</td>
                  <td className={`${td} hidden md:table-cell tabular-nums`}>{c.derniereDemande}</td>
                  <td className={`${td} text-right tabular-nums`}>{c.nbDemandes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Carte>
    </>
  );
}
