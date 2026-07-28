import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getApiBaseUrl } from '../config/env';
import { useAuth } from '../auth/AuthContext';

const HomeScreen = () => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>Fase 0 · Sesión activa</Text>
      <Text style={styles.title}>Hola, {user?.nombre || 'Usuario'}</Text>
      <Text style={styles.subtitle}>
        {user?.nombre_empresa || 'Empresa'}
        {user?.alias ? ` · ${user.alias}` : ''}
      </Text>

      <View style={styles.meta}>
        <Text style={styles.metaLabel}>Plan</Text>
        <Text style={styles.metaValue}>{user?.plan_id || '—'}</Text>
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaLabel}>API</Text>
        <Text style={styles.metaValueSmall} numberOfLines={2}>
          {getApiBaseUrl()}
        </Text>
      </View>

      <Text style={styles.hint}>
        En la Fase 1 añadiremos fichaje, pausa y gestión de tiempo aquí.
      </Text>

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f0fa',
    padding: 24,
    paddingTop: 56,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ede9fe',
    color: '#6d28d9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    overflow: 'hidden',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a2332',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: '#5a6472',
    marginBottom: 24,
  },
  meta: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8c95a1',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 16,
    color: '#1a2332',
    textTransform: 'capitalize',
  },
  metaValueSmall: {
    fontSize: 13,
    color: '#1a2332',
  },
  hint: {
    marginTop: 16,
    fontSize: 14,
    color: '#5a6472',
    lineHeight: 20,
  },
  logoutBtn: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
