export const KITS = [
  { id: "grain", label: "Grain" },
  { id: "noyer", label: "Noyer" },
  { id: "lait", label: "Lait" },
  { id: "safran", label: "Safran" },
  { id: "encre", label: "Encre" },
  { id: "ciel", label: "Ciel" },
] as const;

export type KitId = (typeof KITS)[number]["id"];

export function kitSrc(id: string) {
  return `/kits/${id}.svg`;
}
