import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, ScrollView } from 'react-native';
import { Button, List, Dialog, Portal, TextInput, Text, Menu, IconButton } from 'react-native-paper';
import { createMasterPlayer, getAllMasterPlayers, updateMasterPlayer, deleteMasterPlayer, getAllSettlements } from '../database/db';
import { Player, GradeLevel, Settlement } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { Colors, GradeLevelColors } from '../constants/colors';

interface MasterPlayersScreenProps {
  navigation: any;
}

const MasterPlayersScreen: React.FC<MasterPlayersScreenProps> = ({ navigation }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('Beginner');
  const [menuVisible, setMenuVisible] = useState(false);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const { currency } = useCurrency();

  useEffect(() => {
    loadPlayers();
    loadSettlements();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPlayers();
      loadSettlements();
    });
    return unsubscribe;
  }, [navigation]);

  const loadPlayers = async () => {
    const fetchedPlayers = await getAllMasterPlayers();
    setPlayers(fetchedPlayers);
  };

  const loadSettlements = async () => {
    const allSettlements = await getAllSettlements();
    setSettlements(allSettlements);
  };

  const handleSavePlayer = async () => {
    if (playerName.trim()) {
      if (editMode && currentPlayer) {
        await updateMasterPlayer(currentPlayer.id, playerName.trim(), gradeLevel);
      } else {
        await createMasterPlayer(playerName.trim(), gradeLevel);
      }
      resetForm();
      loadPlayers();
    }
  };

  const handleEditPlayer = (player: Player) => {
    setCurrentPlayer(player);
    setPlayerName(player.name);
    setGradeLevel(player.gradeLevel);
    setEditMode(true);
    setDialogVisible(true);
  };

  const handleDeletePlayer = async (id: number) => {
    await deleteMasterPlayer(id);
    loadPlayers();
  };

  const resetForm = () => {
    setPlayerName('');
    setGradeLevel('Beginner');
    setDialogVisible(false);
    setEditMode(false);
    setCurrentPlayer(null);
  };

  const getGradeLevelColor = (level: GradeLevel) => {
    return GradeLevelColors[level] || Colors.textDisabled;
  };

  return (
    <View style={styles.container}>
      <View style={styles.appHeader}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <IconButton
              icon="arrow-left"
              iconColor={Colors.white}
              size={24}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
            <View>
              <Text style={styles.title}>Players</Text>
              <Text style={styles.subtitle}>Manage all players</Text>
            </View>
          </View>
          <IconButton
            icon="plus"
            iconColor={Colors.white}
            size={28}
            onPress={() => setDialogVisible(true)}
            style={styles.addButton}
          />
        </View>
      </View>
      <ScrollView style={styles.content}>
        {players.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
            description={item.gradeLevel}
            left={props => (
              <View
                style={[
                  styles.gradeBadge,
                  { backgroundColor: getGradeLevelColor(item.gradeLevel) }
                ]}
              />
            )}
            right={props => (
              <View style={styles.actions}>
                <IconButton
                  icon="pencil"
                  iconColor={Colors.white}
                  size={16}
                  onPress={() => handleEditPlayer(item)}
                  style={[styles.circleIconSmall, { backgroundColor: Colors.primary }]}
                />
                <IconButton
                  icon="delete"
                  iconColor={Colors.white}
                  size={16}
                  onPress={() => handleDeletePlayer(item.id)}
                  style={[styles.circleIconSmall, { backgroundColor: Colors.error }]}
                />
              </View>
            )}
            style={styles.listItem}
          />
        ))}
        {players.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text>No master players yet. Add your first player!</Text>
          </View>
        )}
        {settlements.length > 0 && (
          <View style={styles.settlementHistorySection}>
            <Text style={styles.settlementHistoryTitle}>Settlement History</Text>
            {settlements.map((settlement) => (
              <View key={settlement.id} style={styles.settlementHistoryItem}>
                <View style={styles.settlementHistoryDetails}>
                  <Text style={styles.settlementHistoryText}>
                    <Text style={styles.settlementHistoryFrom}>{settlement.fromPlayer}</Text>
                    <Text style={styles.settlementHistoryArrow}> → </Text>
                    <Text style={styles.settlementHistoryTo}>{settlement.toPlayer}</Text>
                  </Text>
                  <Text style={styles.settlementHistoryAmount}>{currency}{settlement.amount.toFixed(2)}</Text>
                </View>
                <Text style={styles.settlementHistoryDate}>
                  {new Date(settlement.settledAt).toLocaleDateString()} {new Date(settlement.settledAt).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={resetForm}>
          <Dialog.Title>{editMode ? 'Edit Player' : 'Add Player'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Player Name"
              value={playerName}
              onChangeText={setPlayerName}
              mode="outlined"
              style={styles.input}
            />
            
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setMenuVisible(true)}
                  style={styles.input}
                  theme={{ roundness: 1 }}
                >
                  {gradeLevel}
                </Button>
              }
            >
              <Menu.Item onPress={() => { setGradeLevel('Beginner'); setMenuVisible(false); }} title="Beginner" />
              <Menu.Item onPress={() => { setGradeLevel('Intermediate'); setMenuVisible(false); }} title="Intermediate" />
              <Menu.Item onPress={() => { setGradeLevel('Professional'); setMenuVisible(false); }} title="Professional" />
            </Menu>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={resetForm} theme={{ roundness: 1 }}>Cancel</Button>
            <Button onPress={handleSavePlayer} buttonColor={Colors.primary} textColor={Colors.white} theme={{ roundness: 1 }}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  appHeader: {
    backgroundColor: Colors.primary,
    padding: 16,
    paddingTop: 50,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    margin: 0,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.white,
    marginTop: 2,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  listItem: {
    backgroundColor: Colors.surface,
    marginBottom: 1,
  },
  gradeBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 20,
    marginLeft: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleIconSmall: {
    borderRadius: 18,
    width: 32,
    height: 32,
    margin: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  addButton: {
    margin: 0,
    backgroundColor: 'transparent',
  },
  input: {
    marginBottom: 12,
  },
  settlementHistorySection: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
    marginBottom: 8,
  },
  settlementHistoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
    marginTop: 12,
  },
  settlementHistoryItem: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: Colors.lightGreenBg,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  settlementHistoryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  settlementHistoryText: {
    fontSize: 14,
    flex: 1,
  },
  settlementHistoryFrom: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  settlementHistoryArrow: {
    color: Colors.textSecondary,
  },
  settlementHistoryTo: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  settlementHistoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.success,
  },
  settlementHistoryDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});

export default MasterPlayersScreen;
