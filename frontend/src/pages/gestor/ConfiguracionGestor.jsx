import { Layout ,Typography} from 'antd';
import React, { useState } from 'react';
import GestionTipoAccesoCard from '../../components/cards/GestionTipoAccesoCard';
import GestionTipoUsuariosCard from '../../components/cards/GestionTipoUsuariosCard';
import GestionTurnosCard from '../../components/cards/GestionTurnosCard';
import './ConfiguracionGestor.css';

const { Title } = Typography;

const ConfiguracionGestor = () => {
    const [selectedOption, setSelectedOption] = useState(null);


    const renderContent = () => {
        switch (selectedOption) {
            case 'turnos':
                return <GestionTurnosCard />;
            case 'usuarios':
                   return <GestionTipoUsuariosCard/>;
            case 'accesos':
                return <GestionTipoAccesoCard />;
            default:
                return <p></p>;
        }
    };

    return (
        <Layout className="config-gestor-layout">
            <GestionTipoUsuariosCard />
            {/* <Card title={<Title level={2} style={{ textAlign: 'center' }}>Panel De Configuración</Title>}>
                <Row justify="center" gutter={[16, 16]} style={{ marginBottom: '20px' }}>
                    
                <Col xs={24} sm={12} md={8} lg={8} xl={8} xxl={4}>
                        <Button
                            type="primary"
                            className="colorPrincipal"
                            style={{ width: '100%' }}
                            onClick={() => setSelectedOption('accesos')}
                            icon={<KeyOutlined style={{ fontSize: '20px' }} />}
                        >
                            Gestionar Tipo Acceso
                        </Button>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8} xxl={4}>
                        <Button
                            type="primary"
                            className="colorPrincipal"
                            style={{ width: '100%' }}
                            onClick={() => setSelectedOption('usuarios')}
                            icon={<UserOutlined style={{ fontSize: '20px' }} />}
                        >
                            Gestionar Tipo Usuarios
                        </Button>
                    </Col>
                    
                </Row>
                <div style={{ marginTop: '20px' }}>
                    {renderContent()}
                </div>
            </Card> */}
        </Layout>
    );
};

export default ConfiguracionGestor;
