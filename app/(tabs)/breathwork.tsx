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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wind, Play, Pause, RotateCcw, Heart } from 'lucide-react-native';
import { breathingPatterns, BreathingPattern } from '../../lib/breathingPatterns';

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
        <View style={styles.headerContent}>
          <Wind size={32} color="#581c87" />
          <Text style={styles.title}>Breathwork</Text>
          <Text style={styles.subtitle}>
            Guided breathing exercises for wellness and focus
          </Text>
        </View>
        
        <Image
          source={{ uri: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800' }}
          style={styles.headerImage}
        />
      </LinearGradient>

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
    top: -30,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.12,
    transform: [{ rotate: '20deg' }],
  },
  title: {
    fontSize: 36,
    fontFamily: 'Poppins-Bold',
    color: '#581c87',
    marginBottom: 12,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Inter-Medium',
    color: '#7c3aed',
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  content: {
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
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#1f2937',
    letterSpacing: -0.3,
  },
  cardDuration: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6b7280',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cardDescription: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    color: '#4b5563',
    marginBottom: 20,
    lineHeight: 26,
  },
  phasesList: {
    marginBottom: 20,
  },
  phaseItem: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    marginBottom: 6,
    paddingLeft: 8,
  },
  benefits: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginBottom: 12,
  },
  benefitItem: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#4b5563',
    marginBottom: 6,
    paddingLeft: 8,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
  sessionContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  sessionHeader: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 70,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  backButtonText: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#581c87',
  },
  sessionTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#581c87',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  sessionSubtitle: {
    fontSize: 17,
    fontFamily: 'Inter-Medium',
    color: '#7c3aed',
    opacity: 0.85,
  },
  visualizerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  breathingCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#8b5cf6',
    position: 'absolute',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  phaseInfo: {
    alignItems: 'center',
    zIndex: 10,
  },
  phaseText: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  instructionText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.95,
    lineHeight: 24,
  },
  timerText: {
    fontSize: 56,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    letterSpacing: -1,
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
    color: '#581c87',
    textAlign: 'center',
    lineHeight: 28,
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
    backgroundColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  playButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#8b5cf6',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.3,
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
});