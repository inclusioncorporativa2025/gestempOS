import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { login as apiLogin } from '../api/authApi';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm || !password) {
      setError('Introduce email y contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await apiLogin(emailNorm, password);

      if (data.code === 'EMPRESA_SELECTION_REQUIRED') {
        navigation.navigate('SelectEmpresa', {
          preAuthToken: data.preAuthToken,
          empresas: data.empresas || [],
          usuario: data.usuario,
        });
        return;
      }

      if (data.token) {
        await login(data.token);
        return;
      }

      setError('Respuesta de login inesperada');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'PASSWORD_RESET_REQUIRED') {
          setError(err.message || 'Debes restablecer tu contraseña desde la web.');
        } else {
          setError(err.message || 'No se pudo iniciar sesión');
        }
      } else {
        setError('Error de conexión. Comprueba la URL del API y que el backend esté activo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Timecor</Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="tu@empresa.com"
          editable={!loading}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          placeholder="••••••••"
          editable={!loading}
          onSubmitEditing={handleSubmit}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f0fa',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1a2332',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a2332',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 24,
    textAlign: 'center',
    color: '#5a6472',
    fontSize: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5a6472',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
