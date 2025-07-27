import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Target, Play, Calendar, Award, Check, ArrowLeft, X, Trophy, Star, Zap, Heart, BookOpen, Clock, ChevronRight, Users, TrendingUp, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Font from 'expo-font';
import { challengeService, challengePrompts } from '../../lib/challenges';
import { storageService } from '../../lib/storage';
import type { Database } from '../../lib/supabase';
import PurpleSkyBackground from '../../components/PurpleSkyBackground';
import AnimatedButton from '../../components/AnimatedButton';

const { width } = Dimensions.get('window');

type Challenge = Database['public']['Tables']['challenges']['Row'];
type ChallengeProgress = Database['public']['Tables']['challenge_progress']['Row'];

const challengeIcons = {
  'gratitude-7': Heart,
  'manifestation-21': Star,
  'abundance-14': Trophy,
  'mindfulness-10': Zap,
  'confidence-14': Target,
  'creativity-7': BookOpen,
};

const challengeGradients = {
  'gratitude-7': ['#f093fb', '#f5576c'],
  'manifestation-21': ['#4facfe', '#00f2fe'],
  'abundance-14': ['#43e97b', '#38f9d7'],
  'mindfulness-10': ['#667eea', '#764ba2'],
  'confidence-14': ['#fa709a', '#fee140'],
  'creativity-7': ['#a8edea', '#fed6e3'],
};

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeProgress, setActiveProgress] = useState<ChallengeProgress[]>([]);
  const [completedProgress, setCompletedProgress] = useState<ChallengeProgress[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [currentProgress, setCurrentProgress] = useState<ChallengeProgress | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [dayResponse, setDayResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [avallonFontLoaded, setAvallonFontLoaded] = useState(false);
  const [glacialFontLoaded, setGlacialFontLoaded] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerFadeAnim = useRef(new Animated.Value(1)).current;
  const headerSlideAnim = useRef(new Animated.Value(0)).current;

  // Load custom fonts
  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Shrikhand': require('../../assets/fonts/Shrikhand-Regular.ttf'),
          'GlacialIndifference': require('../../assets/fonts/GlacialIndifference-Regular.otf'),
          'GlacialIndifference-Bold': require('../../assets/fonts/GlacialIndifference-Bold.otf'),
        });
        setAvallonFontLoaded(true);
        setGlacialFontLoaded(true);
      } catch (error) {
        // Font loading error handled silently
      }
    }
    loadFonts();
  }, []);

  React.useEffect(() => {
    // Animate in the content when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate header when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      // Reset header animations
      headerFadeAnim.setValue(0);
      headerSlideAnim.setValue(-30);
      
      // Animate header in
      Animated.parallel([
        Animated.timing(headerFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(headerSlideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, [])
  );

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const isScrollingDown = currentScrollY > lastScrollY.current;
        
        if (isScrollingDown && currentScrollY > 100) {
          // Hide tab bar on scroll down
          if ((global as any).hideTabBar) {
            (global as any).hideTabBar();
          }
        } else if (!isScrollingDown) {
          // Show tab bar on scroll up
          if ((global as any).showTabBar) {
            (global as any).showTabBar();
          }
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [challengesData, progressData] = await Promise.all([
        challengeService.getChallenges(),
        storageService.getChallengeProgress()
      ]);
      
      setChallenges(challengesData);
      setActiveProgress(progressData.filter(p => p.status === 'in_progress'));
      setCompletedProgress(progressData.filter(p => p.status === 'completed'));
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load challenges');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const startChallenge = async (challenge: Challenge) => {
    try {
      const existingProgress = activeProgress.find(p => p.challenge_id === challenge.id);
      if (existingProgress) {
        setError('You are already participating in this challenge!');
        setTimeout(() => setError(null), 3000);
        return;
      }

      await storageService.addChallengeProgress({
        challenge_id: challenge.id,
        current_day: 1,
        completed_days: [],
        responses: {},
        points: 0,
        streak: 0,
        start_date: new Date().toISOString(),
        status: 'in_progress',
      });
      
      await loadData();
      
      const newProgress = (await storageService.getChallengeProgress())
        .find(p => p.challenge_id === challenge.id && p.status === 'in_progress');
      
      if (newProgress) {
        setSelectedChallenge(challenge);
        setCurrentProgress(newProgress);
        setCurrentDay(1);
        setShowDayModal(true);
      }
    } catch (error) {
      setError('Failed to start challenge. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const continueChallenge = (challenge: Challenge, progress: ChallengeProgress) => {
    setSelectedChallenge(challenge);
    setCurrentProgress(progress);
    
    const nextDay = progress.completed_days.length + 1;
    if (nextDay <= challenge.duration) {
      setCurrentDay(nextDay);
      setShowDayModal(true);
    } else {
      setSuccess(`Congratulations! You've completed the ${challenge.title}. Total points earned: ${progress.points}`);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  const submitDayResponse = async () => {
    if (!currentProgress || !selectedChallenge || !dayResponse.trim()) {
      setError('Please write your response before submitting.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const updatedProgress: Partial<ChallengeProgress> = {
        completed_days: [...currentProgress.completed_days, currentDay],
        responses: { ...currentProgress.responses, [currentDay]: dayResponse },
        points: currentProgress.points + 10,
        streak: currentProgress.streak + 1,
      };

      if (updatedProgress.completed_days!.length === selectedChallenge.duration) {
        updatedProgress.completed_at = new Date().toISOString();
        updatedProgress.status = 'completed';
        updatedProgress.points = updatedProgress.points! + 50;
        
        // Generate AI summary for completed challenge
        try {
          const aiSummary = await storageService.completeChallenge(currentProgress.id);
          updatedProgress.ai_summary = aiSummary;
        } catch (summaryError) {
          console.error('Error generating AI summary:', summaryError);
          // Continue without AI summary
        }
      }

      await storageService.updateChallengeProgress(currentProgress.id, updatedProgress);

      setShowDayModal(false);
      setDayResponse('');
      
      if (updatedProgress.completed_at) {
        setSuccess(`🎉 Challenge completed! You earned ${updatedProgress.points} points total!`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setSuccess('✨ Day completed! Great work!');
        setTimeout(() => setSuccess(null), 3000);
      }
      
      await loadData();
    } catch (error) {
      setError('Failed to submit response. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const getProgressForChallenge = (challengeId: string) => {
    return activeProgress.find(p => p.challenge_id === challengeId);
  };

  const getCompletedRunsForChallenge = (challengeId: string) => {
    return completedProgress.filter(p => p.challenge_id === challengeId);
  };

  const getTotalPoints = () => [...activeProgress, ...completedProgress].reduce((sum, p) => sum + p.points, 0);
  const getActiveCount = () => activeProgress.length;
  const getCompletedCount = () => completedProgress.length;

  if (loading) {
    return (
      <PurpleSkyBackground overlayOpacity={0.4}>
        <View style={styles.loadingContainer}>
          <Target size={48} color="#ffffff" strokeWidth={1.5} />
          <Text style={styles.loadingText}>Loading your growth journey...</Text>
        </View>
      </PurpleSkyBackground>
    );
  }

  return (
    <PurpleSkyBackground overlayOpacity={0.4}>
      <View style={styles.container}>
        {/* Hero Header */}
        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
                                <Animated.View style={[
            styles.logoContainer,
            {
              opacity: headerFadeAnim,
              transform: [{ translateY: headerSlideAnim }],
            }
          ]}>
            <Text style={[
              styles.logoText,
              { fontFamily: avallonFontLoaded ? 'Shrikhand' : 'Inter-Bold' }
            ]}>Growth</Text>
            <Text style={[
              styles.logoSubtext,
              { fontFamily: glacialFontLoaded ? 'GlacialIndifference' : 'Inter-Regular' }
            ]}>Transform through daily practice</Text>
          </Animated.View>

          {/* Compact Stats Row */}
          <View style={styles.compactStatsContainer}>
            <View style={styles.compactStatCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.65)', 'rgba(255, 255, 255, 0.45)']}
                style={styles.compactStatGradient}
              >
                <Trophy size={16} color="#fbbf24" strokeWidth={1.5} />
                <Text style={[
                  styles.compactStatNumber,
                  { fontFamily: glacialFontLoaded ? 'GlacialIndifference-Bold' : 'Inter-Bold' }
                ]}>{getTotalPoints()}</Text>
                <Text style={[
                  styles.compactStatLabel,
                  { fontFamily: glacialFontLoaded ? 'GlacialIndifference' : 'Inter-Medium' }
                ]}>Points</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.compactStatCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.65)', 'rgba(255, 255, 255, 0.45)']}
                style={styles.compactStatGradient}
              >
                <TrendingUp size={16} color="#10b981" strokeWidth={1.5} />
                <Text style={[
                  styles.compactStatNumber,
                  { fontFamily: glacialFontLoaded ? 'GlacialIndifference-Bold' : 'Inter-Bold' }
                ]}>{getActiveCount()}</Text>
                <Text style={[
                  styles.compactStatLabel,
                  { fontFamily: glacialFontLoaded ? 'GlacialIndifference' : 'Inter-Medium' }
                ]}>Active</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.compactStatCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.65)', 'rgba(255, 255, 255, 0.45)']}
                style={styles.compactStatGradient}
              >
                <Award size={16} color="#8b5cf6" strokeWidth={1.5} />
                <Text style={[
                  styles.compactStatNumber,
                  { fontFamily: glacialFontLoaded ? 'GlacialIndifference-Bold' : 'Inter-Bold' }
                ]}>{getCompletedCount()}</Text>
                <Text style={[
                  styles.compactStatLabel,
                  { fontFamily: glacialFontLoaded ? 'GlacialIndifference' : 'Inter-Medium' }
                ]}>Completed</Text>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>

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
          {/* Featured Challenge */}
          {challenges.length > 0 && !getProgressForChallenge(challenges[0].id) && (
            <View style={styles.featuredSection}>
              <Text style={styles.sectionTitle}>Featured Challenge</Text>
              <FeaturedChallengeCard
                challenge={challenges[0]}
                onStart={() => startChallenge(challenges[0])}
              />
            </View>
          )}

          {/* Active Challenges */}
          {activeProgress.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Continue Your Journey</Text>
              {challenges
                .filter(challenge => getProgressForChallenge(challenge.id))
                .map((challenge) => {
                  const progress = getProgressForChallenge(challenge.id)!;
                  return (
                    <ActiveChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      progress={progress}
                      onContinue={() => continueChallenge(challenge, progress)}
                    />
                  );
                })}
            </View>
          )}

          {/* Available Challenges */}
          <View style={styles.section}>
                          <Text style={styles.sectionTitle}>Available Challenges</Text>
            {challenges
              .filter(challenge => !getProgressForChallenge(challenge.id))
              .slice(challenges.length > 0 && !getProgressForChallenge(challenges[0].id) ? 1 : 0)
              .map((challenge, index) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  index={index}
                  onStart={() => startChallenge(challenge)}
                  completedRuns={getCompletedRunsForChallenge(challenge.id)}
                />
              ))}
          </View>

          {/* Completed Challenges */}
          {completedProgress.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Completed Challenges</Text>
              {completedProgress.map((progress) => {
                const challenge = challenges.find(c => c.id === progress.challenge_id);
                if (!challenge) return null;
                
                return (
                  <CompletedChallengeCard
                    key={`${progress.challenge_id}-${progress.run_number}`}
                    challenge={challenge}
                    progress={progress}
                  />
                );
              })}
            </View>
          )}

          {/* Bottom padding for tab bar */}
          <View style={styles.bottomPadding} />
        </Animated.ScrollView>

        {/* Day Modal */}
        <Modal
          visible={showDayModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <PurpleSkyBackground overlayOpacity={0.4}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setShowDayModal(false)}
                  style={styles.closeButton}
                >
                  <ArrowLeft size={24} color="#ffffff" strokeWidth={1.5} />
                </TouchableOpacity>
                
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>
                    {selectedChallenge?.title}
                  </Text>
                  <Text style={styles.modalSubtitle}>Day {currentDay}</Text>
                </View>

                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{currentDay}/{selectedChallenge?.duration}</Text>
                </View>
              </View>
              
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.promptContainer}>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                    style={styles.promptGradient}
                  >
                    <BookOpen size={24} color="#ffffff" strokeWidth={1.5} />
                    <Text style={styles.promptText}>
                      {selectedChallenge && challengePrompts[selectedChallenge.id]?.[currentDay]}
                    </Text>
                  </LinearGradient>
                </View>
                
                <View style={styles.responseContainer}>
                  <Text style={styles.responseLabel}>Your Response</Text>
                  <TextInput
                    style={styles.responseInput}
                    placeholder="Share your thoughts, insights, and reflections..."
                    placeholderTextColor="#94a3b8"
                    value={dayResponse}
                    onChangeText={setDayResponse}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
                
                <AnimatedButton
                  style={[
                    styles.submitButton,
                    !dayResponse.trim() && styles.submitButtonDisabled
                  ]}
                  onPress={submitDayResponse}
                  disabled={!dayResponse.trim()}
                >
                  <LinearGradient
                    colors={dayResponse.trim() ? ['#10b981', '#059669'] : ['#6b7280', '#4b5563']}
                    style={styles.submitButtonGradient}
                  >
                    <View style={styles.submitButtonContent}>
                      <Check size={18} color="#ffffff" strokeWidth={1.5} />
                      <Text style={styles.submitButtonText}>Complete Day {currentDay}</Text>
                    </View>
                  </LinearGradient>
                </AnimatedButton>
              </ScrollView>
            </View>
          </PurpleSkyBackground>
        </Modal>
      </View>
    </PurpleSkyBackground>
  );
}

interface FeaturedChallengeCardProps {
  challenge: Challenge;
  onStart: () => void;
}

function FeaturedChallengeCard({ challenge, onStart }: FeaturedChallengeCardProps) {
  const IconComponent = challengeIcons[challenge.id as keyof typeof challengeIcons] || Target;
  const gradientColors = challengeGradients[challenge.id as keyof typeof challengeGradients] || ['#667eea', '#764ba2'];

  return (
    <View style={styles.featuredCard}>
      <LinearGradient
        colors={gradientColors}
        style={styles.featuredCardGradient}
      >
        <View style={styles.featuredCardHeader}>
          <View style={styles.featuredIconContainer}>
            <IconComponent size={32} color="#ffffff" strokeWidth={1.5} />
          </View>
          <View style={styles.featuredBadge}>
            <Star size={16} color="#fbbf24" fill="#fbbf24" strokeWidth={1.5} />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
        </View>
        
        <Text style={styles.featuredTitle}>{challenge.title}</Text>
        <Text style={styles.featuredDescription}>{challenge.description}</Text>
        
        <View style={styles.featuredStats}>
          <View style={styles.featuredStat}>
            <Calendar size={16} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
            <Text style={styles.featuredStatText}>{challenge.duration} days</Text>
          </View>
          <View style={styles.featuredStat}>
            <Users size={16} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
            <Text style={styles.featuredStatText}>Join thousands</Text>
          </View>
        </View>
        
        <AnimatedButton onPress={onStart} style={[styles.featuredButton, { backgroundColor: gradientColors[0] }]}>
          <View style={styles.featuredButtonContent}>
            <Play size={18} color="#ffffff" strokeWidth={1.5} />
            <Text style={styles.featuredButtonText}>Start Challenge</Text>
            <ChevronRight size={18} color="#ffffff" strokeWidth={1.5} />
          </View>
        </AnimatedButton>
      </LinearGradient>
    </View>
  );
}

interface ActiveChallengeCardProps {
  challenge: Challenge;
  progress: ChallengeProgress;
  onContinue: () => void;
}

function ActiveChallengeCard({ challenge, progress, onContinue }: ActiveChallengeCardProps) {
  const IconComponent = challengeIcons[challenge.id as keyof typeof challengeIcons] || Target;
  const gradientColors = challengeGradients[challenge.id as keyof typeof challengeGradients] || ['#667eea', '#764ba2'];
  const completionPercentage = Math.round((progress.completed_days.length / challenge.duration) * 100);
  const nextDay = progress.completed_days.length + 1;

  return (
    <View style={styles.activeCard}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
        style={styles.activeCardGradient}
      >
        <View style={styles.activeCardHeader}>
          <View style={[styles.activeIconContainer, { backgroundColor: gradientColors[0] }]}>
            <IconComponent size={20} color="#ffffff" strokeWidth={1.5} />
          </View>
          <View style={styles.activeCardInfo}>
            <Text style={styles.activeCardTitle}>{challenge.title}</Text>
            <Text style={styles.activeCardProgress}>Day {nextDay} of {challenge.duration}</Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{completionPercentage}%</Text>
          </View>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${completionPercentage}%`,
                  backgroundColor: gradientColors[0]
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{progress.points} points earned</Text>
        </View>
        
        <AnimatedButton onPress={onContinue} style={[styles.continueButton, { backgroundColor: gradientColors[0], paddingVertical: 14, paddingHorizontal: 20 }]}>
          <View style={styles.continueButtonContent}>
            <Play size={16} color="#ffffff" strokeWidth={1.5} />
            <Text style={styles.continueButtonText}>Continue Day {nextDay}</Text>
          </View>
        </AnimatedButton>
      </LinearGradient>
    </View>
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
        
        <AnimatedButton onPress={onStart} style={[styles.startButton, { backgroundColor: gradientColors[0], paddingVertical: 14, paddingHorizontal: 20 }]}>
          <View style={styles.startButtonContent}>
            <Play size={16} color="#ffffff" strokeWidth={1.5} />
            <Text style={styles.startButtonText}>
              {completedRuns.length > 0 ? 'Start Again' : 'Start Challenge'}
            </Text>
          </View>
        </AnimatedButton>
      </LinearGradient>
    </Animated.View>
  );
}

interface CompletedChallengeCardProps {
  challenge: Challenge;
  progress: ChallengeProgress;
}

function CompletedChallengeCard({ challenge, progress }: CompletedChallengeCardProps) {
  const [showSummary, setShowSummary] = useState(false);
  const IconComponent = challengeIcons[challenge.id as keyof typeof challengeIcons] || Trophy;
  const gradientColors = challengeGradients[challenge.id as keyof typeof challengeGradients] || ['#667eea', '#764ba2'];
  const completionPercentage = Math.round((progress.completed_days.length / challenge.duration) * 100);

  return (
    <View style={styles.completedCard}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
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
              {progress.completed_days.length}/{challenge.duration} days
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
            <Animated.View style={{ transform: [{ rotate: showSummary ? '180deg' : '0deg' }] }}>
              <ChevronDown size={16} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
            </Animated.View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    textAlign: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 56,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoSubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#496FB5',
    textAlign: 'center',
  },
  compactStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  compactStatCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compactStatGradient: {
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  compactStatNumber: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#496FB5',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  compactStatLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#496FB5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#4ade80',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  featuredSection: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  featuredCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  featuredCardGradient: {
    padding: 32,
  },
  featuredCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  featuredIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#496FB5',
  },
  featuredTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#496FB5',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featuredDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#496FB5',
    lineHeight: 24,
    marginBottom: 24,
  },
  featuredStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  featuredStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featuredStatText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#496FB5',
  },
  featuredButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  featuredButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#496FB5',
  },
  activeCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  activeCardGradient: {
    padding: 24,
  },
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  activeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  activeCardInfo: {
    flex: 1,
  },
  activeCardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#496FB5',
    marginBottom: 4,
  },
  activeCardProgress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#496FB5',
  },
  progressBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#496FB5',
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  continueButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  challengeCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  challengeCardGradient: {
    padding: 24,
  },
  challengeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  challengeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  challengeCardInfo: {
    flex: 1,
  },
  challengeCardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#496FB5',
    marginBottom: 4,
  },
  challengeCardDuration: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#496FB5',
  },
  challengeCardDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#496FB5',
    lineHeight: 24,
    marginBottom: 20,
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
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#496FB5',
  },
  completedCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  completedCardGradient: {
    padding: 24,
  },
  completedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  completedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  completedCardInfo: {
    flex: 1,
  },
  completedCardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#496FB5',
    marginBottom: 4,
  },
  completedCardSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#496FB5',
  },
  completedCardStats: {
    alignItems: 'flex-end',
  },
  completedCardPercentage: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  completedCardDays: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#496FB5',
  },
  summaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  summaryToggleText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#496FB5',
  },
  summaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#496FB5',
    lineHeight: 20,
  },
  completedCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  completedDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#496FB5',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#fbbf24',
  },
  bottomPadding: {
    height: 40,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  dayBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dayBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#647696',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  promptContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  promptGradient: {
    padding: 24,
    gap: 16,
  },
  promptText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#647696',
    lineHeight: 26,
    textAlign: 'center',
  },
  responseContainer: {
    marginBottom: 32,
  },
  responseLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#647696',
    marginBottom: 12,
  },
  responseInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 200,
    color: '#647696',
    textAlignVertical: 'top',
    lineHeight: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  submitButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#647696',
  },
});