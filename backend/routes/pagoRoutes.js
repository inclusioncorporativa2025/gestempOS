const express = require('express');
const {
  resolverEnlacePagoHandler,
  redirectEnlacePagoHandler,
} = require('../controllers/pagoController');

const router = express.Router();

router.get('/:codigo/resolver', resolverEnlacePagoHandler);
router.get('/:codigo', redirectEnlacePagoHandler);

module.exports = router;
