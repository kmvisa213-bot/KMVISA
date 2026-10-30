import { BadgePaiement, BadgeStatut } from "./badge";
import { TYPES_SERVICE } from "@/lib/statuts";
import { dzd, type DemandeFictive } from "@/lib/donnees-fictives";

const th = "border-b border-ligne px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted";
const td = "border-b border-stone-100 px-2 py-3 align-middle";

export function TableauDemandes({ demandes, complet = false }: { demandes: DemandeFictive[]; complet?: boolean }) {
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>Réf.</th>
            <th className={th}>Client</th>
            <th className={`${th} hidden sm:table-cell`}>Service</th>
            <th className={th}>Statut</th>
            {complet && <th className={`${th} hidden md:table-cell`}>Paiement</th>}
            {complet && <th className={`${th} hidden md:table-cell`}>Date</th>}
            {complet && <th className={`${th} text-right`}>Reste dû</th>}
          </tr>
        </thead>
        <tbody>
          {demandes.map((d) => (
            <tr key={d.reference} className="hover:bg-stone-50">
              <td className={`${td} whitespace-nowrap text-[13px] text-muted tabular-nums`}>{d.reference}</td>
              <td className={td}>
                <span className="font-medium">{d.client}</span>
                {d.b2b && <span className="ml-1.5 rounded bg-navy-900 px-1.5 py-0.5 text-[10px] font-bold text-white">B2B</span>}
              </td>
              <td className={`${td} hidden sm:table-cell`}>
                {TYPES_SERVICE[d.service]}
                <span className="block text-xs text-muted">{d.detail}</span>
              </td>
              <td className={td}><BadgeStatut statut={d.statut} /></td>
              {complet && <td className={`${td} hidden md:table-cell`}><BadgePaiement statut={d.paiement} /></td>}
              {complet && <td className={`${td} hidden md:table-cell tabular-nums`}>{d.date}</td>}
              {complet && <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{d.resteDzd ? dzd(d.resteDzd) : "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
