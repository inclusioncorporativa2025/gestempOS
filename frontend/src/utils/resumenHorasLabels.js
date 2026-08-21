export const NOTA_COMPARATIVA_HORAS =
  'Comparativa orientativa según jornada pactada. El registro válido para inspección son los fichajes diarios.';

export const etiquetaJornadaPactada = (resumenHoras) =>
  resumenHoras?.etiqueta_jornada_pactada
  || (resumenHoras?.jornada_tipo === 'flexible'
    ? 'Jornada pactada del mes'
    : 'Horas ordinarias del mes');

export const valorJornadaPactada = (resumenHoras, fallback = '—') =>
  resumenHoras?.horas_pactadas_ajustadas
  || resumenHoras?.horasMensuales
  || resumenHoras?.horas_ordinarias
  || fallback;

export const detalleJornadaPactada = (resumenHoras) => {
  if (!resumenHoras?.configurada && resumenHoras?.horasMensuales === 'No configurada') {
    return null;
  }

  const partes = [];

  if (
    resumenHoras?.jornada_tipo === 'flexible'
    && resumenHoras?.horas_pactadas_base
    && resumenHoras?.horas_ausencias_descontadas
  ) {
    partes.push(
      `Pactadas: ${resumenHoras.horas_pactadas_base}. `
      + `Descontadas por ausencias aprobadas: ${resumenHoras.horas_ausencias_descontadas}.`,
    );
  } else if (
    resumenHoras?.horas_ausencias_descontadas
    && resumenHoras?.jornada_tipo === 'fija'
  ) {
    partes.push(
      `Incluye descuento por ausencias aprobadas: ${resumenHoras.horas_ausencias_descontadas}.`,
    );
  } else if (resumenHoras?.jornada_tipo === 'flexible' && resumenHoras?.horas_pactadas_base) {
    partes.push(`Referencia mensual pactada: ${resumenHoras.horas_pactadas_base}.`);
  }

  return partes.length ? partes.join(' ') : null;
};

export const lineasResumenHoras = (resumenHoras) => {
  const lineas = [];
  if (resumenHoras?.tipo_hora_label) {
    lineas.push(`Tipo de hora: ${resumenHoras.tipo_hora_label}`);
  }
  if (resumenHoras?.desglose) {
    lineas.push(resumenHoras.desglose);
  }
  if (resumenHoras?.saldo_bolsa) {
    lineas.push(`Saldo bolsa: ${resumenHoras.saldo_bolsa}`);
  }
  return lineas;
};
