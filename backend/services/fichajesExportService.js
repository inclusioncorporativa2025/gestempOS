const axios = require('axios');
const ExcelJS = require('exceljs');
const fs = require('fs');
const NodeCache = require('node-cache');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { Op } = require('sequelize');

const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const fichajes = require('../models/Fichajes');
const mesesCierre = require('../models/MesesCierre');
const Ausencias = require('../models/Ausencias');
const Descansos = require('../models/Descansos');
const { MESES_CIERRE_ATTRS } = require('../utils/mesesCierreCompat');
const { BRAND_NAME, BRAND_BYLINE, LOGO_PATH } = require('../config/brand');
const { LANDING_URL } = require('../config/appUrls');
const { empresaTieneFeature } = require('./planService');
const { ausenciasSoportaAprobacion, whereSoloAprobadas } = require('../utils/ausenciasCompat');

dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);

const ZONA_HORARIA = 'Europe/Madrid';
const locationCache = new NodeCache({ stdTTL: 86400 });
const BRAND_BLUE = 'FF2BA9E0';
const BRAND_HEADER = 'FF1F4E78';
const EXPORT_COLS = 8;

const estiloCeldaMarca = (cell, { bold = false, color = BRAND_HEADER, size = 11 } = {}) => {
  cell.font = { bold, size, color: { argb: color } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
};

const fusionarFilaExport = (worksheet, rowNumber) => {
  worksheet.mergeCells(rowNumber, 1, rowNumber, EXPORT_COLS);
};

const anadirCabeceraMarca = (workbook, worksheet, { nombreEmpresa, start, end }) => {
  workbook.creator = BRAND_NAME;
  workbook.lastModifiedBy = BRAND_NAME;
  workbook.company = BRAND_BYLINE;
  workbook.created = new Date();

  if (fs.existsSync(LOGO_PATH)) {
    worksheet.addRow([]);
    worksheet.addRow([]);
    const imageId = workbook.addImage({ filename: LOGO_PATH, extension: 'png' });
    worksheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 170, height: 38 },
    });
  }

  const titulo = worksheet.addRow([`${BRAND_NAME} — Registro horario`]);
  fusionarFilaExport(worksheet, titulo.number);
  titulo.height = 22;
  titulo.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: BRAND_HEADER },
  };
  estiloCeldaMarca(titulo.getCell(1), { bold: true, color: 'FFFFFFFF', size: 14 });

  const byline = worksheet.addRow([BRAND_BYLINE]);
  fusionarFilaExport(worksheet, byline.number);
  estiloCeldaMarca(byline.getCell(1), { color: 'FF666666', size: 10 });

  const landingHost = LANDING_URL.replace(/^https?:\/\//, '');
  const enlace = worksheet.addRow([{
    text: `Control horario digital · ${landingHost}`,
    hyperlink: LANDING_URL,
  }]);
  fusionarFilaExport(worksheet, enlace.number);
  estiloCeldaMarca(enlace.getCell(1), { bold: true, color: BRAND_BLUE, size: 10 });
  enlace.getCell(1).font = { ...enlace.getCell(1).font, underline: true };

  const contexto = worksheet.addRow([
    `Empresa: ${nombreEmpresa} · Periodo: ${start.format('DD/MM/YYYY')} — ${end.format('DD/MM/YYYY')}`,
  ]);
  fusionarFilaExport(worksheet, contexto.number);
  estiloCeldaMarca(contexto.getCell(1), { color: 'FF444444', size: 10 });

  const generado = worksheet.addRow([
    `Generado el ${dayjs().tz(ZONA_HORARIA).format('DD/MM/YYYY HH:mm')} con ${BRAND_NAME}`,
  ]);
  fusionarFilaExport(worksheet, generado.number);
  estiloCeldaMarca(generado.getCell(1), { color: 'FF888888', size: 9 });

  worksheet.addRow([]);
};

const anadirPieMarca = (worksheet) => {
  worksheet.addRow([]);
  const landingHost = LANDING_URL.replace(/^https?:\/\//, '');
  const pie = worksheet.addRow([{
    text: `Documento generado con ${BRAND_NAME}. ¿Tu empresa aún no lo usa? ${landingHost}`,
    hyperlink: LANDING_URL,
  }]);
  fusionarFilaExport(worksheet, pie.number);
  pie.height = 28;
  pie.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF4F8FB' },
  };
  pie.getCell(1).font = {
    italic: true,
    size: 10,
    color: { argb: 'FF555555' },
    underline: true,
  };
  pie.getCell(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
};

class FichajesExportError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

const parseCoordenadas = (coordenadas) => {
  const match = coordenadas.match(/^([0-9\.-]+)--([0-9\.-]+)$/);
  if (!match) return [null, null];
  const lat = parseFloat(match[1]);
  const lon = -Math.abs(parseFloat(match[2]));
  return [lat, lon];
};

const getDireccionDesdeCoordenadas = async (coordenadas) => {
  if (!coordenadas) return '-';
  const cached = locationCache.get(coordenadas);
  if (cached) return cached;

  const [lat, lon] = parseCoordenadas(coordenadas);
  if (!lat || !lon) return '-';

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { format: 'json', lat, lon },
      headers: { 'User-Agent': 'GeoApp/1.0 (tucorreo@ejemplo.com)' },
    });

    const direccion = response.data.display_name || `${lat}, ${lon}`;
    locationCache.set(coordenadas, direccion);
    return direccion;
  } catch (err) {
    console.error(`Error al obtener dirección para ${coordenadas}:`, err.message);
    return `${lat}, ${lon}`;
  }
};

