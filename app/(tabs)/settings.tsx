import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Switch,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Trash2, 
  LogOut, 
  Plus,
  Clock,
  TestTube
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { storageService } from '../../lib/storage';
import { notificationService } from '../../lib/notifications';
import type { Database } from '../../lib/supabase';

type NotificationSchedule = Database['public']['Tables']['notification_schedules']['Row'];

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [notificationSchedules, setNotificationSchedules] = useState<NotificationSchedule[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newSchedule, setNewSchedule] = useState({
    title: 'Daily Manifestation',
    message: '',
    useRandomManifestation: true,
    time: '09:00',
    days: [1, 2, 3, 4, 5, 6, 0], // Monday to Sunday
    isActive: true,
  });

  useEffect(() => {
    checkUser();
    loadNotificationSchedules();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadNotificationSchedules = async () => {
    try {
      const schedules = await storageService.getNotificationSchedules();
      setNotificationSchedules(schedules);
    } catch (error) {
      console.error('Error loading notification schedules:', error);
    }
  };

  const signIn = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setSuccess('Check your email for a magic link to sign in!');
      setShowSignInModal(false);
      setEmail('');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSuccess('You have been signed out successfully.');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const clearAllData = async () => {
    try {
      await storageService.clearAllData();
      await notificationService.cancelAllNotifications();
      setNotificationSchedules([]);
      setSuccess('All your data has been cleared.');
    } catch (error) {
      setError('Failed to clear data. Please try again.');
    }
  };

  const addNotificationSchedule = async () => {
    try {
      await storageService.addNotificationSchedule({
        title: newSchedule.title,
        message: newSchedule.message,
        use_random_manifestation: newSchedule.useRandomManifestation,
        time: newSchedule.time,
        days: newSchedule.days,
        is_active: newSchedule.isActive,
      });
      
      setShowScheduleModal(false);
      setNewSchedule({
        title: 'Daily Manifestation',
        message: '',
        useRandomManifestation: true,
        time: '09:00',
        days: [1, 2, 3, 4, 5, 6, 0],
        isActive: true,
      });
      
      await loadNotificationSchedules();
      setSuccess('Notification schedule created successfully!');
    } catch (error: any) {
      setError(error.message || 'Failed to create notification schedule.');
    }
  };

  const toggleSchedule = async (id: string) => {
    try {
      const schedule = notificationSchedules.find(s => s.id === id);
      if (schedule) {
        await storageService.updateNotificationSchedule(id, { is_active: !schedule.is_active });
        await loadNotificationSchedules();
      }
    } catch (error) {
      setError('Failed to update notification schedule.');
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await storageService.deleteNotificationSchedule(id);
      await loadNotificationSchedules();
      setSuccess('Notification schedule deleted successfully.');
    } catch (error) {
      setError('Failed to delete notification schedule.');
    }
  };

  const testNotification = async () => {
    try {
      await notificationService.sendTestNotification(
        'Test Manifestation',
        'This is a test notification from The Rewrite app!'
      );
      setSuccess('Test notification sent! Check your notifications.');
    } catch (error: any) {
      setError(error.message || 'Unable to send test notification.');
    }
  };

  const getDayName = (day: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
  };

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f3f4f6', '#e5e7eb', '#d1d5db']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <SettingsIcon size={32} color="#374151" />
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Manage your account and preferences
          </Text>
        </View>
        
        <Image
          source={{ uri: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800' }}
          style={styles.headerImage}
        />
      </LinearGradient>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {success && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {user ? (
            <View style={styles.userInfo}>
              <User size={24} color="#4b5563" />
              <View style={styles.userDetails}>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userStatus}>Signed in</Text>
              </View>
              <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
                <LogOut size={20} color="#dc2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.signInButton} onPress={() => setShowSignInModal(true)}>
              <User size={20} color="#ffffff" />
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowScheduleModal(true)}
            >
              <Plus size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.testButton} onPress={testNotification}>
            <TestTube size={20} color="#6366f1" />
            <Text style={styles.testButtonText}>Test Notifications</Text>
          </TouchableOpacity>

          {notificationSchedules.map((schedule) => (
            <View key={schedule.id} style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                <Switch
                  value={schedule.is_active}
                  onValueChange={() => toggleSchedule(schedule.id)}
                />
              </View>
              
              <Text style={styles.scheduleTime}>
                <Clock size={16} color="#6b7280" /> {schedule.time}
              </Text>
              
              <View style={styles.scheduleDays}>
                {schedule.days.map(day => (
                  <Text key={day} style={styles.dayBadge}>
                    {getDayName(day)}
                  </Text>
                ))}
              </View>
              
              <Text style={styles.scheduleMessage}>
                {schedule.use_random_manifestation 
                  ? 'Random manifestation from your collection'
                  : schedule.message
                }
              </Text>
              
              <TouchableOpacity
                style={styles.deleteScheduleButton}
                onPress={() => deleteSchedule(schedule.id)}
              >
                <Trash2 size={16} color="#dc2626" />
                <Text style={styles.deleteScheduleText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          {notificationSchedules.length === 0 && (
            <Text style={styles.emptyText}>
              No notification schedules yet. Tap + to create one.
            </Text>
          )}
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={clearAllData}>
            <Trash2 size={20} color="#ffffff" />
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sign In Modal */}
      <Modal
        visible={showSignInModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sign In</Text>
            <TouchableOpacity
              onPress={() => setShowSignInModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={signIn}
            >
              <Text style={styles.createButtonText}>Send Magic Link</Text>
            </TouchableOpacity>
            
            <Text style={styles.helpText}>
              We'll send you a secure link to sign in without a password.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Add Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Notification Schedule</Text>
            <TouchableOpacity
              onPress={() => setShowScheduleModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                value={newSchedule.title}
                onChangeText={(text) => setNewSchedule({...newSchedule, title: text})}
                placeholder="e.g., Morning Manifestation"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Time</Text>
              <TextInput
                style={styles.textInput}
                value={newSchedule.time}
                onChangeText={(text) => setNewSchedule({...newSchedule, time: text})}
                placeholder="HH:MM (24-hour format)"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Use Random Manifestation</Text>
                <Switch
                  value={newSchedule.useRandomManifestation}
                  onValueChange={(value) => setNewSchedule({...newSchedule, useRandomManifestation: value})}
                />
              </View>
            </View>
            
            {!newSchedule.useRandomManifestation && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Custom Message</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newSchedule.message}
                  onChangeText={(text) => setNewSchedule({...newSchedule, message: text})}
                  placeholder="Enter your custom notification message"
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={addNotificationSchedule}
            >
              <Text style={styles.createButtonText}>Create Schedule</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    position: 'relative',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.3,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    opacity: 0.8,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#d1fae5',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  successText: {
    color: '#065f46',
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userStatus: {
    fontSize: 14,
    color: '#10b981',
  },
  signOutButton: {
    padding: 8,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  testButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  scheduleTime: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  scheduleDays: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  dayBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    color: '#374151',
  },
  scheduleMessage: {
    fontSize: 14,
    color: '#4b5563',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  deleteScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteScheduleText: {
    fontSize: 14,
    color: '#dc2626',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  dangerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
});