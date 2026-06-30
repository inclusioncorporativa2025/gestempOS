import React, { useMemo, useState } from 'react';
import { Menu, Typography } from 'antd';
import PrenominasPanel from '../components/PrenominasPanel';
import NominasDefinitivasPanel from '../components/NominasDefinitivasPanel';
import './NominasPage.css';

const { Title, Text } = Typography;

const SUBTITULOS = {
  prenominas: 'Calcula y revisa la prenómina mensual de todo el personal',
  definitivas: 'Sube y gestiona los PDF de las nóminas definitivas',
};

const NominasPage = () => {
  const [activeKey, setActiveKey] = useState('prenominas');

  const submenuItems = useMemo(() => ([
    { key: 'prenominas', label: 'Prenóminas' },
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

      <Menu
        className="nominas-layout__menu"
        mode="horizontal"
        selectedKeys={[activeKey]}
        items={submenuItems}
        onClick={({ key }) => setActiveKey(key)}
      />

      <div className="nominas-layout__content">
        {renderContenido()}
      </div>
    </div>
  );
};

export default NominasPage;
