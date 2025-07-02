import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationSchedule, Manifestation } from '../types/global';
import { storageService } from './storage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  },

  async scheduleNotification(schedule: NotificationSchedule): Promise<string[]> {
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return [];
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Notification permissions not granted');
    }

    const notificationIds: string[] = [];
    const [hours, minutes] = schedule.time.split(':').map(Number);

    // Schedule notification for each selected day
    for (const dayOfWeek of schedule.days) {
      let message = schedule.message;
      
      // If using random manifestation, get a random one
      if (schedule.useRandomManifestation) {
        const manifestations = await storageService.getManifestations();
        if (manifestations.length > 0) {
          const randomManifestation = manifestations[Math.floor(Math.random() * manifestations.length)];
          message = randomManifestation.transformedText;
        }
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: schedule.title,
          body: message,
          sound: true,
        },
        trigger: {
          weekday: dayOfWeek === 0 ? 1 : dayOfWeek + 1, // Expo uses 1-7, Sunday=1
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      notificationIds.push(notificationId);
    }

    return notificationIds;
  },

  async cancelScheduledNotifications(notificationIds: string[]): Promise<void> {
    if (Platform.OS === 'web') return;
    
    for (const id of notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  },

  async sendTestNotification(title: string, message: string): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Test notification:', title, message);
      return;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Notification permissions not granted');
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        sound: true,
      },
      trigger: {
        seconds: 1,
      },
    });
  },

  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    if (Platform.OS === 'web') return [];
    return await Notifications.getAllScheduledNotificationsAsync();
  },

  async cancelAllNotifications(): Promise<void> {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};