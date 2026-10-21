import React from 'react';
import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const PlanFeaturesInfo = ({ planName, features = [], className = 'facturacion-plan-option__info' }) => {
  if (!features?.length) return null;

  return (
    <Tooltip
      title={(
        <ul className="facturacion-plan-features-tip">
          {features.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
      placement="top"
      overlayClassName="facturacion-plan-features-tooltip"
      trigger={['hover', 'focus']}
    >
      <span
        role="button"
        tabIndex={0}
        className={className}
        aria-label={`Qué incluye el plan ${planName}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
          }
        }}
      >
        <InfoCircleOutlined aria-hidden />
      </span>
    </Tooltip>
  );
};

export default PlanFeaturesInfo;
