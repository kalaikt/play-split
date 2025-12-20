import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Text, Divider, Menu, IconButton } from 'react-native-paper';
import { Player, Group } from '../types';
import { shufflePlayers } from '../utils/shuffleAlgorithm';
import CourtVisualization from '../components/CourtVisualization';

interface ShuffleScreenProps {
  route: any;
  navigation: any;
}

const ShuffleScreen: React.FC<ShuffleScreenProps> = ({ route, navigation }) => {
  const { group, players }: { group: Group; players: Player[] } = route.params;
  const [numberOfCourts, setNumberOfCourts] = useState(1);
  const [shuffleResult, setShuffleResult] = useState<any>(null);
  const [rotationOrder, setRotationOrder] = useState<Player[]>([]);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleShuffle = () => {
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

          <Button
            mode="contained"
            onPress={handleShuffle}
            style={styles.button}
            disabled={players.length < 4}
            buttonColor="#1976d2"
            theme={{ roundness: 1 }}
          >
            {rotationOrder.length > 0 ? 'Next Round (Rotate Players)' : 'Start First Round'}
          </Button>
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
  button: {
    marginTop: 8,
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
