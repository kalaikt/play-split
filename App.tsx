import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { CurrencyProvider } from './context/CurrencyContext';
import { initDatabase } from './database/db';
import GroupsScreen from './screens/GroupsScreen';
import PlayersScreen from './screens/PlayersScreen';
import ShuffleScreen from './screens/ShuffleScreen';
import MasterPlayersScreen from './screens/MasterPlayersScreen';
import SelectPlayersScreen from './screens/SelectPlayersScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <CurrencyProvider>
        <PaperProvider>
          <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
            }}
          >
          <Stack.Screen
            name="Groups"
            component={GroupsScreen}
          />
          <Stack.Screen
            name="MasterPlayers"
            component={MasterPlayersScreen}
            options={{ title: 'Players' }}
          />
          <Stack.Screen
            name="SelectPlayers"
            component={SelectPlayersScreen}
            options={{ title: 'Select Players' }}
          />
          <Stack.Screen
            name="Players"
            component={PlayersScreen}
            options={{ title: 'Manage Players' }}
          />
          <Stack.Screen
            name="Shuffle"
            component={ShuffleScreen}
            options={{ title: 'Shuffle & Courts' }}
          />
        </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </CurrencyProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
