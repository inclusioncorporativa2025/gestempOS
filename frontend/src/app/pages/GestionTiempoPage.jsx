import React, { useState } from 'react';
import { Menu, Typography } from 'antd';
import { getTipoUsuario } from '../../utils/authSession';
import PresenciaPersonalPanel from './PresenciaPersonalPanel';
import TimeLogsPanel from './TimeLogsPanel';
import './GestionTiempoPage.css';

const { Title, Text } = Typography;

/** Presencia del equipo: gestión de personal, no del propio empleado (tipo 5) */
const ROLES_PRESENCIA_EQUIPO = [1, 2, 3, 4];

const submenuItems = [
  { key: 'presencia', label: 'Personal en jornada' },
  { key: 'mi-registro', label: 'Mi registro' },
];

const GestionTiempoPage = () => {
  const tipoUsuario = Number(getTipoUsuario());
  const puedeVerPresenciaEquipo = ROLES_PRESENCIA_EQUIPO.includes(tipoUsuario);
  const [activeKey, setActiveKey] = useState('presencia');

  if (!puedeVerPresenciaEquipo) {
    return <TimeLogsPanel />;
  }

  return (
    <div className="gt-layout">
      <Title level={3} className="gt-layout__title">
        Gestión Tiempo
      </Title>
      <Text type="secondary" className="gt-layout__subtitle">
        Consulta en tiempo real quién está trabajando
      </Text>

      <Menu
        className="gt-layout__menu"
        mode="horizontal"
        selectedKeys={[activeKey]}
        items={submenuItems}
        onClick={({ key }) => setActiveKey(key)}
      />

      <div className="gt-layout__content">
        {activeKey === 'presencia' ? <PresenciaPersonalPanel /> : <TimeLogsPanel />}
      </div>
    </div>
  );
};

export default GestionTiempoPage;
