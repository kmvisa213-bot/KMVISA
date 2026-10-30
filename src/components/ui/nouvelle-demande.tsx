"use client";

import { useState } from "react";
import { Bouton } from "./en-tete";
import { TYPES_SERVICE } from "@/lib/statuts";

const champ = "min-h-11 w-full rounded-lg border border-ligne bg-white px-3 py-2 text-sm outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-200";
const etiquette = "mb-1 block text-[13px] font-semibold text-navy-700";

// Saisie rapide pendant un appel : 4 champs (décision D12). Non connecté pour l'instant.
export function NouvelleDemande() {
  const [ouvert, setOuvert] = useState(false);
  const [b2b, setB2b] = useState(false);

  return (
    <>
      <Bouton onClick={() => setOuvert(true)}>+ Nouvelle demande</Bouton>
      {ouvert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titre-nouvelle-demande"
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/45 p-0 sm:items-center sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setOuvert(false)}
        >
          <form
            className="max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-5 sm:max-w-lg sm:rounded-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              setOuvert(false);
            }}
          >
            <h2 id="titre-nouvelle-demande" className="text-lg font-bold text-navy-900">Nouvelle demande</h2>
            <p className="mb-4 text-[13px] text-muted">L'essentiel seulement. Les détails viendront après l'appel.</p>

            <div className="mb-4 inline-flex rounded-lg border border-ligne p-1 text-sm">
              {[["Particulier", false], ["Agence", true]].map(([label, val]) => (
                <button
                  key={String(label)}
                  type="button"
                  onClick={() => setB2b(val as boolean)}
                  className={`rounded-md px-3 py-1.5 font-semibold ${b2b === val ? "bg-navy-900 text-white" : "text-navy-700"}`}
                >
                  {label as string}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {b2b && (
                <>
                  <div><label className={etiquette} htmlFor="nd-agence">Agence</label><input id="nd-agence" className={champ} /></div>
                  <div><label className={etiquette} htmlFor="nd-rep">Représentant</label><input id="nd-rep" className={champ} /></div>
                </>
              )}
              <div><label className={etiquette} htmlFor="nd-nom">Nom complet</label><input id="nd-nom" className={champ} autoFocus /></div>
              <div><label className={etiquette} htmlFor="nd-tel">Téléphone</label><input id="nd-tel" type="tel" inputMode="tel" placeholder="+213" className={champ} /></div>
              <div className="sm:col-span-2">
                <label className={etiquette} htmlFor="nd-service">Type de service</label>
                <select id="nd-service" className={champ}>
                  {Object.entries(TYPES_SERVICE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><label className={etiquette} htmlFor="nd-notes">Notes</label><textarea id="nd-notes" rows={3} className={champ} /></div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Bouton variante="secondaire" onClick={() => setOuvert(false)}>Annuler</Bouton>
              <Bouton type="submit">Enregistrer</Bouton>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
