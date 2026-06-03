export function fechaHoy(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatearFechaLiturgica(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(anio, mes - 1, dia));
}
