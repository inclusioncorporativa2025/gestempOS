import React, { useEffect, useMemo, useState } from 'react';
import { Menu, Select, Typography } from 'antd';
import PrenominasPanel from '../components/PrenominasPanel';
import NominasDefinitivasPanel from '../components/NominasDefinitivasPanel';
import './NominasPage.css';

const { Title, Text } = Typography;

const MOBILE_BREAKPOINT = 950;

const SUBTITULOS = {
  prenominas: 'Previsión de coste laboral bruto de todo el personal (uso interno empresa)',
  definitivas: 'Sube y gestiona los PDF de las nóminas definitivas con neto e impuestos',
};

const NominasPage = () => {
  const [activeKey, setActiveKey] = useState('prenominas');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const submenuItems = useMemo(() => ([
    { key: 'prenominas', label: 'Coste bruto estimado' },
    { key: 'definitivas', label: 'Nóminas definitivas' },
  ]), []);

  const renderContenido = () => {
    if (activeKey === 'definitivas') return <NominasDefinitivasPanel />;
    return <PrenominasPanel />;
  };

  return (
    <div className="nominas-layout">
      <Title level={3} className="nominas-layout__title">
        Nóminas
      </Title>
      <Text type="secondary" className="nominas-layout__subtitle">
        {SUBTITULOS[activeKey]}
      </Text>

      <div className="nominas-layout__nav">
        {isMobile ? (
          <Select
            className="nominas-layout__select"
            value={activeKey}
            options={submenuItems.map(({ key, label }) => ({ value: key, label }))}
            onChange={setActiveKey}
            aria-label="Sección de nóminas"
          />
        ) : (
          <Menu
            className="nominas-layout__menu"
            mode="horizontal"
            selectedKeys={[activeKey]}
            items={submenuItems}
            onClick={({ key }) => setActiveKey(key)}
          />
        )}
      </div>

      <div className="nominas-layout__content">
        {renderContenido()}
      </div>
    </div>
  );
};

export default NominasPage;
