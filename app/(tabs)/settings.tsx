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
  Dimensions,
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
  TestTube,
  Shield,
  Sparkles
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { storageService } from '../../lib/storage';
import { notificationService } from '../../lib/notifications';
import type { Database } from '../../lib/supabase';

type NotificationSchedule = Database['public']['Tables']['notification_schedules']['Row'];

const { width } = Dimensions.get('window');

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
    days: [1, 2, 3, 4, 5, 6, 0],
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
      setSuccess('Check your email for a magic link! ✨');
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
      setSuccess('Signed out successfully! 👋');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const clearAllData = async () => {
    try {
      await storageService.clearAllData();
      await notificationService.cancelAllNotifications();
      setNotificationSchedules([]);
      setSuccess('All data cleared! 🗑️');
    } catch (error) {
      setError('Failed to clear data. Try again! 🔄');
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
      setSuccess('Notification schedule created! 🔔');
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
      setSuccess('Notification schedule deleted! 🗑️');
    } catch (error) {
      setError('Failed to delete notification schedule.');
    }
  };

  const testNotification = async () => {
    try {
      await notificationService.sendTestNotification(
        'Test Manifestation',
        'This is a test notification from The Rewrite app! ✨'
      );
      setSuccess('Test notification sent! Check your notifications. 📱');
    } catch (error: any) {
      setError(error.message || 'Unable to send test notification.');
    }
  };

  const getDayName = (day: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
  };

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
        colors={['#0f172a', '#1e293b', '#334155']}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#6366f1', '#4f46e5']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Shield size={32} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.title}>Profile & Settings</Text>
            <Text style={styles.subtitle}>
              Manage your account and preferences
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Status Messages */}
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
            <View style={styles.userCard}>
              <LinearGradient
                colors={['#1e293b', '#334155']}
                style={styles.userCardGradient}
              >
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <User size={24} color="#ffffff" strokeWidth={2} />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <Text style={styles.userStatus}>✅ Signed in</Text>
                  </View>
                  <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
                    <LogOut size={20} color="#ef4444" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <TouchableOpacity style={styles.signInButton} onPress={() => setShowSignInModal(true)}>
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                style={styles.signInButtonGradient}
              >
                <User size={20} color="#ffffff" strokeWidth={2} />
                <Text style={styles.signInButtonText}>Sign In</Text>
              </LinearGradient>
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
              <Plus size={20} color="#ffffff" strokeWidth={2} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.testButton} onPress={testNotification}>
            <TestTube size={20} color="#6366f1" strokeWidth={2} />
            <Text style={styles.testButtonText}>Test Notifications</Text>
          </TouchableOpacity>

          {notificationSchedules.map((schedule) => (
            <View key={schedule.id} style={styles.scheduleCard}>
              <LinearGradient
                colors={['#1e293b', '#334155']}
                style={styles.scheduleCardGradient}
              >
                <View style={styles.scheduleHeader}>
                  <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                  <Switch
                    value={schedule.is_active}
                    onValueChange={() => toggleSchedule(schedule.id)}
                    trackColor={{ false: '#374151', true: '#10b981' }}
                    thumbColor={schedule.is_active ? '#ffffff' : '#9ca3af'}
                  />
                </View>
                
                <View style={styles.scheduleTime}>
                  <Clock size={16} color="#64748b" strokeWidth={2} />
                  <Text style={styles.scheduleTimeText}>{schedule.time}</Text>
                </View>
                
                <View style={styles.scheduleDays}>
                  {schedule.days.map(day => (
                    <View key={day} style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}><Text>{getDayName(day)}</Text></Text>
                    </View>
                  ))}
                </View>
                
                <Text style={styles.scheduleMessage}>
                  {schedule.use_random_manifestation 
                    ? '✨ Random manifestation from your collection'
                    : schedule.message
                  }
                </Text>
                
                <TouchableOpacity
                  style={styles.deleteScheduleButton}
                  onPress={() => deleteSchedule(schedule.id)}
                >
                  <Trash2 size={16} color="#ef4444" strokeWidth={2} />
                  <Text style={styles.deleteScheduleText}>Delete</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ))}
          
          {notificationSchedules.length === 0 && (
            <View style={styles.emptyNotifications}>
              <Bell size={48} color="#475569" strokeWidth={1.5} />
              <Text style={styles.emptyText}>
                No notification schedules yet. Tap + to create one.
              </Text>
            </View>
          )}
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={clearAllData}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.dangerButtonGradient}
            >
              <Trash2 size={20} color="#ffffff" strokeWidth={2} />
              <Text style={styles.dangerButtonText}>Clear All Data</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sign In Modal */}
      <Modal
        visible={showSignInModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.modalBackground}
          />
          
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
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={signIn}
            >
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                style={styles.createButtonGradient}
              >
                <Sparkles size={20} color="#ffffff" strokeWidth={2} />
                <Text style={styles.createButtonText}>Send Magic Link</Text>
              </LinearGradient>
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
          <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.modalBackground}
          />
          
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
                placeholderTextColor="#64748b"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Time</Text>
              <TextInput
                style={styles.textInput}
                value={newSchedule.time}
                onChangeText={(text) => setNewSchedule({...newSchedule, time: text})}
                placeholder="HH:MM (24-hour format)"
                placeholderTextColor="#64748b"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Use Random Manifestation</Text>
                <Switch
                  value={newSchedule.useRandomManifestation}
                  onValueChange={(value) => setNewSchedule({...newSchedule, useRandomManifestation: value})}
                  trackColor={{ false: '#374151', true: '#10b981' }}
                  thumbColor={newSchedule.useRandomManifestation ? '#ffffff' : '#9ca3af'}
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
                  placeholderTextColor="#64748b"
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={addNotificationSchedule}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.createButtonGradient}
              >
                <Plus size={20} color="#ffffff" strokeWidth={2} />
                <Text style={styles.createButtonText}>Create Schedule</Text>
              </LinearGradient>
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
    backgroundColor: '#0f172a',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    marginTop: 60,
    marginHorizontal: 20,
    marginBottom: 32,
    height: 200,
  },
  headerGradient: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  successText: {
    color: '#059669',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  addButton: {
    backgroundColor: '#6366f1',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  userCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  userCardGradient: {
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  userStatus: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#10b981',
    marginTop: 2,
  },
  signOutButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  signInButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  signInButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  testButtonText: {
    color: '#6366f1',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  scheduleCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  scheduleCardGradient: {
    padding: 20,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  scheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  scheduleTimeText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#94a3b8',
  },
  scheduleDays: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dayBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dayBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#cbd5e1',
  },
  scheduleMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignSelf: 'flex-start',
  },
  deleteScheduleText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ef4444',
  },
  emptyNotifications: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
  },
  dangerButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  dangerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  dangerButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 70,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    flex: 1,
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#334155',
  },
  closeButtonText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
  helpText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 120,
  },
});