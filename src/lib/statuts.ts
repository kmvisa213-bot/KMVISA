// Libellés français des statuts (décisions D2, D7, D30 du projet).

export type StatutDemande =
  | "inquiry"
  | "request"
  | "quoted"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "closed_no_request";

export type StatutPaiement = "unpaid" | "partial" | "paid";

export const STATUTS_DEMANDE: Record<StatutDemande, { label: string; classes: string }> = {
  inquiry: { label: "Prise de contact", classes: "bg-stone-200 text-stone-700" },
  request: { label: "Demande ouverte", classes: "bg-blue-50 text-blue-800" },
  quoted: { label: "Devis envoyé", classes: "bg-amber-50 text-amber-800" },
  confirmed: { label: "Confirmé", classes: "bg-emerald-50 text-emerald-800" },
  in_progress: { label: "En cours", classes: "bg-orange-50 text-orange-800" },
  completed: { label: "Terminé", classes: "bg-emerald-100 text-emerald-900" },
  cancelled: { label: "Annulé", classes: "bg-red-50 text-red-800" },
  closed_no_request: { label: "Clôturé sans suite", classes: "bg-stone-100 text-stone-500" },
};

export const STATUTS_PAIEMENT: Record<StatutPaiement, { label: string; classes: string }> = {
  unpaid: { label: "Non payé", classes: "bg-red-50 text-red-800" },
  partial: { label: "Partiel", classes: "bg-amber-50 text-amber-800" },
  paid: { label: "Payé", classes: "bg-emerald-50 text-emerald-800" },
};

export const TYPES_SERVICE: Record<string, string> = {
  visa: "Visa",
  flight: "Billet d'avion",
  hotel: "Hôtel",
  quote: "Devis",
  insurance: "Assurance voyage",
  other: "Autre service",
};
