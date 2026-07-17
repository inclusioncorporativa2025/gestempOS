import React, { useEffect, useMemo, useState } from 'react';
import { Button, Modal, Pagination, Spin, Table } from 'antd';
import { DownloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import './RegistroMensualModal.css';

const MOBILE_BREAKPOINT = 950;
const PAGE_SIZE = 10;

const RegistroField = ({ label, value }) => (
  <div className="registro-modal-field">
    <span className="registro-modal-field__label">{label}</span>
    <span className="registro-modal-field__value">{value ?? '—'}</span>
  </div>
);

const RegistroTriple = ({ fields }) => (
  <div className="registro-modal-row">
    {fields.map(({ label, value }) => (
      <RegistroField key={label} label={label} value={value} />
    ))}
  </div>
);

const COLUMNAS_REGISTRO = [
  { title: 'Fecha', dataIndex: 'fecha', key: 'fecha' },
  { title: 'Hora Entrada', dataIndex: 'hora_entrada', key: 'hora_entrada' },
  { title: 'Hora Salida', dataIndex: 'hora_salida', key: 'hora_salida' },
  { title: 'Dif. Tiempo', dataIndex: 'dif_tiempo', key: 'dif_tiempo' },
];

const RegistroMensualModal = ({
  open,
  onClose,
  title = 'Registro mensual',
  loading = false,
  registros = [],
  totalHoras,
  totalHorasEsperadas,
  resumenHoras,
  onDescargarPdf,
  pdfDisabled = false,
  firmaCierreDetalle,
  nombreEmpleado,
  destroyOnClose = true,
  saldoBolsaEtiqueta = 'Saldo bolsa',
}) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [mobilePage, setMobilePage] = useState(1);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (open) setMobilePage(1);
  }, [open, registros.length]);

  const registrosMobile = useMemo(() => {
    const start = (mobilePage - 1) * PAGE_SIZE;
    return registros.slice(start, start + PAGE_SIZE);
  }, [registros, mobilePage]);

  const tituloFirma = nombreEmpleado ? `Firmado por ${nombreEmpleado}` : 'Firmado';

  const renderRegistroCard = (record) => (
    <article key={record.fecha} className="registro-modal-card">
      <h3 className="registro-modal-card__fecha">{record.fecha || '—'}</h3>
      <RegistroTriple
        fields={[
          { label: 'Entrada', value: record.hora_entrada },
          { label: 'Salida', value: record.hora_salida },
          { label: 'Tiempo', value: record.dif_tiempo },
        ]}
      />
    </article>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={title}
      width={isMobile ? '100%' : '80%'}
      className={isMobile ? 'registro-mensual-modal registro-mensual-modal--mobile' : 'registro-mensual-modal'}
      destroyOnClose={destroyOnClose}
    >
      {loading ? (
        <div className="registro-mensual-modal__loading">
          <Spin />
        </div>
      ) : (
        <>
          <div className="registro-mensual-modal__actions">
            <Button
              type="default"
              icon={<DownloadOutlined />}
              onClick={onDescargarPdf}
              disabled={pdfDisabled}
              block={isMobile}
            >
              Descargar PDF
            </Button>
          </div>

          {isMobile ? (
            <div className="registro-modal-list">
              {registros.length === 0 ? (
                <p className="registro-modal-empty">Sin registros en este mes</p>
              ) : (
                <>
                  {registrosMobile.map((record) => renderRegistroCard(record))}
                  {registros.length > PAGE_SIZE && (
                    <Pagination
                      className="registro-modal-pagination"
                      current={mobilePage}
                      pageSize={PAGE_SIZE}
                      total={registros.length}
                      onChange={setMobilePage}
                      showSizeChanger={false}
                      hideOnSinglePage
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            <Table
              columns={COLUMNAS_REGISTRO}
              dataSource={registros}
              rowKey="fecha"
              pagination={{ pageSize: PAGE_SIZE }}
              scroll={{ x: 640 }}
            />
          )}

          <div className="registro-mensual-modal__totales">
            <div className="registro-mensual-modal__totales-row">
              <div className="registro-mensual-modal__total-item registro-mensual-modal__total-item--trabajadas">
                <span className="registro-mensual-modal__total-label">Horas trabajadas</span>
                <span className="registro-mensual-modal__total-valor">{totalHoras ?? '—'}</span>
              </div>
              <div className="registro-mensual-modal__total-item">
                <span className="registro-mensual-modal__total-label">Horas esperadas</span>
                <span className="registro-mensual-modal__total-valor">{totalHorasEsperadas ?? '—'}</span>
              </div>
            </div>
            {resumenHoras?.tipo_hora_label && (
              <span>
                Tipo de hora: {resumenHoras.tipo_hora_label}
                {resumenHoras.tipo_hora_origen === 'membresia'
                  ? ' (personal)'
                  : resumenHoras.tipo_hora_origen === 'jornada'
                    ? ' (jornada)'
                    : ''}
              </span>
            )}
            {resumenHoras?.desglose && <span>{resumenHoras.desglose}</span>}
            {resumenHoras?.saldo_bolsa && (
              <span>{saldoBolsaEtiqueta}: {resumenHoras.saldo_bolsa}</span>
            )}
          </div>

          {firmaCierreDetalle?.firmado && (
            <div className="registro-mensual-modal__firma">
              <p className="registro-mensual-modal__firma-titulo">{tituloFirma}</p>
              {firmaCierreDetalle.firma_imagen && (
                <img
                  src={firmaCierreDetalle.firma_imagen}
                  alt={tituloFirma}
                  className="registro-mensual-modal__firma-img"
                />
              )}
              {(firmaCierreDetalle.firma_hash || firmaCierreDetalle.hash_registro_mes) && (
                <div className="registro-mensual-modal__integridad">
                  <div className="registro-mensual-modal__integridad-header">
                    <span className="registro-mensual-modal__integridad-icon" aria-hidden="true">
                      <SafetyCertificateOutlined />
                    </span>
                    <div className="registro-mensual-modal__integridad-texto">
                      <p className="registro-mensual-modal__integridad-titulo">
                        Registro verificado e inalterable
                      </p>
                      <p className="registro-mensual-modal__integridad-desc">
                        Las huellas criptográficas certifican que este cierre no ha sido modificado.
                      </p>
                    </div>
                  </div>
                  <div className="registro-mensual-modal__integridad-hashes">
                    {firmaCierreDetalle.firma_hash && (
                      <div className="registro-mensual-modal__hash-item">
                        <span className="registro-mensual-modal__hash-label">Huella de firma</span>
                        <code className="registro-mensual-modal__hash-valor">
                          {firmaCierreDetalle.firma_hash}
                        </code>
                      </div>
                    )}
                    {firmaCierreDetalle.hash_registro_mes && (
                      <div className="registro-mensual-modal__hash-item">
                        <span className="registro-mensual-modal__hash-label">Hash del registro del mes</span>
                        <code className="registro-mensual-modal__hash-valor">
                          {firmaCierreDetalle.hash_registro_mes}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default RegistroMensualModal;
