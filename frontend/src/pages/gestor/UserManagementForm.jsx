import React, { useState, useEffect } from 'react';
import { Modal,Layout, Card, Row, Col, Button, Form, Input, notification, Upload, Typography, Select, message } from 'antd';
import { UserAddOutlined, UploadOutlined, InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx'; // Importamos la biblioteca para manejar Excel

import { crearUsuario, importarUsuariosEmpresa } from '../../features/user/usuarioService';
import { SUPPORT_EMAIL } from '../../constants/support';
import { obtenerJornadas, obtenerJornadasByIdEmpresa } from "../../features/jornada/jornadaService";
import './UserManagementForm.css';

const { Dragger } = Upload;
const { Title } = Typography;
const { Option } = Select;

const etiquetaTipoUsuario = (tipoUsuario) => {
  if (String(tipoUsuario) === '4') return 'Supervisor';
  if (String(tipoUsuario) === '5') return 'Empleado';
  if (String(tipoUsuario) === '6') return 'Inspector';
  return 'Usuario';
};

const mostrarAlertaSinPlazas = (response) => {
  Modal.warning({
    title: 'Sin plazas disponibles',
    content: (
      <div>
        <p>{response?.message || 'No tiene plazas disponibles para dar de alta a más usuarios.'}</p>
        {response?.licencias != null && (
          <p style={{ marginTop: 8 }}>
            Licencias contratadas: <strong>{response.licencias}</strong>
            {' · '}
            En uso: <strong>{response.usadas}</strong>
          </p>
        )}
        <p style={{ marginTop: 12 }}>
          Póngase en contacto con soporte en{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> para solicitar más licencias.
        </p>
      </div>
    ),
    okText: 'Entendido',
  });
};

const UserManagementForm = () => {
  const [selectedButton, setSelectedButton] = useState(null); // Estado para manejar el botón seleccionado
  const [fileList, setFileList] = useState([]); // Estado para manejar los archivos subidos
  const [jornadas, setJornadas] = useState([]); // Estado para almacenar las jornadas recuperadas de la API
  const [modalVisible, setModalVisible] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState('Trabajador');
  const [tipoJornada, setTipoJornada] = useState('');
  const [inviteForm] = Form.useForm();
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

  const handleButtonClick = (buttonType) => {
    setSelectedButton(buttonType);
  };

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
    try {
      const response = await crearUsuario(values.email, values.nombreCompleto, values.Identificador, 6, null);
      if (!response.creada) {
        if (response.codigo === 'LICENCIAS_AGOTADAS') {
          mostrarAlertaSinPlazas(response);
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

  const enviarInvitacion = async (values) => {
    try {
      const response = await crearUsuario(values.email, values.nombreCompleto, values.dni, values.tipoUsuario, values.tipoHorario);
      if (!response.creada) {
        if (response.codigo === 'LICENCIAS_AGOTADAS') {
          mostrarAlertaSinPlazas(response);
        } else {
          notification.error({
            message: response.message,
            description: response.message,
          });
        }
      } else if (response.emailInvitacionEnviado === false) {
        inviteForm.resetFields();
        const tipo = etiquetaTipoUsuario(values.tipoUsuario);
        notification.warning({
          message: `${tipo} "${values.nombreCompleto}" creado, pero no se pudo enviar el email de invitación.`,
          description: 'Puede usar «Olvidé mi contraseña» con su correo para activar la cuenta.',
        });
      } else {
        inviteForm.resetFields();
        const tipo = etiquetaTipoUsuario(values.tipoUsuario);
        notification.success({
          message: `${tipo} "${values.nombreCompleto}" creado, se le ha enviado el email de invitación.`,
        });
      }
    } catch (error) {
      notification.error({
        message: error.message,
        description: `Error enviando invitación a ${values.email}.`,
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
    if (selectedButton === 'addUser') {
      return (
        <Card title="Alta de Usuario">
          <Form layout="vertical" onFinish={enviarInvitacion}>
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
              label="DNI"
              name="dni"
              rules={[{ required: true, message: 'Por favor, ingresa un dni válido' }]}>
              <Input placeholder="Ingresa el dni" />
            </Form.Item>

            {/* Selector de tipo de horario */}
            <Form.Item
              label="Tipo de Horario"
              name="tipoHorario"
              rules={[{ required: true, message: 'Por favor, selecciona un tipo de horario' }]}>
              <Select placeholder="Selecciona el tipo de horario">
                {jornadas.map((jornada) => (
                  <Option key={jornada.id_jornada} value={jornada.id_jornada}>
                    {jornada.nombre}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* Selector de tipo de usuario */}
            <Form.Item
              label="Tipo de Usuario"
              name="tipoUsuario"
              rules={[{ required: true, message: 'Por favor, selecciona un tipo de usuario' }]}>
              <Select placeholder="Selecciona el tipo de usuario">
                <Option value="5">Empleado</Option>
                <Option value="4">Supervisor</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button type="primary" className="colorPrincipal" block htmlType="submit">
                Enviar Invitación
              </Button>
            </Form.Item>
          </Form>
        </Card>
      );
    } else if (selectedButton === 'importUsers') {
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
                  <Button type="primary" className="colorPrincipal" block onClick={importarUsuarios} disabled={fileList.length === 0}>
                    Aceptar
                  </Button>
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
            <Button type="primary" className="colorPrincipal" block htmlType="submit">
              Enviar Invitación
            </Button>
          </Form.Item>
        </Form>
      </Card>
    );
  }
    return null; // No se muestra nada si no hay botón seleccionado
  };

  return (
    <Layout className="umf-layout">
      <Card title={<Title className="umf-title" level={2}>Gestion De Usuarios</Title>}>
        <Row xs={21} sm={12} md={12} lg={12} xl={12} xxl={12} className="umf-btn-row">
          <Col className="umf-btn-col">
            <Button
              className={selectedButton === 'addUser' ? 'colorPrincipal' : ''}
              type={selectedButton === 'addUser' ? 'primary' : 'text'}
              icon={<UserAddOutlined />}
              onClick={() => handleButtonClick('addUser')}>
              Enviar Invitación
            </Button>
          </Col>
          <Col className="umf-btn-col">
            <Button
              className={selectedButton === 'importUsers' ? 'colorPrincipal' : ''}
              type={selectedButton === 'importUsers' ? 'primary' : 'text'}
              icon={<UploadOutlined />}
              onClick={() => handleButtonClick('importUsers')}>
              Importar Usuarios
            </Button>
          </Col>
          <Col className="umf-btn-col">
            <Button
              className={selectedButton === 'addInspector' ? 'colorPrincipal' : ''}
              type={selectedButton === 'addInspector' ? 'primary' : 'text'}
              icon={<UserAddOutlined />}
              onClick={() => handleButtonClick('addInspector')}>
              Invitar Inspector
            </Button>
          </Col>
        </Row>
      </Card>

      <Col xs={21} sm={12} md={12} lg={12} xl={12} xxl={12} className="umf-form-col">
        {renderForm()}
      </Col>
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
