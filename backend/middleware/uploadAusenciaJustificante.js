const multer = require('multer');

const MAX_BYTES = 5 * 1024 * 1024;

const uploadJustificanteAusencia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    const nombre = String(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    const ok = mime === 'application/pdf'
      || mime.startsWith('image/')
      || /\.(pdf|jpe?g|png|webp)$/.test(nombre);
    if (ok) {
      cb(null, true);
      return;
    }
    cb(new Error('Solo se permiten PDF o imágenes (JPG, PNG, WEBP)'));
  },
});

module.exports = {
  uploadJustificanteAusencia,
};
