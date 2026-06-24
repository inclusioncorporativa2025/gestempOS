import { jsPDF } from 'jspdf';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { DECLARACION_CIERRE_MENSUAL } from './cierreMensualLegal';
import { SUPPORT_EMAIL } from '../constants/support';
import { TIPO_HORA_BOLSA } from './tipoHora';

dayjs.locale('es');

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const LINE_HEIGHT = 6;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const HEADER_HEIGHT = 30;
const FOOTER_HEIGHT = 18;
const CONTENT_TOP = HEADER_HEIGHT + 10;
const CONTENT_BOTTOM = PAGE_HEIGHT - FOOTER_HEIGHT - 6;

/** Paleta de marca (variables.css) */
const BRAND = {
  primary: [168, 92, 224],
  primaryDark: [155, 77, 219],
  secondary: [199, 139, 240],
  secondaryDark: [126, 63, 184],
  background: [246, 242, 250],
  dark: [45, 27, 66],
  white: [255, 255, 255],
  muted: [110, 98, 125],
};

const sanitizarNombreArchivo = (texto) =>
  String(texto || 'personal')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const escribirParrafo = (doc, texto, x, y, maxWidth, lineHeight = LINE_HEIGHT) => {
  const lineas = doc.splitTextToSize(texto, maxWidth);
  doc.text(lineas, x, y);
  return y + lineas.length * lineHeight;
};

const dibujarHeader = (doc, mesLabel) => {
  doc.setFillColor(...BRAND.primaryDark);
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT - 4, 'F');

  doc.setFillColor(...BRAND.secondary);
  doc.rect(0, HEADER_HEIGHT - 4, PAGE_WIDTH, 2, 'F');

  doc.setFillColor(...BRAND.primary);
  doc.rect(0, HEADER_HEIGHT - 2, PAGE_WIDTH, 2, 'F');

  doc.setTextColor(...BRAND.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Certificado de cierre mensual', MARGIN, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(235, 225, 248);
  doc.text('Registro de jornada laboral', MARGIN, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.white);
  doc.text('timecor.es', PAGE_WIDTH - MARGIN, 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(235, 225, 248);
  doc.text(mesLabel, PAGE_WIDTH - MARGIN, 19, { align: 'right' });
};

const dibujarFooter = (doc, pageNum, totalPages, fechaGeneracion) => {
  const footerY = PAGE_HEIGHT - FOOTER_HEIGHT;

  doc.setFillColor(...BRAND.background);
  doc.rect(0, footerY, PAGE_WIDTH, FOOTER_HEIGHT, 'F');

  doc.setDrawColor(...BRAND.secondary);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, footerY + 1, PAGE_WIDTH - MARGIN, footerY + 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text(`Generado el ${fechaGeneracion}`, MARGIN, footerY + 7);
  doc.text(`Página ${pageNum} de ${totalPages}`, PAGE_WIDTH - MARGIN, footerY + 7, {
    align: 'right',
  });

  doc.setTextColor(...BRAND.primaryDark);
  doc.setFontSize(6.5);
  doc.text(SUPPORT_EMAIL, PAGE_WIDTH / 2, footerY + 13, { align: 'center' });
};

const dibujarTituloSeccion = (doc, titulo, y) => {
  doc.setFillColor(...BRAND.background);
  doc.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, 8, 1.5, 1.5, 'F');

  doc.setDrawColor(...BRAND.secondary);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y - 4, MARGIN, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.primaryDark);
  doc.text(titulo, MARGIN + 4, y + 1);

  return y + 10;
};

const asegurarEspacio = (doc, y, necesario, onNuevaPagina) => {
  if (y + necesario <= CONTENT_BOTTOM) return y;
  doc.addPage();
  onNuevaPagina();
  return CONTENT_TOP;
};

const dibujarSeccionBolsaHoras = (doc, resumenHoras, y) => {
  if (!resumenHoras || Number(resumenHoras.tipo_hora) !== TIPO_HORA_BOLSA) return y;

  y = asegurarEspacio(doc, y, 40, () => {});
  y = dibujarTituloSeccion(doc, 'Bolsa de horas', y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.dark);

  const lineas = [
    resumenHoras.tipo_hora_label && `Tipo de hora: ${resumenHoras.tipo_hora_label}`,
    resumenHoras.delta && `Variación del mes: ${resumenHoras.delta}`,
    resumenHoras.saldo_bolsa_anterior != null
      && `Saldo anterior al mes: ${resumenHoras.saldo_bolsa_anterior}`,
    resumenHoras.saldo_bolsa && `Saldo acumulado: ${resumenHoras.saldo_bolsa}`,
  ].filter(Boolean);

  lineas.forEach((linea) => {
    y = asegurarEspacio(doc, y, LINE_HEIGHT, () => {});
    doc.text(linea, MARGIN, y);
    y += LINE_HEIGHT;
  });

  if (resumenHoras.desglose) {
    y += 2;
    doc.setTextColor(...BRAND.muted);
    doc.setFont('helvetica', 'italic');
    y = escribirParrafo(doc, resumenHoras.desglose, MARGIN, y, CONTENT_WIDTH);
  }

  return y + 8;
};

/**
 * Genera y descarga un PDF del cierre mensual firmado.
 */
