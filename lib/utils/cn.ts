/**
 * Combina clases de Tailwind/NativeWind, filtrando falsy values.
 * Para fusión avanzada con resolución de conflictos, considerar tailwind-merge.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
