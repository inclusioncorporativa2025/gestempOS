import React, { useRef, useEffect, useCallback } from 'react';
import { Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import './SignaturePad.css';

const getPoint = (canvas, event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = event.touches?.[0]?.clientX ?? event.clientX;
  const clientY = event.touches?.[0]?.clientY ?? event.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
};

const SignaturePad = ({ onChange, width = 420, height = 160 }) => {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);

  const notifyChange = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onChange) return;
    if (!hasStrokeRef.current) {
      onChange(null);
      return;
    }
    onChange(canvas.toDataURL('image/png'));
  }, [onChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    hasStrokeRef.current = false;
    notifyChange();
  }, [notifyChange]);

  useEffect(() => {
    clear();
  }, [clear]);

  const startDraw = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    const { x, y } = getPoint(canvas, event);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getPoint(canvas, event);
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    hasStrokeRef.current = true;
  };

  const endDraw = (event) => {
    if (!drawingRef.current) return;
    event?.preventDefault?.();
    drawingRef.current = false;
    notifyChange();
  };

  return (
    <div className="signature-pad">
      <p className="signature-pad__hint">Firme con el ratón o el dedo en el recuadro</p>
      <canvas
        ref={canvasRef}
        className="signature-pad__canvas"
        width={width}
        height={height}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        aria-label="Área de firma manuscrita"
      />
      <Button
        type="link"
        size="small"
        icon={<DeleteOutlined />}
        onClick={clear}
        className="signature-pad__clear"
      >
        Borrar firma
      </Button>
    </div>
  );
};

export default SignaturePad;
