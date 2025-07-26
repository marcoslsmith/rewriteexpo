import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { Wind, Play, Pause, RotateCcw, ArrowLeft, Heart, Star, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Font from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { breathingPatterns, BreathingPattern } from '../../lib/breathingPatterns';
import PurpleSkyBackground from '../../components/PurpleSkyBackground';
import AnimatedButton from '../../components/AnimatedButton';

const { width, height } = Dimensions.get('window');

export default function Breathwork() {
  const insets = useSafeAreaInsets();
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [intention, setIntention] = useState('');
  const [showIntention, setShowIntention] = useState(false);
  const [showFAB, setShowFAB] = useState(true);
  const [avallonFontLoaded, setAvallonFontLoaded] = useState(false);

  const animatedValue = useRef(new Animated.Value(0.5)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-30)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  // Load custom fonts
  const [glacialFontLoaded, setGlacialFontLoaded] = useState(false);
  
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
        console.log('Error loading fonts:', error);
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

  // Continuous pulse animation for the breathing circle
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

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
        useNativeDriver: true,
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
      <PurpleSkyBackground overlayOpacity={0.4}>
        <View style={styles.sessionContainer}>
          {/* Session Header */}
          <Animated.View 
            style={[
              styles.sessionHeader,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <TouchableOpacity onPress={stopSession} style={styles.backButton}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']}
                style={styles.backButtonGradient}
              >
                <ArrowLeft size={24} color="#ffffff" strokeWidth={1.5} />
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.sessionInfo}>
                          <Text style={[
              styles.sessionTitle,
              { fontFamily: glacialFontLoaded ? 'GlacialIndifference-Bold' : 'Inter-Bold' }
            ]}>{selectedPattern.name}</Text>
            <Text style={[
              styles.sessionSubtitle,
              { fontFamily: glacialFontLoaded ? 'GlacialIndifference' : 'Inter-Regular' }
            ]}>Cycle {cycleCount + 1}</Text>
            </View>
          </Animated.View>

          {/* Breathing Visualizer */}
          <View style={styles.visualizerContainer}>
            {/* Outer Glow Rings */}
            <Animated.View
              style={[
                styles.glowRing,
                styles.outerGlow,
                {
                  transform: [
                    { 
                      scale: Animated.multiply(
                        animatedValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.3],
                        }),
                        pulseAnim
                      )
                    }
                  ],
                  opacity: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.1, 0.3],
                  })
                }
              ]}
            />
            
            <Animated.View
              style={[
                styles.glowRing,
                styles.middleGlow,
                {
                  transform: [
                    { 
                      scale: Animated.multiply(
                        animatedValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1.2],
                        }),
                        pulseAnim
                      )
                    }
                  ],
                  opacity: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 0.4],
                  })
                }
              ]}
            />

            {/* Main Breathing Circle */}
            <Animated.View
              style={[
                styles.breathingCircle,
                {
                  transform: [
                    {
                      scale: Animated.multiply(
                        animatedValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.7, 1.1],
                        }),
                        pulseAnim
                      )
                    }
                  ],
                  opacity: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 0.9],
                  })
                }
              ]}
            >
              <LinearGradient
                colors={['#ffffff', '#f0f9ff', '#e0f2fe']}
                style={styles.circleGradient}
              >
                <Wind size={40} color="#4facfe" strokeWidth={1.5} />
              </LinearGradient>
            </Animated.View>
            
            {/* Phase Information */}
            <View style={styles.phaseInfo}>
              <Text style={[
                styles.phaseText,
                { fontFamily: glacialFontLoaded ? 'GlacialIndifference-Bold' : 'Inter-Bold' }
              ]}>
                {selectedPattern.phases[currentPhase].name}
              </Text>
              <Text style={[
                styles.instructionText,
                { fontFamily: glacialFontLoaded ? 'GlacialIndifference' : 'Inter-Regular' }
              ]}>
                {selectedPattern.phases[currentPhase].instruction}
              </Text>
              <View style={styles.timerContainer}>
                <Text style={[
                  styles.timerText,
                  { fontFamily: glacialFontLoaded ? 'GlacialIndifference-Bold' : 'Inter-Bold' }
                ]}>{timeRemaining}</Text>
                <Text style={[
                  styles.timerLabel,
                  { fontFamily: glacialFontLoaded ? 'GlacialIndifference' : 'Inter-Regular' }
                ]}>seconds</Text>
              </View>
            </View>
          </View>

          {/* Intention Display */}
          {showIntention && intention && (
            <Animated.View style={styles.intentionDisplay}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']}
                style={styles.intentionGradient}
              >
                <Heart size={20} color="#ffffff" strokeWidth={1.5} />
                <Text style={[
                  styles.intentionText,
                  { fontFamily: glacialFontLoaded ? 'GlacialIndifference' : 'Inter-Regular' }
                ]}>"{intention}"</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Session Controls - Positioned above tab bar */}
          <View style={styles.sessionControls}>
            <TouchableOpacity style={styles.controlButton} onPress={resetSession}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']}
                style={styles.controlButtonGradient}
              >
                <RotateCcw size={20} color="#ffffff" strokeWidth={1.5} />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.playButton]}
              onPress={toggleSession}
            >
              <LinearGradient
                colors={isActive ? ['#ef4444', '#dc2626'] : ['#10b981', '#059669']}
                style={styles.playButtonGradient}
              >
                {isActive ? (
                  <Pause size={32} color="#ffffff" strokeWidth={1.5} />
                ) : (
                  <Play size={32} color="#ffffff" strokeWidth={1.5} />
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={stopSession}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']}
                style={styles.controlButtonGradient}
              >
                <Text style={[
                  styles.stopButtonText,
                  { fontFamily: glacialFontLoaded ? 'GlacialIndifference-Bold' : 'Inter-Bold' }
                ]}>Stop</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </PurpleSkyBackground>
    );
  }

  return (
    <PurpleSkyBackground overlayOpacity={0.4}>
      <View style={styles.container}>
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20 }
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
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
              ]}>Breathwork</Text>
              <Text style={[
                styles.logoSubtext,
                { fontFamily: glacialFontLoaded ? 'GlacialIndifference' : 'Inter-Regular' }
              ]}>Find your center through breath</Text>
            </Animated.View>
          </Animated.View>
          {breathingPatterns.map((pattern, index) => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              index={index}
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
          
          {/* Bottom padding for tab bar */}
          <View style={styles.bottomPadding} />
        </Animated.ScrollView>
      </View>
    </PurpleSkyBackground>
  );
}

