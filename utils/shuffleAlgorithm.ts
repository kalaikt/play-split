import { Player, Court, ShuffleResult, GradeLevel } from '../types';

export const shufflePlayers = (
  players: Player[], 
  numberOfCourts: number, 
  rotationOrder: Player[] = [],
  currentRotationIndex: number = 0
): ShuffleResult & { rotationOrder: Player[], nextRotationIndex: number } => {
  const totalPlayers = players.length;
  const maxCourts = Math.min(numberOfCourts, Math.floor(totalPlayers / 4));
  const spotsNeeded = maxCourts * 4;
  const playersToWait = totalPlayers - spotsNeeded;
  
  // First shuffle: establish rotation order
  if (rotationOrder.length === 0) {
    const result = performInitialShuffle(players, maxCourts);
    // Create rotation order from all players (playing + waiting)
    const allPlayersInOrder = [
      ...result.courts.flatMap(c => c.players),
      ...result.unassignedPlayers
    ];
    
    return {
      ...result,
      rotationOrder: allPlayersInOrder,
      nextRotationIndex: playersToWait // Start rotation from the number who waited
    };
  }
  
  // Subsequent shuffles: use rotation order for fair, equal rotation
  // Determine who should wait based on rotation index
  const waitingIndices: number[] = [];
  for (let i = 0; i < playersToWait; i++) {
    const index = (currentRotationIndex + i) % totalPlayers;
    waitingIndices.push(index);
  }
  
  const waitingPlayerIds = new Set(
    waitingIndices.map(idx => rotationOrder[idx]?.id).filter(Boolean)
  );
  
  // Players who will play this round
  const playingPlayers = players.filter(p => !waitingPlayerIds.has(p.id));
  
  // If not enough players to fill courts, just use whoever is available
  if (playingPlayers.length < spotsNeeded) {
    const result = performBalancedShuffle(players, maxCourts, players);
    return {
      ...result,
      rotationOrder,
      nextRotationIndex: (currentRotationIndex + playersToWait) % totalPlayers
    };
  }
  
  // Perform balanced shuffle with playing players
  const result = performBalancedShuffle(playingPlayers, maxCourts, players);
  
  return {
    ...result,
    rotationOrder,
    nextRotationIndex: (currentRotationIndex + playersToWait) % totalPlayers
  };
};

const performInitialShuffle = (players: Player[], maxCourts: number): ShuffleResult => {
  return performBalancedShuffle(players, maxCourts, players);
};

const performBalancedShuffle = (
  playersToAssign: Player[], 
  maxCourts: number, 
  allPlayers: Player[]
): ShuffleResult => {
  // Separate players by grade level
  const beginners = playersToAssign.filter(p => p.gradeLevel === 'Beginner');
  const intermediates = playersToAssign.filter(p => p.gradeLevel === 'Intermediate');
  const professionals = playersToAssign.filter(p => p.gradeLevel === 'Professional');
  
  // Shuffle each array
  const shuffledBeginners = shuffleArray([...beginners]);
  const shuffledIntermediates = shuffleArray([...intermediates]);
  const shuffledProfessionals = shuffleArray([...professionals]);
  
  const courts: Court[] = [];
  
  for (let i = 0; i < maxCourts; i++) {
    const courtPlayers: Player[] = [];
    
    // Priority 1: Try to add one beginner
    if (shuffledBeginners.length > 0) {
      courtPlayers.push(shuffledBeginners.shift()!);
    }
    
    // Priority 2: Try to add one intermediate or professional (prefer mixing)
    if (shuffledIntermediates.length > 0) {
      courtPlayers.push(shuffledIntermediates.shift()!);
    } else if (shuffledProfessionals.length > 0) {
      courtPlayers.push(shuffledProfessionals.shift()!);
    }
    
    // Priority 3 & 4: Fill remaining 2 spots with skill diversity
    while (courtPlayers.length < 4) {
      const currentLevels = courtPlayers.map(p => p.gradeLevel);
      let playerAdded = false;
      
      // Avoid pairing professionals with professionals if other levels available
      if (currentLevels.includes('Professional') && 
          !currentLevels.includes('Beginner') && 
          !currentLevels.includes('Intermediate')) {
        // Have professionals only, try to add beginner or intermediate first
        if (shuffledBeginners.length > 0) {
          courtPlayers.push(shuffledBeginners.shift()!);
          playerAdded = true;
        } else if (shuffledIntermediates.length > 0) {
          courtPlayers.push(shuffledIntermediates.shift()!);
          playerAdded = true;
        }
      }
      
      // Avoid pairing intermediates with intermediates if beginners available
      if (!playerAdded && 
          currentLevels.filter(l => l === 'Intermediate').length >= 1 &&
          !currentLevels.includes('Beginner') &&
          shuffledBeginners.length > 0) {
        courtPlayers.push(shuffledBeginners.shift()!);
        playerAdded = true;
      }
      
      // If no preference, add from available players prioritizing diversity
      if (!playerAdded) {
        const hasBeginner = currentLevels.includes('Beginner');
        const hasIntermediate = currentLevels.includes('Intermediate');
        const hasProfessional = currentLevels.includes('Professional');
        
        // Prioritize adding different skill levels
        if (!hasBeginner && shuffledBeginners.length > 0) {
          courtPlayers.push(shuffledBeginners.shift()!);
          playerAdded = true;
        } else if (!hasIntermediate && shuffledIntermediates.length > 0) {
          courtPlayers.push(shuffledIntermediates.shift()!);
          playerAdded = true;
        } else if (!hasProfessional && shuffledProfessionals.length > 0) {
          courtPlayers.push(shuffledProfessionals.shift()!);
          playerAdded = true;
        } else {
          // All levels present or need to add duplicates, add any available
          if (shuffledBeginners.length > 0) {
            courtPlayers.push(shuffledBeginners.shift()!);
            playerAdded = true;
          } else if (shuffledIntermediates.length > 0) {
            courtPlayers.push(shuffledIntermediates.shift()!);
            playerAdded = true;
          } else if (shuffledProfessionals.length > 0) {
            courtPlayers.push(shuffledProfessionals.shift()!);
            playerAdded = true;
          }
        }
      }
      
      // If no player could be added, break to avoid infinite loop
      if (!playerAdded) break;
    }
    
    if (courtPlayers.length === 4) {
      courts.push({
        courtNumber: i + 1,
        players: courtPlayers
      });
    }
  }
  
  // Calculate unassigned players from all players if available
  const assignedPlayerIds = new Set(courts.flatMap(c => c.players.map(p => p.id)));
  const unassignedPlayers = allPlayers.length > 0 
    ? allPlayers.filter(p => !assignedPlayerIds.has(p.id))
    : [
        ...shuffledBeginners,
        ...shuffledIntermediates,
        ...shuffledProfessionals
      ];
  
  return {
    courts,
    unassignedPlayers
  };
};

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};
