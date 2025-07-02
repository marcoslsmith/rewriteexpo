export interface BreathingPattern {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  phases: {
    name: string;
    duration: number;
    instruction: string;
  }[];
  totalDuration: number;
  supportsIntention?: boolean;
}

export const breathingPatterns: BreathingPattern[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    description: 'Equal counts for inhale, hold, exhale, and hold',
    benefits: ['Reduces stress', 'Improves focus', 'Calms nervous system'],
    phases: [
      { name: 'Inhale', duration: 4, instruction: 'Breathe in slowly' },
      { name: 'Hold', duration: 4, instruction: 'Hold your breath' },
      { name: 'Exhale', duration: 4, instruction: 'Breathe out slowly' },
      { name: 'Hold', duration: 4, instruction: 'Hold empty' },
    ],
    totalDuration: 16,
  },
  {
    id: 'sleep478',
    name: '4-7-8 Sleep Breathing',
    description: 'Powerful technique for falling asleep quickly',
    benefits: ['Promotes sleep', 'Reduces anxiety', 'Calms mind'],
    phases: [
      { name: 'Inhale', duration: 4, instruction: 'Breathe in through nose' },
      { name: 'Hold', duration: 7, instruction: 'Hold your breath' },
      { name: 'Exhale', duration: 8, instruction: 'Exhale through mouth' },
    ],
    totalDuration: 19,
  },
  {
    id: 'wimhof',
    name: 'Wim Hof Breathing',
    description: 'Energizing breathwork for vitality and cold tolerance',
    benefits: ['Increases energy', 'Boosts immunity', 'Improves cold tolerance'],
    phases: [
      { name: 'Inhale', duration: 2, instruction: 'Deep inhale' },
      { name: 'Exhale', duration: 1, instruction: 'Passive exhale' },
    ],
    totalDuration: 3,
  },
  {
    id: 'coherent',
    name: 'Coherent Breathing',
    description: 'Balanced breathing for heart rate variability',
    benefits: ['Balances nervous system', 'Improves HRV', 'Enhances well-being'],
    phases: [
      { name: 'Inhale', duration: 6, instruction: 'Breathe in gently' },
      { name: 'Exhale', duration: 6, instruction: 'Breathe out gently' },
    ],
    totalDuration: 12,
    supportsIntention: true,
  },
  {
    id: 'physiological',
    name: 'Physiological Sigh',
    description: 'Quick stress relief with double inhale',
    benefits: ['Rapid stress relief', 'Calms nervous system', 'Improves mood'],
    phases: [
      { name: 'Inhale', duration: 2, instruction: 'First inhale' },
      { name: 'Second Inhale', duration: 1, instruction: 'Top off breath' },
      { name: 'Exhale', duration: 6, instruction: 'Long exhale' },
    ],
    totalDuration: 9,
  },
];