interface PatternCardProps {
  pattern: BreathingPattern;
  index: number;
  onStart: () => void;
}

function PatternCard({ pattern, index, onStart }: PatternCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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

  const getPatternIcon = (patternId: string) => {
    switch (patternId) {
      case 'box': return Wind;
      case 'sleep478': return Star;
      case 'wimhof': return Zap;
      case 'coherent': return Heart;
      case 'physiological': return Wind;
      default: return Wind;
    }
  };

  const getPatternColors = (patternId: string) => {
    switch (patternId) {
      case 'box': return ['#6B9FFF', '#6B9FFF'];
      case 'sleep478': return ['#6B9FFF', '#6B9FFF'];
      case 'wimhof': return ['#6B9FFF', '#6B9FFF'];
      case 'coherent': return ['#6B9FFF', '#6B9FFF'];
      case 'physiological': return ['#6B9FFF', '#6B9FFF'];
      default: return ['#6B9FFF', '#6B9FFF'];
    }
  };

  const IconComponent = getPatternIcon(pattern.id);
  const gradientColors = getPatternColors(pattern.id);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{pattern.name}</Text>
            <Text style={styles.cardDuration}>{pattern.totalDuration}s cycle</Text>
          </View>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={gradientColors}
              style={styles.iconGradient}
            >
              <IconComponent size={24} color="#ffffff" strokeWidth={1.5} />
            </LinearGradient>
          </View>
        </View>
        
        <Text style={styles.cardDescription}>{pattern.description}</Text>
        
        <View style={styles.phasesList}>
          {pattern.phases.map((phase, index) => (
            <View key={index} style={styles.phaseItem}>
              <View style={[styles.phaseDot, { backgroundColor: gradientColors[0] }]} />
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
                <View style={[styles.benefitDot, { backgroundColor: gradientColors[1] }]} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <AnimatedButton onPress={onStart} style={styles.startButton}>
          <LinearGradient
            colors={gradientColors}
            style={styles.startButtonGradient}
          >
            <View style={styles.startButtonContent}>
              <Play size={18} color="#ffffff" strokeWidth={1.5} />
              <Text style={styles.startButtonText}>Start Session</Text>
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
  heroSection: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 2,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140, // Extra padding for tab bar
  },
  card: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
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
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#496FB5',
    marginBottom: 4,
  },
  cardDuration: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#496FB5',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#496FB5',
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
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#496FB5',
  },
  benefits: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#496FB5',
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
  },
  benefitText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#496FB5',
    lineHeight: 20,
    flex: 1,
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
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
  bottomPadding: {
    height: 40,
  },
  
  // Session Styles
  sessionContainer: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sessionSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  visualizerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  outerGlow: {
    width: 400,
    height: 400,
  },
  middleGlow: {
    width: 320,
    height: 320,
  },
  breathingCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  circleGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseInfo: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  phaseText: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  instructionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#496FB5',
    textAlign: 'center',
    marginBottom: 20,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 56,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  timerLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#496FB5',
    marginTop: 4,
  },
  intentionDisplay: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    alignItems: 'center',
  },
  intentionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  intentionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    fontStyle: 'italic',
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
  },
  sessionControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    paddingBottom: 140, // Extra padding to ensure buttons are above tab bar
    gap: 24,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  controlButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  playButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonText: {
    color: '#496FB5',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});