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
  Platform,
  Switch
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import GradientBackground from '@/components/GradientBackground';
import FloatingActionButton from '@/components/FloatingActionButton';
import { storageService } from '@/lib/storage';
import { defaultReminderMessages } from '@/lib/notifications';
import type { Database } from '@/lib/supabase';
import { 
  Bell, 
  User as UserIcon, 
  Settings as SettingsIcon, 
  LogOut, 
  Plus, 
  Clock, 
  Calendar,
  X,
  Heart,
  MessageSquare,
  Trash2,
  Edit3,
  Check,
  ChevronDown,
  Sun,
  Moon,
  Zap,
  BookOpen
} from 'lucide-react-native';

const { height, width } = Dimensions.get('window');

type NotificationSchedule = Database['public']['Tables']['notification_schedules']['Row'];
type Manifestation = Database['public']['Tables']['manifestations']['Row'];

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayNamesLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const reminderCategories = [
  { id: 'morning', name: 'Morning', icon: Sun, color: '#f59e0b', gradient: ['#fef3c7', '#fde68a'] },
  { id: 'evening', name: 'Evening', icon: Moon, color: '#6366f1', gradient: ['#e0e7ff', '#c7d2fe'] },
  { id: 'motivation', name: 'Motivation', icon: Zap, color: '#ef4444', gradient: ['#fef2f2', '#fecaca'] },
  { id: 'journaling', name: 'Journaling', icon: BookOpen, color: '#059669', gradient: ['#f0fdf4', '#bbf7d0'] },
];

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [schedules, setSchedules] = useState<NotificationSchedule[]>([]);
  const [manifestations, setManifestations] = useState<Manifestation[]>([]);
  const [favoriteManifestations, setFavoriteManifestations] = useState<Manifestation[]>([]);
  
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    message: '',
    time: '',
    days: [] as number[],
    isManifestationType: false,
    selectedCategory: '',
    selectedManifestation: null as Manifestation | null,
    useRandomFavorites: true
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

  const fetchSchedules = async () => {
    if (!user) return;
    
    try {
      const data = await storageService.getNotificationSchedules();
      setSchedules(data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchManifestations = async () => {
    try {
      const data = await storageService.getManifestations();
      setManifestations(data);
      setFavoriteManifestations(data.filter(m => m.is_favorite));
    } catch (error) {
      console.error('Error fetching manifestations:', error);
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
      setSchedules([]);
      setSuccess('Signed out successfully!');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const resetScheduleForm = () => {
    setNewSchedule({
      title: '',
      message: '',
      time: '',
      days: [],
      isManifestationType: false,
      selectedCategory: '',
      selectedManifestation: null,
      useRandomFavorites: true
    });
  };

  const handleAddSchedule = async () => {
    if (!user || !newSchedule.title || !newSchedule.time || newSchedule.days.length === 0) {
      setError('Please fill in all required fields');
      setTimeout(() => setError(null), 3000);
      return;
    }

    let finalMessage = newSchedule.message;
    let useRandomManifestation = false;

    if (newSchedule.isManifestationType) {
      if (newSchedule.useRandomFavorites) {
        useRandomManifestation = true;
        finalMessage = ''; // Will be populated dynamically
      } else if (newSchedule.selectedManifestation) {
        finalMessage = newSchedule.selectedManifestation.transformed_text;
      } else {
        setError('Please select a manifestation or choose random favorites');
        setTimeout(() => setError(null), 3000);
        return;
      }
    } else if (newSchedule.selectedCategory) {
      const categoryMessages = defaultReminderMessages[newSchedule.selectedCategory as keyof typeof defaultReminderMessages];
      finalMessage = categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
    }

    try {
      await storageService.addNotificationSchedule({
        user_id: user.id,
        title: newSchedule.title,
        message: finalMessage,
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

  const deleteSchedule = async (scheduleId: string) => {
    try {
      await storageService.deleteNotificationSchedule(scheduleId);
      setSuccess('Schedule deleted');
      fetchSchedules();
      setTimeout(() => setSuccess(null), 2000);
    } catch (error: any) {
      setError('Failed to delete schedule');
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

  const selectCategory = (categoryId: string) => {
    const category = reminderCategories.find(c => c.id === categoryId);
    if (category) {
      const categoryMessages = defaultReminderMessages[categoryId as keyof typeof defaultReminderMessages];
      setNewSchedule(prev => ({
        ...prev,
        selectedCategory: categoryId,
        title: prev.title || `${category.name} Reminder`,
        message: categoryMessages[0]
      }));
    }
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

  const getTotalManifestations = () => manifestations.length;
  const getTotalFavorites = () => favoriteManifestations.length;
  const getActiveSchedules = () => schedules.filter(s => s.is_active).length;

  return (
    <GradientBackground colors={['#667eea', '#764ba2', '#f093fb']}>
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
            <Text style={styles.statNumber}>{getTotalManifestations()}</Text>
            <Text style={styles.statLabel}>Manifestations</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getTotalFavorites()}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getActiveSchedules()}</Text>
            <Text style={styles.statLabel}>Reminders</Text>
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
                  <UserIcon size={20} color="#ffffff" />
                  <Text style={styles.sectionTitle}>Profile</Text>
                </View>
                <View style={styles.profileCard}>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                  <Text style={styles.profileJoined}>
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {/* Notification Schedules */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Bell size={20} color="#ffffff" />
                  <Text style={styles.sectionTitle}>Notification Schedules</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowScheduleModal(true)}
                  >
                    <Plus size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                
                {schedules.length > 0 ? (
                  schedules.map((schedule) => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      onToggleActive={() => toggleScheduleActive(schedule)}
                      onDelete={() => deleteSchedule(schedule.id)}
                    />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Bell size={32} color="rgba(255, 255, 255, 0.6)" />
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
                  <SettingsIcon size={20} color="#ffffff" />
                  <Text style={styles.sectionTitle}>Settings</Text>
                </View>
                
                <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
                  <LogOut size={20} color="#ff6b6b" />
                  <Text style={[styles.settingText, { color: '#ff6b6b' }]}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.signInPrompt}>
              <UserIcon size={48} color="#ffffff" />
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
          <GradientBackground colors={['#667eea', '#764ba2']}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
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
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
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
                <Text style={styles.modalTitle}>Add Reminder</Text>
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
                {/* Notification Type Toggle */}
                <View style={styles.typeToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeToggleButton,
                      !newSchedule.isManifestationType && styles.typeToggleButtonActive
                    ]}
                    onPress={() => setNewSchedule(prev => ({ ...prev, isManifestationType: false }))}
                  >
                    <MessageSquare size={18} color={!newSchedule.isManifestationType ? "#667eea" : "rgba(255, 255, 255, 0.7)"} />
                    <Text style={[
                      styles.typeToggleText,
                      !newSchedule.isManifestationType && styles.typeToggleTextActive
                    ]}>
                      Reminder
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.typeToggleButton,
                      newSchedule.isManifestationType && styles.typeToggleButtonActive
                    ]}
                    onPress={() => setNewSchedule(prev => ({ ...prev, isManifestationType: true }))}
                  >
                    <Heart size={18} color={newSchedule.isManifestationType ? "#667eea" : "rgba(255, 255, 255, 0.7)"} />
                    <Text style={[
                      styles.typeToggleText,
                      newSchedule.isManifestationType && styles.typeToggleTextActive
                    ]}>
                      Manifestation
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Title Input */}
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter reminder title"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={newSchedule.title}
                  onChangeText={(text) => setNewSchedule(prev => ({ ...prev, title: text }))}
                />

                {/* Content Selection */}
                {!newSchedule.isManifestationType ? (
                  <>
                    <Text style={styles.inputLabel}>Category</Text>
                    <View style={styles.categoryGrid}>
                      {reminderCategories.map((category) => {
                        const IconComponent = category.icon;
                        const isSelected = newSchedule.selectedCategory === category.id;
                        return (
                          <TouchableOpacity
                            key={category.id}
                            style={[
                              styles.categoryCard,
                              isSelected && styles.categoryCardSelected
                            ]}
                            onPress={() => selectCategory(category.id)}
                          >
                            <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                              <IconComponent size={20} color="#ffffff" />
                            </View>
                            <Text style={[
                              styles.categoryName,
                              isSelected && styles.categoryNameSelected
                            ]}>
                              {category.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {newSchedule.selectedCategory && (
                      <>
                        <Text style={styles.inputLabel}>Message</Text>
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          placeholder="Custom message (optional)"
                          placeholderTextColor="rgba(255, 255, 255, 0.7)"
                          value={newSchedule.message}
                          onChangeText={(text) => setNewSchedule(prev => ({ ...prev, message: text }))}
                          multiline
                          numberOfLines={3}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Manifestation Source</Text>
                    <View style={styles.manifestationOptions}>
                      <TouchableOpacity
                        style={[
                          styles.manifestationOption,
                          newSchedule.useRandomFavorites && styles.manifestationOptionSelected
                        ]}
                        onPress={() => setNewSchedule(prev => ({ 
                          ...prev, 
                          useRandomFavorites: true,
                          selectedManifestation: null 
                        }))}
                      >
                        <Text style={[
                          styles.manifestationOptionText,
                          newSchedule.useRandomFavorites && styles.manifestationOptionTextSelected
                        ]}>
                          Random Favorites ({favoriteManifestations.length})
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.manifestationOption,
                          !newSchedule.useRandomFavorites && styles.manifestationOptionSelected
                        ]}
                        onPress={() => setNewSchedule(prev => ({ 
                          ...prev, 
                          useRandomFavorites: false 
                        }))}
                      >
                        <Text style={[
                          styles.manifestationOptionText,
                          !newSchedule.useRandomFavorites && styles.manifestationOptionTextSelected
                        ]}>
                          Choose Specific
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {!newSchedule.useRandomFavorites && (
                      <View style={styles.manifestationList}>
                        <Text style={styles.inputLabel}>Select Manifestation</Text>
                        <ScrollView style={styles.manifestationScroll} nestedScrollEnabled>
                          {favoriteManifestations.length > 0 ? (
                            favoriteManifestations.map((manifestation) => (
                              <TouchableOpacity
                                key={manifestation.id}
                                style={[
                                  styles.manifestationItem,
                                  newSchedule.selectedManifestation?.id === manifestation.id && 
                                  styles.manifestationItemSelected
                                ]}
                                onPress={() => setNewSchedule(prev => ({ 
                                  ...prev, 
                                  selectedManifestation: manifestation 
                                }))}
                              >
                                <Text style={styles.manifestationText} numberOfLines={2}>
                                  {manifestation.transformed_text}
                                </Text>
                                {newSchedule.selectedManifestation?.id === manifestation.id && (
                                  <Check size={16} color="#667eea" />
                                )}
                              </TouchableOpacity>
                            ))
                          ) : (
                            <Text style={styles.noFavoritesText}>
                              No favorite manifestations yet. Mark some as favorites in your library!
                            </Text>
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </>
                )}

                {/* Time Input */}
                <Text style={styles.inputLabel}>Time *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM (e.g., 09:00)"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={newSchedule.time}
                  onChangeText={(text) => setNewSchedule(prev => ({ ...prev, time: text }))}
                />

                {/* Days Selection */}
                <Text style={styles.inputLabel}>Days of the week *</Text>
                <View style={styles.daysContainer}>
                  {dayNamesLong.map((day, index) => (
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
                      {newSchedule.days.includes(index) && (
                        <View style={styles.dayButtonCheck}>
                          <Check size={14} color="#ffffff" strokeWidth={2} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Selected Days Summary */}
                {newSchedule.days.length > 0 && (
                  <View style={styles.selectedDaysSummary}>
                    <Text style={styles.selectedDaysText}>
                      Selected: {newSchedule.days.map(d => dayNames[d]).join(', ')}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!newSchedule.title || !newSchedule.time || newSchedule.days.length === 0) && 
                    styles.primaryButtonDisabled
                  ]}
                  onPress={handleAddSchedule}
                  disabled={!newSchedule.title || !newSchedule.time || newSchedule.days.length === 0}
                >
                  <Text style={styles.primaryButtonText}>Add Reminder</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </GradientBackground>
        </Modal>
      </View>
    </GradientBackground>
  );
}

interface ScheduleCardProps {
  schedule: NotificationSchedule;
  onToggleActive: () => void;
  onDelete: () => void;
}

function ScheduleCard({ schedule, onToggleActive, onDelete }: ScheduleCardProps) {
  return (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleHeader}>
        <View style={styles.scheduleInfo}>
          <Text style={styles.scheduleTitle}>{schedule.title}</Text>
          <Text style={styles.scheduleTime}>{schedule.time}</Text>
        </View>
        
        <View style={styles.scheduleControls}>
          <Switch
            value={schedule.is_active}
            onValueChange={onToggleActive}
            trackColor={{ false: 'rgba(255, 255, 255, 0.3)', true: '#4ade80' }}
            thumbColor={schedule.is_active ? '#ffffff' : '#f4f3f4'}
          />
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
          >
            <Trash2 size={16} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>
      
      {schedule.message && (
        <Text style={styles.scheduleMessage} numberOfLines={2}>
          {schedule.use_random_manifestation ? 'Random favorite manifestation' : schedule.message}
        </Text>
      )}
      
      <View style={styles.scheduleDays}>
        {schedule.days.map((day: number) => (
          <View key={day} style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>
              {dayNames[day]}
            </Text>
          </View>
        ))}
      </View>
    </View>
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
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successText: {
    color: '#4ade80',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    fontFamily: 'Inter-Bold',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Inter-Medium',
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
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
  profileCard: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  profileEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
    fontFamily: 'Inter-Medium',
  },
  profileJoined: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Inter-Regular',
  },
  scheduleCard: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
    marginBottom: 12,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 2,
    fontFamily: 'Inter-Medium',
  },
  scheduleTime: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter-Regular',
  },
  scheduleControls: {
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
  },
  scheduleDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayBadgeText: {
    fontSize: 12,
    color: 'white',
    fontFamily: 'Inter-Medium',
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
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    fontFamily: 'Inter-Medium',
  },
  signInPrompt: {
    alignItems: 'center',
    padding: 32,
    margin: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  signInTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  signInSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: 'Inter-Regular',
  },
  signInButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
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
    padding: 20,
    paddingTop: 60,
  },
  modalTitle: {
    fontSize: 20,
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
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
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
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 8,
    fontFamily: 'Inter-Medium',
  },
  typeToggleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
  },
  typeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  typeToggleButtonActive: {
    backgroundColor: 'white',
  },
  typeToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Inter-Medium',
  },
  typeToggleTextActive: {
    color: '#667eea',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  categoryCard: {
    width: (width - 80) / 2,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
  categoryNameSelected: {
    color: 'white',
  },
  manifestationOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  manifestationOption: {
    flex: 1,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  manifestationOptionSelected: {
    borderColor: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  manifestationOptionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
  manifestationOptionTextSelected: {
    color: 'white',
  },
  manifestationList: {
    marginBottom: 20,
  },
  manifestationScroll: {
    maxHeight: 200,
  },
  manifestationItem: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  manifestationItemSelected: {
    borderColor: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  manifestationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
    marginRight: 8,
    fontFamily: 'Inter-Regular',
  },
  noFavoritesText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
    fontFamily: 'Inter-Regular',
  },
  daysContainer: {
    gap: 8,
    marginBottom: 16,
  },
  dayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayButtonActive: {
    borderColor: '#4ade80',
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  dayButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter-Medium',
  },
  dayButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  dayButtonCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDaysSummary: {
    padding: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderRadius: 8,
    marginBottom: 20,
  },
  selectedDaysText: {
    fontSize: 14,
    color: '#4ade80',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
  primaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});