import dayjs from 'dayjs';

const minutosEntreHoras = (horaEntrada, horaSalida) => {
  const normalizar = (valor) => {
    if (valor == null || valor === '') return null;
    const str = String(valor).trim();
    const iso = str.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (iso) return `${iso[1].padStart(2, '0')}:${iso[2]}:${(iso[3] || '00').padStart(2, '0')}`;
    const hm = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (hm) return `${hm[1].padStart(2, '0')}:${hm[2]}:${(hm[3] || '00').padStart(2, '0')}`;
    return null;
  };

  const entrada = normalizar(horaEntrada);
  const salida = normalizar(horaSalida);
  if (!entrada || !salida) return 0;

  const inicio = dayjs(`2020-01-01T${entrada}`);
  const fin = dayjs(`2020-01-01T${salida}`);
  if (!inicio.isValid() || !fin.isValid() || !fin.isAfter(inicio)) return 0;

  return fin.diff(inicio, 'minute');
};

export const minutosTramosDia = (dia) => {
  const tramos = Array.isArray(dia?.horario) ? dia.horario : [];
  return tramos.reduce((total, tramo) => {
    const entrada = tramo?.horaEntrada ?? tramo?.hora_entrada;
    const salida = tramo?.horaSalida ?? tramo?.hora_salida;
    return total + minutosEntreHoras(entrada, salida);
  }, 0);
};

export const minutosSemanalesJornadaFija = (dias) => {
  if (!Array.isArray(dias)) return 0;
  return dias.reduce((total, dia) => total + minutosTramosDia(dia), 0);
};

export const formatearMinutosHoras = (minutos) => {
  const total = Math.max(0, Math.round(Number(minutos) || 0));
  const horas = Math.floor(total / 60);
  const mins = total % 60;
  return `${horas}h ${mins}m`;
};
