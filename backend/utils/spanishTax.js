const CP_CANARIAS = /^(35|38)\d{3}$/;
const CP_CEUTA_MELILLA = /^(51|52)\d{3}$/;

const PROVINCIAS_SIN_IVA_PENINSULAR = [
  'las palmas',
  'santa cruz de tenerife',
  'ceuta',
  'melilla',
];

const normalizarCp = (cp) => String(cp || '').replace(/\s/g, '');

const esTerritorioSinIvaPeninsular = ({ codigo_postal: codigoPostal, provincia } = {}) => {
  const cp = normalizarCp(codigoPostal);
  if (CP_CANARIAS.test(cp) || CP_CEUTA_MELILLA.test(cp)) {
    return true;
  }

  const prov = String(provincia || '').toLowerCase().trim();
  if (!prov) {
    return false;
  }

  return PROVINCIAS_SIN_IVA_PENINSULAR.some(
    (nombre) => prov.includes(nombre) || nombre.includes(prov),
  );
};

/** CIF/NIF español de empresa (heurística para autorrepercusión B2B). */
const pareceIdentificadorFiscalEmpresa = (identificador) => {
  const id = String(identificador || '').trim().toUpperCase().replace(/[\s-]/g, '');
  if (!id || id.length < 9) {
    return false;
  }

  return (
    /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(id)
    || /^[ABCDEFGHJNPQRSUVW]\d{8}$/.test(id)
    || /^\d{8}[A-Z]$/.test(id)
    || /^[XYZ]\d{7}[A-Z]$/.test(id)
  );
};

/**
 * Regimen de impuesto para facturación Stripe (manual).
 * - iva_21: península y Baleares
 * - exento: Canarias/Ceuta/Melilla o empresa con CIF (0 % en Stripe)
 */
const resolverRegimenImpuestoEmpresa = (empresa) => {
  if (pareceIdentificadorFiscalEmpresa(empresa?.identificador_fiscal)) {
    return {
      codigo: 'exento',
      porcentaje: 0,
      motivo: 'empresa_con_cif',
      etiqueta: 'Sin IVA (empresa con CIF)',
    };
  }

  if (esTerritorioSinIvaPeninsular(empresa)) {
    return {
      codigo: 'exento',
      porcentaje: 0,
      motivo: 'territorio_especial',
      etiqueta: 'Sin IVA peninsular (Canarias/Ceuta/Melilla)',
    };
  }

  return {
    codigo: 'iva_21',
    porcentaje: 21,
    motivo: 'iva_peninsular',
    etiqueta: 'IVA 21 %',
  };
};

const aplicarPorcentajeImpuesto = (importeEur, porcentaje) => {
  const base = Number(importeEur) || 0;
  const pct = Number(porcentaje) || 0;
  const impuesto = Math.round(base * (pct / 100) * 100) / 100;
  return {
    base,
    impuesto,
    total: Math.round((base + impuesto) * 100) / 100,
  };
};

module.exports = {
  esTerritorioSinIvaPeninsular,
  pareceIdentificadorFiscalEmpresa,
  resolverRegimenImpuestoEmpresa,
  aplicarPorcentajeImpuesto,
};
