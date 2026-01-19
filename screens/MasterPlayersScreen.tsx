import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, ScrollView } from 'react-native';
import { Button, FAB, List, Dialog, Portal, TextInput, Text, Menu, IconButton } from 'react-native-paper';
import { createMasterPlayer, getAllMasterPlayers, updateMasterPlayer, deleteMasterPlayer, getAllSettlements } from '../database/db';
import { Player, GradeLevel, Settlement } from '../types';
import { useCurrency } from '../context/CurrencyContext';

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
    switch (level) {
      case 'Beginner': return '#4caf50';
      case 'Intermediate': return '#ff9800';
      case 'Professional': return '#f44336';
      default: return '#757575';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.appHeader}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <IconButton
              icon="arrow-left"
              iconColor="#fff"
              size={24}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
            <View>
              <Text style={styles.title}>Players</Text>
              <Text style={styles.subtitle}>Manage all players</Text>
            </View>
          </View>
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
                <Button mode="text" onPress={() => handleEditPlayer(item)} theme={{ roundness: 1 }}>
                  Edit
                </Button>
                <Button
                  mode="text"
                  onPress={() => handleDeletePlayer(item.id)}
                  textColor="red"
                  theme={{ roundness: 1 }}
                >
                  Delete
                </Button>
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

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setDialogVisible(true)}
        color="#fff"
        customSize={56}
        backgroundColor="#1976d2"
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={resetForm}>
          <Dialog.Title>{editMode ? 'Edit Player' : 'Add New Player'}</Dialog.Title>
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
            <Button onPress={handleSavePlayer} buttonColor="#1976d2" textColor="#fff" theme={{ roundness: 1 }}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  appHeader: {
    backgroundColor: '#1976d2',
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 2,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  listItem: {
    backgroundColor: '#fff',
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  settlementHistorySection: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  settlementHistoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 12,
  },
  settlementHistoryItem: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#e8f5e9',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
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
    color: '#333',
    fontWeight: 'bold',
  },
  settlementHistoryArrow: {
    color: '#666',
  },
  settlementHistoryTo: {
    color: '#333',
    fontWeight: 'bold',
  },
  settlementHistoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  settlementHistoryDate: {
    fontSize: 11,
    color: '#666',
  },
});

export default MasterPlayersScreen;
