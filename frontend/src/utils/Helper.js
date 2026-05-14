export function getFechaEuropeMadrid() {
    const now = new Date();
    const fechaStr = now.toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' });
    return new Date(fechaStr); // Esto crea un Date con la hora local
  }