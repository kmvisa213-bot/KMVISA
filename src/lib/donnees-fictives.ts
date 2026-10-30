// Données FICTIVES pour la maquette. Aucune donnée réelle, aucune connexion à Supabase.
import type { StatutDemande, StatutPaiement } from "./statuts";

export type DemandeFictive = {
  reference: string;
  client: string;
  b2b: boolean;
  service: string;
  detail: string;
  statut: StatutDemande;
  paiement: StatutPaiement;
  date: string;
  resteDzd: number;
};

export const demandes: DemandeFictive[] = [
  { reference: "KM-2610-001", client: "Amina B.", b2b: false, service: "visa", detail: "Schengen · France", statut: "inquiry", paiement: "unpaid", date: "30/10", resteDzd: 0 },
  { reference: "KM-2610-002", client: "Agence Nour", b2b: true, service: "flight_ticket", detail: "Alger → Istanbul", statut: "quoted", paiement: "unpaid", date: "29/10", resteDzd: 42000 },
  { reference: "KM-2610-003", client: "Karim M.", b2b: false, service: "hotel_booking", detail: "Istanbul · 4 nuits", statut: "confirmed", paiement: "partial", date: "27/10", resteDzd: 68500 },
  { reference: "KM-2610-004", client: "Samira L.", b2b: false, service: "visa", detail: "Étudiant · Espagne", statut: "in_progress", paiement: "partial", date: "22/10", resteDzd: 74000 },
  { reference: "KM-2609-019", client: "Mourad T.", b2b: false, service: "other", detail: "Voyage 30 jours", statut: "completed", paiement: "paid", date: "15/10", resteDzd: 0 },
  { reference: "KM-2609-014", client: "Agence Atlas", b2b: true, service: "visa", detail: "Tourisme · Italie", statut: "cancelled", paiement: "paid", date: "09/10", resteDzd: 0 },
];

export type TacheFictive = {
  titre: string;
  lien: string;
  echeance: string;
  enRetard: boolean;
  faite: boolean;
  auto: boolean;
};

export const taches: TacheFictive[] = [
  { titre: "Rappeler Samira L. avant le rendez-vous consulat", lien: "KM-2610-004", echeance: "28/10", enRetard: true, faite: false, auto: true },
  { titre: "Relancer l'agence Nour sur le devis", lien: "KM-2610-002", echeance: "29/10", enRetard: true, faite: false, auto: false },
  { titre: "Demander le passeport à Amina B.", lien: "KM-2610-001", echeance: "30/10", enRetard: false, faite: false, auto: false },
  { titre: "Émettre la facture de Karim M.", lien: "KM-2610-003", echeance: "30/10", enRetard: false, faite: true, auto: false },
  { titre: "Payer la facture fournisseur hôtel", lien: "Fournisseur", echeance: "30/10", enRetard: false, faite: false, auto: false },
];

export type ClientFictif = {
  nom: string;
  type: "Particulier" | "Agence";
  telephone: string;
  derniereDemande: string;
  nbDemandes: number;
};

export const clients: ClientFictif[] = [
  { nom: "Amina B.", type: "Particulier", telephone: "+213 5•• ••• ••1", derniereDemande: "30/10/2026", nbDemandes: 1 },
  { nom: "Karim M.", type: "Particulier", telephone: "+213 6•• ••• ••7", derniereDemande: "27/10/2026", nbDemandes: 3 },
  { nom: "Samira L.", type: "Particulier", telephone: "+213 7•• ••• ••2", derniereDemande: "22/10/2026", nbDemandes: 2 },
  { nom: "Agence Nour", type: "Agence", telephone: "+213 5•• ••• ••4", derniereDemande: "29/10/2026", nbDemandes: 8 },
  { nom: "Agence Atlas", type: "Agence", telephone: "+213 6•• ••• ••9", derniereDemande: "09/10/2026", nbDemandes: 5 },
];

// Les six indicateurs du document "Financial Architecture" (section 4).
export const indicateursFinance = [
  { label: "Trésorerie", valeur: 1_245_000, aide: "Encaissé moins payé aux fournisseurs" },
  { label: "Chiffre d'affaires reconnu", valeur: 58_900, aide: "Marges des services terminés" },
  { label: "Créances clients", valeur: 184_500, aide: "Factures clients non réglées" },
  { label: "Dettes fournisseurs", valeur: 96_300, aide: "Factures fournisseurs à payer" },
  { label: "Avances clients", valeur: 310_000, aide: "Acomptes détenus (service à rendre)" },
  { label: "Bénéfice prévisionnel", valeur: 73_400, aide: "Reconnu + marges en cours − coûts engagés" },
];

export function dzd(montant: number): string {
  return new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 }).format(montant) + " DZD";
}
