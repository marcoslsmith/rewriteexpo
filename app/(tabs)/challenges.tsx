import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Play, Calendar, Award, Target, Check } from 'lucide-react-native';
import { challenges, challengePrompts } from '../../lib/challenges';
import { storageService } from '../../lib/storage';
import { Challenge, ChallengeProgress } from '../../types/global';

export default function Challenges() {
  const [activeProgress, setActiveProgress] = useState<ChallengeProgress[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [currentProgress, setCurrentProgress] = useState<ChallengeProgress | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [dayResponse, setDayResponse] = useState('');

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const progress = await storageService.getChallengeProgress();
      setActiveProgress(progress.filter(p => !p.completedAt));
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const startChallenge = async (challenge: Challenge) => {
    try {
      const existingProgress = activeProgress.find(p => p.challengeId === challenge.id);
      if (existingProgress) {
        Alert.alert('Already Started', 'You are already participating in this challenge!');
        return;
      }

      const newProgress: ChallengeProgress = {
        id: Date.now().toString(),
        challengeId: challenge.id,
        currentDay: 1,
        completedDays: [],
        responses: {},
        points: 0,
        streak: 0,
        startDate: new Date().toISOString(),
      };

      const allProgress = await storageService.getChallengeProgress();
      allProgress.push(newProgress);
      await storageService.saveChallengeProgress(allProgress);
      
      setSelectedChallenge(challenge);
      setCurrentProgress(newProgress);
      setCurrentDay(1);
      setShowDayModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to start challenge. Please try again.');
    }
  };

  const continueChallenge = (challenge: Challenge, progress: ChallengeProgress) => {
    setSelectedChallenge(challenge);
    setCurrentProgress(progress);
    
    // Determine the next day to work on
    const nextDay = progress.completedDays.length + 1;
    if (nextDay <= challenge.duration) {
      setCurrentDay(nextDay);
      setShowDayModal(true);
    } else {
      // Challenge is complete
      completeChallengeAlert(challenge, progress);
    }
  };

  const completeChallengeAlert = (challenge: Challenge, progress: ChallengeProgress) => {
    Alert.alert(
      'Challenge Complete!',
      `Congratulations! You've completed the ${challenge.title}. Total points earned: ${progress.points}`,
      [{ text: 'Amazing!', onPress: () => {} }]
    );
  };

  const submitDayResponse = async () => {
    if (!currentProgress || !selectedChallenge || !dayResponse.trim()) {
      Alert.alert('Missing Response', 'Please write your response before submitting.');
      return;
    }

    try {
      const updatedProgress: ChallengeProgress = {
        ...currentProgress,
        completedDays: [...currentProgress.completedDays, currentDay],
        responses: { ...currentProgress.responses, [currentDay]: dayResponse },
        points: currentProgress.points + 10,
        streak: currentProgress.streak + 1,
      };

      // Check if challenge is complete
      if (updatedProgress.completedDays.length === selectedChallenge.duration) {
        updatedProgress.completedAt = new Date().toISOString();
        updatedProgress.points += 50; // Bonus for completion
      }

      const allProgress = await storageService.getChallengeProgress();
      const index = allProgress.findIndex(p => p.id === currentProgress.id);
      if (index !== -1) {
        allProgress[index] = updatedProgress;
      }
      await storageService.saveChallengeProgress(allProgress);

      setShowDayModal(false);
      setDayResponse('');
      
      if (updatedProgress.completedAt) {
        completeChallengeAlert(selectedChallenge, updatedProgress);
      }
      
      await loadProgress();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit response. Please try again.');
    }
  };

  const getProgressForChallenge = (challengeId: string) => {
    return activeProgress.find(p => p.challengeId === challengeId);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fef3c7', '#fcd34d', '#f59e0b']}
        style={styles.header}
      >
        <Text style={styles.title}>Challenges</Text>
        <Text style={styles.subtitle}>
          Transform your life through guided journeys
        </Text>
        
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
    ? Math.round((progress.completedDays.length / challenge.duration) * 100)
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
              Day {progress.completedDays.length + 1} of {challenge.duration}
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
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#78350f',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#b45309',
    opacity: 0.8,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#78350f',
  },
  statLabel: {
    fontSize: 12,
    color: '#b45309',
    opacity: 0.8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardDuration: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  progressInfo: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStat: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  startButton: {
    backgroundColor: '#f59e0b',
  },
  continueButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
  promptText: {
    fontSize: 18,
    color: '#1f2937',
    lineHeight: 26,
    marginBottom: 24,
    fontWeight: '600',
  },
  responseInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 200,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});