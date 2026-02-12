import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { CurrencyProvider } from './context/CurrencyContext';
import { Colors } from './constants/colors';
import { initDatabase } from './database/db';
import GroupsScreen from './screens/GroupsScreen';
import PlayersScreen from './screens/PlayersScreen';
import ShuffleScreen from './screens/ShuffleScreen';
import MasterPlayersScreen from './screens/MasterPlayersScreen';
import SelectPlayersScreen from './screens/SelectPlayersScreen';

const Stack = createNativeStackNavigator();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    primaryContainer: Colors.primaryLight,
    secondary: Colors.accent,
    secondaryContainer: Colors.accentLight,
    surface: Colors.surface,
    surfaceVariant: Colors.primaryLight,
    background: Colors.background,
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: Colors.surface,
      level1: Colors.primaryLight,
      level2: Colors.primaryLight,
      level3: Colors.primaryLight,
      level4: Colors.primaryLight,
      level5: Colors.primaryLight,
    },
  },
};

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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <CurrencyProvider>
        <PaperProvider theme={theme}>
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
