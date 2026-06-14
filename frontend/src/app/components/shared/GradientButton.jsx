import React from 'react';
import './GradientButton.css';

const GradientButton = React.forwardRef(({
  text,
  children,
  iconStart,
  iconEnd,
  suffix,
  className = '',
  type = 'button',
  shape = 'pill',
  size = 'default',
  block = false,
  disabled = false,
  loading = false,
  onClick,
  ...rest
}, ref) => {
  const label = children ?? text;
  const isDisabled = disabled || loading;

  return (
    <span
      className={[
        'gradient-btn-ring',
        shape === 'default' ? 'gradient-btn-ring--square' : '',
        block ? 'gradient-btn-ring--block' : '',
      ].filter(Boolean).join(' ')}
    >
      <button
      ref={ref}
      type={type}
      className={[
        'gradient-btn',
        shape === 'default' ? 'gradient-btn--square' : '',
        size === 'small' ? 'gradient-btn--small' : '',
        size === 'large' ? 'gradient-btn--large' : '',
        block ? 'gradient-btn--block' : '',
        loading ? 'gradient-btn--loading' : '',
        className,
      ].filter(Boolean).join(' ')}
      disabled={isDisabled}
      onClick={onClick}
      {...rest}
    >
      {loading && <span className="gradient-btn__spinner" aria-hidden="true" />}
      {iconStart && (
        <span className="gradient-btn__icon gradient-btn__icon--start">{iconStart}</span>
      )}
      {label != null && label !== '' && (
        <span className="gradient-btn__text">{label}</span>
      )}
      {iconEnd && (
        <span className="gradient-btn__icon gradient-btn__icon--end">{iconEnd}</span>
      )}
      {suffix && <span className="gradient-btn__suffix">{suffix}</span>}
    </button>
    </span>
  );
});

GradientButton.displayName = 'GradientButton';

export default GradientButton;
