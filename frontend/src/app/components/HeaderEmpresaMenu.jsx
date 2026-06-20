import React from 'react';
import { getInicialesEmpresa } from '../../utils/empresaBranding';
import './HeaderEmpresaMenu.css';

const HeaderEmpresaMenu = ({ label }) => {
  const iniciales = getInicialesEmpresa(label);

  return (
    <span className="app-header-profile app-header-profile--static">
      <span className="app-header-logo" aria-hidden="true">
        <span className="app-header-logo__initials">{iniciales}</span>
      </span>
      <span className="app-header-profile-name">{label}</span>
    </span>
  );
};

export default HeaderEmpresaMenu;
