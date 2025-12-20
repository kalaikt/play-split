export type GradeLevel = 'Beginner' | 'Intermediate' | 'Professional';

export interface Player {
  id: number;
  name: string;
  gradeLevel: GradeLevel;
  groupId?: number;
}

export interface MasterPlayer {
  id: number;
  name: string;
  gradeLevel: GradeLevel;
  createdAt: string;
}

export interface Group {
  id: number;
  name: string;
  expense?: number;
  createdAt: string;
}

export interface Expense {
  id: number;
  groupId: number;
  amount: number;
  paidBy: string;
  title: string;
  createdAt: string;
}

export interface Settlement {
  id: number;
  fromPlayer: string;
  toPlayer: string;
  amount: number;
  settledAt: string;
}

export interface Court {
  courtNumber: number;
  players: Player[];
}

export interface ShuffleResult {
  courts: Court[];
  unassignedPlayers: Player[];
}
