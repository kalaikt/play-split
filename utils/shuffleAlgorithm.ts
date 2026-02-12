import { Player, Court, ShuffleResult, GradeLevel } from '../types';

export const shufflePlayers = (
  players: Player[], 
  numberOfCourts: number, 
  rotationOrder: Player[] = [],
  currentRotationIndex: number = 0,
  previousPairs: string[][] = [],
  rotateByLevel: boolean = true
): ShuffleResult & { rotationOrder: Player[], nextRotationIndex: number, newPairs: string[][] } => {
  const totalPlayers = players.length;
  const maxCourts = Math.min(numberOfCourts, Math.floor(totalPlayers / 4));
  const spotsNeeded = maxCourts * 4;
  const playersToWait = totalPlayers - spotsNeeded;
  
  // First shuffle: establish rotation order
  if (rotationOrder.length === 0) {
    const result = performBalancedShuffle(players, maxCourts, players, previousPairs, rotateByLevel);
    // Create rotation order from all players (playing + waiting)
    const allPlayersInOrder = [
      ...result.courts.flatMap(c => c.players),
      ...result.unassignedPlayers
    ];
    
    const newPairs = extractPairsFromCourts(result.courts);
    
    return {
      ...result,
      rotationOrder: allPlayersInOrder,
      nextRotationIndex: playersToWait,
      newPairs
    };
  }
  
  // Subsequent shuffles: use rotation order for fair, equal rotation
  const waitingIndices: number[] = [];
  for (let i = 0; i < playersToWait; i++) {
    const index = (currentRotationIndex + i) % totalPlayers;
    waitingIndices.push(index);
  }
  
  const waitingPlayerIds = new Set(
    waitingIndices.map(idx => rotationOrder[idx]?.id).filter(Boolean)
  );
  
  const playingPlayers = players.filter(p => !waitingPlayerIds.has(p.id));
  
  if (playingPlayers.length < spotsNeeded) {
    const result = performBalancedShuffle(players, maxCourts, players, previousPairs, rotateByLevel);
    const newPairs = extractPairsFromCourts(result.courts);
    return {
      ...result,
      rotationOrder,
      nextRotationIndex: (currentRotationIndex + playersToWait) % totalPlayers,
      newPairs
    };
  }
  
  const result = performBalancedShuffle(playingPlayers, maxCourts, players, previousPairs, rotateByLevel);
  const newPairs = extractPairsFromCourts(result.courts);
  
  return {
    ...result,
    rotationOrder,
    nextRotationIndex: (currentRotationIndex + playersToWait) % totalPlayers,
    newPairs
  };
};

// Generate a unique pair key (sorted so order doesn't matter)
const makePairKey = (id1: number, id2: number): string => {
  return [id1, id2].sort((a, b) => a - b).join('-');
};

// Extract all pairs from court assignments
const extractPairsFromCourts = (courts: Court[]): string[][] => {
  const pairs: string[][] = [];
  for (const court of courts) {
    const courtPairs: string[] = [];
    for (let i = 0; i < court.players.length; i++) {
      for (let j = i + 1; j < court.players.length; j++) {
        courtPairs.push(makePairKey(court.players[i].id, court.players[j].id));
      }
    }
    pairs.push(courtPairs);
  }
  return pairs;
};

// Count how many times a pair has appeared together
const countPairOccurrences = (pairKey: string, previousPairs: string[][]): number => {
  let count = 0;
  for (const round of previousPairs) {
    if (round.includes(pairKey)) {
      count++;
    }
  }
  return count;
};

// Calculate pair repetition score for a court (lower is better)
const courtPairScore = (courtPlayers: Player[], previousPairs: string[][]): number => {
  let score = 0;
  for (let i = 0; i < courtPlayers.length; i++) {
    for (let j = i + 1; j < courtPlayers.length; j++) {
      const key = makePairKey(courtPlayers[i].id, courtPlayers[j].id);
      score += countPairOccurrences(key, previousPairs);
    }
  }
  return score;
};

const performBalancedShuffle = (
  playersToAssign: Player[], 
  maxCourts: number, 
  allPlayers: Player[],
  previousPairs: string[][] = [],
  rotateByLevel: boolean = true
): ShuffleResult => {
  // Try multiple random arrangements and pick the one with fewest repeated pairs
  let bestResult: ShuffleResult | null = null;
  let bestScore = Infinity;
  const attempts = Math.min(20, Math.max(5, previousPairs.length * 2));
  
  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = buildCourts(playersToAssign, maxCourts, allPlayers, rotateByLevel);
    
    // Score this arrangement based on pair repetitions
    let totalScore = 0;
    for (const court of result.courts) {
      totalScore += courtPairScore(court.players, previousPairs);
    }
    
    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestResult = result;
    }
    
    // Perfect score - no repeated pairs
    if (totalScore === 0) break;
  }
  
  return bestResult || buildCourts(playersToAssign, maxCourts, allPlayers, rotateByLevel);
};

const buildCourts = (
  playersToAssign: Player[], 
  maxCourts: number, 
  allPlayers: Player[],
  rotateByLevel: boolean = true
): ShuffleResult => {
  // If rotateByLevel is off, do a pure random shuffle
  if (!rotateByLevel) {
    const shuffled = shuffleArray([...playersToAssign]);
    const courts: Court[] = [];
    for (let i = 0; i < maxCourts; i++) {
      const courtPlayers = shuffled.splice(0, 4);
      if (courtPlayers.length === 4) {
        courts.push({ courtNumber: i + 1, players: courtPlayers });
      }
    }
    const assignedPlayerIds = new Set(courts.flatMap(c => c.players.map(p => p.id)));
    const unassignedPlayers = allPlayers.filter(p => !assignedPlayerIds.has(p.id));
    return { courts, unassignedPlayers };
  }

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
