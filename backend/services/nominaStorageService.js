const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const buildRelativePath = (empresaId, anio, mes, idUsuario, idDocumento) => {
  const mesPadded = String(mes).padStart(2, '0');
  return path.posix.join(
    'nominas',
    String(empresaId),
    String(anio),
    mesPadded,
    `${idUsuario}_${idDocumento}.pdf`,
  );
};

const resolveAbsolutePath = (rutaRelativa) => path.join(UPLOADS_ROOT, rutaRelativa);

const guardarPdfNomina = async (buffer, rutaRelativa) => {
  const abs = resolveAbsolutePath(rutaRelativa);
  ensureDir(path.dirname(abs));
  await fs.promises.writeFile(abs, buffer);
  return abs;
};

const leerPdfNomina = async (rutaRelativa) => {
  const abs = resolveAbsolutePath(rutaRelativa);
  return fs.promises.readFile(abs);
};

const eliminarPdfNomina = async (rutaRelativa) => {
  try {
    const abs = resolveAbsolutePath(rutaRelativa);
    await fs.promises.unlink(abs);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

const hashBuffer = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

module.exports = {
  UPLOADS_ROOT,
  buildRelativePath,
  resolveAbsolutePath,
  guardarPdfNomina,
  leerPdfNomina,
  eliminarPdfNomina,
  hashBuffer,
};
