import React from 'react';
import { View, StyleSheet, Text, ImageBackground } from 'react-native';
import { Card } from 'react-native-paper';
import { Court } from '../types';

interface CourtVisualizationProps {
  court: Court;
}

const CourtVisualization: React.FC<CourtVisualizationProps> = ({ court }) => {
  const { players, courtNumber } = court;
  
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <Text style={styles.courtTitle}>Court {courtNumber}</Text>
        <ImageBackground
          source={require('../assets/badminton-v.png')}
          style={styles.courtContainer}
          imageStyle={styles.courtImage}
        >
          <View style={styles.overlay}>
            {/* Top side (Team 1) */}
            <View style={styles.courtSide}>
              {players.slice(0, 2).map((player, index) => (
                <View key={player.id} style={styles.playerBox}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerGrade}>{player.gradeLevel}</Text>
                </View>
              ))}
            </View>
            
            {/* Net indicator */}
            <View style={styles.netIndicator}>
              <Text style={styles.netText}>NET</Text>
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
        </ImageBackground>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardContent: {
    padding: 12,
  },
  courtTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#1976d2',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  courtContainer: {
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 500,
  },
  courtImage: {
    borderRadius: 8,
    opacity: 0.9,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
  },
  courtSide: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
  },
  netIndicator: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 87, 34, 0.8)',
    marginVertical: 4,
  },
  netText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  playerBox: {
    backgroundColor: 'rgba(227, 242, 253, 0.95)',
    padding: 14,
    borderRadius: 10,
    minWidth: 110,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1976d2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1565c0',
    marginBottom: 4,
    textAlign: 'center',
  },
  playerGrade: {
    fontSize: 11,
    color: '#424242',
    fontWeight: '600',
  },
});

export default CourtVisualization;
