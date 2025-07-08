import React, { useState, useEffect, useRef } from 'react';
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
import { Target, Play, Calendar, Award, Check, ArrowLeft, X, Trophy, Star, Zap, Heart, BookOpen, Clock, ChevronRight, Users, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { challengeService, challengePrompts } from '../../lib/challenges';
import { storageService } from '../../lib/storage';
import type { Database } from '../../lib/supabase';
import GradientBackground from '../../components/GradientBackground';
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
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [currentProgress, setCurrentProgress] = useState<ChallengeProgress | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [dayResponse, setDayResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFAB, setShowFAB] = useState(true);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const isScrollingDown = currentScrollY > lastScrollY.current;
        
        if (isScrollingDown && currentScrollY > 100) {
          setShowFAB(false);
          // Hide tab bar on scroll down
          if ((global as any).hideTabBar) {
            (global as any).hideTabBar();
          }
        } else if (!isScrollingDown) {
          setShowFAB(true);
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
    console.log('Loading challenges data...');
    try {
      const [challengesData, progressData] = await Promise.all([
        challengeService.getChallenges(),
        storageService.getChallengeProgress()
      ]);
      
      console.log('Challenges loaded:', challengesData.length);
      console.log('Progress loaded:', progressData.length);
      
      setChallenges(challengesData);
      setActiveProgress(progressData.filter(p => !p.completed_at));
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
      // Check for in-progress challenges
      const inProgressChallenge = activeProgress.find(p => 
        p.challenge_id === challenge.id && p.status === 'in_progress'
      );
      
      if (inProgressChallenge) {
        setSuccess('Found your in-progress challenge! Continuing where you left off...');
        setTimeout(() => setSuccess(null), 3000);
        continueChallenge(challenge, inProgressChallenge);
        return;
      }

      console.log('Starting new challenge:', challenge.id, 'for user');
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
      
      console.log('Challenge progress added, reloading data...');
      await loadData();
      
      // Get the updated progress list
      const updatedProgressList = await storageService.getChallengeProgress();
      const newProgress = updatedProgressList.find(p => 
        p.challenge_id === challenge.id && p.status === 'in_progress'
      );
      
      if (newProgress) {
        console.log('New progress found, opening day modal');
        setSelectedChallenge(challenge);
        setCurrentProgress(newProgress);
        setCurrentDay(1);
        setShowDayModal(true);
        setSuccess('Challenge started successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        console.error('No progress found after adding challenge');
        setError('Unable to start challenge. Please try again.');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Error starting challenge:', error);
      
      // Check if this is an in-progress challenge error
      if (error instanceof Error && error.message.includes('Challenge already in progress')) {
        console.log('In-progress challenge detected, checking for existing progress...');
        await loadData();
        const inProgressChallenge = activeProgress.find(p => 
          p.challenge_id === challenge.id && p.status === 'in_progress'
        );
        if (inProgressChallenge) {
          setSuccess('Found your in-progress challenge! Continuing where you left off...');
          setTimeout(() => setSuccess(null), 3000);
          continueChallenge(challenge, inProgressChallenge);
          return;
        }
      }
      
      setError('Failed to start challenge. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const continueChallenge = (challenge: Challenge, progress: ChallengeProgress) => {
    setSelectedChallenge(challenge);
    setCurrentProgress(progress);
    
    const nextDay = Math.max(1, progress.completed_days.length + 1);
    if (nextDay <= challenge.duration) {
      setCurrentDay(nextDay);
      setShowDayModal(true);
    } else {
      // Challenge is complete, show completion message
      setSuccess(`🎉 Challenge completed! You earned ${progress.points} points total!`);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  const submitDayResponse = async () => {
    if (!currentProgress || !selectedChallenge || !dayResponse.trim()) {
      setError('Please write your response before submitting.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Validate that we're not trying to submit beyond the challenge duration
    if (currentDay > selectedChallenge.duration) {
      setError('This challenge has already been completed.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      // Calculate points for this day
      const dayPoints = 10;
      const newTotalPoints = currentProgress.points + dayPoints;
      
      let updatedProgress: Partial<ChallengeProgress> = {
        completed_days: [...currentProgress.completed_days, currentDay],
        responses: { ...currentProgress.responses, [currentDay]: dayResponse },
        points: newTotalPoints,
        streak: currentProgress.streak + 1,
      };

      // Check if this completes the challenge
      const isCompleting = updatedProgress.completed_days!.length === selectedChallenge.duration;

      if (isCompleting) {
        console.log('Challenge is being completed, adding completion bonus');
        const completionBonus = 50;
        const finalPoints = newTotalPoints + completionBonus;
        
        updatedProgress.points = finalPoints;
        updatedProgress.status = 'completed';
        updatedProgress.completed_at = new Date().toISOString();
        
        console.log('Final challenge completion data:', {
          dayPoints,
          completionBonus,
          finalPoints,
          status: 'completed'
        });
        
        // Update progress with completion data first
        await storageService.updateChallengeProgressWithCompletion(currentProgress.id, updatedProgress);
        
        // Generate AI summary
        try {
          console.log('Generating AI summary for completed challenge...');
          const aiSummary = await storageService.completeChallenge(currentProgress.id);
          console.log('AI Summary generated successfully:', aiSummary);
          setSuccess(`🎉 Challenge completed! Your journey summary has been saved. You earned ${finalPoints} points total!`);
        } catch (summaryError) {
          console.error('Error generating AI summary:', summaryError);
          // Even if AI summary fails, the challenge is still completed
          setSuccess(`🎉 Challenge completed! You earned ${finalPoints} points total! (Summary will be generated shortly)`);
        }
        
        // Close modal and refresh data
        setShowDayModal(false);
        setDayResponse('');
        await loadData();
        setTimeout(() => setSuccess(null), 5000);
        return;
      } else {
        setSuccess(`✨ Day completed! Great work! (+${dayPoints} points)`);
        // Update progress for non-completing day
        await storageService.updateChallengeProgress(currentProgress.id, updatedProgress);
        setTimeout(() => setSuccess(null), 3000);
      }


      setShowDayModal(false);
      setDayResponse('');
      await loadData();
    } catch (error) {
      setError('Failed to submit response. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Helper function to check if a day can be submitted
  const canSubmitDay = () => {
    if (!currentProgress || !selectedChallenge || !dayResponse.trim()) {
      return false;
    }
    
    // Check if this day has already been completed
    if (currentProgress.completed_days.includes(currentDay)) {
      return false;
    }
    
    return currentDay <= selectedChallenge.duration;
  };

  const getProgressForChallenge = (challengeId: string) => {
    return activeProgress.find(p => p.challenge_id === challengeId && p.status === 'in_progress');
  };

  const getCompletedProgressForChallenge = (challengeId: string) => {
    return activeProgress.filter(p => p.challenge_id === challengeId && p.status === 'completed');
  };

  const getTotalPoints = () => activeProgress.reduce((sum, p) => sum + p.points, 0);
  const getActiveCount = () => activeProgress.filter(p => p.status === 'in_progress').length;
  const getCompletedCount = () => {
    return activeProgress.filter(p => p.status === 'completed').length;
  };

  if (loading) {
    return (
      <GradientBackground colors={['#667eea', '#764ba2', '#4facfe']}>
        <View style={styles.loadingContainer}>
          <Target size={48} color="#ffffff" strokeWidth={1.5} />
          <Text style={styles.loadingText}>Loading your growth journey...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground colors={['#667eea', '#764ba2', '#4facfe']}>
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
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#ffffff', '#f8fafc']}
              style={styles.logoBackground}
            >
              <Target size={32} color="#667eea" strokeWidth={2} />
            </LinearGradient>
            <Text style={styles.logoText}>Growth Challenges</Text>
            <Text style={styles.logoSubtext}>Transform through daily practice</Text>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statGradient}
              >
                <Trophy size={24} color="#fbbf24" strokeWidth={1.5} />
                <Text style={styles.statNumber}>{getTotalPoints()}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statGradient}
              >
                <TrendingUp size={24} color="#10b981" strokeWidth={1.5} />
                <Text style={styles.statNumber}>{getActiveCount()}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statGradient}
              >
                <Award size={24} color="#8b5cf6" strokeWidth={1.5} />
                <Text style={styles.statNumber}>{getCompletedCount()}</Text>
                <Text style={styles.statLabel}>Completed</Text>
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
              <Text style={styles.sectionTitle}>✨ Featured Challenge</Text>
              <FeaturedChallengeCard
                challenge={challenges[0]}
                onStart={() => startChallenge(challenges[0])}
              />
            </View>
          )}

          {/* Active Challenges */}
          {activeProgress.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔥 Continue Your Journey</Text>
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

          {/* Completed Challenges */}
          {activeProgress.some(p => p.status === 'completed') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Completed Challenges</Text>
              {activeProgress
                .filter(p => p.status === 'completed')
                .sort((a, b) => new Date(b.completed_at || '').getTime() - new Date(a.completed_at || '').getTime())
                .map((progress) => {
                  const challenge = challenges.find(c => c.id === progress.challenge_id);
                  if (!challenge) return null;
                  
                  return (
                    <CompletedChallengeCard
                      key={`${challenge.id}-${progress.run_number}`}
                      challenge={challenge}
                      progress={progress}
                    />
                  );
                })
                .filter(Boolean)}
            </View>
          )}

          {/* Available Challenges */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Available Challenges</Text>
            {challenges
              .filter(challenge => !getProgressForChallenge(challenge.id))
              .slice(challenges.length > 0 && !getProgressForChallenge(challenges[0].id) ? 1 : 0)
              .map((challenge, index) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  index={index}
                  onStart={() => startChallenge(challenge)}
                  completedRuns={getCompletedProgressForChallenge(challenge.id)}
                />
              ))}
          </View>

          {/* Bottom padding for tab bar */}
          <View style={styles.bottomPadding} />
        </Animated.ScrollView>

        {/* Day Modal */}
        <Modal
          visible={showDayModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <GradientBackground colors={['#667eea', '#764ba2']}>
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
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={dayResponse}
                    onChangeText={setDayResponse}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
                
                <AnimatedButton
                  style={[
                    styles.submitButton,
                    !canSubmitDay() && styles.submitButtonDisabled
                  ]}
                  onPress={submitDayResponse}
                  disabled={!canSubmitDay()}
                >
                  <LinearGradient
                    colors={canSubmitDay() ? ['#10b981', '#059669'] : ['#6b7280', '#4b5563']}
                    style={styles.submitButtonGradient}
                  >
                    <View style={styles.submitButtonContent}>
                      <Check size={18} color="#ffffff" strokeWidth={1.5} />
                      <Text style={styles.submitButtonText}>
                        {currentDay === selectedChallenge?.duration ? 'Complete Challenge' : `Complete Day ${currentDay}`}
                      </Text>
                    </View>
                  </LinearGradient>
                </AnimatedButton>
              </ScrollView>
            </View>
          </GradientBackground>
        </Modal>
      </View>
    </GradientBackground>
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
        
        <AnimatedButton onPress={onStart} style={styles.featuredButton}>
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
        
        <AnimatedButton onPress={onContinue} style={styles.continueButton}>
          <LinearGradient
            colors={gradientColors}
            style={styles.continueButtonGradient}
          >
            <View style={styles.continueButtonContent}>
              <Play size={16} color="#ffffff" strokeWidth={1.5} />
              <Text style={styles.continueButtonText}>Continue Day {nextDay}</Text>
            </View>
          </LinearGradient>
        </AnimatedButton>
      </LinearGradient>
    </View>
  );
}

interface CompletedChallengeCardProps {
  challenge: Challenge;
  progress: ChallengeProgress;
}

function CompletedChallengeCard({ challenge, progress }: CompletedChallengeCardProps) {
  const IconComponent = challengeIcons[challenge.id as keyof typeof challengeIcons] || Target;
  const gradientColors = challengeGradients[challenge.id as keyof typeof challengeGradients] || ['#667eea', '#764ba2'];
  const [showSummary, setShowSummary] = useState(false);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.completedCard}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
        style={styles.completedCardGradient}
      >
        <View style={styles.completedCardHeader}>
          <View style={[styles.completedIconContainer, { backgroundColor: gradientColors[0] }]}>
            <IconComponent size={20} color="#ffffff" strokeWidth={1.5} />
          </View>
          <View style={styles.completedCardInfo}>
            <Text style={styles.completedCardTitle}>{challenge.title}</Text>
            <Text style={styles.completedCardDate}>
              Run #{progress.run_number} • Completed {progress.completed_at ? formatDate(progress.completed_at) : 'Recently'}
            </Text>
          </View>
          <View style={styles.completedBadge}>
            <Trophy size={16} color="#fbbf24" fill="#fbbf24" strokeWidth={1.5} />
          </View>
        </View>
        
        <View style={styles.completedStatsContainer}>
          <View style={styles.completedStat}>
            <Text style={styles.completedStatNumber}>{challenge.duration}</Text>
            <Text style={styles.completedStatLabel}>Days</Text>
          </View>
          <View style={styles.completedStat}>
            <Text style={styles.completedStatNumber}>{progress.points}</Text>
            <Text style={styles.completedStatLabel}>Points</Text>
          </View>
          <View style={styles.completedStat}>
            <Text style={styles.completedStatNumber}>{progress.streak}</Text>
            <Text style={styles.completedStatLabel}>Streak</Text>
          </View>
        </View>
        
        {progress.ai_summary && (
          <>
            <TouchableOpacity 
              style={styles.summaryToggle}
              onPress={() => setShowSummary(!showSummary)}
              activeOpacity={0.7}
            >
              <BookOpen size={16} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
              <Text style={styles.summaryToggleText}>
                {showSummary ? 'Hide' : 'View'} Journey Summary
              </Text>
              <View style={{ transform: [{ rotate: showSummary ? '180deg' : '0deg' }] }}>
                <ChevronDown 
                  size={16} 
                  color="rgba(255, 255, 255, 0.8)" 
                  strokeWidth={1.5}
                />
              </View>
            </TouchableOpacity>
            
            {showSummary && (
              <Animated.View 
                style={[
                  styles.summaryContainer,
                  {
                    opacity: showSummary ? 1 : 0,
                  }
                ]}
              >
                <Text style={styles.summaryText}>{progress.ai_summary}</Text>
              </Animated.View>
            )}
          </>
        )}
        
        {!progress.ai_summary && progress.status === 'completed' && (
          <View style={styles.summaryPlaceholder}>
            <BookOpen size={16} color="rgba(255, 255, 255, 0.6)" strokeWidth={1.5} />
            <Text style={styles.summaryPlaceholderText}>
              Journey summary is being generated...
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}
                size={16} 
                color="rgba(255, 255, 255, 0.8)" 
                strokeWidth={1.5}
                style={{ transform: [{ rotate: showSummary ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>
            
            {showSummary && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>{progress.ai_summary}</Text>
              </View>
            )}
          </>
        )}
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
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
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
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoSubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
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
    color: '#ffffff',
  },
  featuredTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featuredDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
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
    color: 'rgba(255, 255, 255, 0.8)',
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
    color: '#ffffff',
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
    color: '#ffffff',
    marginBottom: 4,
  },
  activeCardProgress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
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
    color: 'rgba(255, 255, 255, 0.8)',
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
    marginBottom: 20,
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
    color: '#ffffff',
    marginBottom: 4,
  },
  completedCardDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  completedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  completedStat: {
    alignItems: 'center',
  },
  completedStatNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  completedStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  completedRecapNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  completedRecapText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  summaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryToggleText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  summaryPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryPlaceholderText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
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
    color: '#ffffff',
    marginBottom: 4,
  },
  challengeCardDuration: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  challengeCardDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    marginBottom: 20,
  },
  completedRunsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  completedRunsText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#fbbf24',
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
    color: '#ffffff',
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
    color: 'rgba(255, 255, 255, 0.8)',
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
    color: '#ffffff',
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
    color: '#ffffff',
    lineHeight: 26,
    textAlign: 'center',
  },
  responseContainer: {
    marginBottom: 32,
  },
  responseLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 12,
  },
  responseInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 200,
    color: '#ffffff',
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
    color: '#ffffff',
  },
});