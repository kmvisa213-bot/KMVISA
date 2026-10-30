"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Bouton } from "./en-tete";
import { TYPES_DEMANDE_VISA_FR, TYPES_SERVICE, TYPES_VISA_FR } from "@/lib/statuts";
import { creerDemande, type AgenceRef, type RepresentantRef } from "@/lib/demandes";
import { normaliserTelephone, telephoneValide } from "@/lib/telephone";
import { listePays } from "@/lib/pays";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const champ = "min-h-11 w-full rounded-lg border border-ligne bg-white px-3 py-2 text-sm outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-200 disabled:bg-stone-100";
const etiquette = "mb-1 block text-[13px] font-semibold text-navy-700";

// Saisie rapide pendant un appel (D12) : l'essentiel, les détails viendront après.
export function NouvelleDemande({ onCreee }: { onCreee?: (reference: string) => void }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [b2b, setB2b] = useState(false);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [agenceId, setAgenceId] = useState("");
  const [repId, setRepId] = useState("");
  const [service, setService] = useState("visa");
  const [pays, setPays] = useState("");
  const [typeVisa, setTypeVisa] = useState("");
  const [typeDemande, setTypeDemande] = useState("first");
  const [notes, setNotes] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [agences, setAgences] = useState<AgenceRef[]>([]);
  const [reps, setReps] = useState<RepresentantRef[]>([]);
  const pays_ = useMemo(() => listePays(), []);

  useEffect(() => {
    if (!ouvert || !b2b || agences.length) return;
    (async () => {
      const [a, r] = await Promise.all([
        supabase.from("agencies").select("id, name, approval_status").eq("approval_status", "approved").order("name"),
        supabase.from("agency_representatives").select("id, full_name, agency_id, is_active").eq("is_active", true).order("full_name"),
      ]);
      if (a.error || r.error) setErreur("Impossible de charger les agences : " + (a.error ?? r.error)!.message);
      setAgences((a.data as AgenceRef[]) ?? []);
      setReps((r.data as RepresentantRef[]) ?? []);
    })();
  }, [ouvert, b2b, agences.length]);

  function reinitialiser() {
    setNom(""); setTel(""); setAgenceId(""); setRepId(""); setService("visa");
    setPays(""); setTypeVisa(""); setTypeDemande("first"); setNotes(""); setErreur(null);
  }

  function fermer() {
    if (envoi) return;
    setOuvert(false);
    reinitialiser();
  }

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    let telephone = "";
    if (b2b) {
      if (!agenceId || !repId) return setErreur("Choisissez l'agence et son représentant.");
    } else {
      if (!nom.trim() || !tel.trim()) return setErreur("Le nom et le téléphone sont obligatoires.");
      telephone = normaliserTelephone(tel);
      if (!telephoneValide(telephone)) return setErreur("Numéro invalide. Exemple : 0550 12 34 56");
    }
    if (service === "visa" && (!pays || !typeVisa || !typeDemande)) return setErreur("Pour un visa, choisissez la destination, le type de visa et le type de demande.");

    setEnvoi(true);
    const res = await creerDemande({
      b2b, nom, telephone, agenceId, representantId: repId, service, notes,
      visa: service === "visa" ? { pays, type: typeVisa, typeDemande } : undefined,
    });
    setEnvoi(false);
    if (!res.ok) return setErreur("Enregistrement impossible : " + res.erreur);
    setOuvert(false);
    reinitialiser();
    if (onCreee) onCreee(res.reference);
    else router.push(`/maquette/demandes?nouvelle=${encodeURIComponent(res.reference)}`);
  }

  const repsAgence = reps.filter((r) => r.agency_id === agenceId);

  return (
    <>
      <Bouton onClick={() => setOuvert(true)}>+ Nouvelle demande</Bouton>
      {ouvert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titre-nouvelle-demande"
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/45 p-0 sm:items-center sm:p-4"
          onClick={(e) => e.target === e.currentTarget && fermer()}
        >
          <form onSubmit={enregistrer} className="max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-5 sm:max-w-lg sm:rounded-2xl">
            <h2 id="titre-nouvelle-demande" className="text-lg font-bold text-navy-900">Nouvelle demande</h2>
            <p className="mb-4 text-[13px] text-muted">L'essentiel seulement. Les détails viendront après l'appel.</p>

            <div className="mb-4 inline-flex rounded-lg border border-ligne p-1 text-sm">
              {([["Particulier", false], ["Agence", true]] as const).map(([label, val]) => (
                <button key={label} type="button" onClick={() => { setB2b(val); setErreur(null); }}
                  className={`cursor-pointer rounded-md px-3 py-1.5 font-semibold ${b2b === val ? "bg-navy-900 text-white" : "text-navy-700"}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {b2b ? (
                <>
                  <div>
                    <label className={etiquette} htmlFor="nd-agence">Agence</label>
                    <select id="nd-agence" className={champ} value={agenceId} onChange={(e) => { setAgenceId(e.target.value); setRepId(""); }}>
                      <option value="">Choisir…</option>
                      {agences.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={etiquette} htmlFor="nd-rep">Représentant</label>
                    <select id="nd-rep" className={champ} value={repId} onChange={(e) => setRepId(e.target.value)} disabled={!agenceId}>
                      <option value="">Choisir…</option>
                      {repsAgence.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div><label className={etiquette} htmlFor="nd-nom">Nom complet</label><input id="nd-nom" className={champ} value={nom} onChange={(e) => setNom(e.target.value)} autoFocus autoComplete="off" /></div>
                  <div><label className={etiquette} htmlFor="nd-tel">Téléphone</label><input id="nd-tel" type="tel" inputMode="tel" placeholder="0550 12 34 56" className={champ} value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="off" /></div>
                </>
              )}

              <div className="sm:col-span-2">
                <label className={etiquette} htmlFor="nd-service">Type de service</label>
                <select id="nd-service" className={champ} value={service} onChange={(e) => setService(e.target.value)}>
                  {Object.entries(TYPES_SERVICE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              {service === "visa" && (
                <>
                  <div className="sm:col-span-2">
                    <label className={etiquette} htmlFor="nd-pays">Destination</label>
                    <select id="nd-pays" className={champ} value={pays} onChange={(e) => setPays(e.target.value)}>
                      <option value="">Choisir…</option>
                      <optgroup label="Destinations fréquentes">
                        {pays_.filter((p) => p.prioritaire).map((p) => <option key={p.code} value={p.code}>{p.nom}</option>)}
                      </optgroup>
                      <optgroup label="Tous les pays">
                        {pays_.filter((p) => !p.prioritaire).map((p) => <option key={p.code} value={p.code}>{p.nom}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className={etiquette} htmlFor="nd-tv">Type de visa</label>
                    <select id="nd-tv" className={champ} value={typeVisa} onChange={(e) => setTypeVisa(e.target.value)}>
                      <option value="">Choisir…</option>
                      {Object.entries(TYPES_VISA_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={etiquette} htmlFor="nd-td">Demande</label>
                    <select id="nd-td" className={champ} value={typeDemande} onChange={(e) => setTypeDemande(e.target.value)}>
                      {Object.entries(TYPES_DEMANDE_VISA_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="sm:col-span-2"><label className={etiquette} htmlFor="nd-notes">Notes</label><textarea id="nd-notes" rows={3} className={champ} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>

            {erreur && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Bouton variante="secondaire" onClick={fermer}>Annuler</Bouton>
              <Bouton type="submit">{envoi ? "Enregistrement…" : "Enregistrer"}</Bouton>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