export const generarPdfCierreMensual = ({
  nombreEmpleado,
  mes,
  registros = [],
  totalHoras = '',
  totalHorasEsperadas = '',
  resumenHoras = null,
  firmaImagen = null,
  firmaHash = null,
  hashRegistroMes = null,
  fechaSolicitud = null,
  estado = 'Pendiente',
}) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const mesLabel = dayjs(`${mes}-01`).isValid()
    ? dayjs(`${mes}-01`).format('MMMM [de] YYYY')
    : mes;
  const fechaGeneracion = dayjs().format('DD/MM/YYYY HH:mm');

  let y = CONTENT_TOP;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.dark);
  doc.text(`Personal: ${nombreEmpleado || '—'}`, MARGIN, y);
  y += LINE_HEIGHT;
  doc.text(`Periodo: ${mesLabel}`, MARGIN, y);
  y += LINE_HEIGHT;
  doc.text(`Estado de la solicitud: ${estado}`, MARGIN, y);
  y += LINE_HEIGHT;
  if (fechaSolicitud) {
    doc.text(
      `Fecha de solicitud: ${dayjs(fechaSolicitud).format('DD/MM/YYYY HH:mm')}`,
      MARGIN,
      y,
    );
    y += LINE_HEIGHT;
  }
  y += 6;

  y = dibujarTituloSeccion(doc, 'Declaración del personal', y);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  y = escribirParrafo(doc, DECLARACION_CIERRE_MENSUAL, MARGIN, y, CONTENT_WIDTH);
  y += 8;

  y = asegurarEspacio(doc, y, 20, () => {});
  y = dibujarTituloSeccion(doc, 'Registro de jornada', y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.dark);
  doc.setFillColor(...BRAND.primary);
  doc.rect(MARGIN, y - 3, CONTENT_WIDTH, 7, 'F');
  doc.setTextColor(...BRAND.white);
  doc.text('Fecha', MARGIN + 2, y + 1);
  doc.text('Entrada', MARGIN + 37, y + 1);
  doc.text('Salida', MARGIN + 62, y + 1);
  doc.text('Tiempo', MARGIN + 87, y + 1);
  y += LINE_HEIGHT + 3;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.dark);

  const filas = registros.length > 0 ? registros : [];
  if (filas.length === 0) {
    doc.setTextColor(...BRAND.muted);
    doc.text('Sin registros de fichaje en este periodo.', MARGIN, y);
    y += LINE_HEIGHT;
  } else {
    filas.forEach((fila, index) => {
      y = asegurarEspacio(doc, y, LINE_HEIGHT, () => {});
      if (index % 2 === 0) {
        doc.setFillColor(...BRAND.background);
        doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, LINE_HEIGHT, 'F');
      }
      doc.setTextColor(...BRAND.dark);
      doc.text(String(fila.fecha || '—'), MARGIN + 2, y);
      doc.text(String(fila.hora_entrada || '—'), MARGIN + 37, y);
      doc.text(String(fila.hora_salida || '—'), MARGIN + 62, y);
      doc.text(String(fila.dif_tiempo || '—'), MARGIN + 87, y);
      y += LINE_HEIGHT;
    });
  }

  y += 4;
  y = asegurarEspacio(doc, y, 16, () => {});

  doc.setDrawColor(...BRAND.secondary);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.primaryDark);
  doc.text(`Total horas trabajadas: ${totalHoras || '—'}`, MARGIN, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.dark);
  doc.text(`Total horas esperadas: ${totalHorasEsperadas || 'No configurada'}`, MARGIN, y);
  y += LINE_HEIGHT;

  if (resumenHoras?.desglose && Number(resumenHoras.tipo_hora) !== TIPO_HORA_BOLSA) {
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    y = escribirParrafo(doc, resumenHoras.desglose, MARGIN, y, CONTENT_WIDTH);
    y += 4;
  } else {
    y += 4;
  }

  y = dibujarSeccionBolsaHoras(doc, resumenHoras, y);
  y += 2;

  if (firmaImagen) {
    y = asegurarEspacio(doc, y, 50, () => {});
    y = dibujarTituloSeccion(doc, 'Firma del personal', y);
    try {
      doc.setDrawColor(...BRAND.secondary);
      doc.setLineWidth(0.4);
      doc.roundedRect(MARGIN, y, 72, 30, 2, 2, 'S');
      doc.addImage(firmaImagen, 'PNG', MARGIN + 1, y + 1, 70, 28);
      y += 36;
    } catch {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND.muted);
      doc.text('(No se pudo incrustar la imagen de la firma)', MARGIN, y);
      y += LINE_HEIGHT;
    }
  }

  if (firmaHash || hashRegistroMes) {
    y = asegurarEspacio(doc, y, 20, () => {});
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.muted);
    if (firmaHash) {
      y = escribirParrafo(doc, `Huella de firma: ${firmaHash}`, MARGIN, y, CONTENT_WIDTH, 4.5);
    }
    if (hashRegistroMes) {
      y = escribirParrafo(
        doc,
        `Hash de integridad del registro del mes: ${hashRegistroMes}`,
        MARGIN,
        y,
        CONTENT_WIDTH,
        4.5,
      );
    }
  }

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    dibujarHeader(doc, mesLabel);
    dibujarFooter(doc, i, totalPages, fechaGeneracion);
  }

  const nombreArchivo = `cierre-mensual-${mes}-${sanitizarNombreArchivo(nombreEmpleado)}.pdf`;
  doc.save(nombreArchivo);
};
