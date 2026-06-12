const crypto = require('crypto');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Europe/Madrid';

const TIPO_REGISTRO_A_EVENTO = {
  1: 'entrada',
  2: 'salida',
  3: 'pausa',
  4: 'pausa_fin',
};

const normalizarFechaCampo = (fecha) => {
  if (!fecha) return '';
  if (typeof fecha === 'string') {
    return fecha.slice(0, 10);
  }
  return dayjs(fecha).tz(TZ).format('YYYY-MM-DD');
};

const normalizarHoraCampo = (hora) => {
  if (!hora) return '00:00:00';
  if (typeof hora === 'string') {
    const match = hora.match(/^(\d{1,2}):(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}:${match[3]}`;
    }
  }
  return dayjs(hora).tz(TZ).format('HH:mm:ss');
};

const normalizarFechaHora = (fechaInput) => {
  const d = dayjs(fechaInput).tz(TZ);
  return {
    fecha: d.format('YYYY-MM-DD'),
    hora: d.format('HH:mm:ss'),
  };
};

const generarHash = (
  idUsuario,
  fecha,
  hora,
  tipo,
  idEmpresa,
  ubicacion = '',
  observaciones = ''
) => {
  const datos = `${idUsuario}|${fecha}|${hora}|${tipo}|${idEmpresa}|${ubicacion || ''}|${observaciones || ''}`;
  return crypto.createHash('sha256').update(datos).digest('hex');
};

const verificarIntegridadRegistro = (registro) => {
  const fecha = normalizarFechaCampo(registro.fecha);
  const hora = normalizarHoraCampo(registro.hora);

  const hashCalculado = generarHash(
    registro.id_usuario,
    fecha,
    hora,
    registro.tipo,
    registro.empresa_id,
    registro.ubicacion,
    registro.observaciones
  );

  if (hashCalculado !== registro.hash) {
    return { valido: false, motivo: 'Hash no coincide - registro posiblemente alterado' };
  }

  return { valido: true };
};

const generarHashRaizMensual = (hashes) => {
  const ordenados = [...hashes].sort();
  return crypto.createHash('sha256').update(ordenados.join('')).digest('hex');
};

module.exports = {
  TZ,
  TIPO_REGISTRO_A_EVENTO,
  normalizarFechaCampo,
  normalizarHoraCampo,
  normalizarFechaHora,
  generarHash,
  verificarIntegridadRegistro,
  generarHashRaizMensual,
};
