import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Button, FAB, List, Dialog, Portal, TextInput, Text, Menu, IconButton } from 'react-native-paper';
import { createPlayer, getPlayersByGroup, updatePlayer, deletePlayer } from '../database/db';
import { Player, GradeLevel, Group } from '../types';
import { Colors, GradeLevelColors } from '../constants/colors';

interface PlayersScreenProps {
  route: any;
  navigation: any;
}

const PlayersScreen: React.FC<PlayersScreenProps> = ({ route, navigation }) => {
  const { group }: { group: Group } = route.params;
  const [players, setPlayers] = useState<Player[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('Beginner');
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    const fetchedPlayers = await getPlayersByGroup(group.id);
    setPlayers(fetchedPlayers);
  };

  const handleSavePlayer = async () => {
    if (playerName.trim()) {
      if (editMode && currentPlayer) {
        await updatePlayer(currentPlayer.id, playerName.trim(), gradeLevel);
      } else {
        await createPlayer(playerName.trim(), gradeLevel, group.id);
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
    await deletePlayer(id);
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
              <Text style={styles.title}>{group.name}</Text>
              <Text style={styles.subtitle}>Manage players</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.content}>
        <FlatList
          data={players}
          keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <List.Item
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
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>No players yet. Add your first player!</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        onPress={() => setDialogVisible(true)}
        color={Colors.white}
        customSize={56}
        style={[styles.fab, { backgroundColor: Colors.primary }]}
      />
      </View>

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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  input: {
    marginBottom: 12,
  },
});

export default PlayersScreen;
