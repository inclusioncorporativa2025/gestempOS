/** Evento global para abrir el modal de facturación (solo admin empresa). */
export const OPEN_FACTURACION_EVENT = 'open-facturacion-modal';

/**
 * @param {{ focusLicencias?: boolean, licenciasSugeridas?: number }} [options]
 */
export const dispatchOpenFacturacion = (options = {}) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(OPEN_FACTURACION_EVENT, {
        detail: {
          focusLicencias: Boolean(options.focusLicencias),
          licenciasSugeridas: options.licenciasSugeridas ?? null,
        },
      }),
    );
  }
};

const FOCUS_CLASS = 'facturacion-panel__section--focus';

/** Desplaza una sección del panel dentro del modal de facturación y la resalta brevemente. */
export const scrollFacturacionSection = (elementId) => {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(elementId);
  if (!el) return;

  el.classList.add(FOCUS_CLASS);
  window.setTimeout(() => el.classList.remove(FOCUS_CLASS), 2200);

  const modalRoot = el.closest('.app-sider-facturacion-modal');
  const scrollContainer = modalRoot?.querySelector('.ant-modal-body');
  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const top = scrollContainer.scrollTop + (elRect.top - containerRect.top) - 8;
    scrollContainer.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    return;
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
