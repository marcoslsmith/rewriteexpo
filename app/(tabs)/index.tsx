import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Sparkles, Save, Plus, Heart, Zap, Star, ArrowRight, PenTool, BookOpen } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { transformJournalEntry } from '../../lib/ai';
import { storageService } from '../../lib/storage';
import { getGreeting, getMotivationalGreeting } from '../../lib/greetings';
import GradientBackground from '../../components/GradientBackground';
import AnimatedButton from '../../components/AnimatedButton';
import LoadingShimmer from '../../components/LoadingShimmer';
import FloatingActionButton from '../../components/FloatingActionButton';

const { width, height } = Dimensions.get('window');

export default function Journal() {
  const [journalEntry, setJournalEntry] = useState('');
  const [transformedText, setTransformedText] = useState('');
  const [isTransforming, setIsTransforming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showClearButton, setShowClearButton] = useState(false);
  const [showFAB, setShowFAB] = useState(true);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const promptFadeAnim = useRef(new Animated.Value(1)).current;

  const quickPrompts = [
    { text: "I want to feel more confident...", icon: Star, color: '#f59e0b' },
    { text: "I'm struggling with...", icon: Heart, color: '#ef4444' },
    { text: "My biggest dream is...", icon: Sparkles, color: '#8b5cf6' },
    { text: "I feel anxious about...", icon: Zap, color: '#06b6d4' },
    { text: "I wish I could...", icon: Star, color: '#10b981' },
    { text: "I'm grateful for...", icon: Heart, color: '#f97316' },
    { text: "I want to create...", icon: Sparkles, color: '#ec4899' },
    { text: "I'm ready to...", icon: Zap, color: '#6366f1' },
  ];

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

  // Auto-rotate prompts
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(promptFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(promptFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setCurrentPromptIndex((prev) => (prev + 1) % quickPrompts.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const isScrollingDown = currentScrollY > lastScrollY.current;
        
        if (isScrollingDown && currentScrollY > 100) {
          setShowFAB(false);
        } else if (!isScrollingDown) {
          setShowFAB(true);
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

  const handleTransform = async () => {
    if (!journalEntry.trim()) {
      setError('Please write something in your journal first.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsTransforming(true);
    setError(null);
    
    try {
      const transformed = await transformJournalEntry(journalEntry);
      setTransformedText(transformed);
      
      // Automatically save to library
      try {
        await storageService.addManifestation({
          original_entry: journalEntry,
          transformed_text: transformed,
          is_favorite: false,
          tags: [],
        });
        
        setSuccess('Your manifestation has been created and saved to your library!');
        
        // Clear only the journal entry, keep the manifestation visible
        setJournalEntry('');
        setShowClearButton(true);
        
        // Clear success message after 4 seconds, but keep manifestation
        setTimeout(() => setSuccess(null), 4000);
      } catch (saveError) {
        console.error('Save error:', saveError);
        setError('Manifestation created but failed to save. Please try again.');
        setTimeout(() => setError(null), 5000);
      }
      
      setError(null);
    } catch (error) {
      setError('Failed to transform your entry. Please check your connection and try again.');
      console.error('Transformation error:', error);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsTransforming(false);
    }
  };

  const clearManifestation = () => {
    setTransformedText('');
    setShowClearButton(false);
  };

  const handleQuickPrompt = (prompt: string) => {
    setJournalEntry(prompt);
  };

  const currentPrompt = quickPrompts[currentPromptIndex];
  const IconComponent = currentPrompt.icon;

  return (
    <GradientBackground colors={['#667eea', '#764ba2', '#f093fb']}>
      <View style={styles.container}>
        <FloatingActionButton visible={showFAB} />
        
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Hero Header with Logo */}
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
                <PenTool size={32} color="#667eea" strokeWidth={2} />
              </LinearGradient>
              <Text style={styles.logoText}>The Rewrite</Text>
              <Text style={styles.logoSubtext}>Transform your thoughts</Text>
            </View>
            
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.motivationalText}>{getMotivationalGreeting()}</Text>
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

          {/* Rotating Quick Start Prompt */}
          <View style={styles.quickStartSection}>
            <Text style={styles.sectionTitle}>Quick Start</Text>
            <Text style={styles.sectionSubtitle}>Tap to get started with a prompt</Text>
            
            <Animated.View style={{ opacity: promptFadeAnim }}>
              <TouchableOpacity
                style={styles.rotatingPromptCard}
                onPress={() => handleQuickPrompt(currentPrompt.text)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                  style={styles.promptGradient}
                >
                  <View style={styles.promptIconContainer}>
                    <View style={[styles.promptIconBackground, { backgroundColor: currentPrompt.color }]}>
                      <IconComponent size={20} color="#ffffff" strokeWidth={1.5} />
                    </View>
                  </View>
                  
                  <View style={styles.promptTextContainer}>
                    <Text style={styles.rotatingPromptText}>{currentPrompt.text}</Text>
                    <Text style={styles.promptHint}>Tap to use this prompt</Text>
                  </View>
                  
                  <View style={styles.promptArrowContainer}>
                    <ArrowRight size={20} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Prompt Indicators */}
            <View style={styles.promptIndicators}>
              {quickPrompts.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentPromptIndex && styles.activeIndicator
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Main Journal Entry Card */}
          <View style={styles.journalCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <BookOpen size={24} color="#667eea" strokeWidth={1.5} />
                  <Text style={styles.cardTitle}>Your Journal</Text>
                </View>
                {journalEntry.length > 0 && (
                  <Text style={styles.characterCount}>{journalEntry.length} characters</Text>
                )}
              </View>
              
              <TextInput
                style={styles.textInput}
                placeholder="What's on your mind today? Share your thoughts, dreams, challenges, or anything you'd like to transform into something positive..."
                placeholderTextColor="#94a3b8"
                value={journalEntry}
                onChangeText={setJournalEntry}
                multiline
                textAlignVertical="top"
              />
              
              <AnimatedButton
                onPress={handleTransform}
                disabled={isTransforming || !journalEntry.trim()}
                style={[
                  styles.transformButton,
                  (!journalEntry.trim() || isTransforming) && styles.transformButtonDisabled
                ]}
              >
                <LinearGradient
                  colors={journalEntry.trim() && !isTransforming ? ['#667eea', '#764ba2'] : ['#94a3b8', '#64748b']}
                  style={styles.buttonGradient}
                >
                  <View style={styles.buttonContent}>
                    {isTransforming ? (
                      <LoadingShimmer width={20} height={20} borderRadius={10} />
                    ) : (
                      <Sparkles size={20} color="#ffffff" strokeWidth={1.5} />
                    )}
                    <Text style={styles.buttonText}>
                      {isTransforming ? 'Transforming...' : 'Transform with AI'}
                    </Text>
                  </View>
                </LinearGradient>
              </AnimatedButton>
            </LinearGradient>
          </View>

          {/* Manifestation Result */}
          {transformedText ? (
            <Animated.View style={styles.manifestationCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Sparkles size={24} color="#f59e0b" strokeWidth={1.5} />
                    <Text style={styles.cardTitle}>Your Manifestation</Text>
                  </View>
                  {showClearButton && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={clearManifestation}
                    >
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.manifestationContent}>
                  <Text style={styles.manifestationText}>{transformedText}</Text>
                </View>
                
                <View style={styles.manifestationActions}>
                  <TouchableOpacity style={styles.actionChip}>
                    <Heart size={16} color="#ef4444" strokeWidth={1.5} />
                    <Text style={styles.actionChipText}>Add to Favorites</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionChip}>
                    <BookOpen size={16} color="#667eea" strokeWidth={1.5} />
                    <Text style={styles.actionChipText}>View in Library</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          ) : null}

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.tipsGradient}
            >
              <Text style={styles.tipsTitle}>✨ Writing Tips</Text>
              <View style={styles.tipsList}>
                <View style={styles.tipItem}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.tipText}>Be honest about your current thoughts and feelings</Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.tipText}>Share your challenges, fears, or limiting beliefs</Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.tipText}>Describe what you want to create or change</Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.tipText}>Your manifestations are automatically saved</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
          
          {/* Bottom padding for FAB */}
          <View style={styles.bottomPadding} />
        </Animated.ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
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
  greetingContainer: {
    alignItems: 'center',
  },
  greeting: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    textAlign: 'center',
  },
  motivationalText: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
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
    borderRadius: 12,
    marginBottom: 20,
  },
  successText: {
    color: '#4ade80',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  quickStartSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  rotatingPromptCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 100, // Fixed height to prevent shifting
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  promptGradient: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    height: 100, // Fixed height matching card
  },
  promptIconContainer: {
    marginRight: 16,
  },
  promptIconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  promptTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  rotatingPromptText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 24,
  },
  promptHint: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  promptArrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeIndicator: {
    backgroundColor: '#ffffff',
    width: 24,
  },
  journalCard: {
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  manifestationCard: {
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardGradient: {
    padding: 24,
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  characterCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  savedBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savedBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  clearButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  clearButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 160,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    marginBottom: 24,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  transformButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  transformButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  manifestationContent: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  manifestationText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  manifestationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#475569',
  },
  tipsSection: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tipsGradient: {
    padding: 24,
  },
  tipsTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 40,
  },
});