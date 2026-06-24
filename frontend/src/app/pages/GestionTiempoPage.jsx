import React, { useMemo, useState } from 'react';
import { Menu, Typography } from 'antd';
import { getTipoUsuario } from '../../utils/authSession';
import { usePlan } from '../../hooks/usePlan';
import PresenciaPersonalPanel from './PresenciaPersonalPanel';
import TimeLogsPanel from './TimeLogsPanel';
import AusenciasPanel from './AusenciasPanel';
import './GestionTiempoPage.css';

const { Title, Text } = Typography;

/** Presencia del equipo: gestión de personal, no del propio empleado (tipo 5) */
const ROLES_PRESENCIA_EQUIPO = [1, 2, 3, 4];

const SUBTITULOS = {
  presencia: 'Consulta en tiempo real quién está trabajando',
  'mi-registro': 'Consulta y gestiona tus fichajes',
  ausencias: 'Días solicitados: vacaciones, bajas, asuntos propios y días retribuidos',
};

const GestionTiempoPage = () => {
  const tipoUsuario = Number(getTipoUsuario());
  const { tieneFeature } = usePlan();
  const puedeVerPresenciaEquipo = ROLES_PRESENCIA_EQUIPO.includes(tipoUsuario);
  const puedeVerAusencias = tieneFeature('ausencias_basicas');

  const submenuItems = useMemo(() => {
    const items = [];
    if (puedeVerPresenciaEquipo) {
      items.push({ key: 'presencia', label: 'Personal en jornada' });
    }
    items.push({ key: 'mi-registro', label: 'Mi registro' });
    if (puedeVerAusencias) {
      items.push({ key: 'ausencias', label: 'Ausencias' });
    }
    return items;
  }, [puedeVerPresenciaEquipo, puedeVerAusencias]);

  const defaultKey = puedeVerPresenciaEquipo ? 'presencia' : 'mi-registro';
  const [activeKey, setActiveKey] = useState(defaultKey);

  if (!puedeVerPresenciaEquipo && !puedeVerAusencias) {
    return <TimeLogsPanel />;
  }

  const mostrarSubmenu = submenuItems.length > 1;

  const renderContenido = () => {
    if (activeKey === 'presencia') return <PresenciaPersonalPanel />;
    if (activeKey === 'ausencias') return <AusenciasPanel />;
    return <TimeLogsPanel />;
  };

  return (
    <div className="gt-layout">
      <Title level={3} className="gt-layout__title">
        Gestión Tiempo
      </Title>
      <Text type="secondary" className="gt-layout__subtitle">
        {SUBTITULOS[activeKey] || SUBTITULOS['mi-registro']}
      </Text>

      {mostrarSubmenu && (
        <Menu
          className="gt-layout__menu"
          mode="horizontal"
          selectedKeys={[activeKey]}
          items={submenuItems}
          onClick={({ key }) => setActiveKey(key)}
        />
      )}

      <div className="gt-layout__content">
        {renderContenido()}
      </div>
    </div>
  );
};

export default GestionTiempoPage;
