import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const SplashScreen = () => (
  <View style={styles.container}>
    <Text style={styles.logo}>Timecor</Text>
    <ActivityIndicator size="large" color="#7c3aed" style={styles.spinner} />
    <Text style={styles.hint}>Cargando sesión…</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f0fa',
    padding: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a2332',
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  hint: {
    fontSize: 14,
    color: '#5a6472',
  },
});

export default SplashScreen;
