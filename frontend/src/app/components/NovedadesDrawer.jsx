import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Drawer, Empty, Tag, Typography } from 'antd';
import { listarNovedades, marcarNovedadVista } from '../../features/novedades/novedadesService';
import { notifyNovedadesActualizadas } from '../../hooks/useNovedadPendiente';
import NovedadesRocketIcon from './NovedadesRocketIcon';
import './NovedadesDrawer.css';

const { Text, Paragraph } = Typography;

const formatearFecha = (fecha) => {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const NovedadesDrawer = ({ open, onClose }) => {
  const [novedades, setNovedades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandida, setExpandida] = useState(null);
  const [marcando, setMarcando] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarNovedades();
      setNovedades(data.novedades || []);
    } catch (error) {
      console.error('Error al cargar novedades:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  const handleMarcarVista = async (idNovedad) => {
    try {
      setMarcando(idNovedad);
      await marcarNovedadVista(idNovedad);
      notifyNovedadesActualizadas();
      await cargar();
    } catch (error) {
      console.error('Error al marcar novedad:', error);
    } finally {
      setMarcando(null);
    }
  };

  return (
    <Drawer
      title="Novedades de la app"
      placement="right"
      width={420}
      open={open}
      onClose={onClose}
      className="novedades-drawer"
    >
      {novedades.length === 0 && !loading ? (
        <Empty description="No hay novedades para ti" />
      ) : (
        <div className="novedades-drawer__list">
          {novedades.map((item) => {
            const abierta = expandida === item.id_novedad;
            return (
              <article
                key={item.id_novedad}
                className={[
                  'novedades-drawer__item',
                  !item.vista ? 'novedades-drawer__item--nueva' : '',
                ].filter(Boolean).join(' ')}
              >
                <button
                  type="button"
                  className="novedades-drawer__item-header"
                  onClick={() => setExpandida(abierta ? null : item.id_novedad)}
                >
                  <div className="novedades-drawer__item-top">
                    <NovedadesRocketIcon className="novedades-drawer__icon" size={18} />
                    <Text strong>{item.titulo}</Text>
                    {!item.vista && <Tag color="purple">Nueva</Tag>}
                  </div>
                  <Text type="secondary" className="novedades-drawer__fecha">
                    {formatearFecha(item.fecha_publicacion)}
                  </Text>
                  {!abierta && (
                    <Paragraph type="secondary" ellipsis={{ rows: 2 }} className="novedades-drawer__resumen">
                      {item.resumen}
                    </Paragraph>
                  )}
                </button>

                {abierta && (
                  <div className="novedades-drawer__item-body">
                    <Paragraph type="secondary">{item.resumen}</Paragraph>
                    <div className="novedades-drawer__contenido">
                      {item.contenido.split('\n').map((linea, index) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <p key={index}>{linea || '\u00A0'}</p>
                      ))}
                    </div>
                    {!item.vista && (
                      <Button
                        type="primary"
                        size="small"
                        loading={marcando === item.id_novedad}
                        onClick={() => handleMarcarVista(item.id_novedad)}
                      >
                        Marcar como leída
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Drawer>
  );
};

export default NovedadesDrawer;
