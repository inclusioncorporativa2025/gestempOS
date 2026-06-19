import { jsPDF } from 'jspdf';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { DECLARACION_CIERRE_MENSUAL } from './cierreMensualLegal';

dayjs.locale('es');

const MARGIN = 14;
const LINE_HEIGHT = 6;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const sanitizarNombreArchivo = (texto) =>
  String(texto || 'empleado')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const escribirParrafo = (doc, texto, x, y, maxWidth) => {
  const lineas = doc.splitTextToSize(texto, maxWidth);
  doc.text(lineas, x, y);
  return y + lineas.length * LINE_HEIGHT;
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

  let y = MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Certificado de cierre mensual', MARGIN, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Empleado: ${nombreEmpleado || '—'}`, MARGIN, y);
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
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Declaración del empleado', MARGIN, y);
  y += LINE_HEIGHT;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  y = escribirParrafo(doc, DECLARACION_CIERRE_MENSUAL, MARGIN, y, CONTENT_WIDTH);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Registro de jornada', MARGIN, y);
  y += LINE_HEIGHT + 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Fecha', MARGIN, y);
  doc.text('Entrada', MARGIN + 35, y);
  doc.text('Salida', MARGIN + 60, y);
  doc.text('Tiempo', MARGIN + 85, y);
  y += LINE_HEIGHT;

  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(200);
  doc.line(MARGIN, y - 2, PAGE_WIDTH - MARGIN, y - 2);

  const filas = registros.length > 0 ? registros : [];
  if (filas.length === 0) {
    doc.text('Sin registros de fichaje en este periodo.', MARGIN, y);
    y += LINE_HEIGHT;
  } else {
    filas.forEach((fila) => {
      if (y > 250) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(String(fila.fecha || '—'), MARGIN, y);
      doc.text(String(fila.hora_entrada || '—'), MARGIN + 35, y);
      doc.text(String(fila.hora_salida || '—'), MARGIN + 60, y);
      doc.text(String(fila.dif_tiempo || '—'), MARGIN + 85, y);
      y += LINE_HEIGHT;
    });
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total horas trabajadas: ${totalHoras || '—'}`, MARGIN, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total horas esperadas: ${totalHorasEsperadas || 'No configurada'}`, MARGIN, y);
  y += 10;

  if (firmaImagen) {
    if (y > 220) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Firma del empleado', MARGIN, y);
    y += LINE_HEIGHT;
    try {
      doc.addImage(firmaImagen, 'PNG', MARGIN, y, 70, 28);
      y += 34;
    } catch {
      doc.setFont('helvetica', 'normal');
      doc.text('(No se pudo incrustar la imagen de la firma)', MARGIN, y);
      y += LINE_HEIGHT;
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(80);
  if (firmaHash) {
    y = escribirParrafo(doc, `Huella de firma: ${firmaHash}`, MARGIN, y, CONTENT_WIDTH);
  }
  if (hashRegistroMes) {
    y = escribirParrafo(
      doc,
      `Hash de integridad del registro del mes: ${hashRegistroMes}`,
      MARGIN,
      y,
      CONTENT_WIDTH,
    );
  }

  doc.setTextColor(0);
  doc.setFontSize(7);
  doc.text(
    `Documento generado el ${dayjs().format('DD/MM/YYYY HH:mm')}`,
    MARGIN,
    290,
  );

  const nombreArchivo = `cierre-mensual-${mes}-${sanitizarNombreArchivo(nombreEmpleado)}.pdf`;
  doc.save(nombreArchivo);
};
