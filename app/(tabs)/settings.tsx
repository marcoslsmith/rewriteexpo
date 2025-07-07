import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Modal, 
  TextInput, 
  Alert,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import GradientBackground from '@/components/GradientBackground';
import FloatingActionButton from '@/components/FloatingActionButton';
import { Bell, User as UserIcon, Settings as SettingsIcon, LogOut, Plus, Clock, Calendar, CreditCard as Edit } from 'lucide-react-native';

const { height } = Dimensions.get('window');

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
};

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    message: '',
    time: '',
    days: [] as number[]
  });
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showFAB, setShowFAB] = useState(true);

  const inspirationalQuote = "The universe is conspiring to help you achieve your dreams.";

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchSchedules();
      fetchProfile();
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found

      if (data) {
        setProfile(data);
        setEditUsername(data.username || '');
        setEditDisplayName(data.display_name || '');
        
        // Auto-prompt for profile completion if fields are empty
        if (!data.username && !data.display_name) {
          setIsEditingProfile(true);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data.');
    }
  };

  const fetchSchedules = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notification_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const updates = {
        username: editUsername.trim() || null,
        display_name: editDisplayName.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
      fetchProfile();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccess('Account created successfully!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccess('Signed in successfully!');
      }

      setShowSignInModal(false);
      setEmail('');
      setPassword('');
      checkUser();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
      setSchedules([]);
      setSuccess('Signed out successfully!');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleAddSchedule = async () => {
    if (!user || !newSchedule.title || !newSchedule.time || newSchedule.days.length === 0) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('notification_schedules')
        .insert({
          user_id: user.id,
          title: newSchedule.title,
          message: newSchedule.message,
          time: newSchedule.time,
          days: newSchedule.days,
        });

      if (error) throw error;

      setSuccess('Schedule added successfully!');
      setShowScheduleModal(false);
      setNewSchedule({ title: '', message: '', time: '', days: [] });
      fetchSchedules();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const toggleDay = (day: number) => {
    setNewSchedule(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort()
    }));
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: false,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        setShowFAB(currentScrollY < 100);
      }
    }
  );

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <GradientBackground>
      <View style={styles.container}>
        <FloatingActionButton visible={showFAB} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Your account</Text>
          <Text style={styles.title}>Profile & Settings</Text>
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

        {/* User Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>7</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{schedules.length}</Text>
            <Text style={styles.statLabel}>Reminders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>42</Text>
            <Text style={styles.statLabel}>Manifestations</Text>
          </View>
        </View>
        
        {/* Inspirational Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>"{inspirationalQuote}"</Text>
        </View>

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {user ? (
            <>
              {/* User Profile Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <UserIcon size={20} color="#6366f1" />
                  <Text style={styles.sectionTitle}>Profile</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditingProfile(!isEditingProfile)}
                  >
                    <Edit size={16} color="#6366f1" />
                    <Text style={styles.editButtonText}>
                      {isEditingProfile ? 'Cancel' : 'Edit'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.profileCard}>
                  {isEditingProfile && (!profile?.username || !profile?.display_name) && (
                    <View style={styles.profilePrompt}>
                      <Text style={styles.profilePromptText}>
                        Complete your profile to get started!
                      </Text>
                    </View>
                  )}
                  
                  <Text style={styles.profileEmail}>{user.email}</Text>
                  {profile?.display_name && (
                    <Text style={styles.profileDisplayName}>{profile.display_name}</Text>
                  )}
                  {profile?.username && (
                    <Text style={styles.profileUsername}>@{profile.username}</Text>
                  )}
                  <Text style={styles.profileJoined}>
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </Text>

                  {isEditingProfile && (
                    <View style={styles.editProfileSection}>
                      <TextInput
                        style={styles.input}
                        placeholder="Display Name"
                        value={editDisplayName}
                        onChangeText={setEditDisplayName}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Username"
                        value={editUsername}
                        onChangeText={setEditUsername}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleProfileUpdate}
                        disabled={loading}
                      >
                        <Text style={styles.primaryButtonText}>
                          {loading ? 'Saving...' : 'Save Changes'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Notification Schedules */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Bell size={20} color="#6366f1" />
                  <Text style={styles.sectionTitle}>Notification Schedules</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowScheduleModal(true)}
                  >
                    <Plus size={16} color="#6366f1" />
                  </TouchableOpacity>
                </View>
                
                {schedules.length > 0 ? (
                  schedules.map((schedule) => (
                    <View key={schedule.id} style={styles.scheduleCard}>
                      <View style={styles.scheduleHeader}>
                        <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                        <Text style={styles.scheduleTime}>{schedule.time}</Text>
                      </View>
                      {schedule.message && (
                        <Text style={styles.scheduleMessage}>{schedule.message}</Text>
                      )}
                      <View style={styles.scheduleDays}>
                        {schedule.days.map((day: number) => (
                          <Text key={day} style={styles.dayBadge}>
                            {dayNames[day]}
                          </Text>
                        ))}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Bell size={32} color="#9ca3af" />
                    <Text style={styles.emptyText}>No notification schedules yet</Text>
                    <Text style={styles.emptySubtext}>
                      Add your first reminder to stay on track
                    </Text>
                  </View>
                )}
              </View>

              {/* Settings Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <SettingsIcon size={20} color="#6366f1" />
                  <Text style={styles.sectionTitle}>Settings</Text>
                </View>
                
                <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
                  <LogOut size={20} color="#ef4444" />
                  <Text style={[styles.settingText, { color: '#ef4444' }]}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.signInPrompt}>
              <UserIcon size={48} color="#6366f1" />
              <Text style={styles.signInTitle}>Sign in to your account</Text>
              <Text style={styles.signInSubtitle}>
                Access your personalized manifestation journey and sync across devices
              </Text>
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => setShowSignInModal(true)}
              >
                <Text style={styles.signInButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.ScrollView>

        {/* Sign In Modal */}
        <Modal
          visible={showSignInModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSignInModal(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSignIn}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={styles.secondaryButtonText}>
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
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
              <Text style={styles.modalTitle}>Add Reminder</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowScheduleModal(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <TextInput
                style={styles.input}
                placeholder="Title"
                value={newSchedule.title}
                onChangeText={(text) => setNewSchedule(prev => ({ ...prev, title: text }))}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Message (optional)"
                value={newSchedule.message}
                onChangeText={(text) => setNewSchedule(prev => ({ ...prev, message: text }))}
                multiline
                numberOfLines={3}
              />

              <TextInput
                style={styles.input}
                placeholder="Time (e.g., 09:00)"
                value={newSchedule.time}
                onChangeText={(text) => setNewSchedule(prev => ({ ...prev, time: text }))}
              />

              <Text style={styles.inputLabel}>Days of the week:</Text>
              <View style={styles.daysContainer}>
                {dayNames.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      newSchedule.days.includes(index) && styles.dayButtonActive
                    ]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      newSchedule.days.includes(index) && styles.dayButtonTextActive
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddSchedule}
              >
                <Text style={styles.primaryButtonText}>Add Reminder</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  errorContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  successContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successText: {
    color: '#22c55e',
    fontSize: 14,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  quoteCard: {
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
    flex: 1,
  },
  addButton: {
    padding: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: '#6366f1',
    marginLeft: 4,
    fontWeight: '500',
  },
  profileCard: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  profilePrompt: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  profilePromptText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
  },
  profileDisplayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  profileUsername: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  profileJoined: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  editProfileSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  scheduleCard: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
    marginBottom: 12,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    flex: 1,
  },
  scheduleTime: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  scheduleMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  scheduleDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayBadge: {
    fontSize: 12,
    color: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  signInPrompt: {
    alignItems: 'center',
    padding: 32,
    margin: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  signInTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  signInSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    color: '#6366f1',
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    marginBottom: 8,
  },
  dayButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  dayButtonTextActive: {
    color: 'white',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 14,
  },
});