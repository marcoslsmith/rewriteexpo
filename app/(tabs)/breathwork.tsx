import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
  Platform,
} from 'react-native';
import { Wind, Play, Pause, RotateCcw, ArrowLeft } from 'lucide-react-native';
import { breathingPatterns, BreathingPattern } from '../../lib/breathingPatterns';
import GradientBackground from '../../components/GradientBackground';
import AnimatedButton from '../../components/AnimatedButton';
import FloatingActionButton from '../../components/FloatingActionButton';

export default function Breathwork() {
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [intention, setIntention] = useState('');
  const [showIntention, setShowIntention] = useState(false);
  const [showFAB, setShowFAB] = useState(true);

  const animatedValue = useRef(new Animated.Value(0.5)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        setShowFAB(currentScrollY < 100);
      },
    }
  );

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
      <GradientBackground colors={['#f0f9ff', '#e0f2fe', '#bae6fd']}>
        <View style={styles.sessionContainer}>
          <View style={styles.sessionHeader}>
            <TouchableOpacity onPress={stopSession} style={styles.backButton}>
              <ArrowLeft size={24} color="#0f172a" strokeWidth={1.5} />
            </TouchableOpacity>
            
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionTitle}>{selectedPattern.name}</Text>
              <Text style={styles.sessionSubtitle}>Cycle {cycleCount + 1}</Text>
            </View>
          </View>

          <View style={styles.visualizerContainer}>
            <Animated.View
              style={[
                styles.breathingCircle,
                {
                  transform: [{
                    scale: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1.1],
                    })
                  }],
                  opacity: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 0.8],
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
              <RotateCcw size={20} color="#64748b" strokeWidth={1.5} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.playButton]}
              onPress={toggleSession}
            >
              {isActive ? (
                <Pause size={28} color="#ffffff" strokeWidth={1.5} />
              ) : (
                <Play size={28} color="#ffffff" strokeWidth={1.5} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={stopSession}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground colors={['#f0f9ff', '#e0f2fe', '#bae6fd']}>
      <View style={styles.container}>
        <FloatingActionButton visible={showFAB} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Find your center</Text>
          <Text style={styles.title}>Breathwork</Text>
        </View>

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
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
        </Animated.ScrollView>
      </View>
    </GradientBackground>
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
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{pattern.name}</Text>
          <Text style={styles.cardDuration}>{pattern.totalDuration}s cycle</Text>
        </View>
        <View style={styles.iconContainer}>
          <Wind size={20} color="#0ea5e9" strokeWidth={1.5} />
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
        {pattern.benefits.map((benefit, index) => (
          <Text key={index} style={styles.benefitItem}>• {benefit}</Text>
        ))}
      </View>
      
      <AnimatedButton onPress={onStart} style={styles.startButton}>
        <View style={styles.startButtonContent}>
          <Play size={16} color="#ffffff" strokeWidth={1.5} />
          <Text style={styles.startButtonText}>Start Session</Text>
        </View>
      </AnimatedButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
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
  cardTitleContainer: {
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
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#475569',
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
    backgroundColor: '#0ea5e9',
  },
  phaseItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  benefits: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0f172a',
    marginBottom: 12,
  },
  benefitItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    marginBottom: 6,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  sessionContainer: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  backButton: {
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
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  sessionSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  visualizerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#0ea5e9',
    position: 'absolute',
  },
  phaseInfo: {
    alignItems: 'center',
    zIndex: 10,
  },
  phaseText: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#0f172a',
  },
  intentionDisplay: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    alignItems: 'center',
  },
  intentionText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    fontStyle: 'italic',
    color: '#475569',
    textAlign: 'center',
  },
  sessionControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0ea5e9',
  },
  stopButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});