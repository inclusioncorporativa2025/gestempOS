/** Comunidades autónomas (Nager.Date) y provincias españolas. */

export const COMUNIDADES_AUTONOMAS = [
  { code: 'ES-AN', label: 'Andalucía' },
  { code: 'ES-AR', label: 'Aragón' },
  { code: 'ES-AS', label: 'Asturias' },
  { code: 'ES-CB', label: 'Cantabria' },
  { code: 'ES-CL', label: 'Castilla y León' },
  { code: 'ES-CM', label: 'Castilla-La Mancha' },
  { code: 'ES-CT', label: 'Cataluña' },
  { code: 'ES-CE', label: 'Ceuta' },
  { code: 'ES-CN', label: 'Canarias' },
  { code: 'ES-EX', label: 'Extremadura' },
  { code: 'ES-GA', label: 'Galicia' },
  { code: 'ES-IB', label: 'Islas Baleares' },
  { code: 'ES-ML', label: 'Melilla' },
  { code: 'ES-MC', label: 'Región de Murcia' },
  { code: 'ES-MD', label: 'Comunidad de Madrid' },
  { code: 'ES-NC', label: 'Comunidad Foral de Navarra' },
  { code: 'ES-PV', label: 'País Vasco' },
  { code: 'ES-RI', label: 'La Rioja' },
  { code: 'ES-VC', label: 'Comunitat Valenciana' },
];

export const PROVINCIAS = [
  { cpPrefix: '01', name: 'Álava', regionCode: 'ES-PV' },
  { cpPrefix: '02', name: 'Albacete', regionCode: 'ES-CM' },
  { cpPrefix: '03', name: 'Alicante', regionCode: 'ES-VC' },
  { cpPrefix: '04', name: 'Almería', regionCode: 'ES-AN' },
  { cpPrefix: '05', name: 'Ávila', regionCode: 'ES-CL' },
  { cpPrefix: '06', name: 'Badajoz', regionCode: 'ES-EX' },
  { cpPrefix: '07', name: 'Islas Baleares', regionCode: 'ES-IB' },
  { cpPrefix: '08', name: 'Barcelona', regionCode: 'ES-CT' },
  { cpPrefix: '09', name: 'Burgos', regionCode: 'ES-CL' },
  { cpPrefix: '10', name: 'Cáceres', regionCode: 'ES-EX' },
  { cpPrefix: '11', name: 'Cádiz', regionCode: 'ES-AN' },
  { cpPrefix: '12', name: 'Castellón', regionCode: 'ES-VC' },
  { cpPrefix: '13', name: 'Ciudad Real', regionCode: 'ES-CM' },
  { cpPrefix: '14', name: 'Córdoba', regionCode: 'ES-AN' },
  { cpPrefix: '15', name: 'A Coruña', regionCode: 'ES-GA' },
  { cpPrefix: '16', name: 'Cuenca', regionCode: 'ES-CM' },
  { cpPrefix: '17', name: 'Girona', regionCode: 'ES-CT' },
  { cpPrefix: '18', name: 'Granada', regionCode: 'ES-AN' },
  { cpPrefix: '19', name: 'Guadalajara', regionCode: 'ES-CM' },
  { cpPrefix: '20', name: 'Gipuzkoa', regionCode: 'ES-PV' },
  { cpPrefix: '21', name: 'Huelva', regionCode: 'ES-AN' },
  { cpPrefix: '22', name: 'Huesca', regionCode: 'ES-AR' },
  { cpPrefix: '23', name: 'Jaén', regionCode: 'ES-AN' },
  { cpPrefix: '24', name: 'León', regionCode: 'ES-CL' },
  { cpPrefix: '25', name: 'Lleida', regionCode: 'ES-CT' },
  { cpPrefix: '26', name: 'La Rioja', regionCode: 'ES-RI' },
  { cpPrefix: '27', name: 'Lugo', regionCode: 'ES-GA' },
  { cpPrefix: '28', name: 'Madrid', regionCode: 'ES-MD' },
  { cpPrefix: '29', name: 'Málaga', regionCode: 'ES-AN' },
  { cpPrefix: '30', name: 'Murcia', regionCode: 'ES-MC' },
  { cpPrefix: '31', name: 'Navarra', regionCode: 'ES-NC' },
  { cpPrefix: '32', name: 'Ourense', regionCode: 'ES-GA' },
  { cpPrefix: '33', name: 'Asturias', regionCode: 'ES-AS' },
  { cpPrefix: '34', name: 'Palencia', regionCode: 'ES-CL' },
  { cpPrefix: '35', name: 'Las Palmas', regionCode: 'ES-CN' },
  { cpPrefix: '36', name: 'Pontevedra', regionCode: 'ES-GA' },
  { cpPrefix: '37', name: 'Salamanca', regionCode: 'ES-CL' },
  { cpPrefix: '38', name: 'Santa Cruz de Tenerife', regionCode: 'ES-CN' },
  { cpPrefix: '39', name: 'Cantabria', regionCode: 'ES-CB' },
  { cpPrefix: '40', name: 'Segovia', regionCode: 'ES-CL' },
  { cpPrefix: '41', name: 'Sevilla', regionCode: 'ES-AN' },
  { cpPrefix: '42', name: 'Soria', regionCode: 'ES-CL' },
  { cpPrefix: '43', name: 'Tarragona', regionCode: 'ES-CT' },
  { cpPrefix: '44', name: 'Teruel', regionCode: 'ES-AR' },
  { cpPrefix: '45', name: 'Toledo', regionCode: 'ES-CM' },
  { cpPrefix: '46', name: 'Valencia', regionCode: 'ES-VC' },
  { cpPrefix: '47', name: 'Valladolid', regionCode: 'ES-CL' },
  { cpPrefix: '48', name: 'Bizkaia', regionCode: 'ES-PV' },
  { cpPrefix: '49', name: 'Zamora', regionCode: 'ES-CL' },
  { cpPrefix: '50', name: 'Zaragoza', regionCode: 'ES-AR' },
  { cpPrefix: '51', name: 'Ceuta', regionCode: 'ES-CE' },
  { cpPrefix: '52', name: 'Melilla', regionCode: 'ES-ML' },
];

export const provinciaPorNombre = (nombre) =>
  PROVINCIAS.find((p) => p.name.toLowerCase() === String(nombre || '').trim().toLowerCase());

export const regionDesdeCodigoPostal = (cp) => {
  const prefix = String(cp || '').trim().slice(0, 2);
  const prov = PROVINCIAS.find((p) => p.cpPrefix === prefix);
  return prov?.regionCode ?? null;
};

export const regionDesdeProvincia = (nombre) => provinciaPorNombre(nombre)?.regionCode ?? null;

export const labelRegion = (code) =>
  COMUNIDADES_AUTONOMAS.find((r) => r.code === code)?.label ?? code;
