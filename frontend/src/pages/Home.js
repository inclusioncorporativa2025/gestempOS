import React, { useState, useEffect } from 'react';
import { Button, Typography, Col, Row, Select, message,Switch   } from 'antd';
import { PlayCircleOutlined  } from '@ant-design/icons';
import { getUltimoRegistroById } from '../features/empresas/empresasService';
import { crearRegistro } from '../features/fichaje/fichajeService';
import { getFechaEuropeMadrid } from '../utils/Helper';

const { Title } = Typography;
const { Option } = Select;

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [tipoEntrada, setTipoEntrada] = useState('');
  const [tiposRegistros, setTiposRegistros] = useState([]);
  const [horasTrabajadas, setHorasTrabajadas] = useState('00:00');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [guardarUbicacion, setGuardarUbicacion] = useState(() => {
    const saved = localStorage.getItem('guardarUbicacion');
    return saved === 'true'; 
  });
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('guardarUbicacion', guardarUbicacion);
  }, [guardarUbicacion]);
  
  const nombreUsuario = sessionStorage.getItem('nombreUsuario');
  const fetchTiposRegistros = async () => {
    try {
      const ultimoRegistro = await getUltimoRegistroById();
      const registros = [];
  
      if (ultimoRegistro && ultimoRegistro.info != null) {
        const { fecha_entrada, fecha_salida } = ultimoRegistro.info;
  
        const parseFecha = (fecha) => {
          if (!fecha) return null;
          const utcDate = new Date(fecha);
          return new Date(utcDate.getTime()); 
        };
  
        const entrada = parseFecha(fecha_entrada);
        const salida = parseFecha(fecha_salida);
  
        if (entrada && !salida && ultimoRegistro.descanso== null) {
          const ahora = getFechaEuropeMadrid();
          const diffMs = ahora.getTime() - entrada.getTime();
  
          const horas = Math.floor(diffMs / (1000 * 60 * 60));
          const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
          const formato = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
          setHorasTrabajadas(formato);
  
          registros.push({ id: 2, nombre: 'Salida' });
          registros.push({ id: 3, nombre: 'Descanso' }); // Nueva opción
  
          setTipoEntrada(2);
        } else if(ultimoRegistro.descanso!= null){
          registros.push({ id: 4, nombre: 'Fin Descanso' }); // Nueva opción
          setTipoEntrada(4);

        }else {
          registros.push({ id: 1, nombre: 'Entrada' });
          setTipoEntrada(1);
          setHorasTrabajadas('00:00');
        }
      } else {
        registros.push({ id: 1, nombre: 'Entrada' });
        setTipoEntrada(1);
        setHorasTrabajadas('00:00');
      }
  
      setTiposRegistros(registros);
    } catch (error) {
      console.error('Error al obtener los tipos de registro:', error);
      setTiposRegistros([]);
      setHorasTrabajadas('00:00');
    }
  };
  

  useEffect(() => {
    fetchTiposRegistros();
  }, []);

  const buttonEntrada = async () => {
    try {
      setLoading(true);
      const usuario = parseInt(sessionStorage.getItem('idUsuario'));
      const registroSeleccionado = tiposRegistros.find((registro) => registro.id === tipoEntrada);

      if (!registroSeleccionado) {
        message.error('Tipo de registro no válido');
        return;
      }

      const response = await crearRegistro(registroSeleccionado.id, usuario,guardarUbicacion );

      if (!response) {
        message.error('Error creando registro');
      } else {
        message.success('Registro creado');
        await fetchTiposRegistros();
      }
    } catch (error) {
      console.error('Error al crear registro:', error);
      message.error('Ocurrió un error al crear el registro');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (value) => {
    setTipoEntrada(value);
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '10px',
      }}
    >
      <Col style={{ padding: '2vh' }}>
        <Row span={24} style={{ justifyContent: 'center', marginBottom: '10px' }}>
          <Title>Hola, {nombreUsuario}</Title>
        </Row>
        <Row
          style={{
            width: '100%',
            maxWidth: '600px',
            border: '1px solid black',
            borderRadius: '10px',
            padding: '20px',
            backgroundColor: 'white',
          }}
        >

          <Col
            span={24}
            style={{
              display: 'flex',
              justifyContent: 'center',
              minHeight: '40vh',
              padding: '20px',
            }}
          >
            <Button
              shape="default"
              size="large"
              onClick={buttonEntrada}
              loading={loading}
              style={{
                color: 'white',
                backgroundColor: '#001529',
                width: '100%',
                maxWidth: '400px',
                height: '100%',
                fontSize: '1.5rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
                border: 'none',
                borderRadius: 45,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Row style={{ width: '100vw', height: '100%' }} span={24}>
                <Col span={24}></Col>
                <Col span={24}>
                  <PlayCircleOutlined style={{ marginBottom: '45px', fontSize: '8.5rem' }} />
                </Col>
              </Row>
            </Button>
          </Col>

          <Col
            span={24}
            style={{
              display: 'flex',
              alignContent: 'center',
              justifyContent: 'center',
            }}
          >
            <Row
              style={{
                width: '80%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                marginInline: '10px',
              }}
            >
              <div style={{ paddingInline: '20px' }}>
                <h3>Tipo de registro:</h3>
              </div>

              <Select
                placeholder="Selecciona el tipo de registro"
                style={{
                  width: '80%',
                  maxWidth: '400px',
                }}
                value={tipoEntrada}
                onChange={handleSelectChange}
                dropdownStyle={{
                  maxHeight: '250px',
                  overflowY: 'auto',
                  whiteSpace: 'nowrap',
                }}
                optionLabelProp="label"
              >
                {tiposRegistros.map((registro) => (
                  <Option key={registro.id} value={registro.id} label={registro.nombre}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {registro.nombre}
                    </span>
                  </Option>
                ))}
              </Select>
              <div
                style={{
                  marginTop: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',

                }}
              >
                <span>Guardar ubicación:</span>
                <Switch checked={guardarUbicacion} onChange={setGuardarUbicacion} />
              </div>
            </Row>
          </Col>
        </Row>
        
      </Col>
      
      
    </div>
  );
};

export default Home;
