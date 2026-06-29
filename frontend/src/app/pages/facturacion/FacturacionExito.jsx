import React, { useEffect, useState } from 'react';

import { useNavigate, useSearchParams, Link } from 'react-router-dom';

import { Result, Button, Spin } from 'antd';

import { CheckCircleOutlined } from '@ant-design/icons';

import { APP_ROUTES } from '../../../constants/routes';

import { verificarSesionCheckout } from '../../../features/billing/billingService';

import { TRIAL_EXPIRED_EVENT } from '../../../hooks/useTrialStatus';

import { getAuthToken } from '../../../utils/authSession';

import './Facturacion.css';



const sesionCompletada = (sesion) =>

  sesion?.status === 'complete' &&

  (sesion.paymentStatus === 'paid' || sesion.paymentStatus === 'no_payment_required');



const FacturacionExito = () => {

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get('session_id');

  const [verificando, setVerificando] = useState(Boolean(sessionId));

  const [ok, setOk] = useState(!sessionId);

  const autenticado = Boolean(getAuthToken());



  useEffect(() => {

    if (!sessionId) return undefined;



    let cancelado = false;

    let intentos = 0;

    const maxIntentos = 8;



    const comprobar = async () => {

      try {

        const sesion = await verificarSesionCheckout(sessionId);

        if (cancelado) return;



        if (sesionCompletada(sesion)) {

          setOk(true);

          setVerificando(false);

          window.dispatchEvent(new CustomEvent(TRIAL_EXPIRED_EVENT, {

            detail: {

              trial: { expirada: false, activa: true, requierePlan: false },

            },

          }));

          return;

        }

      } catch {

        // reintentar

      }



      intentos += 1;

      if (intentos < maxIntentos) {

        setTimeout(comprobar, 1500);

      } else {

        setOk(true);

        setVerificando(false);

      }

    };



    comprobar();



    return () => {

      cancelado = true;

    };

  }, [sessionId]);



  if (verificando) {

    return (

      <div className="facturacion-result app-page">

        <Spin size="large" />

        <p style={{ textAlign: 'center', marginTop: 16 }}>

          Confirmando tu método de pago con Stripe…

        </p>

      </div>

    );

  }



  const irInicio = () => navigate(APP_ROUTES.home);

  const irLogin = () => navigate(APP_ROUTES.login);



  return (

    <div className="facturacion-result app-page">

      <Result

        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}

        status="success"

        title="¡Periodo de prueba activado!"

        subTitle={

          ok

            ? autenticado

              ? 'Tu prueba de 15 días está activa. No se cobrará nada hasta que finalice y puedes cancelar en cualquier momento antes, sin compromiso.'

              : 'Hemos guardado tu tarjeta. Revisa el correo del administrador para establecer tu contraseña e iniciar sesión.'

            : 'Hemos recibido tu solicitud. Si el acceso no se activa en unos minutos, contacta con soporte.'

        }

        extra={[

          autenticado ? (

            <Button type="primary" key="home" onClick={irInicio}>

              Ir al inicio

            </Button>

          ) : (

            <Button type="primary" key="login" onClick={irLogin}>

              Ir a iniciar sesión

            </Button>

          ),

          !autenticado && (

            <Button key="login-link" type="link">

              <Link to={APP_ROUTES.login}>¿Ya tienes contraseña? Acceder</Link>

            </Button>

          ),

        ].filter(Boolean)}

      />

    </div>

  );

};



export default FacturacionExito;

