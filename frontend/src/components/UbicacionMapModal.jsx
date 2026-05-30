import React, { useEffect, useState } from 'react';
import { Modal, Typography, Spin } from 'antd';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { getDireccionDesdeCoords } from '../features/fichaje/fichajeService';
import 'leaflet/dist/leaflet.css';
import './UbicacionMapModal.css';

const { Text } = Typography;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const MapResize = ({ open }) => {
  const map = useMap();
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(timer);
  }, [open, map]);
  return null;
};

const UbicacionMapModal = ({ open, onClose, ubicacion }) => {
  const [direccion, setDireccion] = useState('');
  const [loadingDireccion, setLoadingDireccion] = useState(false);

  const lat = ubicacion?.lat;
  const lng = ubicacion?.lng;
  const label = ubicacion?.label;

  const titulo =
    label === 'entrada'
      ? 'Ubicación de entrada'
      : label === 'salida'
        ? 'Ubicación de salida'
        : 'Ubicación';

  useEffect(() => {
    if (!open || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setDireccion('');
      setLoadingDireccion(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingDireccion(true);
    setDireccion('');

    getDireccionDesdeCoords(lat, lng)
      .then((texto) => {
        if (!cancelled) setDireccion(texto);
      })
      .catch(() => {
        if (!cancelled) setDireccion('');
      })
      .finally(() => {
        if (!cancelled) setLoadingDireccion(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, lat, lng]);

  if (!ubicacion) return null;

  return (
    <Modal
      title={titulo}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      centered
      destroyOnClose
      className="ubicacion-map-modal"
    >
      <div className="ubicacion-map-address-block">
        <Text className="ubicacion-map-address-label">Dirección</Text>
        {loadingDireccion ? (
          <Spin size="small" className="ubicacion-map-address-spin" />
        ) : (
          <Text className="ubicacion-map-address">
            {direccion || 'No se pudo obtener la dirección para estas coordenadas.'}
          </Text>
        )}
      </div>

      <div className="ubicacion-map-wrap">
        <MapContainer
          center={[lat, lng]}
          zoom={16}
          scrollWheelZoom
          className="ubicacion-map"
        >
          <MapResize open={open} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]}>
            <Popup>{direccion || titulo}</Popup>
          </Marker>
        </MapContainer>
      </div>

      <Text type="secondary" className="ubicacion-map-coords">
        Coordenadas: {lat.toFixed(6)}, {lng.toFixed(6)}
      </Text>
      <Text type="secondary" className="ubicacion-map-hint">
        Dirección obtenida a partir del GPS al fichar (OpenStreetMap). La precisión depende del dispositivo.
      </Text>
    </Modal>
  );
};

export default UbicacionMapModal;
