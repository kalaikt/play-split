# Player Draws - Badminton Court Shuffling App

A React Native mobile application for managing badminton players and intelligently shuffling them across courts based on their skill levels.

## Features

- **Group Management**: Create and manage multiple player groups
- **Player Management**: Add, edit, and delete players with skill level classification
- **Smart Shuffle Algorithm**: Automatically distribute players across courts with balanced skill levels
  - 4 players per court
  - Ensures mix of skill levels (Beginner, Intermediate, Professional)
  - Prioritizes one beginner per court when possible
- **Court Visualization**: Visual representation of badminton courts with assigned players
- **SQLite Database**: Local data persistence

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Database**: SQLite (expo-sqlite)
- **UI Library**: React Native Paper
- **Navigation**: React Navigation

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Emulator

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your platform:
```bash
npm run ios      # for iOS
npm run android  # for Android
npm run web      # for web (limited functionality)
```

## Project Structure

```
player-draws/
├── App.tsx                 # Main app component with navigation
├── types.ts               # TypeScript type definitions
├── database/
│   └── db.ts             # SQLite database operations
├── screens/
│   ├── GroupsScreen.tsx  # Group management screen
│   ├── PlayersScreen.tsx # Player management screen
│   └── ShuffleScreen.tsx # Shuffle and court display screen
├── components/
│   └── CourtVisualization.tsx  # Badminton court visual component
└── utils/
    └── shuffleAlgorithm.ts     # Player shuffling logic
```

## Usage

1. **Create a Group**: Tap the + button to create a new player group
2. **Add Players**: Select a group and add players with their names and skill levels
3. **Shuffle**: Click "Shuffle Players" and specify the number of courts
4. **View Courts**: See the visual representation of courts with assigned players

## Skill Level Rules

- **Beginner**: New or casual players
- **Intermediate**: Regular players with moderate skill
- **Professional**: Advanced or competitive players

The shuffle algorithm ensures balanced games by mixing skill levels appropriately on each court.

## License

MIT
