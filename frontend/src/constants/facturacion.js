/** Evento global para abrir el modal de facturación (solo admin empresa). */
export const OPEN_FACTURACION_EVENT = 'open-facturacion-modal';

export const dispatchOpenFacturacion = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_FACTURACION_EVENT));
  }
};
