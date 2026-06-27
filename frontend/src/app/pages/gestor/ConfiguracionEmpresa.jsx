import React, { useEffect, useState } from 'react';
import {
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Spin,
  message,
} from 'antd';
import { editMiEmpresa, getMiEmpresa } from '../../../features/empresas/empresasService';
import { EMPRESA_BRANDING_UPDATED } from '../../../hooks/useEmpresaBranding';
import {
  COMUNIDADES_AUTONOMAS,
  PROVINCIAS,
  regionDesdeCodigoPostal,
  regionDesdeProvincia,
} from '../../../constants/spanishRegions';
import GradientButton from '../../components/shared/GradientButton';
import './Configuracion.css';

const CAMPOS_EMPRESA = [
  'nombre',
  'nombre_comercial',
  'razon_social',
  'alias',
  'identificador_fiscal',
  'licencias',
  'email',
  'telefono',
  'web',
  'direccion',
  'codigo_postal',
  'ciudad',
  'provincia',
  'codigo_region_festivos',
  'pais',
  'sector',
  'actividad',
  'logo_url',
  'color_principal',
];

const valoresVacios = () =>
  CAMPOS_EMPRESA.reduce((acc, campo) => {
    acc[campo] = campo === 'pais' ? 'España' : campo === 'licencias' ? null : '';
    return acc;
  }, {});

const normalizarEmpresa = (empresa = {}) => {
  const base = valoresVacios();
  CAMPOS_EMPRESA.forEach((campo) => {
    const valor = empresa[campo];
    base[campo] = valor ?? base[campo];
  });
  base.pais = base.pais || 'España';
  return base;
};

const emailOpcional = (_, value) => {
  if (!value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) {
    return Promise.resolve();
  }
  return Promise.reject(new Error('Email no válido'));
};

const ConfiguracionEmpresa = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cargarEmpresa = async () => {
      setLoading(true);
      try {
        const empresa = await getMiEmpresa();
        const datos = normalizarEmpresa(empresa);
        if (!datos.codigo_region_festivos) {
          datos.codigo_region_festivos =
            regionDesdeCodigoPostal(datos.codigo_postal) ||
            regionDesdeProvincia(datos.provincia) ||
            undefined;
        }
        form.setFieldsValue(datos);
      } catch (error) {
        form.setFieldsValue(valoresVacios());
        message.error(error.message || 'No se pudieron cargar los datos de la empresa');
      } finally {
        setLoading(false);
      }
    };

    cargarEmpresa();
  }, [form]);

  const sugerirRegionFestivos = () => {
    const cp = form.getFieldValue('codigo_postal');
    const provincia = form.getFieldValue('provincia');
    const region =
      regionDesdeCodigoPostal(cp) || regionDesdeProvincia(provincia);
    if (region) {
      form.setFieldValue('codigo_region_festivos', region);
    }
  };

  const handleProvinciaChange = (nombreProvincia) => {
    const prov = PROVINCIAS.find((p) => p.name === nombreProvincia);
    if (prov) {
      form.setFieldValue('codigo_region_festivos', prov.regionCode);
    }
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      await editMiEmpresa(values);
      window.dispatchEvent(new Event(EMPRESA_BRANDING_UPDATED));
      message.success('Datos de la empresa guardados correctamente');
    } catch (error) {
      message.error(error.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="config-empresa-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="config-empresa">
      <Form form={form} layout="vertical" onFinish={handleSave} className="config-empresa-form">
        <section className="config-empresa-block">
          <h3 className="config-empresa-block__title">Identificación</h3>
          <Row gutter={[16, 0]}>
            <Col xs={24} lg={12}>
              <Form.Item
                name="nombre"
                label="Nombre de la empresa"
                rules={[{ required: true, message: 'Campo requerido' }]}
              >
                <Input placeholder="Nombre principal de la organización" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="nombre_comercial" label="Nombre comercial">
                <Input placeholder="Nombre con el que se conoce públicamente" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="razon_social" label="Razón social">
                <Input placeholder="Denominación legal, si es distinta" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item
                name="alias"
                label="Alias en la aplicación"
                rules={[{ required: true, message: 'Campo requerido' }]}
                extra="Se muestra en la cabecera de la app"
              >
                <Input placeholder="Ej. Empresa Juli" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="identificador_fiscal" label="CIF / NIF">
                <Input placeholder="Identificador fiscal" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="licencias" label="Licencias contratadas">
                <InputNumber min={0} disabled className="config-empresa-input-full" />
              </Form.Item>
            </Col>
          </Row>
        </section>

        <section className="config-empresa-block">
          <h3 className="config-empresa-block__title">Contacto</h3>
          <Row gutter={[16, 0]}>
            <Col xs={24} lg={12}>
              <Form.Item name="email" label="Email de contacto" rules={[{ validator: emailOpcional }]}>
                <Input placeholder="contacto@empresa.com" type="email" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="telefono" label="Teléfono">
                <Input placeholder="+34 600 000 000" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="web" label="Sitio web">
                <Input placeholder="https://www.empresa.com" />
              </Form.Item>
            </Col>
          </Row>
        </section>

        <section className="config-empresa-block">
          <h3 className="config-empresa-block__title">Ubicación</h3>
          <Row gutter={[16, 0]}>
            <Col xs={24}>
              <Form.Item name="direccion" label="Dirección">
                <Input placeholder="Calle, número, piso…" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="codigo_postal" label="Código postal">
                <Input
                  placeholder="28001"
                  maxLength={5}
                  onBlur={sugerirRegionFestivos}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="ciudad" label="Ciudad / municipio">
                <Input placeholder="Madrid" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="provincia" label="Provincia">
                <Select
                  showSearch
                  allowClear
                  placeholder="Selecciona provincia"
                  optionFilterProp="label"
                  onChange={handleProvinciaChange}
                  options={PROVINCIAS.map((p) => ({
                    value: p.name,
                    label: p.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item
                name="codigo_region_festivos"
                label="Comunidad autónoma (festivos oficiales)"
                extra="Se usa para importar festivos nacionales y autonómicos en el calendario"
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Selecciona comunidad autónoma"
                  optionFilterProp="label"
                  options={COMUNIDADES_AUTONOMAS.map((r) => ({
                    value: r.code,
                    label: r.label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="pais" label="País">
                <Input placeholder="España" />
              </Form.Item>
            </Col>
          </Row>
        </section>

        <section className="config-empresa-block">
          <h3 className="config-empresa-block__title">Actividad</h3>
          <Row gutter={[16, 0]}>
            <Col xs={24} lg={12}>
              <Form.Item name="sector" label="Sector">
                <Input placeholder="Ej. Servicios, hostelería, tecnología…" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="actividad" label="Actividad principal">
                <Input placeholder="Descripción breve de la actividad" />
              </Form.Item>
            </Col>
          </Row>
        </section>

        <section className="config-empresa-block">
          <h3 className="config-empresa-block__title">Marca</h3>
          <Row gutter={[16, 0]}>
            <Col xs={24} lg={12}>
              <Form.Item name="logo_url" label="URL del logo">
                <Input placeholder="https://…/logo.png" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="color_principal" label="Color principal">
                <Input placeholder="#A85CE0" />
              </Form.Item>
            </Col>
          </Row>
        </section>

        <div className="config-empresa-actions">
          <GradientButton type="submit" text="Guardar cambios" loading={saving} />
        </div>
      </Form>
    </div>
  );
};

export default ConfiguracionEmpresa;
