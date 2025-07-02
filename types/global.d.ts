export interface User {
  id: string;
  email: string;
  displayName?: string;
  username?: string;
  createdAt: string;
}

export interface Manifestation {
  id: string;
  userId?: string;
  originalEntry: string;
  transformedText: string;
  isFavorite: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  duration: number; // days
  isActive: boolean;
  createdAt: string;
}

export interface ChallengeProgress {
  id: string;
  userId?: string;
  challengeId: string;
  currentDay: number;
  completedDays: number[];
  responses: { [day: number]: string };
  points: number;
  streak: number;
  startDate: string;
  completedAt?: string;
}

export interface NotificationSchedule {
  id: string;
  userId?: string;
  title: string;
  message: string;
  useRandomManifestation: boolean;
  time: string; // HH:MM format
  days: number[]; // 0-6, Sunday=0
  isActive: boolean;
  createdAt: string;
}

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