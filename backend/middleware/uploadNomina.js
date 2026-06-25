const multer = require('multer');

const MAX_BYTES = 5 * 1024 * 1024;

const uploadNominaPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    const nombre = String(file.originalname || '').toLowerCase();
    if (file.mimetype === 'application/pdf' || nombre.endsWith('.pdf')) {
      cb(null, true);
      return;
    }
    cb(new Error('Solo se permiten archivos PDF'));
  },
});

module.exports = {
  uploadNominaPdf,
};
