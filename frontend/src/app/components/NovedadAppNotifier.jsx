import React, { useEffect, useState } from 'react';
import { Button, Modal, Typography } from 'antd';
import { CloseOutlined, RocketOutlined } from '@ant-design/icons';
import { useNovedadPendiente } from '../../hooks/useNovedadPendiente';
import './NovedadAppNotifier.css';

const { Title, Text, Paragraph } = Typography;

const MOBILE_BREAKPOINT = 950;

const formatearFecha = (fecha) => {
  if (!fecha) return null;
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const NovedadContenido = ({ novedad }) => (
  <>
    <div className="novedad-notifier__meta">
      <RocketOutlined aria-hidden />
      <span>Novedad</span>
      {novedad.fecha_publicacion && (
        <Text type="secondary" className="novedad-notifier__fecha">
          {formatearFecha(novedad.fecha_publicacion)}
        </Text>
      )}
    </div>
    <Title level={4} className="novedad-notifier__titulo">
      {novedad.titulo}
    </Title>
    <Paragraph type="secondary" className="novedad-notifier__resumen">
      {novedad.resumen}
    </Paragraph>
    <div className="novedad-notifier__contenido">
      {novedad.contenido.split('\n').map((linea, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <p key={index}>{linea || '\u00A0'}</p>
      ))}
    </div>
  </>
);

const NovedadAppNotifier = () => {
  const { novedad, marcarVista } = useNovedadPendiente();
  const [visible, setVisible] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [marcando, setMarcando] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!novedad) {
      setVisible(false);
      setEntrando(false);
      return;
    }

    setVisible(true);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntrando(true));
    });

    return () => cancelAnimationFrame(frame);
  }, [novedad?.id_novedad]);

  const cerrarSinMarcar = () => {
    setEntrando(false);
    window.setTimeout(() => setVisible(false), 280);
  };

  const handleEntendido = async () => {
    if (!novedad) return;
    try {
      setMarcando(true);
      await marcarVista(novedad.id_novedad);
      setEntrando(false);
    } catch {
      // El hook ya registra el error
    } finally {
      setMarcando(false);
    }
  };

  if (!novedad || !visible) return null;

  if (isMobile) {
    return (
      <Modal
        open={visible}
        onCancel={cerrarSinMarcar}
        footer={(
          <Button type="primary" loading={marcando} onClick={handleEntendido} block>
            Entendido
          </Button>
        )}
        centered
        className="novedad-notifier-modal"
        title={null}
        closable
        destroyOnClose
      >
        <NovedadContenido novedad={novedad} />
      </Modal>
    );
  }

  return (
    <div
      className={[
        'novedad-notifier',
        entrando ? 'novedad-notifier--visible' : '',
      ].filter(Boolean).join(' ')}
      role="dialog"
      aria-labelledby="novedad-notifier-titulo"
      aria-live="polite"
    >
      <button
        type="button"
        className="novedad-notifier__close"
        onClick={cerrarSinMarcar}
        aria-label="Cerrar novedad"
      >
        <CloseOutlined />
      </button>
      <NovedadContenido novedad={novedad} />
      <div className="novedad-notifier__actions">
        <Button type="primary" loading={marcando} onClick={handleEntendido}>
          Entendido
        </Button>
      </div>
    </div>
  );
};

export default NovedadAppNotifier;
