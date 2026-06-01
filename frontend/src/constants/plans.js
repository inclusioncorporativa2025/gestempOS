/**
 * Planes comerciales (landing y documentación).
 * Ver docs/planes-licencias.md
 */
export const PLANS = [
  {
    id: 'esencial',
    name: 'Esencial',
    description: 'Fichaje legal y registro de jornada para equipos pequeños.',
    price: '4,50',
    minLicenses: 5,
    variant: 'cyan',
    bestseller: false,
    featured: false,
    features: [
      'Fichaje entrada, salida y pausa',
      'Ubicación en el fichaje',
      'Administrador incluido',
    ],
  },
  {
    id: 'rrhh',
    name: 'RRHH',
    description: 'Control del equipo, calendario y gestión de personal.',
    price: '7',
    minLicenses: 10,
    variant: 'purple',
    bestseller: true,
    featured: true,
    features: [
      'Todo Esencial',
      'Altas e invitaciones por email',
      'Calendario, ausencias y notificaciones',
    ],
  },
  {
    id: 'completo',
    name: 'Completo',
    description: 'Gestión integral con inspector e importación masiva.',
    price: '10',
    minLicenses: 15,
    variant: 'blue',
    bestseller: false,
    featured: false,
    features: [
      'Todo RRHH',
      'Perfil inspector',
      'Importación de usuarios (Excel)',
    ],
  },
];
