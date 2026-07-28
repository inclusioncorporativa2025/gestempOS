import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { selectEmpresa as apiSelectEmpresa } from '../api/authApi';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const SelectEmpresaScreen = ({ route, navigation }) => {
  const { login } = useAuth();
  const { preAuthToken, empresas = [], usuario } = route.params || {};
  const [seleccionada, setSeleccionada] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirmar = async () => {
    if (!seleccionada) {
      setError('Selecciona una empresa');
      return;
    }
    if (!preAuthToken) {
      setError('Sesión de selección no válida. Vuelve a iniciar sesión.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await apiSelectEmpresa(preAuthToken, seleccionada);
      if (data.token) {
        await login(data.token);
        return;
      }
      setError('No se recibió el token de sesión');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo completar el acceso',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Selecciona tu empresa</Text>
        <Text style={styles.subtitle}>
          {usuario?.nombre
            ? `Hola, ${usuario.nombre}. Elige con cuál acceder.`
            : 'Tu cuenta está vinculada a varias empresas.'}
        </Text>
      </View>

      <FlatList
        data={empresas}
        keyExtractor={(item) => String(item.id_empresa)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const activa = seleccionada === item.id_empresa;
          return (
            <Pressable
              style={[styles.item, activa && styles.itemActive]}
              onPress={() => setSeleccionada(item.id_empresa)}
              disabled={loading}
            >
              <Text style={styles.itemTitle}>{item.nombre}</Text>
              {item.alias ? (
                <Text style={styles.itemAlias}>{item.alias}</Text>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={(
          <Text style={styles.empty}>No hay empresas disponibles</Text>
        )}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, (loading || !seleccionada) && styles.buttonDisabled]}
        onPress={handleConfirmar}
        disabled={loading || !seleccionada}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continuar</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.backLink}
        onPress={() => navigation.navigate('Login')}
        disabled={loading}
      >
        <Text style={styles.backLinkText}>Volver al login</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f0fa',
    padding: 20,
    paddingTop: 48,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a2332',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#5a6472',
    lineHeight: 22,
  },
  list: {
    paddingBottom: 12,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#faf5ff',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2332',
  },
  itemAlias: {
    marginTop: 4,
    fontSize: 13,
    color: '#5a6472',
  },
  empty: {
    textAlign: 'center',
    color: '#5a6472',
    marginTop: 24,
  },
  error: {
    color: '#dc2626',
    marginBottom: 10,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#7c3aed',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  backLinkText: {
    color: '#7c3aed',
    fontSize: 15,
  },
});

export default SelectEmpresaScreen;
