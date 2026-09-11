import React from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import esES from 'antd/es/locale/es_ES';

const appTheme = {
  token: {
    fontFamily: 'var(--font-family-base)',
    fontWeightStrong: 300,
    colorPrimary: '#A85CE0',
    colorBgLayout: '#F6F2FA',
    colorBgContainer: '#FFFFFF',
    borderRadius: 12,
    controlHeight: 42,
  },
  components: {
    Input: {
      borderRadius: 999,
      controlHeight: 42,
      paddingInline: 16,
      lineWidth: 0,
      colorBorder: 'transparent',
      hoverBorderColor: 'transparent',
      activeBorderColor: 'transparent',
      activeShadow: '0 4px 18px rgba(168, 92, 224, 0.16)',
    },
    Select: {
      borderRadius: 999,
      controlHeight: 42,
      lineWidth: 0,
      colorBorder: 'transparent',
      hoverBorderColor: 'transparent',
      activeBorderColor: 'transparent',
    },
    DatePicker: {
      borderRadius: 999,
      controlHeight: 42,
      lineWidth: 0,
      colorBorder: 'transparent',
      hoverBorderColor: 'transparent',
      activeBorderColor: 'transparent',
    },
    InputNumber: {
      borderRadius: 999,
      controlHeight: 42,
      lineWidth: 0,
      colorBorder: 'transparent',
      hoverBorderColor: 'transparent',
      activeBorderColor: 'transparent',
    },
  },
};

const AntDesignProvider = ({ children }) => (
  <ConfigProvider locale={esES} theme={appTheme}>
    <AntApp>{children}</AntApp>
  </ConfigProvider>
);

export default AntDesignProvider;
