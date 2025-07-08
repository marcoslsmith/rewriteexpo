import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Challenge, ChallengeProgress } from '@/types/global';
import { challengeData } from '@/lib/challenges';
import { AnimatedButton } from '@/components/AnimatedButton';
import { LoadingShimmer } from '@/components/LoadingShimmer';
import { EmptyState } from '@/components/EmptyState';
import {
  Target,
  Heart,
  Brain,
  Zap,
  Trophy,
  Play,
  ChevronDown,
  Calendar,
  Award,
  Star,
} from 'lucide-react-native';

const challengeIcons = {
  'gratitude-21': Heart,
  'mindfulness-30': Brain,
  'energy-boost-14': Zap,
  'focus-challenge-7': Target,
};

const challengeGradients = {
  'gratitude-21': ['#ff6b6b', '#ee5a24'],
  'mindfulness-30': ['#667eea', '#764ba2'],
  'energy-boost-14': ['#feca57', '#ff9ff3'],
  'focus-challenge-7': ['#48dbfb', '#0abde3'],
};

interface CompletedChallengeCardProps {
  progress: ChallengeProgress;
  challenge: Challenge;
  onViewSummary: () => void;
}

function CompletedChallengeCard({ progress, challenge, onViewSummary }: CompletedChallengeCardProps) {
  const [showSummary, setShowSummary] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const IconComponent = challengeIcons[challenge.id as keyof typeof challengeIcons] || Trophy;
  const gradientColors = challengeGradients[challenge.id as keyof typeof challengeGradients] || ['#667eea', '#764ba2'];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const completionRate = (progress.completed_days?.length || 0) / challenge.duration;
  const completionPercentage = Math.round(completionRate * 100);

  return (
    <Animated.View style={[styles.completedCard, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
        style={styles.completedCardGradient}
      >
        <View style={styles.completedCardHeader}>
          <View style={[styles.completedIconContainer, { backgroundColor: gradientColors[0] }]}>
            <Trophy size={20} color="#ffffff" strokeWidth={1.5} />
          </View>
          <View style={styles.completedCardInfo}>
            <Text style={styles.completedCardTitle}>{challenge.title}</Text>
            <Text style={styles.completedCardSubtitle}>
              Completed • Run #{progress.run_number}
            </Text>
          </View>
          <View style={styles.completedCardStats}>
            <Text style={styles.completedCardPercentage}>{completionPercentage}%</Text>
            <Text style={styles.completedCardDays}>
              {progress.completed_days?.length || 0}/{challenge.duration} days
            </Text>
          </View>
        </View>

        {progress.ai_summary && (
          <TouchableOpacity
            style={styles.summaryToggle}
            onPress={() => setShowSummary(!showSummary)}
          >
            <Text style={styles.summaryToggleText}>
              {showSummary ? 'Hide' : 'View'} AI Summary
            </Text>
            <ChevronDown
              size={16}
              color="rgba(255, 255, 255, 0.8)"
              strokeWidth={1.5}
              style={{ transform: [{ rotate: showSummary ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>
        )}

        {showSummary && progress.ai_summary && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>{progress.ai_summary}</Text>
          </View>
        )}

        <View style={styles.completedCardFooter}>
          <Text style={styles.completedDate}>
            Completed {new Date(progress.completed_at!).toLocaleDateString()}
          </Text>
          <View style={styles.pointsBadge}>
            <Star size={12} color="#fbbf24" strokeWidth={1.5} />
            <Text style={styles.pointsText}>{progress.points} pts</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

interface ChallengeCardProps {
  challenge: Challenge;
  index: number;
  onStart: () => void;
  completedRuns: ChallengeProgress[];
}

function ChallengeCard({ challenge, index, onStart, completedRuns }: ChallengeCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const IconComponent = challengeIcons[challenge.id as keyof typeof challengeIcons] || Target;
  const gradientColors = challengeGradients[challenge.id as keyof typeof challengeGradients] || ['#667eea', '#764ba2'];

  useEffect(() => {
    // Staggered animation for cards
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: index * 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.challengeCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
        style={styles.challengeCardGradient}
      >
        <View style={styles.challengeCardHeader}>
          <View style={[styles.challengeIconContainer, { backgroundColor: gradientColors[0] }]}>
            <IconComponent size={24} color="#ffffff" strokeWidth={1.5} />
          </View>
          <View style={styles.challengeCardInfo}>
            <Text style={styles.challengeCardTitle}>{challenge.title}</Text>
            <Text style={styles.challengeCardDuration}>{challenge.duration} days</Text>
          </View>
        </View>
        
        <Text style={styles.challengeCardDescription}>{challenge.description}</Text>
        
        {completedRuns.length > 0 && (
          <View style={styles.completedRunsIndicator}>
            <Trophy size={14} color="#fbbf24" strokeWidth={1.5} />
            <Text style={styles.completedRunsText}>
              Completed {completedRuns.length} time{completedRuns.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        
        <AnimatedButton onPress={onStart} style={styles.startButton}>
          <LinearGradient
            colors={gradientColors}
            style={styles.startButtonGradient}
          >
            <View style={styles.startButtonContent}>
              <Play size={16} color="#ffffff" strokeWidth={1.5} />
              <Text style={styles.startButtonText}>
                {completedRuns.length > 0 ? 'Start Again' : 'Start Challenge'}
              </Text>
            </View>
          </LinearGradient>
        </AnimatedButton>
      </LinearGradient>
    </Animated.View>
  );
}

export default function ChallengesScreen() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<ChallengeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChallenges();
    loadCompletedChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChallenges(data || []);
    } catch (err) {
      console.error('Error loading challenges:', err);
      setError('Failed to load challenges');
    }
  };

  const loadCompletedChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('challenge_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setCompletedChallenges(data || []);
    } catch (err) {
      console.error('Error loading completed challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  const startChallenge = async (challengeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to start a challenge');
        return;
      }

      // Check if user already has an active challenge for this type
      const { data: existingProgress } = await supabase
        .from('challenge_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .eq('status', 'in_progress')
        .single();

      if (existingProgress) {
        Alert.alert(
          'Challenge Already Active',
          'You already have an active challenge of this type. Complete it first before starting a new one.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get the next run number for this challenge
      const { data: allRuns } = await supabase
        .from('challenge_progress')
        .select('run_number')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .order('run_number', { ascending: false })
        .limit(1);

      const nextRunNumber = allRuns && allRuns.length > 0 ? allRuns[0].run_number + 1 : 1;

      // Create new challenge progress
      const { error } = await supabase
        .from('challenge_progress')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          run_number: nextRunNumber,
          current_day: 1,
          completed_days: [],
          responses: {},
          points: 0,
          streak: 0,
          status: 'in_progress',
        });

      if (error) throw error;

      Alert.alert(
        'Challenge Started!',
        'Your challenge has been started. Check your progress in the main tab.',
        [{ text: 'OK' }]
      );

      // Refresh completed challenges to update the UI
      loadCompletedChallenges();
    } catch (err) {
      console.error('Error starting challenge:', err);
      Alert.alert('Error', 'Failed to start challenge. Please try again.');
    }
  };

  const getCompletedRunsForChallenge = (challengeId: string) => {
    return completedChallenges.filter(progress => progress.challenge_id === challengeId);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.background}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Challenges</Text>
            <Text style={styles.headerSubtitle}>Transform your life with guided journeys</Text>
          </View>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <LoadingShimmer height={200} style={styles.shimmerCard} />
            <LoadingShimmer height={200} style={styles.shimmerCard} />
            <LoadingShimmer height={200} style={styles.shimmerCard} />
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.background}
        >
          <EmptyState
            icon={Target}
            title="Unable to Load Challenges"
            subtitle={error}
            actionText="Try Again"
            onAction={loadChallenges}
          />
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.background}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Challenges</Text>
          <Text style={styles.headerSubtitle}>Transform your life with guided journeys</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Completed Challenges Section */}
          {completedChallenges.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Award size={20} color="rgba(255, 255, 255, 0.9)" strokeWidth={1.5} />
                <Text style={styles.sectionTitle}>Completed Challenges</Text>
              </View>
              {completedChallenges.map((progress) => {
                const challenge = challenges.find(c => c.id === progress.challenge_id) || 
                  challengeData.find(c => c.id === progress.challenge_id);
                if (!challenge) return null;
                
                return (
                  <CompletedChallengeCard
                    key={`${progress.challenge_id}-${progress.run_number}`}
                    progress={progress}
                    challenge={challenge}
                    onViewSummary={() => {}}
                  />
                );
              })}
            </View>
          )}

          {/* Available Challenges Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Target size={20} color="rgba(255, 255, 255, 0.9)" strokeWidth={1.5} />
              <Text style={styles.sectionTitle}>Available Challenges</Text>
            </View>
            {challenges.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No Challenges Available"
                subtitle="Check back later for new challenges"
              />
            ) : (
              challenges.map((challenge, index) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  index={index}
                  onStart={() => startChallenge(challenge.id)}
                  completedRuns={getCompletedRunsForChallenge(challenge.id)}
                />
              ))
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 8,
  },
  challengeCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  challengeCardGradient: {
    padding: 20,
  },
  challengeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  challengeCardInfo: {
    flex: 1,
  },
  challengeCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  challengeCardDuration: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  challengeCardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 16,
  },
  completedRunsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  completedRunsText: {
    fontSize: 12,
    color: '#fbbf24',
    fontWeight: '500',
    marginLeft: 4,
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  completedCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  completedCardGradient: {
    padding: 16,
  },
  completedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  completedIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  completedCardInfo: {
    flex: 1,
  },
  completedCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  completedCardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  completedCardStats: {
    alignItems: 'flex-end',
  },
  completedCardPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  completedCardDays: {
    fontSize: 12,
    color: '#6b7280',
  },
  summaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  summaryToggleText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginRight: 4,
  },
  summaryContainer: {
    backgroundColor: 'rgba(243, 244, 246, 0.8)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  completedCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.5)',
  },
  completedDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pointsText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
    marginLeft: 2,
  },
  shimmerCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
});