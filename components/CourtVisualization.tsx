import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { Court } from '../types';

interface CourtVisualizationProps {
  court: Court;
}

const CourtVisualization: React.FC<CourtVisualizationProps> = ({ court }) => {
  const { players, courtNumber } = court;
  
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.courtTitle}>Court {courtNumber}</Text>
        <View style={styles.courtContainer}>
          {/* Net line */}
          <View style={styles.netLine} />
          
          {/* Top side (Team 1) */}
          <View style={styles.courtSide}>
            {players.slice(0, 2).map((player, index) => (
              <View key={player.id} style={styles.playerBox}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerGrade}>{player.gradeLevel}</Text>
              </View>
            ))}
          </View>
          
          {/* Bottom side (Team 2) */}
          <View style={styles.courtSide}>
            {players.slice(2, 4).map((player, index) => (
              <View key={player.id} style={styles.playerBox}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerGrade}>{player.gradeLevel}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  courtTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#1976d2',
  },
  courtContainer: {
    borderWidth: 2,
    borderColor: '#1976d2',
    borderRadius: 8,
    padding: 8,
    minHeight: 200,
  },
  netLine: {
    height: 2,
    backgroundColor: '#ff5722',
    position: 'absolute',
    top: '50%',
    left: 8,
    right: 8,
  },
  courtSide: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  playerBox: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  playerGrade: {
    fontSize: 11,
    color: '#666',
  },
});

export default CourtVisualization;