const generarExcelRegistrosHorarios = async ({ id_usuario, startDate, endDate, idEmpresa }) => {
  if (!id_usuario || !startDate || !endDate || !idEmpresa) {
    throw new FichajesExportError('Faltan parámetros necesarios', 400);
  }

  const start = dayjs(startDate).startOf('day');
  const end = dayjs(endDate).endOf('day');

  const [usuario, empresa] = await Promise.all([
    Usuario.findOne({ where: { id_usuario } }),
    Empresa.findByPk(idEmpresa),
  ]);

  if (!usuario) {
    throw new FichajesExportError('Usuario no encontrado', 404);
  }

  const incluirAusencias = await empresaTieneFeature(idEmpresa, 'ausencias_basicas');
  const soportaAprobacionAusencias = incluirAusencias
    ? await ausenciasSoportaAprobacion()
    : false;

  const [fichajesData, ausenciasData, descansosData] = await Promise.all([
    fichajes.findAll({
      where: {
        empresa_id: idEmpresa,
        id_usuario,
        fecha_baja: null,
        fecha_entrada: {
          [Op.gte]: start.toDate(),
          [Op.lte]: end.toDate(),
        },
      },
    }),
    incluirAusencias
      ? Ausencias.findAll({
          where: {
            empresa_id: idEmpresa,
            id_usuario,
            fecha_baja: null,
            ...whereSoloAprobadas(soportaAprobacionAusencias),
            fecha_desde: { [Op.lte]: end.toDate() },
            fecha_hasta: { [Op.gte]: start.toDate() },
          },
        })
      : Promise.resolve([]),
    Descansos.findAll({
      where: {
        empresa_id: idEmpresa,
        id_usuario,
        fecha_baja: null,
        fecha_entrada: {
          [Op.gte]: start.toDate(),
          [Op.lte]: end.toDate(),
        },
      },
    }),
  ]);

  const expandirRangoDias = (fechaDesde, fechaHasta) => {
    const dias = [];
    let actual = dayjs(fechaDesde).startOf('day');
    const fin = dayjs(fechaHasta).startOf('day');

    while (actual.isSame(fin) || actual.isBefore(fin)) {
      dias.push(actual.format('YYYY-MM-DD'));
      actual = actual.add(1, 'day');
    }

    return dias;
  };

  const combinarFechaHora = (fecha, hora) => {
    if (!fecha) return null;
    const fechaBase = dayjs(fecha).format('YYYY-MM-DD');
    if (!hora) return `${fechaBase}T00:00:00`;
    return `${fechaBase}T${hora}`;
  };

  const estaDentroDeRango = (fecha) => {
    const f = dayjs(fecha).startOf('day');
    return f.isSame(start, 'day') || f.isSame(end, 'day') || (f.isAfter(start, 'day') && f.isBefore(end, 'day'));
  };

  const registrosData = [
    ...fichajesData.map((f) => ({ ...f.toJSON(), tipo: 'fichaje' })),
    ...ausenciasData.flatMap((a) => {
      const raw = a.toJSON();
      const dias = expandirRangoDias(raw.fecha_desde, raw.fecha_hasta);

      return dias
        .filter((dia) => estaDentroDeRango(dia))
        .map((dia) => ({
          ...raw,
          tipo: 'ausencia',
          fecha_original: dia,
          fecha_entrada: combinarFechaHora(dia, raw.hora_ausencia_desde),
          fecha_salida: raw.hora_ausencia_hasta
            ? combinarFechaHora(dia, raw.hora_ausencia_hasta)
            : null,
          sin_hora: !raw.hora_ausencia_desde && !raw.hora_ausencia_hasta,
        }));
    }),
    ...descansosData.map((d) => ({ ...d.toJSON(), tipo: 'descanso' })),
  ].sort((a, b) => new Date(a.fecha_entrada) - new Date(b.fecha_entrada));

  if (registrosData.length === 0) {
    throw new FichajesExportError('No se encontraron registros para este usuario en el rango de fechas', 404);
  }

  const fichajesPorMes = {};
  for (const registro of registrosData) {
    const mes = dayjs(registro.fecha_entrada).format('YYYY-MM');
    if (!fichajesPorMes[mes]) fichajesPorMes[mes] = [];
    fichajesPorMes[mes].push(registro);
  }

  const meses = Object.keys(fichajesPorMes);

  const cierres = await mesesCierre.findAll({
    attributes: MESES_CIERRE_ATTRS,
    where: {
      empresa_id: idEmpresa,
      usuario_alta: id_usuario,
      mes: { [Op.in]: meses },
      usuario_aceptacion: { [Op.not]: null },
    },
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Fichajes Usuario');

  anadirCabeceraMarca(workbook, worksheet, {
    nombreEmpresa: empresa?.nombre || 'Sin empresa',
    start,
    end,
  });

  const datosUser = worksheet.addRow(['Nombre', 'DNI']);
  const contenidoUser = worksheet.addRow([usuario.nombre || 'Sin nombre', usuario.dni || 'Sin DNI']);
  worksheet.addRow([]);

  datosUser.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
    cell.font = { color: { argb: 'FFFFFF' }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  contenidoUser.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F0FA' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (const mes of Object.keys(fichajesPorMes)) {
    const tieneCierre = cierres.some((c) => c.mes === mes);

    worksheet.addRow([]);
    const cabeceraMes = worksheet.addRow([
      `Fichajes del mes: ${mes}`,
      `Firmado: ${tieneCierre ? '✔' : '✘'}`,
    ]);

    cabeceraMes.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };

      if (colNumber === 2) {
        cell.font = { color: { argb: tieneCierre ? '00FF00' : 'FF0000' }, bold: true };
      } else {
        cell.font = { color: { argb: 'FFFFFF' }, bold: true };
      }

      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const headerRow = worksheet.addRow([
      'Fecha Entrada',
      'Hora Entrada',
      'Hora Salida',
      'Ubicación Entrada',
      'Ubicación Salida',
      'Tipo',
      'Descanso',
      'Diferencia Tiempo',
    ]);

    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
      cell.font = { color: { argb: 'FFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    let totalMinutes = 0;

    for (const fichaje of fichajesPorMes[mes]) {
      const entrada = fichaje.fecha_entrada ? dayjs(fichaje.fecha_entrada).tz(ZONA_HORARIA) : null;
      const salida = fichaje.fecha_salida ? dayjs(fichaje.fecha_salida).tz(ZONA_HORARIA) : null;

      let diferencia = '-';

      if (
        fichaje.tipo === 'fichaje'
        && entrada
        && entrada.isValid()
        && salida
        && salida.isValid()
      ) {
        const diffMs = salida.diff(entrada);
        const diff = dayjs.duration(diffMs);
        diferencia = `${String(diff.hours()).padStart(2, '0')}:${String(diff.minutes()).padStart(2, '0')}`;
        totalMinutes += Math.floor(salida.diff(entrada, 'minute'));
      }

      const ubicacionEntrada = await getDireccionDesdeCoordenadas(fichaje.ubicacion_entrada);
      const ubicacionSalida = await getDireccionDesdeCoordenadas(fichaje.ubicacion_salida);

      const tipoLabel = {
        fichaje: 'Fichaje',
        ausencia: 'Ausencia',
        descanso: 'Descanso',
      }[fichaje.tipo] || '-';

      const row = worksheet.addRow([
        entrada && entrada.isValid() ? entrada.format('DD/MM/YYYY') : '-',
        fichaje.sin_hora ? '-' : (entrada && entrada.isValid() ? entrada.format('HH:mm') : '-'),
        fichaje.sin_hora ? '-' : (salida && salida.isValid() ? salida.format('HH:mm') : '-'),
        ubicacionEntrada,
        ubicacionSalida,
        tipoLabel,
        fichaje.descanso || '-',
        diferencia,
      ]);

      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E6F0FA' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    }

    const totalHoras = Math.floor(totalMinutes / 60);
    const totalRestoMin = totalMinutes % 60;
    const totalStr = `${String(totalHoras).padStart(2, '0')}:${String(totalRestoMin).padStart(2, '0')}`;

    worksheet.addRow([]);
    const totalRow = worksheet.addRow(['Total horas trabajadas', totalStr]);
    totalRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
      cell.font = { color: { argb: 'FFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    worksheet.addRow([]);
  }

  anadirPieMarca(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `fichajes_usuario_${id_usuario}_${start.format('YYYYMMDD')}_${end.format('YYYYMMDD')}.xlsx`;

  return {
    buffer,
    filename,
    meta: {
      nombreUsuario: usuario.nombre || 'Sin nombre',
      dni: usuario.dni || 'Sin DNI',
      nombreEmpresa: empresa?.nombre || 'Sin empresa',
      idEmpresa,
      startLabel: start.format('DD/MM/YYYY'),
      endLabel: end.format('DD/MM/YYYY'),
    },
  };
};

module.exports = {
  FichajesExportError,
  generarExcelRegistrosHorarios,
};
