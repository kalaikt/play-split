// Centralized color constants — Badminton Court Green Theme 🏸

export const Colors = {
  // Primary brand (court green)
  primary: '#00897B',
  primaryDark: '#00695C',
  primaryLight: '#E0F2F1',

  // Accent (shuttlecock orange)
  accent: '#FF6D00',
  accentLight: '#FFF3E0',

  // Semantic
  success: '#43A047',
  warning: '#FB8C00',
  error: '#E53935',

  // Grade levels (distinct from primary/semantic)
  beginner: '#66BB6A',
  intermediate: '#FFA726',
  professional: '#EF5350',

  // WhatsApp
  whatsapp: '#25D366',

  // Backgrounds
  background: '#F1F8E9',
  surface: '#ffffff',
  surfaceVariant: '#F5F5F5',

  // Text
  textPrimary: '#263238',
  textSecondary: '#546E7A',
  textDisabled: '#90A4AE',

  // Borders
  border: '#CFD8DC',
  disabled: '#B0BEC5',

  // Court visualization
  courtOverlay: 'rgba(255, 255, 255, 0.1)',
  netIndicator: 'rgba(255, 109, 0, 0.85)',
  courtShadow: 'rgba(0, 0, 0, 0.3)',
  cardShadow: '#000000',

  // Special
  white: '#ffffff',
  transparentWhite: 'rgba(255, 255, 255, 0.25)',
  lightRedBg: '#FFEBEE',
  lightGreenBg: '#E8F5E9',
  primaryLightTranslucent: 'rgba(224, 242, 241, 0.95)',
};

export const GradeLevelColors: Record<string, string> = {
  Beginner: Colors.beginner,
  Intermediate: Colors.intermediate,
  Professional: Colors.professional,
};
