import React from 'react';
import { Tooltip } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { useEmpresaBranding } from '../../hooks/useEmpresaBranding';
import './SidebarEmpresaBrand.css';

const SidebarEmpresaBrand = ({ collapsed = false }) => {
  const { label } = useEmpresaBranding();

  const content = (
    <div
      className={[
        'app-sider-brand',
        collapsed ? 'app-sider-brand--collapsed' : '',
      ].filter(Boolean).join(' ')}
    >
      <span className="app-sider-brand__icon-wrap" aria-hidden="true">
        <BankOutlined className="app-sider-brand__icon" />
      </span>
      {!collapsed && (
        <span className="app-sider-brand__label" title={label}>
          {label}
        </span>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip title={label} placement="right">
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default SidebarEmpresaBrand;
