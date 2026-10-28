const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { sequelize } = require('../config/db');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const ZONA = 'Europe/Madrid';
const FORMAT = 'YYYY-MM-DD HH:mm:ss';

const NAIVE_MYSQL_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/;
const FORMAT_COMPLETO_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

const esNaiveMysql = (value) =>
  typeof value === 'string' && NAIVE_MYSQL_RE.test(value.trim());

/** Hora de pared actual en España, lista para columnas DATETIME de fichajes */
const ahoraMadridSql = () => dayjs().tz(ZONA).format(FORMAT);

/**
 * Convierte Date, ISO o string naive a hora de pared Madrid (YYYY-MM-DD HH:mm:ss).
 */
const instanteAMadridSql = (value) => {
  if (value == null || value === '') return ahoraMadridSql();
  if (esNaiveMysql(value)) {
    let texto = value.trim().slice(0, 19);
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(texto)) texto = `${texto}:00`;
    return texto;
  }

  const d = dayjs(value);
  if (!d.isValid()) return ahoraMadridSql();
  return d.tz(ZONA).format(FORMAT);
};

const combinarFechaHoraMadridSql = (fechaBase, horaHHmm) => {
  const fechaStr = String(fechaBase).slice(0, 10);
  const [horas, minutos] = String(horaHHmm).split(':').map(Number);
  const hh = String(horas).padStart(2, '0');
  const mm = String(minutos).padStart(2, '0');
  return dayjs
    .tz(`${fechaStr} ${hh}:${mm}:00`, FORMAT, ZONA)
    .format(FORMAT);
};

const parseMadridSql = (value) => {
  if (value == null || value === '') return null;
  if (esNaiveMysql(value)) {
    const d = dayjs.tz(value.trim().slice(0, 19), FORMAT, ZONA);
    return d.isValid() ? d : null;
  }
  const d = dayjs(value);
  return d.isValid() ? d.tz(ZONA) : null;
};

const rangoDiaMadridSql = (fecha) => {
  const d = fecha ? dayjs.tz(fecha, ZONA) : dayjs().tz(ZONA);
  return {
    inicio: d.startOf('day').format(FORMAT),
    fin: d.endOf('day').format(FORMAT),
  };
};

/**
 * Literal SQL para escribir la hora de pared sin que Sequelize aplique timezone.
 * Con timezone +00:00, un string o Date pasa por moment y en un servidor
 * Europe/Madrid resta el offset (1 h en invierno, 2 h en verano).
 */
const comoDatetimeSql = (valor) => {
  if (valor == null || valor === '') return null;
  const texto = instanteAMadridSql(valor);
  if (!FORMAT_COMPLETO_RE.test(texto)) {
    throw new Error(`Fecha de fichaje no válida: ${valor}`);
  }
  return sequelize.literal(`CAST(${sequelize.escape(texto)} AS DATETIME)`);
};

/**
 * Valor leído de un DATETIME con Sequelize timezone +00:00.
 * El Date resultante tiene en UTC los mismos dígitos que MySQL; se devuelve esa pared.
 */
const serializarPared = (value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const texto = value.trim().replace('T', ' ');
    if (NAIVE_MYSQL_RE.test(texto)) return texto.slice(0, 19);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dayjs.utc(value).format(FORMAT);
  }
  return null;
};

const rangoMesMadridSql = (mesYYYYMM) => {
  const d = dayjs.tz(`${mesYYYYMM}-01`, 'YYYY-MM-DD', ZONA);
  return {
    inicio: d.startOf('month').format(FORMAT),
    fin: d.endOf('month').format(FORMAT),
  };
};

module.exports = {
  ZONA,
  FORMAT,
  ahoraMadridSql,
  instanteAMadridSql,
  comoDatetimeSql,
  serializarPared,
  combinarFechaHoraMadridSql,
  parseMadridSql,
  rangoDiaMadridSql,
  rangoMesMadridSql,
};
