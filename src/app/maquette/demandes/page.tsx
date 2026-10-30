"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Carte } from "@/components/ui/carte";
import { EnTetePage } from "@/components/ui/en-tete";
import { NouvelleDemande } from "@/components/ui/nouvelle-demande";
import { BadgePaiement, BadgeStatut } from "@/components/ui/badge";
import { STATUTS_DEMANDE, TYPES_DEMANDE_VISA_FR, TYPES_SERVICE, TYPES_VISA_FR, type StatutDemande } from "@/lib/statuts";
import { chargerDemandes, type DonneesDemandes, type Demande } from "@/lib/demandes";
import { nomPays } from "@/lib/pays";

const champ = "min-h-11 rounded-lg border border-ligne bg-white px-3 text-sm";
const th = "border-b border-ligne px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted";
const td = "border-b border-stone-100 px-2 py-3 align-middle";

type Ligne = Demande & { nomClient: string; telClient: string; agence: string | null; detail: string; recherche: string };

// Ignore accents et majuscules pour la recherche ("Amina" = "amina", "Hélène" = "helene").
function plat(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function construireLignes(d: DonneesDemandes): Ligne[] {
  const clients = new Map(d.clients.map((c) => [c.id, c]));
  const agences = new Map(d.agences.map((a) => [a.id, a]));
  const reps = new Map(d.representants.map((r) => [r.id, r]));
  return d.demandes.map((x) => {
    const client = x.client_id ? clients.get(x.client_id) : undefined;
    const agence = x.agency_id ? agences.get(x.agency_id)?.name ?? "Agence inconnue" : null;
    const rep = x.representative_id ? reps.get(x.representative_id)?.full_name : undefined;
    const nomClient = agence ? rep ?? "—" : client?.full_name ?? x.contact_name ?? "—";
    const telClient = client?.phone ?? x.contact_phone ?? "";
    const v = d.visas[x.id];
    const detail = x.service_type === "visa" && v
      ? [nomPays(v.country), v.visa_category ? TYPES_VISA_FR[v.visa_category] ?? v.visa_category : null, v.application_type ? TYPES_DEMANDE_VISA_FR[v.application_type] : null].filter(Boolean).join(" · ")
      : "";
    const telChiffres = telClient.replace(/\D/g, "");
    const recherche = plat([x.reference, nomClient, agence ?? "", telClient, telChiffres, "0" + telChiffres.replace(/^213/, ""), x.notes ?? "", detail].join(" "));
    return { ...x, nomClient, telClient, agence, detail, recherche };
  });
}

function dateCourte(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function Demandes() {
  const [donnees, setDonnees] = useState<DonneesDemandes | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [statut, setStatut] = useState<"" | StatutDemande>("");
  const [clientele, setClientele] = useState<"" | "b2c" | "b2b">("");
  const [service, setService] = useState("");
  const [vue, setVue] = useState<"actives" | "archivees">("actives");

  const charger = useCallback(async () => {
    const r = await chargerDemandes();
    if (r.ok) { setDonnees(r.donnees); setErreur(null); }
    else setErreur("Impossible de charger les demandes : " + r.erreur);
  }, []);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("nouvelle");
    if (ref) setSucces(`Demande ${ref} enregistrée.`);
    charger();
  }, [charger]);

  const lignes = useMemo(() => (donnees ? construireLignes(donnees) : []), [donnees]);
  const filtrees = useMemo(() => {
    const q = plat(texte.trim());
    const qChiffres = texte.replace(/\D/g, "");
    return lignes.filter((l) =>
      (vue === "actives" ? l.archived_at === null : l.archived_at !== null) &&
      (!statut || l.status === statut) &&
      (!clientele || (clientele === "b2b" ? l.agency_id !== null : l.agency_id === null)) &&
      (!service || l.service_type === service) &&
      (!q || l.recherche.includes(q) || (qChiffres.length >= 4 && l.recherche.includes(qChiffres)))
    );
  }, [lignes, texte, statut, clientele, service, vue]);

  const filtresActifs = Boolean(texte || statut || clientele || service);

  return (
    <>
      <EnTetePage
        titre="Demandes"
        sousTitre="Chaque service est une demande, avec son propre statut"
        actions={<NouvelleDemande onCreee={(ref) => { setSucces(`Demande ${ref} enregistrée.`); charger(); }} />}
      />

      {succes && (
        <p role="status" className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
          {succes}
          <button onClick={() => setSucces(null)} className="cursor-pointer text-xs font-semibold underline">Fermer</button>
        </p>
      )}
      {erreur && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800">{erreur}</p>}

      <div className="mb-3 flex flex-wrap gap-2">
        <input type="search" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Nom, téléphone, référence ou agence" aria-label="Rechercher" className={`${champ} min-w-56 flex-1`} />
        <select aria-label="Statut" value={statut} onChange={(e) => setStatut(e.target.value as StatutDemande | "")} className={champ}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS_DEMANDE).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <select aria-label="Type de client" value={clientele} onChange={(e) => setClientele(e.target.value as "" | "b2c" | "b2b")} className={champ}>
          <option value="">Particuliers et agences</option>
          <option value="b2c">Particuliers (B2C)</option>
          <option value="b2b">Agences (B2B)</option>
        </select>
        <select aria-label="Service" value={service} onChange={(e) => setService(e.target.value)} className={champ}>
          <option value="">Tous les services</option>
          {Object.entries(TYPES_SERVICE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="inline-flex rounded-lg border border-ligne bg-white p-1">
          {(["actives", "archivees"] as const).map((v) => (
            <button key={v} onClick={() => setVue(v)} className={`cursor-pointer rounded-md px-3 py-1.5 font-semibold ${vue === v ? "bg-navy-900 text-white" : "text-navy-700"}`}>
              {v === "actives" ? "Actives" : "Archivées"}
            </button>
          ))}
        </div>
        <p className="text-muted">
          {donnees ? `${filtrees.length} demande${filtrees.length > 1 ? "s" : ""}` : "Chargement…"}
          {filtresActifs && (
            <button onClick={() => { setTexte(""); setStatut(""); setClientele(""); setService(""); }} className="ml-3 cursor-pointer font-semibold text-navy-700 underline">
              Effacer les filtres
            </button>
          )}
        </p>
      </div>

      <Carte>
        {!donnees && !erreur && <p className="py-8 text-center text-sm text-muted">Chargement des demandes…</p>}
        {donnees && filtrees.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            {filtresActifs ? "Aucune demande ne correspond à ces filtres." : vue === "actives" ? "Aucune demande active." : "Aucune demande archivée."}
          </p>
        )}
        {filtrees.length > 0 && (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>Réf.</th>
                  <th className={th}>Client</th>
                  <th className={`${th} hidden sm:table-cell`}>Service</th>
                  <th className={th}>Statut</th>
                  <th className={`${th} hidden md:table-cell`}>Paiement</th>
                  <th className={`${th} hidden md:table-cell`}>Date</th>
                  <th className={th}><span className="sr-only">Ouvrir</span></th>
                </tr>
              </thead>
              <tbody>
                {filtrees.map((l) => (
                  <tr key={l.id} className="hover:bg-stone-50">
                    <td className={`${td} whitespace-nowrap text-[13px] text-muted tabular-nums`}>
                      {l.reference}
                      {l.source === "public_intake" && <span className="mt-0.5 block text-[11px] font-semibold text-amber-800">via le site</span>}
                    </td>
                    <td className={td}>
                      {l.agence && <span className="mr-1.5 rounded bg-navy-900 px-1.5 py-0.5 text-[10px] font-bold text-white">B2B</span>}
                      <span className="font-medium">{l.agence ?? l.nomClient}</span>
                      <span className="block text-xs text-muted tabular-nums">{l.agence ? l.nomClient : l.telClient || "—"}</span>
                    </td>
                    <td className={`${td} hidden sm:table-cell`}>
                      {TYPES_SERVICE[l.service_type] ?? l.service_type}
                      {l.detail && <span className="block text-xs text-muted">{l.detail}</span>}
                    </td>
                    <td className={td}><BadgeStatut statut={l.status} /></td>
                    <td className={`${td} hidden md:table-cell`}><BadgePaiement statut={l.payment_status} /></td>
                    <td className={`${td} hidden md:table-cell tabular-nums`}>{dateCourte(l.created_at)}</td>
                    <td className={`${td} text-right`}>
                      <Link href={`/dashboard/requests/${l.id}`} className="whitespace-nowrap text-[13px] font-semibold text-navy-700 underline">Ouvrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Carte>
      <p className="mt-3 text-xs text-muted">« Ouvrir » affiche encore la fiche de l'ancien tableau de bord, en attendant la nouvelle fiche.</p>
    </>
  );
}
