// Même règle que l'ancien formulaire : format international, +213 par défaut.
export function normaliserTelephone(brut: string): string {
  const chiffres = brut.replace(/[\s\-().]/g, "");
  if (chiffres.startsWith("+")) return chiffres;
  if (chiffres.startsWith("00")) return "+" + chiffres.slice(2);
  if (chiffres.startsWith("0")) return "+213" + chiffres.slice(1);
  return "+" + chiffres;
}

export function telephoneValide(normalise: string): boolean {
  return /^\+[0-9]{8,15}$/.test(normalise);
}
