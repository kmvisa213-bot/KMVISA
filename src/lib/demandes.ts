import { supabase } from "./supabase";
import type { StatutDemande, StatutPaiement } from "./statuts";

export type Demande = {
  id: string;
  reference: string;
  service_type: string;
  status: StatutDemande;
  payment_status: StatutPaiement;
  source: "manual" | "public_intake";
  client_id: string | null;
  agency_id: string | null;
  representative_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

export type ClientRef = { id: string; full_name: string; phone: string };
export type AgenceRef = { id: string; name: string; approval_status: string };
export type RepresentantRef = { id: string; full_name: string; agency_id: string; is_active: boolean; phone?: string | null };
export type VisaRef = { request_id: string; country: string | null; visa_category: string | null; application_type: string | null };

export type DonneesDemandes = {
  demandes: Demande[];
  clients: ClientRef[];
  agences: AgenceRef[];
  representants: RepresentantRef[];
  visas: Record<string, VisaRef>;
};

export async function chargerDemandes(): Promise<{ ok: true; donnees: DonneesDemandes } | { ok: false; erreur: string }> {
  const [d, c, a, r, v] = await Promise.all([
    supabase
      .from("service_requests")
      .select("id, reference, service_type, status, payment_status, source, client_id, agency_id, representative_id, contact_name, contact_phone, notes, archived_at, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, full_name, phone"),
    supabase.from("agencies").select("id, name, approval_status").order("name"),
    supabase.from("agency_representatives").select("id, full_name, agency_id, is_active").order("full_name"),
    supabase.from("visa_details").select("request_id, country, visa_category, application_type"),
  ]);
  const err = d.error ?? c.error ?? a.error ?? r.error ?? v.error;
  if (err) return { ok: false, erreur: err.message };

  const visas: Record<string, VisaRef> = {};
  for (const x of (v.data as VisaRef[]) ?? []) visas[x.request_id] = x;

  return {
    ok: true,
    donnees: {
      demandes: (d.data as Demande[]) ?? [],
      clients: (c.data as ClientRef[]) ?? [],
      agences: (a.data as AgenceRef[]) ?? [],
      representants: (r.data as RepresentantRef[]) ?? [],
      visas,
    },
  };
}

export type NouvelleDemandeSaisie = {
  b2b: boolean;
  nom: string;
  telephone: string; // déjà normalisé
  agenceId: string;
  representantId: string;
  service: string;
  notes: string;
  visa?: { pays: string; type: string; typeDemande: string };
};

// Même logique que l'ancien formulaire (/dashboard/requests/new) :
// B2C : on relie au client existant seulement si nom ET téléphone correspondent, sinon prise de contact.
export async function creerDemande(s: NouvelleDemandeSaisie): Promise<{ ok: true; reference: string } | { ok: false; erreur: string }> {
  let clientId: string | null = null;
  let contactNom: string | null = null;
  let contactTel: string | null = null;

  if (!s.b2b) {
    const { data } = await supabase.from("clients").select("id, full_name").eq("phone", s.telephone);
    const existant = ((data as { id: string; full_name: string }[]) ?? []).find(
      (x) => x.full_name.trim().toLowerCase() === s.nom.trim().toLowerCase()
    );
    clientId = existant?.id ?? null;
    contactNom = s.nom.trim();
    contactTel = s.telephone;
  }

  const { data: cree, error } = await supabase
    .from("service_requests")
    .insert({
      service_type: s.service,
      client_id: clientId,
      agency_id: s.b2b ? s.agenceId : null,
      representative_id: s.b2b ? s.representantId : null,
      source: "manual",
      notes: s.notes.trim() || null,
      contact_name: contactNom,
      contact_phone: contactTel,
    })
    .select("id, reference")
    .single();

  if (error || !cree) return { ok: false, erreur: error?.message ?? "erreur inconnue" };

  if (s.service === "visa" && s.visa) {
    const { error: e2 } = await supabase.from("visa_details").insert({
      request_id: cree.id,
      country: s.visa.pays,
      visa_category: s.visa.type,
      application_type: s.visa.typeDemande,
    });
    if (e2) return { ok: false, erreur: `Demande ${cree.reference} créée, mais les détails du visa n'ont pas été enregistrés : ${e2.message}` };
  }

  return { ok: true, reference: cree.reference as string };
}
