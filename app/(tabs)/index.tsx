import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { Sparkles, Save, Plus } from 'lucide-react-native';
import { transformJournalEntry } from '../../lib/ai';
import { storageService } from '../../lib/storage';
import { getGreeting, getMotivationalGreeting } from '../../lib/greetings';
import GradientBackground from '../../components/GradientBackground';
import AnimatedButton from '../../components/AnimatedButton';
import LoadingShimmer from '../../components/LoadingShimmer';
import FloatingActionButton from '../../components/FloatingActionButton';

const { width } = Dimensions.get('window');

export default function Journal() {
  const [journalEntry, setJournalEntry] = useState('');
  const [transformedText, setTransformedText] = useState('');
  const [isTransforming, setIsTransforming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFAB, setShowFAB] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

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
      setError(null);
    } catch (error) {
      setError('Failed to transform your entry. Please check your connection and try again.');
      console.error('Transformation error:', error);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsTransforming(false);
    }
  };

  const handleSave = async () => {
    if (!transformedText.trim()) {
      setError('Please transform your journal entry first.');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      await storageService.addManifestation({
        original_entry: journalEntry,
        transformed_text: transformedText,
        is_favorite: false,
        tags: [],
      });
      
      setSuccess('Your manifestation has been saved!');
      
      setJournalEntry('');
      setTransformedText('');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to save your manifestation. Please try again.');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GradientBackground colors={['#fefbff', '#f8fafc', '#f1f5f9']}>
      <View style={styles.container}>
        <FloatingActionButton visible={showFAB} />
        
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.title}>How are you feeling today?</Text>
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

          {/* Journal Entry Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Plus size={20} color="#64748b" strokeWidth={1.5} />
              <Text style={styles.cardTitle}>New Entry</Text>
            </View>
            
            <TextInput
              style={styles.textInput}
              onScroll={handleScroll}
              multiline
              textAlignVertical="top"
            />
            
            <View style={styles.brandHeader}>
              <Text style={styles.brandTitle}>The Rewrite</Text>
            </View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.title}>{getMotivationalGreeting()}</Text>
            <TouchableOpacity
              onPress={handleTransform}
              disabled={isTransforming}
            >
              {isTransforming ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Sparkles size={18} color="#ffffff" strokeWidth={1.5} />
              )}
              <Text style={styles.buttonText}>
                {isTransforming ? 'Transforming...' : 'Transform with AI'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Manifestation Result */}
          {transformedText ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Sparkles size={20} color="#2563eb" strokeWidth={1.5} />
                <Text style={styles.cardTitle}>Your Manifestation</Text>
              </View>
              
              <View style={styles.manifestationCard}>
                <Text style={styles.manifestationText}>{transformedText}</Text>
              </View>
              
              <AnimatedButton
                onPress={handleSave}
                disabled={isSaving}
                style={[styles.button, styles.saveButton]}
              >
                <View style={styles.buttonContent}>
                  {isSaving ? (
                    <LoadingShimmer width={18} height={18} borderRadius={9} />
                  ) : (
                    <Save size={18} color="#ffffff" strokeWidth={1.5} />
                  )}
                  <Text style={styles.buttonText}>
                    {isSaving ? 'Saving...' : 'Save to Library'}
                  </Text>
                </View>
              </AnimatedButton>
            </View>
          ) : null}

          {/* Tips Section */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Writing Tips</Text>
            <View style={styles.tipsList}>
              <Text style={styles.tipText}>✨ Be honest about your current thoughts and feelings</Text>
              <Text style={styles.tipText}>💭 Share your challenges, fears, or limiting beliefs</Text>
              <Text style={styles.tipText}>🌟 Describe what you want to create or change</Text>
              <Text style={styles.tipText}>🚀 Let AI transform your words into empowering affirmations</Text>
            </View>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 32,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  greeting: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0f172a',
    lineHeight: 28,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
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
    borderRadius: 12,
    marginBottom: 20,
  },
  successText: {
    color: '#16a34a',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0f172a',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 140,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    marginBottom: 20,
    lineHeight: 24,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  transformButton: {
    backgroundColor: '#2563eb',
  },
  saveButton: {
    backgroundColor: '#059669',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  manifestationCard: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  manifestationText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tipsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0f172a',
    marginBottom: 16,
  },
  tipsList: {
    gap: 12,
  },
  tipText: {
    fontSize: 15,
    color: '#475569',
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 40,
  },
});