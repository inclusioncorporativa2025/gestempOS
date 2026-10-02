import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { Button, Modal, Progress, Typography } from 'antd';

import {

  CheckCircleFilled,

  CloseOutlined,

  DownOutlined,

  UpOutlined,

  ArrowRightOutlined,

} from '@ant-design/icons';

import { getIdEmpresa } from '../../utils/authSession';

import {

  cerrarOnboarding,

  omitirOnboarding,

} from '../../features/onboarding/onboardingService';

import './OnboardingHeaderPanel.css';



const { Text } = Typography;



const OnboardingHeaderPanel = ({ data, minimized, onToggleMinimized, onClosed }) => {

  const navigate = useNavigate();

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [closing, setClosing] = useState(false);



  if (!data?.pasos?.length) {

    return null;

  }



  const todosCompletados = Boolean(

    data.todosCompletados ?? (data.total > 0 && data.completados === data.total),

  );

  const pct = data.total ? Math.round((data.completados / data.total) * 100) : 0;



  const irPaso = (ruta) => {

    if (ruta) navigate(ruta);

  };



  const ejecutarCierreForzado = async () => {

    setClosing(true);

    try {

      const res = await omitirOnboarding(getIdEmpresa());

      setConfirmOpen(false);

      onClosed?.(res);

    } catch {

      /* ignore */

    } finally {

      setClosing(false);

    }

  };



  const ejecutarCierreFelicitacion = async () => {

    setClosing(true);

    try {

      const res = await cerrarOnboarding(getIdEmpresa());

      onClosed?.(res);

    } catch {

      /* ignore */

    } finally {

      setClosing(false);

    }

  };



  const handleClickCerrar = () => {

    if (todosCompletados) {

      ejecutarCierreFelicitacion();

    } else {

      setConfirmOpen(true);

    }

  };



  if (minimized) {

    return (

      <div className="onboarding-header-bar onboarding-header-bar--minimized">

        <button

          type="button"

          className="onboarding-header-bar__min-trigger"

          onClick={() => onToggleMinimized(false)}

        >

          {todosCompletados ? (

            <CheckCircleFilled className="onboarding-header-bar__min-done-icon" aria-hidden />

          ) : null}

          <Text className="onboarding-header-bar__min-title">

            {todosCompletados ? 'Guía completada' : data.titulo}

          </Text>

          <Text type="secondary" className="onboarding-header-bar__min-meta">

            {data.completados}/{data.total}

          </Text>

          <UpOutlined className="onboarding-header-bar__min-icon" aria-hidden />

        </button>

      </div>

    );

  }



  if (todosCompletados) {

    return (

      <div

        className="onboarding-header-bar onboarding-header-bar--success"

        aria-label="Guía de inicio completada"

      >

        <CheckCircleFilled className="onboarding-header-bar__success-icon" aria-hidden />

        <Text className="onboarding-header-bar__success-msg">
          Has completado todos los pasos.
          <span className="onboarding-header-bar__success-hint"> Cierra con la X cuando quieras.</span>
        </Text>

        <Button

          type="text"

          size="small"

          className="onboarding-header-bar__icon-btn"

          icon={<CloseOutlined />}

          aria-label="Cerrar guía"

          loading={closing}

          onClick={handleClickCerrar}

        />

      </div>

    );

  }



  return (

    <>

      <div className="onboarding-header-bar" aria-label="Guía de inicio">

        <div className="onboarding-header-bar__top">

          <div className="onboarding-header-bar__heading">

            <Text strong className="onboarding-header-bar__title">

              {data.titulo}

            </Text>

            <Text type="secondary" className="onboarding-header-bar__meta">

              {data.completados}/{data.total} completados

            </Text>

          </div>

          <Progress

            percent={pct}

            showInfo={false}

            strokeColor="#6366f1"

            trailColor="rgba(99, 102, 241, 0.12)"

            size="small"

            className="onboarding-header-bar__progress"

          />

          <div className="onboarding-header-bar__actions">

            <Button

              type="text"

              size="small"

              className="onboarding-header-bar__icon-btn"

              icon={<DownOutlined />}

              aria-label="Minimizar guía"

              onClick={() => onToggleMinimized(true)}

            />

            <Button

              type="text"

              size="small"

              className="onboarding-header-bar__icon-btn"

              icon={<CloseOutlined />}

              aria-label="Cerrar guía antes de tiempo"

              onClick={handleClickCerrar}

            />

          </div>

        </div>

        <ul className="onboarding-header-bar__list">

          {data.pasos.map((paso) => (

            <li

              key={paso.codigo}

              className={[

                'onboarding-header-bar__item',

                paso.hecho ? 'onboarding-header-bar__item--done' : '',

              ].filter(Boolean).join(' ')}

            >

              <span className="onboarding-header-bar__check" aria-hidden>

                {paso.hecho ? (

                  <CheckCircleFilled />

                ) : (

                  <span className="onboarding-header-bar__check-empty" />

                )}

              </span>

              <span className="onboarding-header-bar__item-title">{paso.titulo}</span>

              {!paso.hecho && paso.ruta && (
                <button
                  type="button"
                  className="onboarding-header-bar__go"
                  aria-label={`Ir a ${paso.titulo}`}
                  onClick={() => irPaso(paso.ruta)}
                >
                  <ArrowRightOutlined />
                </button>
              )}

            </li>

          ))}

        </ul>

      </div>



      <Modal

        title="¿Cerrar la guía de inicio?"

        open={confirmOpen}

        onCancel={() => setConfirmOpen(false)}

        okText="Cerrar guía"

        cancelText="Seguir con los pasos"

        okButtonProps={{ danger: true, loading: closing }}

        onOk={ejecutarCierreForzado}

        destroyOnClose

      >

        <p>

          La guía no volverá a mostrarse en tu cuenta para esta empresa.

        </p>

        <p>

          <strong>Todos los pasos se marcarán como completados</strong>, aunque no los hayas

          realizado todavía.

        </p>

      </Modal>

    </>

  );

};



export default OnboardingHeaderPanel;


