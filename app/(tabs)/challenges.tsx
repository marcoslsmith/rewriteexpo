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
} from 'react-native';
import { Target, Play, Calendar, Award, Check, ArrowLeft, X } from 'lucide-react-native';
import { challengeService, challengePrompts } from '../../lib/challenges';
import { storageService } from '../../lib/storage';
import type { Database } from '../../lib/supabase';

type Challenge = Database['public']['Tables']['challenges']['Row'];
type ChallengeProgress = Database['public']['Tables']['challenge_progress']['Row'];

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
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [challengesData, progressData] = await Promise.all([
        challengeService.getChallenges(),
        storageService.getChallengeProgress()
      ]);
      
      setChallenges(challengesData);
      setActiveProgress(progressData.filter(p => !p.completed_at));
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load challenges');
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
      });
      
      await loadData();
      
      const newProgress = (await storageService.getChallengeProgress())
        .find(p => p.challenge_id === challenge.id && !p.completed_at);
      
      if (newProgress) {
        setSelectedChallenge(challenge);
        setCurrentProgress(newProgress);
        setCurrentDay(1);
        setShowDayModal(true);
      }
    } catch (error) {
      setError('Failed to start challenge. Please try again.');
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
        updatedProgress.points = updatedProgress.points! + 50;
      }

      await storageService.updateChallengeProgress(currentProgress.id, updatedProgress);

      setShowDayModal(false);
      setDayResponse('');
      
      if (updatedProgress.completed_at) {
        setSuccess(`Congratulations! You've completed the ${selectedChallenge.title}. Total points earned: ${updatedProgress.points}`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setSuccess('Day completed! Great work!');
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Your journey</Text>
        <Text style={styles.title}>Growth Challenges</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{activeProgress.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>
              {activeProgress.reduce((sum, p) => sum + p.points, 0)}
            </Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>
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

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {challenges.map((challenge) => {
          const progress = getProgressForChallenge(challenge.id);
          return (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              progress={progress}
              onStart={() => startChallenge(challenge)}
              onContinue={() => progress && continueChallenge(challenge, progress)}
            />
          );
        })}
      </Animated.ScrollView>

      {/* Day Modal */}
      <Modal
        visible={showDayModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowDayModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color="#64748b" strokeWidth={1.5} />
            </TouchableOpacity>
            
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>
                {selectedChallenge?.title}
              </Text>
              <Text style={styles.modalSubtitle}>Day {currentDay}</Text>
            </View>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.promptContainer}>
              <Text style={styles.promptText}>
                {selectedChallenge && challengePrompts[selectedChallenge.id]?.[currentDay]}
              </Text>
            </View>
            
            <TextInput
              style={styles.responseInput}
              placeholder="Write your response here..."
              placeholderTextColor="#94a3b8"
              value={dayResponse}
              onChangeText={setDayResponse}
              multiline
              textAlignVertical="top"
            />
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitDayResponse}
            >
              <Check size={18} color="#ffffff" strokeWidth={1.5} />
              <Text style={styles.submitButtonText}>Submit Response</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

interface ChallengeCardProps {
  challenge: Challenge;
  progress?: ChallengeProgress;
  onStart: () => void;
  onContinue: () => void;
}

function ChallengeCard({ challenge, progress, onStart, onContinue }: ChallengeCardProps) {
  const isStarted = !!progress;
  const completionPercentage = progress 
    ? Math.round((progress.completed_days.length / challenge.duration) * 100)
    : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.challengeInfo}>
          <Text style={styles.cardTitle}>{challenge.title}</Text>
          <Text style={styles.cardDuration}>{challenge.duration} days</Text>
        </View>
        
        <View style={styles.iconContainer}>
          {isStarted ? (
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>{completionPercentage}%</Text>
            </View>
          ) : (
            <Target size={20} color="#64748b" strokeWidth={1.5} />
          )}
        </View>
      </View>
      
      <Text style={styles.cardDescription}>{challenge.description}</Text>
      
      {isStarted && progress && (
        <View style={styles.progressInfo}>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${completionPercentage}%` }]} 
            />
          </View>
          <View style={styles.progressStats}>
            <Text style={styles.progressStat}>
              Day {progress.completed_days.length + 1} of {challenge.duration}
            </Text>
            <Text style={styles.progressStat}>
              {progress.points} points
            </Text>
          </View>
        </View>
      )}
      
      <TouchableOpacity
        style={[styles.actionButton, isStarted ? styles.continueButton : styles.startButton]}
        onPress={isStarted ? onContinue : onStart}
      >
        <Play size={16} color="#ffffff" strokeWidth={1.5} />
        <Text style={styles.actionButtonText}>
          {isStarted ? 'Continue Journey' : 'Start Challenge'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#0f172a',
    lineHeight: 34,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 32,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748b',
    marginTop: 2,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#16a34a',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  challengeInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardDuration: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  progressText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  cardDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 24,
    marginBottom: 20,
  },
  progressInfo: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStat: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  startButton: {
    backgroundColor: '#2563eb',
  },
  continueButton: {
    backgroundColor: '#059669',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0f172a',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  promptContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  promptText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#0f172a',
    lineHeight: 26,
  },
  responseInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 200,
    color: '#0f172a',
    marginBottom: 24,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    lineHeight: 24,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});