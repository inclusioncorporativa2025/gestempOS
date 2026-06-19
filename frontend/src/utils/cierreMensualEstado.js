import dayjs from 'dayjs';

export const combinarCierres = (pendientes, historial) => {
  const ids = new Set();
  const merged = [];
  [...(pendientes || []), ...(historial || [])].forEach((item) => {
    const key = `${item.empresa_id}-${item.id_mes_cierre}`;
    if (!ids.has(key)) {
      ids.add(key);
      merged.push(item);
    }
  });
  return merged.sort(
    (a, b) => dayjs(b.fecha_alta).valueOf() - dayjs(a.fecha_alta).valueOf(),
  );
};

export const obtenerEstadoCierre = (record) => {
  if (record.fecha_aceptacion) return 'Aprobado';
  if (record.fecha_cancelacion) return 'Rechazado';
  return 'Pendiente';
};

export const colorEstadoCierre = (estado) => {
  if (estado === 'Aprobado') return 'green';
  if (estado === 'Rechazado') return 'red';
  return 'orange';
};

export const obtenerFechaResolucionCierre = (record) =>
  record.fecha_aceptacion || record.fecha_cancelacion || null;
