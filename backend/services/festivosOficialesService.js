const { Op } = require('sequelize');
const dayjs = require('dayjs');
const Empresa = require('../models/Empresa');
const FestivoEmpresa = require('../models/FestivoEmpresa');
const { createConId } = require('../utils/empresaScope');
const { resolveRegionCode } = require('../config/spanishRegions');
const { getPublicHolidays } = require('./publicHolidaysService');

const FESTIVO_FIELDS = [
  'fecha',
  'descripcion',
  'origen',
  'external_key',
  'usuario_alta',
  'fecha_alta',
  'usuario_modificacion',
  'fecha_modificacion',
];

const buildExternalKey = (year, date) => `${year}:${date}`;

const resolverRegionEmpresa = async (idEmpresa) => {
  const empresa = await Empresa.findByPk(idEmpresa);
  if (!empresa) {
    throw new Error('Empresa no encontrada');
  }

  const regionCode = resolveRegionCode({
    codigoRegionFestivos: empresa.codigo_region_festivos,
    codigoPostal: empresa.codigo_postal,
    provincia: empresa.provincia,
  });

  if (!regionCode) {
    throw new Error(
      'Configure la comunidad autónoma o el código postal en los datos de la empresa antes de importar festivos.',
    );
  }

  return { empresa, regionCode };
};

/**
 * Importa/actualiza festivos oficiales del año en festivos_empresa.
 * No sobrescribe festivos locales en la misma fecha.
 */
const sincronizarFestivosOficiales = async (idEmpresa, idUsuario, year = dayjs().year()) => {
  const yearNum = Number(year);
  if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
    throw new Error('Año no válido');
  }

  const { regionCode } = await resolverRegionEmpresa(idEmpresa);
  const holidays = await getPublicHolidays(yearNum, 'ES', regionCode);

  let creados = 0;
  let actualizados = 0;
  let omitidos = 0;

  const apiDates = new Set();

  for (const holiday of holidays) {
    const fecha = holiday.date;
    apiDates.add(fecha);
    const externalKey = buildExternalKey(yearNum, fecha);
    const descripcion = holiday.localName || holiday.name || 'Festivo';

    const existente = await FestivoEmpresa.findOne({
      where: {
        empresa_id: idEmpresa,
        fecha,
        fecha_baja: null,
      },
    });

    if (!existente) {
      await createConId(
        FestivoEmpresa,
        idEmpresa,
        'id_festivo',
        {
          fecha,
          descripcion,
          origen: 'oficial',
          external_key: externalKey,
          usuario_alta: idUsuario,
          fecha_alta: new Date(),
        },
        null,
        FESTIVO_FIELDS,
      );
      creados += 1;
      continue;
    }

    if (existente.origen === 'local') {
      omitidos += 1;
      continue;
    }

    await existente.update(
      {
        descripcion,
        origen: 'oficial',
        external_key: externalKey,
        usuario_modificacion: idUsuario,
        fecha_modificacion: new Date(),
      },
      { fields: FESTIVO_FIELDS },
    );
    actualizados += 1;
  }

  const oficialesEnBd = await FestivoEmpresa.findAll({
    where: {
      empresa_id: idEmpresa,
      origen: 'oficial',
      fecha_baja: null,
      fecha: { [Op.like]: `${yearNum}-%` },
    },
  });

  let dadosDeBaja = 0;
  for (const festivo of oficialesEnBd) {
    if (!apiDates.has(festivo.fecha)) {
      await festivo.update({
        usuario_baja: idUsuario,
        fecha_baja: new Date(),
      });
      dadosDeBaja += 1;
    }
  }

  return {
    year: yearNum,
    regionCode,
    totalApi: holidays.length,
    creados,
    actualizados,
    omitidos,
    dadosDeBaja,
  };
};

module.exports = {
  sincronizarFestivosOficiales,
  resolverRegionEmpresa,
};
