import * as XLSX from 'xlsx';

export const COLUMNAS_PLANTILLA_IMPORTACION = [
  'Nombre Completo',
  'Correo',
  'DNI',
  'Tipo de Horario',
  'Tipo de Usuario',
];

export const FILA_EJEMPLO_PLANTILLA = {
  'Nombre Completo': 'Ejemplo Nombre',
  Correo: 'ejemplo@correo.com',
  DNI: '12345678A',
};

export const TIPOS_USUARIO_PLANTILLA = ['Personal', 'Supervisor'];

export const construirFilaPlantillaImportacion = ({
  tipoUsuario = 'Personal',
  tipoJornada = '',
} = {}) => ({
  ...FILA_EJEMPLO_PLANTILLA,
  'Tipo de Horario': tipoJornada ?? '',
  'Tipo de Usuario': tipoUsuario,
});

export const generarWorkbookPlantillaImportacion = ({
  tipoUsuario = 'Personal',
  tipoJornada = '',
} = {}) => {
  const data = [construirFilaPlantillaImportacion({ tipoUsuario, tipoJornada })];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: COLUMNAS_PLANTILLA_IMPORTACION,
  });
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PlantillaUsuarios');
  return workbook;
};

export const generarBufferPlantillaImportacion = (options = {}) =>
  XLSX.write(generarWorkbookPlantillaImportacion(options), {
    type: 'buffer',
    bookType: 'xlsx',
  });

export const descargarPlantillaImportacion = ({
  tipoUsuario = 'Personal',
  tipoJornada = '',
  nombreArchivo = 'PlantillaUsuarios.xlsx',
} = {}) => {
  const workbook = generarWorkbookPlantillaImportacion({ tipoUsuario, tipoJornada });
  XLSX.writeFile(workbook, nombreArchivo);
};

export const resolverNombreJornadaPlantilla = (jornadas, idJornada) => {
  if (idJornada == null || idJornada === '') return '';
  const lista = Array.isArray(jornadas) ? jornadas : [];
  const jornada = lista.find((item) => Number(item.id_jornada) === Number(idJornada));
  return jornada?.nombre ?? String(idJornada);
};
