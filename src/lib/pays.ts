import { COUNTRIES } from "./countries";
import { PRIORITY_DESTINATION_CODES } from "./visa-catalog";

const noms = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["fr"], { type: "region" }) : null;

export function nomPays(code: string | null | undefined): string {
  if (!code) return "—";
  try {
    return noms?.of(code) ?? code;
  } catch {
    return code;
  }
}

// Destinations prioritaires d'abord, puis toutes les autres par ordre alphabétique français.
export function listePays(): { code: string; nom: string; prioritaire: boolean }[] {
  const prio = new Set(PRIORITY_DESTINATION_CODES);
  const tous = COUNTRIES.map((c) => ({ code: c.code, nom: nomPays(c.code), prioritaire: prio.has(c.code) }));
  return [
    ...PRIORITY_DESTINATION_CODES.map((code) => tous.find((p) => p.code === code)).filter((p): p is NonNullable<typeof p> => !!p),
    ...tous.filter((p) => !p.prioritaire).sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
  ];
}
