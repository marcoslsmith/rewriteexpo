import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wind, Play, Pause, RotateCcw, Heart, Circle } from 'lucide-react-native';
import { breathingPatterns, BreathingPattern } from '../../lib/breathingPatterns';

const { width } = Dimensions.get('window');

export default function Breathwork() {
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [intention, setIntention] = useState('');
  const [showIntention, setShowIntention] = useState(false);

  const animatedValue = useRef(new Animated.Value(0.5)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && selectedPattern && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            const nextPhaseIndex = (currentPhase + 1) % selectedPattern.phases.length;
            if (nextPhaseIndex === 0) {
              setCycleCount(count => count + 1);
            }
            setCurrentPhase(nextPhaseIndex);
            return selectedPattern.phases[nextPhaseIndex].duration;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeRemaining, currentPhase, selectedPattern]);

  useEffect(() => {
    if (selectedPattern && isActive) {
      animateBreathing();
    }
  }, [currentPhase, isActive, selectedPattern]);

  const animateBreathing = () => {
    if (!selectedPattern) return;

    const phase = selectedPattern.phases[currentPhase];
    const isInhale = phase.name.toLowerCase().includes('inhale');
    const isHold = phase.name.toLowerCase().includes('hold');

    let toValue = 0.5;
    if (isInhale) toValue = 1;
    else if (isHold) toValue = animatedValue._value;
    else toValue = 0.3;

    if (!isHold) {
      Animated.timing(animatedValue, {
        toValue,
        duration: phase.duration * 1000,
        useNativeDriver: false,
      }).start();
    }
  };

  const startSession = (pattern: BreathingPattern) => {
    setSelectedPattern(pattern);
    setCurrentPhase(0);
    setTimeRemaining(pattern.phases[0].duration);
    setCycleCount(0);
    setIsActive(true);

    if (pattern.supportsIntention) {
      setShowIntention(true);
    }
  };

  const toggleSession = () => {
    setIsActive(!isActive);
  };

  const resetSession = () => {
    setIsActive(false);
    setCurrentPhase(0);
    setTimeRemaining(selectedPattern?.phases[0].duration || 0);
    setCycleCount(0);
    animatedValue.setValue(0.5);
  };

  const stopSession = () => {
    setSelectedPattern(null);
    setIsActive(false);
    setCurrentPhase(0);
    setTimeRemaining(0);
    setCycleCount(0);
    setShowIntention(false);
    setIntention('');
    animatedValue.setValue(0.5);
  };

  if (selectedPattern) {
    return (
      <View style={styles.sessionContainer}>
        <LinearGradient
          colors={['#0f172a', '#1e293b', '#334155']}
          style={styles.sessionBackground}
        />
        
        <LinearGradient
          colors={['#3b82f6', '#2563eb']}
          style={styles.sessionHeader}
        >
          <TouchableOpacity onPress={stopSession} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.sessionTitle}>{selectedPattern.name}</Text>
          <Text style={styles.sessionSubtitle}>Cycle {cycleCount + 1}</Text>
        </LinearGradient>

        <View style={styles.visualizerContainer}>
          <Animated.View
            style={[
              styles.breathingCircle,
              {
                transform: [{
                  scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1.4],
                  })
                }],
                opacity: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                })
              }
            ]}
          />
          
          <View style={styles.phaseInfo}>
            <Text style={styles.phaseText}>
              {selectedPattern.phases[currentPhase].name}
            </Text>
            <Text style={styles.instructionText}>
              {selectedPattern.phases[currentPhase].instruction}
            </Text>
            <Text style={styles.timerText}>{timeRemaining}</Text>
          </View>
        </View>

        {showIntention && intention && (
          <View style={styles.intentionDisplay}>
            <Text style={styles.intentionText}>"{intention}"</Text>
          </View>
        )}

        <View style={styles.sessionControls}>
          <TouchableOpacity style={styles.controlButton} onPress={resetSession}>
            <RotateCcw size={24} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.playButton]}
            onPress={toggleSession}
          >
            {isActive ? (
              <Pause size={36} color="#ffffff" strokeWidth={2.5} />
            ) : (
              <Play size={36} color="#ffffff" strokeWidth={2.5} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton} onPress={stopSession}>
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        style={styles.background}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Wind size={32} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.title}>Breathwork</Text>
              <Text style={styles.subtitle}>
                Guided breathing for wellness and focus
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          {breathingPatterns.map((pattern) => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              onStart={() => {
                if (pattern.supportsIntention) {
                  if (Platform.OS === 'web') {
                    const intentionText = prompt('Set Your Intention (optional):');
                    setIntention(intentionText || '');
                  }
                  startSession(pattern);
                } else {
                  startSession(pattern);
                }
              }}
            />
          ))}
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

interface PatternCardProps {
  pattern: BreathingPattern;
  onStart: () => void;
}

function PatternCard({ pattern, onStart }: PatternCardProps) {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#1e293b', '#334155']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{pattern.name}</Text>
          <View style={styles.durationBadge}>
            <Circle size={8} color="#3b82f6" fill="#3b82f6" />
            <Text style={styles.cardDuration}>{pattern.totalDuration}s</Text>
          </View>
        </View>
        
        <Text style={styles.cardDescription}>{pattern.description}</Text>
        
        <View style={styles.phasesList}>
          {pattern.phases.map((phase, index) => (
            <View key={index} style={styles.phaseItem}>
              <View style={styles.phaseDot} />
              <Text style={styles.phaseItemText}>
                {phase.name} ({phase.duration}s)
              </Text>
            </View>
          ))}
        </View>
        
        <View style={styles.benefits}>
          <Text style={styles.benefitsTitle}>Benefits</Text>
          <View style={styles.benefitsList}>
            {pattern.benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <View style={styles.benefitDot} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <TouchableOpacity style={styles.startButton} onPress={onStart}>
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.startButtonGradient}
          >
            <Play size={20} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.startButtonText}>Start Session</Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    marginTop: 60,
    marginHorizontal: 20,
    marginBottom: 32,
    height: 200,
  },
  headerGradient: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
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
    fontSize: 36,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    padding: 20,
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
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    letterSpacing: -0.3,
    flex: 1,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  cardDuration: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#3b82f6',
  },
  cardDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    marginBottom: 20,
    lineHeight: 24,
  },
  phasesList: {
    marginBottom: 20,
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748b',
  },
  phaseItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  benefits: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 12,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  benefitText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
  sessionContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  sessionBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  sessionHeader: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 70,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  sessionTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  sessionSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    opacity: 0.9,
  },
  visualizerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  breathingCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#3b82f6',
    position: 'absolute',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 16,
  },
  phaseInfo: {
    alignItems: 'center',
    zIndex: 10,
  },
  phaseText: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  instructionText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.95,
    lineHeight: 24,
  },
  timerText: {
    fontSize: 64,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    letterSpacing: -2,
  },
  intentionDisplay: {
    paddingHorizontal: 48,
    paddingVertical: 24,
    alignItems: 'center',
  },
  intentionText: {
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
    fontStyle: 'italic',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 28,
    opacity: 0.8,
  },
  sessionControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    gap: 24,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  playButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.5,
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomSpacer: {
    height: 120,
  },
});