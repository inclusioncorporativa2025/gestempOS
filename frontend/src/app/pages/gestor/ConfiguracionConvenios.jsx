import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Form, Input, Modal, Select, Switch, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  actualizarConvenioEmpresa,
  bajaConvenioEmpresa,
  incorporarConvenioEmpresa,
  listarCatalogoConvenios,
  listarConveniosEmpresa,
} from '../../../features/convenios/convenioService';
import './Configuracion.css';

const { Text, Title } = Typography;

const etiquetaModo = (modo) => (modo === 'laboral' ? 'Días laborables' : 'Días naturales');

const resumenConvenio = (convenio) => {
  const dias = Number(convenio?.dias_cupo_defecto ?? 30);
  const modo = convenio?.modo_conteo_vacaciones === 'laboral' ? 'laborables' : 'naturales';
  return `${dias} días ${modo}`;
};

const datosCatalogo = (convenio) => ({
  nombre: convenio?.nombre || '—',
  codigo: convenio?.codigo || '',
  resumen: resumenConvenio(convenio),
  modo: etiquetaModo(convenio?.modo_conteo_vacaciones),
  dias: Number(convenio?.dias_cupo_defecto ?? 30),
});

const renderOpcionConvenio = (nombre, codigo, resumen) => (
  <div className="config-convenio-option">
    <span className="config-convenio-option-title">{nombre}</span>
    <span className="config-convenio-option-meta">
      {resumen}
      {codigo ? ` · ${codigo}` : ''}
    </span>
  </div>
);

const TOOLTIP_CONVENIO_DEFECTO =
  'El convenio por defecto se aplica al personal sin convenio asignado: altas nuevas, '
  + 'fichas sin selección explícita y cálculo de vacaciones. Solo puede haber uno activo '
  + 'por empresa; al marcar otro, el anterior deja de ser el predeterminado.';

const InfoConvenioDefecto = () => (
  <Tooltip title={TOOLTIP_CONVENIO_DEFECTO}>
    <InfoCircleOutlined
      className="config-convenio-info"
      aria-label="Información sobre convenio por defecto"
    />
  </Tooltip>
);

