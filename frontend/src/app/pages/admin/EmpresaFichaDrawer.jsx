import React, { useEffect, useState } from 'react';
import { Drawer, Descriptions, Spin, Tag, Typography, Divider, message } from 'antd';
import dayjs from 'dayjs';
import { getEmpresaFicha } from '../../../features/empresas/empresasService';
import { getPlanLabel, getPlanTagColor } from '../../../constants/plans';
import { etiquetaTipoUsuario } from '../../../utils/tipoUsuarioLabel';
import { renderEstadoEmpresa } from './empresaEstadoUtils';
import './EmpresaFichaDrawer.css';

const { Text, Title } = Typography;

const formatValor = (valor) => (valor != null && String(valor).trim() !== '' ? valor : '—');

const formatFecha = (fecha) => (fecha ? dayjs(fecha).format('DD/MM/YYYY HH:mm') : '—');

const formatFechaCorta = (fecha) => (fecha ? dayjs(fecha).format('DD/MM/YYYY') : '—');

const EmpresaFichaDrawer = ({ open, idEmpresa, preview, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [ficha, setFicha] = useState(null);

  useEffect(() => {
    if (!open || !idEmpresa) {
      setFicha(null);
      return undefined;
    }

    let cancelled = false;

    const cargar = async () => {
      setLoading(true);
      try {
        const data = await getEmpresaFicha(idEmpresa);
        if (!cancelled) {
          setFicha(data);
        }
      } catch {
        if (!cancelled) {
          setFicha(null);
          message.error('No se pudo cargar la ficha de la empresa');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    cargar();

    return () => {
      cancelled = true;
    };
  }, [open, idEmpresa]);

  const empresa = ficha?.empresa;
  const administrador = ficha?.administradores?.[0] ?? null;
  const usuarios = ficha?.usuarios;
  const comercial = ficha?.comercial;
  const titulo = empresa?.nombre || preview?.nombre || 'Ficha de empresa';

  return (
    <Drawer
      title={titulo}
      placement="right"
      width={Math.min(640, window.innerWidth - 24)}
      open={open}
      onClose={onClose}
      destroyOnClose
      className="be-ficha-drawer"
    >
      {loading ? (
        <div className="be-ficha-loading">
          <Spin />
        </div>
      ) : !ficha ? (
        <Text type="secondary">No se pudo cargar la ficha de la empresa.</Text>
      ) : (
        <div className="be-ficha-content">
          <div className="be-ficha-header">
            <Title level={4} className="be-ficha-header__title">
              {empresa?.nombre}
            </Title>
            <div className="be-ficha-header__tags">
              {renderEstadoEmpresa(empresa)}
              <Tag color={getPlanTagColor(empresa?.plan)}>{getPlanLabel(empresa?.plan)}</Tag>
            </div>
          </div>

          <Divider orientation="left" plain>Usuarios</Divider>
          <Descriptions bordered size="small" column={2} className="be-ficha-desc">
            <Descriptions.Item label="Total usuarios">{usuarios?.total ?? 0}</Descriptions.Item>
            <Descriptions.Item label="Activos">{usuarios?.activos ?? 0}</Descriptions.Item>
            <Descriptions.Item label="Inactivos">{usuarios?.inactivos ?? 0}</Descriptions.Item>
            <Descriptions.Item label="Licencias contratadas">{empresa?.licencias ?? '—'}</Descriptions.Item>
          </Descriptions>
          {usuarios?.por_rol?.length > 0 && (
            <div className="be-ficha-roles">
              {usuarios.por_rol.map((row) => (
                <Tag key={row.tipo_usuario}>
                  {etiquetaTipoUsuario(row.tipo_usuario)}: {row.activos}/{row.total}
                </Tag>
              ))}
            </div>
          )}

          <Divider orientation="left" plain>Empresa</Divider>
          <Descriptions bordered size="small" column={1} className="be-ficha-desc">
            <Descriptions.Item label="ID">{empresa?.id_empresa}</Descriptions.Item>
            <Descriptions.Item label="Alias">{formatValor(empresa?.alias)}</Descriptions.Item>
            <Descriptions.Item label="Razón social">{formatValor(empresa?.razon_social)}</Descriptions.Item>
            <Descriptions.Item label="Nombre comercial">{formatValor(empresa?.nombre_comercial)}</Descriptions.Item>
            <Descriptions.Item label="CIF / NIF">{formatValor(empresa?.identificador_fiscal)}</Descriptions.Item>
            <Descriptions.Item label="Email empresa">{formatValor(empresa?.email)}</Descriptions.Item>
            <Descriptions.Item label="Teléfono">{formatValor(empresa?.telefono)}</Descriptions.Item>
            <Descriptions.Item label="Web">{formatValor(empresa?.web)}</Descriptions.Item>
            <Descriptions.Item label="Dirección">{formatValor(empresa?.direccion)}</Descriptions.Item>
            <Descriptions.Item label="Localidad">
              {[empresa?.codigo_postal, empresa?.ciudad, empresa?.provincia].filter(Boolean).join(' · ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="País">{formatValor(empresa?.pais)}</Descriptions.Item>
            <Descriptions.Item label="Sector">{formatValor(empresa?.sector)}</Descriptions.Item>
            <Descriptions.Item label="Actividad">{formatValor(empresa?.actividad)}</Descriptions.Item>
            <Descriptions.Item label="Fecha alta">{formatFecha(empresa?.fecha_alta)}</Descriptions.Item>
            {empresa?.fecha_baja && (
              <Descriptions.Item label="Fecha baja">{formatFecha(empresa?.fecha_baja)}</Descriptions.Item>
            )}
          </Descriptions>

          <Divider orientation="left" plain>Administrador</Divider>
          {administrador ? (
            <Descriptions bordered size="small" column={1} className="be-ficha-desc">
              <Descriptions.Item label="Nombre">{formatValor(administrador.nombre)}</Descriptions.Item>
              <Descriptions.Item label="Email">{formatValor(administrador.email)}</Descriptions.Item>
              <Descriptions.Item label="Teléfono">{formatValor(administrador.telefono_whatsapp)}</Descriptions.Item>
              <Descriptions.Item label="DNI / NIE">{formatValor(administrador.dni)}</Descriptions.Item>
              <Descriptions.Item label="Estado">
                {administrador.usuario_fecha_baja || administrador.membresia_fecha_baja
                  ? <Tag color="default">Inactivo</Tag>
                  : (administrador.usuario_activo === false || administrador.usuario_activo === 0
                    || administrador.membresia_activa === false || administrador.membresia_activa === 0)
                    ? <Tag color="orange">Parcialmente inactivo</Tag>
                    : <Tag color="green">Activo</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Alta usuario">{formatFecha(administrador.fecha_alta)}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Text type="secondary">No hay administrador registrado.</Text>
          )}

          <Divider orientation="left" plain>Facturación</Divider>
          <Descriptions bordered size="small" column={1} className="be-ficha-desc">
            <Descriptions.Item label="Modo">{formatValor(empresa?.modo_facturacion)}</Descriptions.Item>
            <Descriptions.Item label="Estado suscripción">{formatValor(empresa?.estado_suscripcion)}</Descriptions.Item>
            <Descriptions.Item label="Ciclo">{formatValor(empresa?.ciclo_facturacion)}</Descriptions.Item>
            <Descriptions.Item label="Fin de prueba">{formatFechaCorta(empresa?.trial_ends_at)}</Descriptions.Item>
            <Descriptions.Item label="Licencias facturadas">{formatValor(empresa?.licencias_facturadas)}</Descriptions.Item>
          </Descriptions>

          {comercial && (
            <>
              <Divider orientation="left" plain>Comercial / Campaña</Divider>
              <Descriptions bordered size="small" column={1} className="be-ficha-desc">
                <Descriptions.Item label="Comercial">
                  {formatValor(comercial.comercial_nombre)}
                  {comercial.comercial_email ? ` (${comercial.comercial_email})` : ''}
                </Descriptions.Item>
                <Descriptions.Item label="Canal">{formatValor(comercial.canal)}</Descriptions.Item>
                <Descriptions.Item label="Etapa">{formatValor(comercial.etapa)}</Descriptions.Item>
                <Descriptions.Item label="Fecha venta">{formatFecha(comercial.fecha_venta)}</Descriptions.Item>
                {comercial.campana_nombre && (
                  <Descriptions.Item label="Campaña">
                    {comercial.campana_nombre}
                    {comercial.campana_dias_prueba ? ` (${comercial.campana_dias_prueba} días prueba)` : ''}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </>
          )}
        </div>
      )}
    </Drawer>
  );
};

export default EmpresaFichaDrawer;
