export const esUsuarioActivo = (usuario) => (
  !usuario?.fecha_baja_empresa
  && usuario?.activo !== false
  && usuario?.activo !== 0
);

export const estaDadoDeBajaEnEmpresa = (usuario) => Boolean(usuario?.fecha_baja_empresa);
