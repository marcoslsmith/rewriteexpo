import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wind, Play, Pause, RotateCcw, Heart } from 'lucide-react-native';
import { breathingPatterns } from '../../lib/breathingPatterns';
import { BreathingPattern } from '../../types/global';

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
            // Move to next phase
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

    let toValue = 0.5; // Default
    if (isInhale) toValue = 1;
    else if (isHold) toValue = animatedValue._value; // Keep current value
    else toValue = 0.3; // Exhale

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
          colors={['#ede9fe', '#ddd6fe', '#c4b5fd']}
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
                    outputRange: [0.5, 1.2],
                  })
                }],
                opacity: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.9],
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
            <RotateCcw size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.playButton]}
            onPress={toggleSession}
          >
            {isActive ? (
              <Pause size={32} color="#ffffff" />
            ) : (
              <Play size={32} color="#ffffff" />
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#ede9fe', '#ddd6fe', '#c4b5fd']}
        style={styles.header}
      >
        <Text style={styles.title}>Breathwork</Text>
        <Text style={styles.subtitle}>
          Guided breathing exercises for wellness and focus
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {breathingPatterns.map((pattern) => (
          <PatternCard
            key={pattern.id}
            pattern={pattern}
            onStart={() => {
              if (pattern.supportsIntention) {
                Alert.prompt(
                  'Set Your Intention',
                  'What would you like to focus on during this session?',
                  [
                    { text: 'Skip', onPress: () => startSession(pattern) },
                    {
                      text: 'Set',
                      onPress: (text) => {
                        setIntention(text || '');
                        startSession(pattern);
                      }
                    }
                  ],
                  'plain-text',
                  '',
                  'default'
                );
              } else {
                startSession(pattern);
              }
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}

interface PatternCardProps {
  pattern: BreathingPattern;
  onStart: () => void;
}

function PatternCard({ pattern, onStart }: PatternCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{pattern.name}</Text>
        <Text style={styles.cardDuration}>{pattern.totalDuration}s cycle</Text>
      </View>
      
      <Text style={styles.cardDescription}>{pattern.description}</Text>
      
      <View style={styles.phasesList}>
        {pattern.phases.map((phase, index) => (
          <Text key={index} style={styles.phaseItem}>
            {phase.name} ({phase.duration}s)
          </Text>
        ))}
      </View>
      
      <View style={styles.benefits}>
        <Text style={styles.benefitsTitle}>Benefits:</Text>
        {pattern.benefits.map((benefit, index) => (
          <Text key={index} style={styles.benefitItem}>• {benefit}</Text>
        ))}
      </View>
      
      <TouchableOpacity style={styles.startButton} onPress={onStart}>
        <Play size={20} color="#ffffff" />
        <Text style={styles.startButtonText}>Start Session</Text>
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
    color: '#581c87',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7c3aed',
    opacity: 0.8,
  },
  content: {
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
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  cardDuration: {
    fontSize: 14,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardDescription: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 16,
    lineHeight: 22,
  },
  phasesList: {
    marginBottom: 16,
  },
  phaseItem: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  benefits: {
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  benefitItem: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  sessionContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  sessionHeader: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
  },
  backButtonText: {
    fontSize: 16,
    color: '#581c87',
    fontWeight: '600',
  },
  sessionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#581c87',
    marginBottom: 4,
  },
  sessionSubtitle: {
    fontSize: 16,
    color: '#7c3aed',
    opacity: 0.8,
  },
  visualizerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#a855f7',
    position: 'absolute',
  },
  phaseInfo: {
    alignItems: 'center',
    zIndex: 10,
  },
  phaseText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  intentionDisplay: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    alignItems: 'center',
  },
  intentionText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#581c87',
    textAlign: 'center',
  },
  sessionControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6b7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7c3aed',
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});