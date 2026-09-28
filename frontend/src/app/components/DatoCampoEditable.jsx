import React, { useEffect, useState } from 'react';
import { Button, Input, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';

const { Text } = Typography;

const DatoCampoEditable = ({
  label,
  value = '',
  editable = false,
  onSave,
  displayValue,
  renderDisplay,
  inputProps = {},
  id,
  highlight = false,
  autoStartEdit = false,
  emptyLabel = '—',
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(value ?? '');
    }
  }, [value, editing]);

  useEffect(() => {
    if (autoStartEdit && editable) {
      setEditing(true);
    }
  }, [autoStartEdit, editable]);

  const display = renderDisplay
    ? renderDisplay(value)
    : (displayValue ?? (value ? value : emptyLabel));

  if (!editable) {
    return (
      <div className="fp-dato">
        <Text type="secondary" className="fp-dato__label">
          {label}
        </Text>
        <div className="fp-dato__valor">{display}</div>
      </div>
    );
  }

  if (editing) {
    return (
      <div
        className={`fp-dato fp-dato--editing${highlight ? ' fp-dato--highlight' : ''}`}
        id={id}
      >
        <Text type="secondary" className="fp-dato__label">
          {label}
        </Text>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          {...inputProps}
        />
        <div className="fp-dato__acciones">
          <Button
            size="small"
            disabled={saving}
            onClick={() => {
              setDraft(value ?? '');
              setEditing(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            size="small"
            type="primary"
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(draft);
                setEditing(false);
              } catch {
                /* el padre muestra el error */
              } finally {
                setSaving(false);
              }
            }}
          >
            Guardar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fp-dato fp-dato--editable${highlight ? ' fp-dato--highlight' : ''}`}
      id={id}
    >
      <Text type="secondary" className="fp-dato__label">
        {label}
      </Text>
      <div className="fp-dato__valor-row">
        <span className="fp-dato__valor fp-dato__valor--inline">{display}</span>
        <button
          type="button"
          className="fp-dato__edit-btn"
          onClick={() => setEditing(true)}
          aria-label={`Editar ${label}`}
        >
          <EditOutlined />
        </button>
      </div>
    </div>
  );
};

export default DatoCampoEditable;
