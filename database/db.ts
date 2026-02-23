import * as SQLite from 'expo-sqlite';
import { Group, Player, GradeLevel } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('playsplit.db');
  }
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      expense REAL,
      createdAt TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS master_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gradeLevel TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS group_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      groupId INTEGER NOT NULL,
      playerId INTEGER NOT NULL,
      FOREIGN KEY (groupId) REFERENCES groups (id) ON DELETE CASCADE,
      FOREIGN KEY (playerId) REFERENCES master_players (id) ON DELETE CASCADE,
      UNIQUE(groupId, playerId)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      groupId INTEGER NOT NULL,
      amount REAL NOT NULL,
      paidBy TEXT NOT NULL,
      title TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (groupId) REFERENCES groups (id) ON DELETE CASCADE
    );
  `);

  // Migration: Check if title column exists, if not drop and recreate
  try {
    await db.execAsync(`
      SELECT title FROM expenses LIMIT 1;
    `);
  } catch (error) {
    // Column doesn't exist, drop and recreate table
    await db.execAsync('DROP TABLE IF EXISTS expenses;');
    await db.execAsync(`
      CREATE TABLE expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        groupId INTEGER NOT NULL,
        amount REAL NOT NULL,
        paidBy TEXT NOT NULL,
        title TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (groupId) REFERENCES groups (id) ON DELETE CASCADE
      );
    `);
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fromPlayer TEXT NOT NULL,
      toPlayer TEXT NOT NULL,
      amount REAL NOT NULL,
      settledAt TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS shuffle_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      groupId INTEGER NOT NULL UNIQUE,
      numberOfCourts INTEGER NOT NULL,
      shuffleResult TEXT NOT NULL,
      rotationOrder TEXT NOT NULL,
      rotationIndex INTEGER NOT NULL,
      isEnded INTEGER DEFAULT 0,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (groupId) REFERENCES groups (id) ON DELETE CASCADE
    );
  `);

  // Migration: Add isEnded column if it doesn't exist
  try {
    await db.execAsync(`
      ALTER TABLE shuffle_states ADD COLUMN isEnded INTEGER DEFAULT 0;
    `);
  } catch (error: any) {
    // Column likely already exists, ignore the error
  }

  // Migration: Add pairHistory column if it doesn't exist
  try {
    await db.execAsync(`
      ALTER TABLE shuffle_states ADD COLUMN pairHistory TEXT DEFAULT '[]';
    `);
  } catch (error: any) {
    // Column likely already exists, ignore the error
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gradeLevel TEXT NOT NULL,
      groupId INTEGER NOT NULL,
      FOREIGN KEY (groupId) REFERENCES groups (id) ON DELETE CASCADE
    );
  `);
  
  return db;
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
};

// Group operations
export const createGroup = async (name: string): Promise<number> => {
  const database = getDB();
  const result = await database.runAsync(
    'INSERT INTO groups (name, createdAt) VALUES (?, ?)',
    [name, new Date().toISOString()]
  );
  return result.lastInsertRowId;
};

export const getGroups = async (): Promise<Group[]> => {
  const database = getDB();
  const result = await database.getAllAsync<Group>('SELECT * FROM groups ORDER BY createdAt DESC');
  return result;
};

export const deleteGroup = async (id: number): Promise<void> => {
  const database = getDB();
  await database.runAsync('DELETE FROM groups WHERE id = ?', [id]);
};

export const updateGroup = async (id: number, name: string, createdAt: string): Promise<void> => {
  const database = getDB();
  await database.runAsync('UPDATE groups SET name = ?, createdAt = ? WHERE id = ?', [name, createdAt, id]);
};

export const updateGroupExpense = async (id: number, expense: number): Promise<void> => {
  const database = getDB();
  await database.runAsync('UPDATE groups SET expense = ? WHERE id = ?', [expense, id]);
};

// Expense operations
export const createExpense = async (groupId: number, amount: number, paidBy: string, title: string): Promise<number> => {
  const database = getDB();
  const result = await database.runAsync(
    'INSERT INTO expenses (groupId, amount, paidBy, title, createdAt) VALUES (?, ?, ?, ?, ?)',
    [groupId, amount, paidBy, title, new Date().toISOString()]
  );
  return result.lastInsertRowId;
};

export const getExpensesByGroup = async (groupId: number): Promise<any[]> => {
  const database = getDB();
  const result = await database.getAllAsync(
    'SELECT * FROM expenses WHERE groupId = ? ORDER BY createdAt DESC',
    [groupId]
  );
  return result;
};

export const updateExpense = async (id: number, amount: number, paidBy: string, title: string): Promise<void> => {
  const database = getDB();
  await database.runAsync(
    'UPDATE expenses SET amount = ?, paidBy = ?, title = ? WHERE id = ?',
    [amount, paidBy, title, id]
  );
};

export const deleteExpense = async (id: number): Promise<void> => {
  const database = getDB();
  await database.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
};

// Settlement operations
export const recordSettlement = async (fromPlayer: string, toPlayer: string, amount: number): Promise<number> => {
  const database = getDB();
  const result = await database.runAsync(
    'INSERT INTO settlements (fromPlayer, toPlayer, amount, settledAt) VALUES (?, ?, ?, ?)',
    [fromPlayer, toPlayer, amount, new Date().toISOString()]
  );
  return result.lastInsertRowId;
};

export const getAllSettlements = async (): Promise<any[]> => {
  const database = getDB();
  const result = await database.getAllAsync('SELECT * FROM settlements ORDER BY settledAt DESC');
  return result;
};

// Shuffle state operations
export const saveShuffleState = async (
  groupId: number,
  numberOfCourts: number,
  shuffleResult: any,
  rotationOrder: Player[],
  rotationIndex: number,
  isEnded: boolean = false,
  pairHistory: string[][] = []
): Promise<void> => {
  const database = getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO shuffle_states (groupId, numberOfCourts, shuffleResult, rotationOrder, rotationIndex, isEnded, pairHistory, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [groupId, numberOfCourts, JSON.stringify(shuffleResult), JSON.stringify(rotationOrder), rotationIndex, isEnded ? 1 : 0, JSON.stringify(pairHistory), new Date().toISOString()]
  );
};

export const getShuffleState = async (groupId: number): Promise<any | null> => {
  const database = getDB();
  const result = await database.getFirstAsync<any>(
    'SELECT * FROM shuffle_states WHERE groupId = ?',
    [groupId]
  );
  if (result) {
    return {
      ...result,
      shuffleResult: JSON.parse(result.shuffleResult),
      rotationOrder: JSON.parse(result.rotationOrder),
      isEnded: result.isEnded === 1,
      pairHistory: result.pairHistory ? JSON.parse(result.pairHistory) : []
    };
  }
  return null;
};

export const deleteShuffleState = async (groupId: number): Promise<void> => {
  const database = getDB();
  await database.runAsync('DELETE FROM shuffle_states WHERE groupId = ?', [groupId]);
};

export const deleteSettlement = async (id: number): Promise<void> => {
  const database = getDB();
  await database.runAsync('DELETE FROM settlements WHERE id = ?', [id]);
};

// Master Player operations
export const createMasterPlayer = async (name: string, gradeLevel: GradeLevel): Promise<number> => {
  const database = getDB();
  const result = await database.runAsync(
    'INSERT INTO master_players (name, gradeLevel, createdAt) VALUES (?, ?, ?)',
    [name, gradeLevel, new Date().toISOString()]
  );
  return result.lastInsertRowId;
};

export const getAllMasterPlayers = async (): Promise<Player[]> => {
  const database = getDB();
  const result = await database.getAllAsync<Player>(
    'SELECT * FROM master_players ORDER BY name'
  );
  return result;
};

export const updateMasterPlayer = async (id: number, name: string, gradeLevel: GradeLevel): Promise<void> => {
  const database = getDB();
  await database.runAsync(
    'UPDATE master_players SET name = ?, gradeLevel = ? WHERE id = ?',
    [name, gradeLevel, id]
  );
};

export const deleteMasterPlayer = async (id: number): Promise<void> => {
  const database = getDB();
  await database.runAsync('DELETE FROM master_players WHERE id = ?', [id]);
};

// Group-Player Selection operations
export const addPlayerToGroup = async (groupId: number, playerId: number): Promise<void> => {
  const database = getDB();
  try {
    await database.runAsync(
      'INSERT INTO group_players (groupId, playerId) VALUES (?, ?)',
      [groupId, playerId]
    );
  } catch (e) {
    // Player already in group, ignore
  }
};

export const removePlayerFromGroup = async (groupId: number, playerId: number): Promise<void> => {
  const database = getDB();
  await database.runAsync(
    'DELETE FROM group_players WHERE groupId = ? AND playerId = ?',
    [groupId, playerId]
  );
};

export const getSelectedPlayersForGroup = async (groupId: number): Promise<Player[]> => {
  const database = getDB();
  const result = await database.getAllAsync<Player>(
    `SELECT mp.* FROM master_players mp
     INNER JOIN group_players gp ON mp.id = gp.playerId
     WHERE gp.groupId = ?
     ORDER BY mp.name`,
    [groupId]
  );
  return result;
};

export const isPlayerInGroup = async (groupId: number, playerId: number): Promise<boolean> => {
  const database = getDB();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM group_players WHERE groupId = ? AND playerId = ?',
    [groupId, playerId]
  );
  return (result?.count || 0) > 0;
};

// Player operations (legacy - for old groups)
export const createPlayer = async (name: string, gradeLevel: GradeLevel, groupId: number): Promise<number> => {
  const database = getDB();
  const result = await database.runAsync(
    'INSERT INTO players (name, gradeLevel, groupId) VALUES (?, ?, ?)',
    [name, gradeLevel, groupId]
  );
  return result.lastInsertRowId;
};

export const getPlayersByGroup = async (groupId: number): Promise<Player[]> => {
  const database = getDB();
  const result = await database.getAllAsync<Player>(
    'SELECT * FROM players WHERE groupId = ? ORDER BY name',
    [groupId]
  );
  return result;
};

export const updatePlayer = async (id: number, name: string, gradeLevel: GradeLevel): Promise<void> => {
  const database = getDB();
  await database.runAsync(
    'UPDATE players SET name = ?, gradeLevel = ? WHERE id = ?',
    [name, gradeLevel, id]
  );
};

export const deletePlayer = async (id: number): Promise<void> => {
  const database = getDB();
  await database.runAsync('DELETE FROM players WHERE id = ?', [id]);
};

export default db;
