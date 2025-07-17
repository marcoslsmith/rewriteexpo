import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { storageService } from './storage';
import { supabase } from './supabase';
import type { Database } from './supabase';

type NotificationSchedule = Database['public']['Tables']['notification_schedules']['Row'];

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Default reminder messages
export const defaultReminderMessages = {
  morning: [
    "Good morning! Start your day with intention. What will you manifest today?",
    "Rise and shine! Your dreams are waiting for you to take action.",
    "A new day, a new opportunity to transform your thoughts into reality.",
    "Morning reflection time: What are you grateful for today?",
    "Your future self is counting on the choices you make today.",
  ],
  evening: [
    "Time to wind down and reflect on your day. What went well?",
    "Before you sleep, take a moment to appreciate your progress.",
    "End your day with gratitude and positive intentions for tomorrow.",
    "Reflect on today's wins, no matter how small they may seem.",
    "Rest well knowing you're one step closer to your dreams.",
  ],
  motivation: [
    "You have the power to create the life you desire.",
    "Every thought is a seed. Plant positive ones today.",
    "Your potential is limitless. What will you create?",
    "Believe in yourself as much as your dreams believe in you.",
    "Progress, not perfection. Keep moving forward.",
  ],
  journaling: [
    "Time for some self-reflection. What's on your mind today?",
    "Your journal is waiting for your thoughts and dreams.",
    "Take a moment to check in with yourself. How are you feeling?",
    "What insights are waiting to be discovered through writing?",
    "Your thoughts matter. Capture them in your journal.",
  ]
};

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
      if (schedule.use_random_manifestation) {
        const manifestations = await storageService.getManifestations();
        const favoriteManifestations = manifestations.filter(m => m.is_favorite);
        
        if (favoriteManifestations.length > 0) {
          const randomManifestation = favoriteManifestations[Math.floor(Math.random() * favoriteManifestations.length)];
          message = randomManifestation.transformed_text;
        } else if (manifestations.length > 0) {
          const randomManifestation = manifestations[Math.floor(Math.random() * manifestations.length)];
          message = randomManifestation.transformed_text;
        } else {
          message = 'Take a moment to reflect on your dreams and aspirations today.';
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
        } as any,
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
      } as any,
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

  // Create default schedules for new users
  async createDefaultSchedules(userId: string): Promise<void> {
    const defaultSchedules = [
      {
        user_id: userId,
        title: 'Good Morning Motivation',
        message: defaultReminderMessages.morning[0],
        use_random_manifestation: false,
        time: '08:00',
        days: [1, 2, 3, 4, 5], // Monday to Friday
        is_active: true,
      },
      {
        user_id: userId,
        title: 'Evening Reflection',
        message: defaultReminderMessages.evening[0],
        use_random_manifestation: false,
        time: '20:00',
        days: [0, 1, 2, 3, 4, 5, 6], // Every day
        is_active: true,
      }
    ];

    for (const schedule of defaultSchedules) {
      try {
        await storageService.addNotificationSchedule(schedule);
      } catch (error) {
        console.error('Error creating default schedule:', error);
      }
    }
  },

  // Schedule all active notifications for the current user
  async scheduleAllActiveNotifications(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Notification permissions not granted');
        return;
      }

      // Cancel all existing notifications first
      await this.cancelAllNotifications();

      // Get all active schedules
      const schedules = await storageService.getNotificationSchedules();
      const activeSchedules = schedules.filter(schedule => schedule.is_active);

      console.log(`Scheduling ${activeSchedules.length} active notifications`);

      // Schedule each active notification
      for (const schedule of activeSchedules) {
        try {
          await this.scheduleNotification(schedule);
        } catch (error) {
          console.error(`Error scheduling notification ${schedule.id}:`, error);
        }
      }

      console.log('All active notifications scheduled successfully');
    } catch (error) {
      console.error('Error scheduling all notifications:', error);
    }
  },

  // Check and create default schedules for new users
  async ensureDefaultSchedulesExist(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, skipping default schedule check');
        return;
      }

      const schedules = await storageService.getNotificationSchedules();
      
      if (schedules.length === 0) {
        console.log('No schedules found for user, creating defaults...');
        await this.createDefaultSchedules(user.id);
      } else {
        console.log(`User has ${schedules.length} existing schedules`);
      }
    } catch (error) {
      console.error('Error ensuring default schedules exist:', error);
    }
  },

  // Debug function to test notifications
  async debugNotifications(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return;
    }

    try {
      console.log('=== DEBUG: Testing Notifications ===');
      
      // Check permissions
      const hasPermission = await this.requestPermissions();
      console.log('Notification permissions:', hasPermission);
      
      // Get all scheduled notifications
      const scheduled = await this.getAllScheduledNotifications();
      console.log('Currently scheduled notifications:', scheduled.length);
      
      // Get all schedules from storage
      const schedules = await storageService.getNotificationSchedules();
      console.log('Schedules in storage:', schedules.length);
      
      // Send a test notification
      await this.sendTestNotification('Debug Test', 'This is a test notification from the debug function');
      console.log('Test notification sent');
      
    } catch (error) {
      console.error('Debug notification error:', error);
    }
  },
};