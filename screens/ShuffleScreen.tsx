import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Text, Divider, Menu, IconButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { Player, Group } from '../types';
import { shufflePlayers } from '../utils/shuffleAlgorithm';
import CourtVisualization from '../components/CourtVisualization';
import { saveShuffleState, deleteShuffleState, getShuffleState } from '../database/db';

interface ShuffleScreenProps {
  route: any;
  navigation: any;
}

const ShuffleScreen: React.FC<ShuffleScreenProps> = ({ route, navigation }) => {
  const { group, players, shuffleState }: { group: Group; players: Player[]; shuffleState?: any } = route.params;
  
  const [numberOfCourts, setNumberOfCourts] = useState(shuffleState?.numberOfCourts || 1);
  const [shuffleResult, setShuffleResult] = useState<any>(shuffleState?.shuffleResult || null);
  const [rotationOrder, setRotationOrder] = useState<Player[]>(shuffleState?.rotationOrder || []);
  const [rotationIndex, setRotationIndex] = useState(shuffleState?.rotationIndex || 0);
  const [isEnded, setIsEnded] = useState(shuffleState?.isEnded === true || shuffleState?.isEnded === 1);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial state on mount
  useEffect(() => {
    const loadInitialState = async () => {
      setIsLoading(true);
      const currentState = await getShuffleState(group.id);
      if (currentState) {
        setIsEnded(currentState.isEnded === true || currentState.isEnded === 1);
        setNumberOfCourts(currentState.numberOfCourts);
        setShuffleResult(currentState.shuffleResult);
        setRotationOrder(currentState.rotationOrder);
        setRotationIndex(currentState.rotationIndex);
      }
      setIsLoading(false);
    };
    loadInitialState();
  }, [group.id]);

  // Reload shuffle state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const loadShuffleState = async () => {
        const currentState = await getShuffleState(group.id);
        if (currentState) {
          setIsEnded(currentState.isEnded === true || currentState.isEnded === 1);
          setNumberOfCourts(currentState.numberOfCourts);
          setShuffleResult(currentState.shuffleResult);
          setRotationOrder(currentState.rotationOrder);
          setRotationIndex(currentState.rotationIndex);
        }
      };
      loadShuffleState();
    }, [group.id])
  );

  const handleShuffle = async () => {
    const courts = numberOfCourts;
    
    // Use rotation order for systematic, equal rotation
    const result = shufflePlayers(
      players, 
      courts, 
      rotationOrder,
      rotationIndex
    );
    
    setShuffleResult(result);
    setRotationOrder(result.rotationOrder);
    setRotationIndex(result.nextRotationIndex);    
    // Save shuffle state to database (preserve isEnded state)
    await saveShuffleState(
      group.id,
      courts,
      result,
      result.rotationOrder,
      result.nextRotationIndex,
      isEnded
    );
  };

  const handleEndShuffle = async () => {
    setIsEnded(true);
    await saveShuffleState(
      group.id,
      numberOfCourts,
      shuffleResult,
      rotationOrder,
      rotationIndex,
      true // isEnded = true
    );
  };

  const handleReplay = async () => {
    setIsEnded(false);
    await saveShuffleState(
      group.id,
      numberOfCourts,
      shuffleResult,
      rotationOrder,
      rotationIndex,
      false // isEnded = false
    );
  };

  const handleClearShuffle = async () => {
    await deleteShuffleState(group.id);
    setShuffleResult(null);
    setRotationOrder([]);
    setRotationIndex(0);
    setNumberOfCourts(1);
    setIsEnded(false);
  };

  const maxCourts = Math.floor(players.length / 4);
  const maxSelectableCourts = 20;

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
              <Text style={styles.title}>{group.name}</Text>
              <Text style={styles.subtitle}>Total Players: {players.length}</Text>
            </View>
          </View>
        </View>
      </View>
      <ScrollView style={styles.scrollContent}>
        <View style={styles.content}>
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
                Number of Courts: {numberOfCourts}
              </Button>
            }
          >
            {Array.from({ length: maxSelectableCourts }, (_, i) => i + 1).map((num) => (
              <Menu.Item
                key={num}
                onPress={() => {
                  setNumberOfCourts(num);
                  setMenuVisible(false);
                }}
                title={`${num} Court${num > 1 ? 's' : ''}`}
              />
            ))}
          </Menu>
          
          <Text style={styles.hint}>
            {numberOfCourts > maxCourts 
              ? `⚠️ Only ${maxCourts} court${maxCourts !== 1 ? 's' : ''} can be filled with 4 players each`
              : `Maximum ${maxCourts} court${maxCourts !== 1 ? 's' : ''} can be filled`
            }
          </Text>
          
          {shuffleResult?.unassignedPlayers?.length > 0 && rotationOrder.length > 0 && (
            <Text style={styles.priorityHint}>
              🔄 Players rotate in sequential order - everyone gets equal playing time
            </Text>
          )}

          {isEnded && (
            <Text style={styles.endedHint}>
              ⛔ Shuffle session ended. Click "Replay" to continue or "Clear Shuffle" to start fresh.
            </Text>
          )}

          <Button
            mode="contained"
            onPress={handleShuffle}
            style={styles.button}
            disabled={players.length < 4 || isEnded}
            buttonColor="#1976d2"
            theme={{ roundness: 1 }}
          >
            {rotationOrder.length > 0 ? 'Next Round (Rotate Players)' : 'Start First Round'}
          </Button>
          
          {shuffleResult && (
            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={() => {
                  console.log('Button clicked - isEnded:', isEnded);
                  if (isEnded) {
                    handleReplay();
                  } else {
                    handleEndShuffle();
                  }
                }}
                style={styles.halfButton}
                buttonColor={isEnded ? "#ff9800" : "#4caf50"}
                textColor="#fff"
                theme={{ roundness: 1 }}
              >
                {isEnded ? 'Replay' : 'End'}
              </Button>
              <Button
                mode="outlined"
                onPress={handleClearShuffle}
                style={styles.halfButton}
                textColor="#f44336"
                theme={{ roundness: 1 }}
              >
                Clear Shuffle
              </Button>
            </View>
          )}
        </View>

      {shuffleResult && (
        <>
          <Divider style={styles.divider} />
          
          <View style={styles.results}>
            <Text style={styles.sectionTitle}>
              Courts ({shuffleResult.courts.length})
            </Text>
            
            {shuffleResult.courts.map((court: any) => (
              <CourtVisualization key={court.courtNumber} court={court} />
            ))}

            {shuffleResult.unassignedPlayers.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  Waiting Players ({shuffleResult.unassignedPlayers.length})
                </Text>
                <View style={styles.waitingList}>
                  {shuffleResult.unassignedPlayers.map((player: Player) => (
                    <View key={player.id} style={styles.waitingPlayer}>
                      <Text style={styles.waitingPlayerName}>{player.name}</Text>
                      <Text style={styles.waitingPlayerGrade}>
                        {player.gradeLevel}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </>
      )}
      </ScrollView>
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
    padding: 16,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flex: 1,
  },
  input: {
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  priorityHint: {
    fontSize: 13,
    color: '#1976d2',
    marginBottom: 12,
    fontWeight: '500',
  },
  endedHint: {
    fontSize: 13,
    color: '#f44336',
    marginBottom: 12,
    fontWeight: '600',
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 4,
  },
  button: {
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  halfButton: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  results: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1976d2',
  },
  waitingList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  waitingPlayer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  waitingPlayerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  waitingPlayerGrade: {
    fontSize: 14,
    color: '#666',
  },
});

export default ShuffleScreen;
