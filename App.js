import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import * as Updates from 'expo-updates';

function UpdateScreen({ error }) {
  return (
    <View style={styles.updateWrap}>
      <ActivityIndicator size="large" color="#FF6B35" />
      <Text style={styles.updateText}>Đang cập nhật ứng dụng...</Text>
      {error ? <Text style={styles.updateError}>{error}</Text> : null}
    </View>
  );
}

function AppInner() {
  return <AppNavigator />;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  useEffect(() => {
    (async () => {
      if (__DEV__) { setReady(true); return; }
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          setUpdating(true);
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
          return;
        }
      } catch (e) {
        setUpdateError(e?.message || String(e));
      }
      setReady(true);
    })();
  }, []);

  if (updating) return <UpdateScreen />;
  if (!ready) return <UpdateScreen error={updateError} />;

  return (
    <AuthProvider>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  updateWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 16,
  },
  updateText: {
    fontSize: 15, color: '#888', marginTop: 8,
  },
  updateError: {
    fontSize: 11, color: '#F44336', marginTop: 12, textAlign: 'center', paddingHorizontal: 24,
  },
});
