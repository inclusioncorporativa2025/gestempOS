import React, { useState } from 'react';
import { App as AntApp, Button, Input, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { editMiPerfil } from '../../features/user/usuarioService';

const { Text } = Typography;

const FpSeccionContrasena = () => {
  const { message } = AntApp.useApp();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');

  const reset = () => {
    setActual('');
    setNueva('');
    setConfirmacion('');
    setEditing(false);
  };

  const guardar = async () => {
    if (!nueva) {
      message.info('Introduce una nueva contraseña o cancela');
      return;
    }
    if (String(nueva).length < 8) {
      message.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (nueva !== confirmacion) {
      message.error('Las contraseñas no coinciden');
      return;
    }
    if (!actual) {
      message.error('Introduce tu contraseña actual');
      return;
    }

    setSaving(true);
    try {
      await editMiPerfil({
        contrasenaActual: actual,
        contrasenaNueva: nueva,
      });
      message.success('Contraseña actualizada');
      reset();
    } catch (error) {
      message.error(error.message || 'No se pudo cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="fp-dato fp-dato--editable">
        <Text type="secondary" className="fp-dato__label">
          Contraseña
        </Text>
        <div className="fp-dato__valor-row">
          <span className="fp-dato__valor fp-dato__valor--inline fp-dato__valor--muted">••••••••</span>
          <button
            type="button"
            className="fp-dato__edit-btn"
            onClick={() => setEditing(true)}
            aria-label="Cambiar contraseña"
          >
            <EditOutlined />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fp-dato fp-dato--editing fp-dato--contrasena">
      <Text type="secondary" className="fp-dato__label">
        Cambiar contraseña
      </Text>
      <div className="fp-dato__contrasena-grid">
        <Input.Password
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          placeholder="Contraseña actual"
          autoComplete="current-password"
        />
        <Input.Password
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          placeholder="Nueva contraseña (mín. 8)"
          autoComplete="new-password"
        />
        <Input.Password
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          placeholder="Confirmar nueva contraseña"
          autoComplete="new-password"
        />
      </div>
      <div className="fp-dato__acciones">
        <Button size="small" disabled={saving} onClick={reset}>
          Cancelar
        </Button>
        <Button size="small" type="primary" loading={saving} onClick={guardar}>
          Guardar
        </Button>
      </div>
    </div>
  );
};

export default FpSeccionContrasena;
