const parseImporteOpcional = (valor) => {
  if (valor == null || valor === '') return null;

  let n;
  if (typeof valor === 'string') {
    const trimmed = valor.trim().replace(/\s/g, '');
    if (trimmed.includes(',')) {
      n = Number(trimmed.replace(/\./g, '').replace(',', '.'));
    } else {
      n = Number(trimmed);
    }
  } else {
    n = Number(valor);
  }

  if (!Number.isFinite(n) || n < 0) {
    const error = new Error('El importe indicado no es válido');
    error.code = 'IMPORTE_INVALIDO';
    throw error;
  }

  return Math.round(n * 100) / 100;
};

module.exports = {
  parseImporteOpcional,
};
