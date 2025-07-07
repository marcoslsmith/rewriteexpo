import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Modal, 
  TextInput, 
  Animated,
  Dimensions,
  Platform,
  Switch,
  Alert
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import GradientBackground from '@/components/GradientBackground';
import FloatingActionButton from '@/components/FloatingActionButton';
import { storageService } from '@/lib/storage';
import { notificationService, defaultReminderMessages } from '@/lib/notifications';
import { Bell, User as UserIcon, Settings as SettingsIcon, LogOut, Plus, CreditCard as Edit3, Check, X, Crown, Calendar, Mail, AtSign, Heart, Clock, Trash2, MessageSquare, Sparkles } from 'lucide-react-native';

const { height, width } = Dimensions.get('window');

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
};

type UserStats = {
  manifestationCount: number;
  favoriteCount: number;
  challengeCount: number;
  completedChallenges: number;
  currentStreak: number;
  totalPoints: number;
  daysSinceJoined: number;
};

type NotificationSchedule = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  use_random_manifestation: boolean;
  time: string;
  days: number[];
  is_active: boolean;
  created_at: string;
};

type Manifestation = {
  id: string;
  user_id: string | null;
  original_entry: string;
  transformed_text: string;
  is_favorite: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [manifestations, setManifestations] = useState<Manifestation[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    manifestationCount: 0,
    favoriteCount: 0,
    challengeCount: 0,
    completedChallenges: 0,
    currentStreak: 0,
    totalPoints: 0,
    daysSinceJoined: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [schedules, setSchedules] = useState<NotificationSchedule[]>([]);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [scheduleType, setScheduleType] = useState<'reminder' | 'manifestation'>('reminder');
  const [selectedCategory, setSelectedCategory] = useState<'morning' | 'evening' | 'motivation' | 'journaling'>('morning');
  const [selectedManifestation, setSelectedManifestation] = useState<string>('');
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    message: '',
    time: '',
    days: [] as number[],
    use_random_manifestation: false,
  });
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showFAB, setShowFAB] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkUser();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (user) {
      fetchSchedules();
      fetchProfile();
      fetchUserStats();
      fetchManifestations();
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

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
        setEditUsername(data.username || '');
        setEditDisplayName(data.display_name || '');
        
        if (!data.username && !data.display_name) {
          setIsEditingProfile(true);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const fetchManifestations = async () => {
    try {
      const data = await storageService.getManifestations();
      setManifestations(data);
    } catch (error) {
      console.error('Error fetching manifestations:', error);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;
    
    try {
      // Fetch manifestations data
      const { data: manifestations, error: manifestationsError } = await supabase
        .from('manifestations')
        .select('id, is_favorite, created_at')
        .eq('user_id', user.id);

      if (manifestationsError) throw manifestationsError;

      // Fetch challenge progress data
      const { data: challengeProgress, error: challengeError } = await supabase
        .from('challenge_progress')
        .select('id, completed_at, points, streak, start_date, completed_days')
        .eq('user_id', user.id);

      if (challengeError) throw challengeError;

      // Calculate stats
      const manifestationCount = manifestations?.length || 0;
      const favoriteCount = manifestations?.filter(m => m.is_favorite).length || 0;
      const challengeCount = challengeProgress?.length || 0;
      const completedChallenges = challengeProgress?.filter(c => c.completed_at).length || 0;
      const totalPoints = challengeProgress?.reduce((sum, c) => sum + (c.points || 0), 0) || 0;
      
      // Calculate current streak (most recent active challenge)
      const activeChallenge = challengeProgress?.find(c => !c.completed_at);
      const currentStreak = activeChallenge?.streak || 0;
      
      // Calculate days since joined
      const joinDate = new Date(user.created_at);
      const today = new Date();
      const daysSinceJoined = Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

      setUserStats({
        manifestationCount,
        favoriteCount,
        challengeCount,
        completedChallenges,
        currentStreak,
        totalPoints,
        daysSinceJoined,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchSchedules = async () => {
    if (!user) return;
    
    try {
      const data = await storageService.getNotificationSchedules();
      setSchedules(data);
      
      // Create default schedules if none exist
      if (data.length === 0) {
        await notificationService.createDefaultSchedules(user.id);
        const updatedData = await storageService.getNotificationSchedules();
        setSchedules(updatedData);
      }
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
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(null), 3000);
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
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(null), 3000);
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
      setManifestations([]);
      setUserStats({
        manifestationCount: 0,
        favoriteCount: 0,
        challengeCount: 0,
        completedChallenges: 0,
        currentStreak: 0,
        totalPoints: 0,
        daysSinceJoined: 0,
      });
      setSuccess('Signed out successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddSchedule = async () => {
    if (!user || !newSchedule.title || !newSchedule.time || newSchedule.days.length === 0) {
      setError('Please fill in all required fields');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      let message = newSchedule.message;
      let useRandomManifestation = false;

      if (scheduleType === 'manifestation') {
        if (selectedManifestation === 'random') {
          useRandomManifestation = true;
          message = 'Your personalized manifestation will appear here';
        } else if (selectedManifestation) {
          const manifestation = manifestations.find(m => m.id === selectedManifestation);
          message = manifestation?.transformed_text || message;
        }
      }

      await storageService.addNotificationSchedule({
        user_id: user.id,
        title: newSchedule.title,
        message: message,
        use_random_manifestation: useRandomManifestation,
        time: newSchedule.time,
        days: newSchedule.days,
        is_active: true,
      });

      setSuccess('Schedule added successfully!');
      setShowScheduleModal(false);
      resetScheduleForm();
      fetchSchedules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const resetScheduleForm = () => {
    setNewSchedule({ title: '', message: '', time: '', days: [], use_random_manifestation: false });
    setScheduleType('reminder');
    setSelectedCategory('morning');
    setSelectedManifestation('');
  };

  const deleteSchedule = async (scheduleId: string) => {
    try {
      await storageService.deleteNotificationSchedule(scheduleId);
      setSuccess('Schedule deleted successfully!');
      fetchSchedules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError('Failed to delete schedule');
      setTimeout(() => setError(null), 3000);
    }
  };

  const toggleScheduleActive = async (schedule: NotificationSchedule) => {
    try {
      await storageService.updateNotificationSchedule(schedule.id, {
        is_active: !schedule.is_active
      });
      fetchSchedules();
    } catch (error: any) {
      setError('Failed to update schedule');
      setTimeout(() => setError(null), 3000);
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

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDisplayName = () => {
    if (profile?.display_name) return profile.display_name;
    if (profile?.username) return profile.username;
    return user?.email?.split('@')[0] || 'User';
  };

  const formatJoinDate = () => {
    if (!user?.created_at) return 'Recently';
    const joinDate = new Date(user.created_at);
    return joinDate.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const favoriteManifestations = manifestations.filter(m => m.is_favorite);

  return (
    <GradientBackground colors={['#667eea', '#764ba2', '#f093fb']}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <FloatingActionButton visible={showFAB} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.title}>Your Profile</Text>
        </View>

        {/* Status Messages */}
        {error && (
          <Animated.View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}
        
        {success && (
          <Animated.View style={styles.successContainer}>
            <Text style={styles.successText}>{success}</Text>
          </Animated.View>
        )}

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {user ? (
            <>
              {/* Profile Card */}
              <View style={styles.profileMainCard}>
                <View style={styles.profileHeader}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(getDisplayName())}</Text>
                    </View>
                    {userStats.totalPoints > 100 && (
                      <View style={styles.premiumBadge}>
                        <Crown size={12} color="#FFD700" />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{getDisplayName()}</Text>
                    {profile?.username && (
                      <View style={styles.usernameContainer}>
                        <AtSign size={14} color="rgba(255, 255, 255, 0.7)" />
                        <Text style={styles.profileUsername}>{profile.username}</Text>
                      </View>
                    )}
                    <View style={styles.emailContainer}>
                      <Mail size={14} color="rgba(255, 255, 255, 0.7)" />
                      <Text style={styles.profileEmail}>{user.email}</Text>
                    </View>
                    <View style={styles.joinDateContainer}>
                      <Calendar size={14} color="rgba(255, 255, 255, 0.7)" />
                      <Text style={styles.joinDateText}>Joined {formatJoinDate()}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.editProfileButton}
                    onPress={() => setIsEditingProfile(!isEditingProfile)}
                  >
                    {isEditingProfile ? (
                      <X size={20} color="#ffffff" />
                    ) : (
                      <Edit3 size={20} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Profile Completion Prompt */}
                {(!profile?.username || !profile?.display_name) && !isEditingProfile && (
                  <TouchableOpacity 
                    style={styles.completionPrompt}
                    onPress={() => setIsEditingProfile(true)}
                  >
                    <Text style={styles.completionPromptText}>
                      Complete your profile to unlock all features
                    </Text>
                    <Edit3 size={16} color="#667eea" />
                  </TouchableOpacity>
                )}

                {/* Edit Profile Form */}
                {isEditingProfile && (
                  <View style={styles.editForm}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Display Name</Text>
                      <TextInput
                        style={styles.modernInput}
                        placeholder="Enter your display name"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        value={editDisplayName}
                        onChangeText={setEditDisplayName}
                      />
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Username</Text>
                      <TextInput
                        style={styles.modernInput}
                        placeholder="Choose a username"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        value={editUsername}
                        onChangeText={setEditUsername}
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setIsEditingProfile(false)}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleProfileUpdate}
                        disabled={loading}
                      >
                        <Check size={16} color="#ffffff" />
                        <Text style={styles.saveButtonText}>
                          {loading ? 'Saving...' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{userStats.currentStreak}</Text>
                    <Text style={styles.statLabel}>Current Streak</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{userStats.manifestationCount}</Text>
                    <Text style={styles.statLabel}>Manifestations</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{userStats.totalPoints}</Text>
                    <Text style={styles.statLabel}>Total Points</Text>
                  </View>
                </View>

                {/* Additional Stats Row */}
                <View style={styles.additionalStatsRow}>
                  <View style={styles.additionalStatItem}>
                    <Text style={styles.additionalStatNumber}>{userStats.favoriteCount}</Text>
                    <Text style={styles.additionalStatLabel}>Favorites</Text>
                  </View>
                  <View style={styles.additionalStatItem}>
                    <Text style={styles.additionalStatNumber}>{userStats.challengeCount}</Text>
                    <Text style={styles.additionalStatLabel}>Challenges Started</Text>
                  </View>
                  <View style={styles.additionalStatItem}>
                    <Text style={styles.additionalStatNumber}>{userStats.completedChallenges}</Text>
                    <Text style={styles.additionalStatLabel}>Completed</Text>
                  </View>
                  <View style={styles.additionalStatItem}>
                    <Text style={styles.additionalStatNumber}>{userStats.daysSinceJoined}</Text>
                    <Text style={styles.additionalStatLabel}>Days Active</Text>
                  </View>
                </View>
              </View>

              {/* Notification Schedules */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <Bell size={20} color="#667eea" />
                    <Text style={styles.sectionTitle}>Notification Schedules</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowScheduleModal(true)}
                  >
                    <Plus size={16} color="#667eea" />
                  </TouchableOpacity>
                </View>
                
                {schedules.length > 0 ? (
                  schedules.map((schedule) => (
                    <View key={schedule.id} style={styles.scheduleCard}>
                      <View style={styles.scheduleHeader}>
                        <View style={styles.scheduleMainInfo}>
                          <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                          <Text style={styles.scheduleTime}>{schedule.time}</Text>
                        </View>
                        <View style={styles.scheduleActions}>
                          <Switch
                            value={schedule.is_active}
                            onValueChange={() => toggleScheduleActive(schedule)}
                            trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#667eea' }}
                            thumbColor={schedule.is_active ? '#ffffff' : 'rgba(255, 255, 255, 0.8)'}
                          />
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => {
                              Alert.alert(
                                'Delete Schedule',
                                'Are you sure you want to delete this notification schedule?',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Delete', style: 'destructive', onPress: () => deleteSchedule(schedule.id) }
                                ]
                              );
                            }}
                          >
                            <Trash2 size={16} color="#ff6b6b" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      {schedule.use_random_manifestation ? (
                        <View style={styles.manifestationIndicator}>
                          <Sparkles size={14} color="#667eea" />
                          <Text style={styles.manifestationText}>Random favorite manifestation</Text>
                        </View>
                      ) : schedule.message ? (
                        <Text style={styles.scheduleMessage}>{schedule.message}</Text>
                      ) : null}
                      
                      <View style={styles.scheduleDays}>
                        {schedule.days.map((day: number) => (
                          <View key={day} style={styles.dayBadge}>
                            <Text style={styles.dayBadgeText}>{dayNames[day]}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Bell size={32} color="rgba(255, 255, 255, 0.3)" />
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
                  <View style={styles.sectionTitleContainer}>
                    <SettingsIcon size={20} color="#667eea" />
                    <Text style={styles.sectionTitle}>Settings</Text>
                  </View>
                </View>
                
                <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
                  <LogOut size={20} color="#ff6b6b" />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.signInPrompt}>
              <View style={styles.signInIcon}>
                <UserIcon size={48} color="#ffffff" />
              </View>
              <Text style={styles.signInTitle}>Welcome to The Rewrite</Text>
              <Text style={styles.signInSubtitle}>
                Sign in to access your personalized manifestation journey and sync across all your devices
              </Text>
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => setShowSignInModal(true)}
              >
                <Text style={styles.signInButtonText}>Get Started</Text>
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
          <GradientBackground colors={['#667eea', '#764ba2']}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowSignInModal(false)}
                >
                  <X size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Email"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Password"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  onPress={handleSignIn}
                  disabled={loading}
                >
                  <Text style={styles.modalPrimaryButtonText}>
                    {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={() => setIsSignUp(!isSignUp)}
                >
                  <Text style={styles.modalSecondaryButtonText}>
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </GradientBackground>
        </Modal>

        {/* Add Schedule Modal */}
        <Modal
          visible={showScheduleModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <GradientBackground colors={['#667eea', '#764ba2']}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Notification</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setShowScheduleModal(false);
                    resetScheduleForm();
                  }}
                >
                  <X size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Schedule Type Selection */}
                <View style={styles.typeSelection}>
                  <TouchableOpacity
                    style={[styles.typeButton, scheduleType === 'reminder' && styles.typeButtonActive]}
                    onPress={() => setScheduleType('reminder')}
                  >
                    <MessageSquare size={20} color={scheduleType === 'reminder' ? '#ffffff' : 'rgba(255, 255, 255, 0.7)'} />
                    <Text style={[styles.typeButtonText, scheduleType === 'reminder' && styles.typeButtonTextActive]}>
                      Reminder
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.typeButton, scheduleType === 'manifestation' && styles.typeButtonActive]}
                    onPress={() => setScheduleType('manifestation')}
                  >
                    <Sparkles size={20} color={scheduleType === 'manifestation' ? '#ffffff' : 'rgba(255, 255, 255, 0.7)'} />
                    <Text style={[styles.typeButtonText, scheduleType === 'manifestation' && styles.typeButtonTextActive]}>
                      Manifestation
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Notification Title"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newSchedule.title}
                  onChangeText={(text) => setNewSchedule(prev => ({ ...prev, title: text }))}
                />

                {scheduleType === 'reminder' ? (
                  <>
                    {/* Category Selection */}
                    <Text style={styles.inputLabel}>Choose a category:</Text>
                    <View style={styles.categoryGrid}>
                      {Object.keys(defaultReminderMessages).map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryButton,
                            selectedCategory === category && styles.categoryButtonActive
                          ]}
                          onPress={() => {
                            setSelectedCategory(category as any);
                            const messages = defaultReminderMessages[category as keyof typeof defaultReminderMessages];
                            setNewSchedule(prev => ({ 
                              ...prev, 
                              message: messages[Math.floor(Math.random() * messages.length)]
                            }));
                          }}
                        >
                          <Text style={[
                            styles.categoryButtonText,
                            selectedCategory === category && styles.categoryButtonTextActive
                          ]}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TextInput
                      style={[styles.modalInput, styles.textArea]}
                      placeholder="Custom message (optional)"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={newSchedule.message}
                      onChangeText={(text) => setNewSchedule(prev => ({ ...prev, message: text }))}
                      multiline
                      numberOfLines={3}
                    />
                  </>
                ) : (
                  <>
                    {/* Manifestation Selection */}
                    <Text style={styles.inputLabel}>Choose manifestation source:</Text>
                    
                    <TouchableOpacity
                      style={[
                        styles.manifestationOption,
                        selectedManifestation === 'random' && styles.manifestationOptionActive
                      ]}
                      onPress={() => setSelectedManifestation('random')}
                    >
                      <Sparkles size={20} color={selectedManifestation === 'random' ? '#667eea' : 'rgba(255, 255, 255, 0.7)'} />
                      <View style={styles.manifestationOptionText}>
                        <Text style={[
                          styles.manifestationOptionTitle,
                          selectedManifestation === 'random' && styles.manifestationOptionTitleActive
                        ]}>
                          Random Favorite
                        </Text>
                        <Text style={styles.manifestationOptionSubtitle}>
                          Show a random manifestation from your favorites
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {favoriteManifestations.length > 0 && (
                      <>
                        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Or choose a specific favorite:</Text>
                        <ScrollView style={styles.manifestationList} nestedScrollEnabled>
                          {favoriteManifestations.map((manifestation) => (
                            <TouchableOpacity
                              key={manifestation.id}
                              style={[
                                styles.manifestationItem,
                                selectedManifestation === manifestation.id && styles.manifestationItemActive
                              ]}
                              onPress={() => setSelectedManifestation(manifestation.id)}
                            >
                              <Heart 
                                size={16} 
                                color={selectedManifestation === manifestation.id ? '#667eea' : 'rgba(255, 255, 255, 0.7)'} 
                                fill={selectedManifestation === manifestation.id ? '#667eea' : 'transparent'}
                              />
                              <Text style={[
                                styles.manifestationItemText,
                                selectedManifestation === manifestation.id && styles.manifestationItemTextActive
                              ]} numberOfLines={2}>
                                {manifestation.transformed_text}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </>
                    )}

                    {favoriteManifestations.length === 0 && (
                      <View style={styles.noFavoritesMessage}>
                        <Heart size={24} color="rgba(255, 255, 255, 0.5)" />
                        <Text style={styles.noFavoritesText}>
                          No favorite manifestations yet. Mark some manifestations as favorites in your library to use them here.
                        </Text>
                      </View>
                    )}
                  </>
                )}

                <TextInput
                  style={styles.modalInput}
                  placeholder="Time (e.g., 09:00)"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
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
                  style={[
                    styles.modalPrimaryButton,
                    (!newSchedule.title || !newSchedule.time || newSchedule.days.length === 0 || 
                     (scheduleType === 'manifestation' && !selectedManifestation)) && styles.modalPrimaryButtonDisabled
                  ]}
                  onPress={handleAddSchedule}
                  disabled={!newSchedule.title || !newSchedule.time || newSchedule.days.length === 0 || 
                           (scheduleType === 'manifestation' && !selectedManifestation)}
                >
                  <Text style={styles.modalPrimaryButtonText}>Create Notification</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </GradientBackground>
        </Modal>
      </Animated.View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Inter-Bold',
  },
  errorContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  successContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successText: {
    color: '#22c55e',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileMainCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Inter-Bold',
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
    fontFamily: 'Inter-Regular',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
    fontFamily: 'Inter-Regular',
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  completionPromptText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  editForm: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    fontFamily: 'Inter-Medium',
  },
  modernInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    fontFamily: 'Inter-Regular',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Inter-Bold',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    fontFamily: 'Inter-Medium',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  joinDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  joinDateText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 4,
    fontFamily: 'Inter-Regular',
  },
  additionalStatsRow: {
    flexDirection: 'row',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  additionalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  additionalStatNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter-SemiBold',
  },
  additionalStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleCard: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  scheduleMainInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
    fontFamily: 'Inter-Medium',
  },
  scheduleTime: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
  scheduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 4,
  },
  scheduleMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  manifestationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  manifestationText: {
    fontSize: 14,
    color: '#667eea',
    fontFamily: 'Inter-Medium',
  },
  scheduleDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayBadge: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.5)',
  },
  dayBadgeText: {
    fontSize: 12,
    color: '#667eea',
    fontFamily: 'Inter-Medium',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 12,
    marginBottom: 4,
    fontFamily: 'Inter-Medium',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    color: '#ff6b6b',
    fontFamily: 'Inter-Medium',
  },
  signInPrompt: {
    alignItems: 'center',
    padding: 40,
    margin: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  signInIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  signInTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    fontFamily: 'Inter-Bold',
  },
  signInSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontFamily: 'Inter-Regular',
  },
  signInButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Inter-Bold',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    fontFamily: 'Inter-Regular',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelection: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  typeButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  categoryButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  manifestationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 12,
    gap: 12,
  },
  manifestationOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(102, 126, 234, 0.5)',
  },
  manifestationOptionText: {
    flex: 1,
  },
  manifestationOptionTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  manifestationOptionTitleActive: {
    color: 'white',
  },
  manifestationOptionSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  manifestationList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  manifestationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 8,
    gap: 12,
  },
  manifestationItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(102, 126, 234, 0.5)',
  },
  manifestationItemText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  manifestationItemTextActive: {
    color: 'white',
  },
  noFavoritesMessage: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginBottom: 16,
  },
  noFavoritesText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  dayButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Inter-Medium',
  },
  dayButtonTextActive: {
    color: 'white',
  },
  modalPrimaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalPrimaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  modalSecondaryButton: {
    padding: 16,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});