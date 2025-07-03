import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Play, Calendar, Award, Target, Check } from 'lucide-react-native';
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
      
      // Start the first day
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
    
    // Determine the next day to work on
    const nextDay = progress.completed_days.length + 1;
    if (nextDay <= challenge.duration) {
      setCurrentDay(nextDay);
      setShowDayModal(true);
    } else {
      // Challenge is complete
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

      // Check if challenge is complete
      if (updatedProgress.completed_days!.length === selectedChallenge.duration) {
        updatedProgress.completed_at = new Date().toISOString();
        updatedProgress.points = updatedProgress.points! + 50; // Bonus for completion
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
      <LinearGradient
        colors={['#fef3c7', '#fcd34d', '#f59e0b']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Trophy size={32} color="#78350f" />
          <Text style={styles.title}>Challenges</Text>
          <Text style={styles.subtitle}>
            Transform your life through guided journeys
          </Text>
        </View>
        
        <Image
          source={{ uri: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800' }}
          style={styles.headerImage}
        />
        
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
      </ScrollView>

      <Modal
        visible={showDayModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedChallenge?.title} - Day {currentDay}
            </Text>
            <TouchableOpacity
              onPress={() => setShowDayModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.promptText}>
              {selectedChallenge && challengePrompts[selectedChallenge.id]?.[currentDay]}
            </Text>
            
            <TextInput
              style={styles.responseInput}
              placeholder="Write your response here..."
              value={dayResponse}
              onChangeText={setDayResponse}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitDayResponse}
            >
              <Check size={20} color="#ffffff" />
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
        
        {isStarted && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>{completionPercentage}%</Text>
          </View>
        )}
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
        {isStarted ? (
          <>
            <Play size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Continue Journey</Text>
          </>
        ) : (
          <>
            <Target size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Start Challenge</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  headerImage: {
    position: 'absolute',
    top: -25,
    right: -25,
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.15,
    transform: [{ rotate: '-15deg' }],
  },
  title: {
    fontSize: 36,
    fontFamily: 'Poppins-Bold',
    color: '#78350f',
    marginBottom: 12,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Inter-Medium',
    color: '#b45309',
    opacity: 0.85,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  stat: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  statNumber: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#78350f',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#b45309',
    opacity: 0.9,
    marginTop: 2,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#d1fae5',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  successText: {
    color: '#065f46',
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
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
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#1f2937',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardDuration: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  progressBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  progressText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
  cardDescription: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    color: '#4b5563',
    lineHeight: 26,
    marginBottom: 20,
  },
  progressInfo: {
    marginBottom: 20,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 6,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStat: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  startButton: {
    backgroundColor: '#ea580c',
  },
  continueButton: {
    backgroundColor: '#059669',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 70,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fafbfc',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#1f2937',
    flex: 1,
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  closeButtonText: {
    color: '#6b7280',
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  promptText: {
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
    color: '#1f2937',
    lineHeight: 30,
    marginBottom: 28,
    letterSpacing: -0.2,
  },
  responseInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 20,
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    minHeight: 220,
    backgroundColor: '#fafbfc',
    color: '#1f2937',
    textAlignVertical: 'top',
    marginBottom: 28,
    lineHeight: 26,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
});