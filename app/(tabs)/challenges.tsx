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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Play, Calendar, Award, Target, Check, Flame, Star } from 'lucide-react-native';
import { challengeService, challengePrompts } from '../../lib/challenges';
import { storageService } from '../../lib/storage';
import type { Database } from '../../lib/supabase';

type Challenge = Database['public']['Tables']['challenges']['Row'];
type ChallengeProgress = Database['public']['Tables']['challenge_progress']['Row'];

const { width } = Dimensions.get('window');

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
        setError('You are already on this journey! 🚀');
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
      setError('Failed to start challenge. Try again! 💪');
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
      setSuccess(`🎉 Challenge complete! You earned ${progress.points} points!`);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  const submitDayResponse = async () => {
    if (!currentProgress || !selectedChallenge || !dayResponse.trim()) {
      setError('Share your thoughts before continuing! ✍️');
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
        setSuccess(`🏆 Challenge completed! Total: ${updatedProgress.points} points!`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setSuccess('Day completed! Keep going! 🔥');
        setTimeout(() => setSuccess(null), 3000);
      }
      
      await loadData();
    } catch (error) {
      setError('Failed to submit. Try again! 🔄');
      setTimeout(() => setError(null), 3000);
    }
  };

  const getProgressForChallenge = (challengeId: string) => {
    return activeProgress.find(p => p.challenge_id === challengeId);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#f59e0b', '#d97706']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Trophy size={32} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.title}>Growth Challenges</Text>
            <Text style={styles.subtitle}>
              Transform your life through guided journeys
            </Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Flame size={20} color="#ffffff" strokeWidth={2} />
                <Text style={styles.statNumber}>{activeProgress.length}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.stat}>
                <Star size={20} color="#ffffff" strokeWidth={2} />
                <Text style={styles.statNumber}>
                  {activeProgress.reduce((sum, p) => sum + p.points, 0)}
                </Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
            </View>
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
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Day Modal */}
      <Modal
        visible={showDayModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.modalBackground}
          />
          
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
              placeholder="Share your thoughts, feelings, and insights..."
              placeholderTextColor="#64748b"
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
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.submitButtonGradient}
              >
                <Check size={20} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.submitButtonText}>Complete Day</Text>
              </LinearGradient>
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
      <LinearGradient
        colors={['#1e293b', '#334155']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.challengeInfo}>
            <Text style={styles.cardTitle}>{challenge.title}</Text>
            <View style={styles.durationContainer}>
              <Calendar size={16} color="#64748b" strokeWidth={2} />
              <Text style={styles.cardDuration}>{challenge.duration} days</Text>
            </View>
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
                <Text>Day {progress.completed_days.length + 1} of {challenge.duration}</Text>
              </Text>
              <View style={styles.pointsContainer}>
                <Star size={14} color="#f59e0b" fill="#f59e0b" strokeWidth={2} />
                <Text style={styles.progressStat}><Text>{progress.points} points</Text></Text>
              </View>
            </View>
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, isStarted ? styles.continueButton : styles.startButton]}
          onPress={isStarted ? onContinue : onStart}
        >
          <LinearGradient
            colors={isStarted ? ['#10b981', '#059669'] : ['#f59e0b', '#d97706']}
            style={styles.actionButtonGradient}
          >
            {isStarted ? (
              <>
                <Play size={20} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.actionButtonText}>Continue Journey</Text>
              </>
            ) : (
              <>
                <Target size={20} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.actionButtonText}>Start Challenge</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
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
    height: 260,
  },
  headerGradient: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#f59e0b',
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
    marginBottom: 24,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 32,
  },
  stat: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 4,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  card: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    padding: 24,
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
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDuration: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748b',
  },
  progressBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
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
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    lineHeight: 24,
    marginBottom: 20,
  },
  progressInfo: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStat: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94a3b8',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  startButton: {
    shadowColor: '#f59e0b',
  },
  continueButton: {
    shadowColor: '#10b981',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Inter-Bold',
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
    fontSize: 20,
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
  promptText: {
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
    color: '#ffffff',
    lineHeight: 30,
    marginBottom: 28,
    letterSpacing: -0.2,
  },
  responseInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 200,
    color: '#ffffff',
    textAlignVertical: 'top',
    marginBottom: 28,
    lineHeight: 24,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
  bottomSpacer: {
    height: 120,
  },
});