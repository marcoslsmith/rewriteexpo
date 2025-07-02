import AsyncStorage from '@react-native-async-storage/async-storage';
import { Manifestation, NotificationSchedule, ChallengeProgress } from '../types/global';

const STORAGE_KEYS = {
  MANIFESTATIONS: '@rewrite_manifestations',
  NOTIFICATIONS: '@rewrite_notifications',
  CHALLENGES: '@rewrite_challenges',
  USER_PREFERENCES: '@rewrite_preferences',
};

export const storageService = {
  // Manifestations
  async getManifestations(): Promise<Manifestation[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MANIFESTATIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading manifestations:', error);
      return [];
    }
  },

  async saveManifestations(manifestations: Manifestation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MANIFESTATIONS, JSON.stringify(manifestations));
    } catch (error) {
      console.error('Error saving manifestations:', error);
    }
  },

  async addManifestation(manifestation: Manifestation): Promise<void> {
    const manifestations = await this.getManifestations();
    manifestations.push(manifestation);
    await this.saveManifestations(manifestations);
  },

  async updateManifestation(id: string, updates: Partial<Manifestation>): Promise<void> {
    const manifestations = await this.getManifestations();
    const index = manifestations.findIndex(m => m.id === id);
    if (index !== -1) {
      manifestations[index] = { ...manifestations[index], ...updates, updatedAt: new Date().toISOString() };
      await this.saveManifestations(manifestations);
    }
  },

  async deleteManifestation(id: string): Promise<void> {
    const manifestations = await this.getManifestations();
    const filtered = manifestations.filter(m => m.id !== id);
    await this.saveManifestations(filtered);
  },

  // Notification Schedules
  async getNotificationSchedules(): Promise<NotificationSchedule[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading notification schedules:', error);
      return [];
    }
  },

  async saveNotificationSchedules(schedules: NotificationSchedule[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(schedules));
    } catch (error) {
      console.error('Error saving notification schedules:', error);
    }
  },

  // Challenge Progress
  async getChallengeProgress(): Promise<ChallengeProgress[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHALLENGES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading challenge progress:', error);
      return [];
    }
  },

  async saveChallengeProgress(progress: ChallengeProgress[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving challenge progress:', error);
    }
  },

  // Clear all data
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  },
};