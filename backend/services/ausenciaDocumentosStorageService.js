const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');

const extensionPorMime = (mimeType) => {
  const mime = String(mimeType || '').toLowerCase();
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  return '.bin';
};

const buildRelativePath = (empresaId, idUsuario, idAusencia, idDocumento, mimeType) =>
  path.posix.join(
    'documentos',
    String(empresaId),
    'ausencias',
    String(idUsuario),
    String(idAusencia),
    `${idDocumento}${extensionPorMime(mimeType)}`,
  );

const resolveAbsolutePath = (rutaRelativa) => path.join(UPLOADS_ROOT, rutaRelativa);

const guardarArchivo = async (buffer, rutaRelativa) => {
  const abs = resolveAbsolutePath(rutaRelativa);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  await fs.promises.writeFile(abs, buffer);
  return abs;
};

const leerArchivo = async (rutaRelativa) => {
  const abs = resolveAbsolutePath(rutaRelativa);
  return fs.promises.readFile(abs);
};

const eliminarArchivo = async (rutaRelativa) => {
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
  guardarArchivo,
  leerArchivo,
  eliminarArchivo,
  hashBuffer,
  extensionPorMime,
};
