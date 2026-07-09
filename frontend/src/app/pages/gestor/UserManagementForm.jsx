import React, { useState, useEffect } from 'react';
import { Modal, Layout, Card, Row, Col, Button, Form, Input, notification, Upload, Typography, Select, message } from 'antd';
import GradientButton from '../../components/shared/GradientButton';
import { InboxOutlined, DownloadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../../constants/routes';
import * as XLSX from 'xlsx'; // Importamos la biblioteca para manejar Excel

import { crearUsuario, importarUsuariosEmpresa } from '../../../features/user/usuarioService';
import { mostrarModalLicenciasAgotadas } from '../../../features/billing/licenciasAgotadasModal';
import { obtenerJornadas, obtenerJornadasByIdEmpresa } from "../../../features/jornada/jornadaService";
import './UserManagementForm.css';

const { Dragger } = Upload;
const { Title } = Typography;
const { Option } = Select;

const etiquetaTipoUsuario = (tipoUsuario) => {
  if (String(tipoUsuario) === '4') return 'Supervisor';
  if (String(tipoUsuario) === '5') return 'Personal';
  if (String(tipoUsuario) === '6') return 'Inspector';
  return 'Usuario';
};

const SECCIONES_VALIDAS = ['importUsers', 'addInspector'];

const seccionInicial = (state) =>
  SECCIONES_VALIDAS.includes(state?.section) ? state.section : 'importUsers';

const UserManagementForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedButton, setSelectedButton] = useState(() => seccionInicial(location.state));
  const [fileList, setFileList] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState('Trabajador');
  const [tipoJornada, setTipoJornada] = useState('');
  const [inspectorForm] = Form.useForm();
  
  // Función para obtener las jornadas desde la API
  const obtenerTipoJornadas = async () => {
    try {
      const response = await obtenerJornadas();
      setJornadas(response); // Almacenar las jornadas en el estado
    } catch (error) {
      message.error('Error recuperando tipo de jornadas');
    }
  };

  // Usamos useEffect para cargar las jornadas cuando se monta el componente
  useEffect(() => {
    obtenerTipoJornadas();
  }, []);

  useEffect(() => {
    if (SECCIONES_VALIDAS.includes(location.state?.section)) {
      setSelectedButton(location.state.section);
    }
  }, [location.state?.section]);

  const importarUsuarios = async (values) => {

    const response = await importarUsuariosEmpresa(values);

    notification.info({
      message: 'Importando Usuarios',
      description: 'Se está importando la lista de usuarios. Esta funcionalidad será implementada más adelante.',
    });
  };

  const eliminarArchivo = () => {
    setFileList([]); // Limpia la lista de archivos
    notification.success({
      message: 'Formulario Limpio',
      description: 'Se ha limpiado el formulario de importación.',
    });
  };

  const crearInspector = async (values) => {
    const intentarAlta = () =>
      crearUsuario(values.email, values.nombreCompleto, values.Identificador, 6, null);

    try {
      const response = await intentarAlta();
      if (!response.creada) {
        if (response.codigo === 'LICENCIAS_AGOTADAS') {
          mostrarModalLicenciasAgotadas({
            response,
            onAmpliado: async () => {
              const reintento = await intentarAlta();
              if (!reintento.creada) {
                notification.error({
                  message: reintento.message || 'No se pudo completar el alta tras ampliar licencias',
                });
                return;
              }
              if (reintento.emailInvitacionEnviado === false) {
                inspectorForm.resetFields();
                notification.warning({
                  message: 'Usuario creado sin correo',
                  description:
                    reintento.message
                    || `Inspector creado, pero no se pudo enviar el email a ${values.email}. Puede usar "Olvidé mi contraseña".`,
                });
              } else {
                inspectorForm.resetFields();
                notification.success({
                  message: `Inspector "${values.nombreCompleto}" creado, se le ha enviado el email de invitación.`,
                });
              }
            },
          });
        } else {
          notification.error({
            message: response.message,
            description: response.message,
          });
        }
      } else if (response.emailInvitacionEnviado === false) {
        inspectorForm.resetFields();
        notification.warning({
          message: 'Usuario creado sin correo',
          description:
            response.message ||
            `Inspector creado, pero no se pudo enviar el email a ${values.email}. Puede usar "Olvidé mi contraseña".`,
        });
      } else {
        inspectorForm.resetFields();
        notification.success({
          message: `Inspector "${values.nombreCompleto}" creado, se le ha enviado el email de invitación.`,
        });
      }
    } catch (error) {
      notification.error({
        message: error.message,
        description: `Error enviando invitación al inspector ${values.email}.`,
      });
    }
  };

  const showDownloadModal = () => {
    setModalVisible(true); // Abre el modal
  };
  
  const handleModalCancel = () => {
    setModalVisible(false); // Cierra el modal sin hacer nada
  };
  
  const handleModalOk = () => {
    setModalVisible(false); // Cierra el modal
    descargarPlantillaExcel(tipoUsuario, tipoJornada); // Llama a la función para descargar el Excel con los valores seleccionados
  };
  
  const handleUsuarioChange = (value) => {
    setTipoUsuario(value); // Cambia el tipo de usuario seleccionado
  };
  
  const handleJornadaChange = (value) => {
    setTipoJornada(value); // Cambia el tipo de jornada seleccionado
  };
  
  const descargarPlantillaExcel = (tipoUsuario, tipoJornada) => {
    // Crear datos de ejemplo con los valores seleccionados
    const data = [
      { 
        'Nombre Completo': 'Ejemplo Nombre', 
        'Correo': 'ejemplo@correo.com', 
        'DNI': '12345678A', 
        'Tipo de Horario': tipoJornada, 
        'Tipo de Usuario': tipoUsuario
      },
    ];
  
    // Crear un libro de Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
  
    // Añadir la hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PlantillaUsuarios');
  
    // Exportar el archivo
    XLSX.writeFile(workbook, 'PlantillaUsuarios.xlsx');
  };
  

  const renderForm = () => {
    if (selectedButton === 'importUsers') {
      return (
        <Card title="Importar Usuarios">
          <Form layout="vertical">
            <Form.Item
              label="Selecciona un archivo Excel para importar"
              valuePropName="fileList">
              <Dragger
                name="file"
                multiple={false}
                fileList={fileList}
                onChange={(info) => setFileList(info.fileList)}
                beforeUpload={() => false} // Evita la subida automática
                accept=".xls,.xlsx">
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Haz clic o arrastra un archivo a esta área</p>
                <p className="ant-upload-hint">Solo se aceptan archivos .xls y .xlsx.</p>
              </Dragger>
            </Form.Item>
            <Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <GradientButton text="Aceptar" block onClick={importarUsuarios} disabled={fileList.length === 0} />
                </Col>
                <Col span={12}>
                  <Button block danger onClick={eliminarArchivo}>
                    Eliminar
                  </Button>
                </Col>
              </Row>
            </Form.Item>
            <Form.Item>
              <Button type="default" block icon={<DownloadOutlined />} onClick={showDownloadModal}>
                Descargar Plantilla
              </Button>
            </Form.Item>
          </Form>
        </Card>
      );
  } else if (selectedButton === 'addInspector') {
    return (
      <Card title="Alta Inspector">
        <Form form={inspectorForm} layout="vertical" onFinish={crearInspector}>
          <Form.Item
            label="Nombre Completo"
            name="nombreCompleto"
            rules={[{ required: true, message: 'Por favor, ingresa el nombre completo' }]}>
            <Input placeholder="Ingresa el nombre completo" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Por favor, ingresa un email válido' }]}>
            <Input placeholder="Ingresa el correo electrónico" />
          </Form.Item>

          <Form.Item
            label="Identificador"
            name="Identificador"
            rules={[{ required: true, message: 'Por favor, ingresa un Identificador válido' }]}>
            <Input placeholder="Ingresa el Identificador" />
          </Form.Item>


          <Form.Item
            label="Fecha vencimiento usuario"
            name="vencimiento"
            rules={[{ required: true, message: 'Por favor, ingresa una fecha de vencimiento' }]}>
            <Input type='date' placeholder="Ingresa fecha vencimiento" />
          </Form.Item>


          <Form.Item>
            <GradientButton type="submit" text="Enviar Invitación" block />
          </Form.Item>
        </Form>
      </Card>
    );
  }
    return null;
  };

  const tituloSeccion = {
    importUsers: 'Importar usuarios',
    addInspector: 'Invitar inspector',
  }[selectedButton] || 'Gestión de usuarios';

  return (
    <Layout className="umf-layout">
      <Card
        title={
          <div className="umf-header">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(APP_ROUTES.users)}
              className="umf-back"
            >
              Volver al listado
            </Button>
            <Title className="umf-title" level={2}>
              {tituloSeccion}
            </Title>
          </div>
        }
      >
        <Col xs={24} className="umf-form-col">
          {renderForm()}
        </Col>
      </Card>
      <Modal
          title="Seleccionar Tipo de Usuario y Jornada"
          open={modalVisible}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
        >
          <Form layout="vertical">
            {/* Selector de Tipo de Usuario */}
            <Form.Item label="Tipo de Usuario" required>
              <Select value={tipoUsuario} onChange={handleUsuarioChange}>
                <Option value="Trabajador">Trabajador</Option>
                <Option value="Supervisor">Supervisor</Option>
              </Select>
            </Form.Item>

            {/* Selector de Tipo de Jornada */}
            <Form.Item label="Tipo de Jornada" required>
              <Select value={tipoJornada} onChange={handleJornadaChange}>
                {jornadas.map((jornada) => (
                  <Option key={jornada.id_jornada} value={jornada.id_jornada}>
                    {jornada.nombre}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
    </Layout>
  );
};

export default UserManagementForm;
