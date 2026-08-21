import React from 'react';

const lineStyle = { margin: '0 0 8px' };
const lastLineStyle = { margin: 0 };

export const TooltipTipoHoraContent = ({ includeHeredar = false }) => (
  <div style={{ maxWidth: 360, fontSize: 13, lineHeight: 1.55 }}>
    <p style={lineStyle}>
      Indica cómo se tratan las horas que superan (o no alcanzan) la jornada
      pactada del mes: <strong>horas fichadas − jornada pactada ajustada</strong>.
      En jornada flexible, la referencia mensual se prorratea y se descuentan
      las ausencias aprobadas del mes.
    </p>
    <p style={lineStyle}>
      <strong>Extra</strong> — Para <strong>jornada completa</strong>. El exceso se
      registra como hora extra. En derecho laboral español suele llevar{' '}
      <strong>recargo mínimo del 75%</strong> (Estatuto de los Trabajadores, art. 35).
      Timecor aplica factor <strong>1,75×</strong> en prenómina.
    </p>
    <p style={lineStyle}>
      <strong>Complementaria</strong> — Para <strong>tiempo parcial</strong>. Horas
      trabajadas por encima de la jornada parcial pactada, pagadas al{' '}
      <strong>precio hora normal</strong> (sin recargo del 75%).
    </p>
    <p style={includeHeredar ? lineStyle : lastLineStyle}>
      <strong>Bolsa de horas</strong> — El saldo (+/−) se acumula para compensar después.
      No genera devengo automático en prenómina (línea informativa).
    </p>
    {includeHeredar && (
      <p style={lastLineStyle}>
        <strong>Heredar de la jornada</strong> — Usa el tipo configurado en la plantilla
        de jornada laboral del personal (recomendado).
      </p>
    )}
  </div>
);

export const tooltipTipoHoraFormItem = ({ includeHeredar = false } = {}) => ({
  title: <TooltipTipoHoraContent includeHeredar={includeHeredar} />,
  overlayStyle: { maxWidth: 400 },
});