const ConfiguracionConvenios = () => {
  const [conveniosEmpresa, setConveniosEmpresa] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalIncorporar, setModalIncorporar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [empresa, cat] = await Promise.all([
        listarConveniosEmpresa(),
        listarCatalogoConvenios(),
      ]);
      setConveniosEmpresa(empresa);
      setCatalogo(cat.convenios || []);
    } catch (error) {
      message.error(error.message || 'No se pudieron cargar los convenios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const idsIncorporados = useMemo(
    () => new Set(conveniosEmpresa.map((c) => c.id_convenio)),
    [conveniosEmpresa],
  );

  const opcionesCatalogo = useMemo(
    () => catalogo
      .filter((c) => c.activo && !idsIncorporados.has(c.id_convenio))
      .map((c) => {
        const info = datosCatalogo(c);
        return {
          value: c.id_convenio,
          label: `${info.nombre} · ${info.resumen}`,
          nombre: info.nombre,
          codigo: info.codigo,
          resumen: info.resumen,
        };
      }),
    [catalogo, idsIncorporados],
  );

  const handleIncorporar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);
      await incorporarConvenioEmpresa(values.id_convenio, {
        nombre_visible: values.nombre_visible || null,
        es_defecto: Boolean(values.es_defecto),
      });
      message.success('Convenio incorporado');
      setModalIncorporar(false);
      form.resetFields();
      await cargar();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error.message || 'No se pudo incorporar el convenio');
    } finally {
      setGuardando(false);
    }
  };

  const marcarDefecto = async (record) => {
    try {
      await actualizarConvenioEmpresa(record.id_empresa_convenio, { es_defecto: true });
      message.success('Convenio marcado como defecto');
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo actualizar');
    }
  };

  const retirarConvenio = async (record) => {
    try {
      await bajaConvenioEmpresa(record.id_empresa_convenio);
      message.success('Convenio retirado de la empresa');
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo retirar el convenio');
    }
  };

  const columns = [
    {
      title: 'Convenio',
      key: 'nombre',
      render: (_, r) => {
        const cat = r.catalogo || r;
        const info = datosCatalogo({
          nombre: r.nombre || cat.nombre,
          codigo: cat.codigo,
          dias_cupo_defecto: r.dias_cupo_defecto ?? cat.dias_cupo_defecto,
          modo_conteo_vacaciones: r.modo_conteo_vacaciones ?? cat.modo_conteo_vacaciones,
        });
        return (
          <div className="config-convenio-table-name">
            <Text strong>{info.nombre}</Text>
            {info.codigo && (
              <Text type="secondary" className="config-convenio-table-code">
                {info.codigo}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Vacaciones',
      key: 'vacaciones',
      width: 200,
      render: (_, r) => {
        const cat = r.catalogo || r;
        return resumenConvenio({
          dias_cupo_defecto: r.dias_cupo_defecto ?? cat.dias_cupo_defecto,
          modo_conteo_vacaciones: r.modo_conteo_vacaciones ?? cat.modo_conteo_vacaciones,
        });
      },
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 140,
      render: (_, r) => (
        <>
          <Tag color={r.activo ? 'green' : 'default'}>{r.activo ? 'Activo' : 'Inactivo'}</Tag>
          {r.es_defecto && <Tag color="blue">Defecto</Tag>}
        </>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 200,
      render: (_, record) => (
        <>
          {record.activo && !record.es_defecto && (
            <span className="config-convenio-defecto-action">
              <Button type="link" size="small" onClick={() => marcarDefecto(record)}>
                Marcar defecto
              </Button>
              <InfoConvenioDefecto />
            </span>
          )}
          {record.activo && (
            <Button type="link" size="small" danger onClick={() => retirarConvenio(record)}>
              Retirar
            </Button>
          )}
        </>
      ),
    },
  ];

  return (
    <Card loading={loading}>
      <Title level={4}>Convenios de la empresa</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Incorpora convenios del catálogo global y asigna uno por defecto al personal sin convenio
        específico.
      </Text>

      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            form.resetFields();
            setModalIncorporar(true);
          }}
          disabled={!opcionesCatalogo.length}
        >
          Incorporar convenio
        </Button>
        {!opcionesCatalogo.length && (
          <Text type="secondary" style={{ marginLeft: 12 }}>
            No hay más convenios disponibles en el catálogo.
          </Text>
        )}
      </div>

      <Table
        rowKey="id_empresa_convenio"
        dataSource={conveniosEmpresa.filter((c) => c.activo)}
        columns={columns}
        pagination={false}
      />

      <Modal
        title="Incorporar convenio"
        open={modalIncorporar}
        onCancel={() => setModalIncorporar(false)}
        onOk={handleIncorporar}
        confirmLoading={guardando}
        okText="Incorporar"
        cancelText="Cancelar"
        destroyOnClose
        width={640}
        className="config-convenio-modal"
      >
        <Form form={form} layout="vertical" initialValues={{ es_defecto: false }}>
          <Form.Item
            label="Convenio del catálogo"
            name="id_convenio"
            rules={[{ required: true, message: 'Selecciona un convenio' }]}
          >
            <Select
              size="large"
              showSearch
              listHeight={360}
              placeholder="Selecciona un convenio..."
              options={opcionesCatalogo}
              optionFilterProp="label"
              optionRender={(option) => renderOpcionConvenio(
                option.data.nombre,
                option.data.codigo,
                option.data.resumen,
              )}
            />
          </Form.Item>
          <Form.Item label="Nombre visible (opcional)" name="nombre_visible">
            <Input placeholder="Nombre personalizado en la empresa" maxLength={120} />
          </Form.Item>
          <Form.Item
            label={(
              <span className="config-convenio-defecto-label">
                Marcar como convenio por defecto
                <InfoConvenioDefecto />
              </span>
            )}
            name="es_defecto"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ConfiguracionConvenios;
