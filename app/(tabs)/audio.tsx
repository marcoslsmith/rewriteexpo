import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { Headphones, Play, Pause, Square, Volume2, Clock, Music, Sparkles, Check, X, ArrowLeft, Download, Heart, AudioWaveform as Waveform } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storageService } from '../../lib/storage';
import { audioService } from '../../lib/audio';
import type { Database } from '../../lib/supabase';
import GradientBackground from '../../components/GradientBackground';
import AnimatedButton from '../../components/AnimatedButton';

const { width, height } = Dimensions.get('window');

type Manifestation = Database['public']['Tables']['manifestations']['Row'];

const DURATION_OPTIONS = [
  { value: 3, label: '3 minutes', description: 'Quick session' },
  { value: 10, label: '10 minutes', description: 'Standard session' },
  { value: 30, label: '30 minutes', description: 'Deep session' },
  { value: 60, label: '60 minutes', description: 'Extended session' },
];

const MUSIC_STYLES = [
  { 
    id: 'nature', 
    name: 'Nature Sounds', 
    description: 'Gentle rain and forest ambience',
    url: 'https://www.soundjay.com/misc/sounds/rain-01.wav' // Placeholder
  },
  { 
    id: 'meditation', 
    name: 'Meditation Bells', 
    description: 'Soft Tibetan singing bowls',
    url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' // Placeholder
  },
  { 
    id: 'ambient', 
    name: 'Ambient Waves', 
    description: 'Peaceful ocean waves',
    url: 'https://www.soundjay.com/misc/sounds/ocean-wave-1.wav' // Placeholder
  },
];

export default function PersonalizedAudio() {
  const [manifestations, setManifestations] = useState<Manifestation[]>([]);
  const [favoriteManifestations, setFavoriteManifestations] = useState<Manifestation[]>([]);
  const [selectedManifestations, setSelectedManifestations] = useState<Set<string>>(new Set());
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [selectedMusicStyle, setSelectedMusicStyle] = useState('nature');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

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

  // Wave animation for audio visualization
  useEffect(() => {
    if (isPlaying) {
      const waveAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      waveAnimation.start();
      return () => waveAnimation.stop();
    }
  }, [isPlaying]);

  useEffect(() => {
    loadManifestations();
  }, []);

  const loadManifestations = async () => {
    setLoading(true);
    try {
      const data = await storageService.getManifestations();
      setManifestations(data);
      const favorites = data.filter(m => m.is_favorite);
      setFavoriteManifestations(favorites);
      
      if (favorites.length === 0) {
        setError('You need to mark some manifestations as favorites first. Visit your Library to add favorites.');
      }
    } catch (error) {
      console.error('Error loading manifestations:', error);
      setError('Failed to load manifestations');
    } finally {
      setLoading(false);
    }
  };

  const toggleManifestationSelection = (id: string) => {
    const newSelection = new Set(selectedManifestations);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedManifestations(newSelection);
  };

  const selectAllManifestations = () => {
    if (selectedManifestations.size === favoriteManifestations.length) {
      setSelectedManifestations(new Set());
    } else {
      setSelectedManifestations(new Set(favoriteManifestations.map(m => m.id)));
    }
  };

  const generateAudio = async () => {
    if (selectedManifestations.size === 0) {
      setError('Please select at least one manifestation');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const selectedTexts = favoriteManifestations
        .filter(m => selectedManifestations.has(m.id))
        .map(m => m.transformed_text);

      const audioUrl = await audioService.generatePersonalizedAudio({
        manifestationTexts: selectedTexts,
        duration: selectedDuration,
        musicStyle: selectedMusicStyle,
      });

      setGeneratedAudioUrl(audioUrl);
      setTotalDuration(selectedDuration * 60); // Convert to seconds
      setShowPlayer(true);
      setSuccess('✨ Your personalized audio is ready!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error generating audio:', error);
      setError('Failed to generate audio. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      // Pause audio
      setIsPlaying(false);
    } else {
      // Play audio
      setIsPlaying(true);
      // Start timer simulation
      const timer = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            clearInterval(timer);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (totalDuration === 0) return 0;
    return (currentTime / totalDuration) * 100;
  };

  if (loading) {
    return (
      <GradientBackground colors={['#a855f7', '#7c3aed', '#6366f1']}>
        <View style={styles.loadingContainer}>
          <Headphones size={48} color="#ffffff" strokeWidth={1.5} />
          <Text style={styles.loadingText}>Loading your manifestations...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground colors={['#a855f7', '#7c3aed', '#6366f1']}>
      <View style={styles.container}>
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
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#ffffff', '#f8fafc']}
              style={styles.logoBackground}
            >
              <Headphones size={32} color="#a855f7" strokeWidth={2} />
            </LinearGradient>
            <Text style={styles.logoText}>Personalized Audio</Text>
            <Text style={styles.logoSubtext}>Transform your manifestations into guided audio</Text>
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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {favoriteManifestations.length === 0 ? (
            <View style={styles.emptyState}>
              <Heart size={48} color="rgba(255, 255, 255, 0.6)" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No Favorite Manifestations</Text>
              <Text style={styles.emptySubtitle}>
                Mark some manifestations as favorites in your Library to create personalized audio sessions.
              </Text>
            </View>
          ) : (
            <>
              {/* Manifestation Selection */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Select Manifestations</Text>
                  <TouchableOpacity
                    style={styles.selectAllButton}
                    onPress={selectAllManifestations}
                  >
                    <Text style={styles.selectAllText}>
                      {selectedManifestations.size === favoriteManifestations.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {favoriteManifestations.map((manifestation) => (
                  <ManifestationCard
                    key={manifestation.id}
                    manifestation={manifestation}
                    isSelected={selectedManifestations.has(manifestation.id)}
                    onToggle={() => toggleManifestationSelection(manifestation.id)}
                  />
                ))}
              </View>

              {/* Duration Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Audio Duration</Text>
                <View style={styles.durationGrid}>
                  {DURATION_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.durationCard,
                        selectedDuration === option.value && styles.durationCardSelected
                      ]}
                      onPress={() => setSelectedDuration(option.value)}
                    >
                      <LinearGradient
                        colors={selectedDuration === option.value 
                          ? ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.2)']
                          : ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']
                        }
                        style={styles.durationGradient}
                      >
                        <Clock size={24} color="#ffffff" strokeWidth={1.5} />
                        <Text style={styles.durationLabel}>{option.label}</Text>
                        <Text style={styles.durationDescription}>{option.description}</Text>
                        {selectedDuration === option.value && (
                          <View style={styles.selectedIndicator}>
                            <Check size={16} color="#ffffff" strokeWidth={2} />
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Music Style Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Background Music</Text>
                <View style={styles.musicGrid}>
                  {MUSIC_STYLES.map((style) => (
                    <TouchableOpacity
                      key={style.id}
                      style={[
                        styles.musicCard,
                        selectedMusicStyle === style.id && styles.musicCardSelected
                      ]}
                      onPress={() => setSelectedMusicStyle(style.id)}
                    >
                      <LinearGradient
                        colors={selectedMusicStyle === style.id 
                          ? ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.2)']
                          : ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']
                        }
                        style={styles.musicGradient}
                      >
                        <Music size={24} color="#ffffff" strokeWidth={1.5} />
                        <Text style={styles.musicName}>{style.name}</Text>
                        <Text style={styles.musicDescription}>{style.description}</Text>
                        {selectedMusicStyle === style.id && (
                          <View style={styles.selectedIndicator}>
                            <Check size={16} color="#ffffff" strokeWidth={2} />
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Generate Button */}
              <AnimatedButton
                onPress={generateAudio}
                disabled={isGenerating || selectedManifestations.size === 0}
                style={[
                  styles.generateButton,
                  (isGenerating || selectedManifestations.size === 0) && styles.generateButtonDisabled
                ]}
              >
                <LinearGradient
                  colors={selectedManifestations.size > 0 && !isGenerating 
                    ? ['#10b981', '#059669'] 
                    : ['#6b7280', '#4b5563']
                  }
                  style={styles.generateGradient}
                >
                  <View style={styles.generateContent}>
                    {isGenerating ? (
                      <>
                        <Animated.View style={{ transform: [{ rotate: '360deg' }] }}>
                          <Sparkles size={20} color="#ffffff" strokeWidth={1.5} />
                        </Animated.View>
                        <Text style={styles.generateText}>Generating Audio...</Text>
                      </>
                    ) : (
                      <>
                        <Headphones size={20} color="#ffffff" strokeWidth={1.5} />
                        <Text style={styles.generateText}>Generate Audio</Text>
                      </>
                    )}
                  </View>
                </LinearGradient>
              </AnimatedButton>
            </>
          )}
        </ScrollView>

        {/* Audio Player Modal */}
        <Modal
          visible={showPlayer}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <GradientBackground colors={['#a855f7', '#7c3aed']}>
            <View style={styles.playerContainer}>
              <View style={styles.playerHeader}>
                <TouchableOpacity
                  style={styles.closePlayerButton}
                  onPress={() => setShowPlayer(false)}
                >
                  <ArrowLeft size={24} color="#ffffff" strokeWidth={1.5} />
                </TouchableOpacity>
                
                <View style={styles.playerTitleContainer}>
                  <Text style={styles.playerTitle}>Your Personalized Audio</Text>
                  <Text style={styles.playerSubtitle}>
                    {selectedManifestations.size} manifestation{selectedManifestations.size > 1 ? 's' : ''} • {selectedDuration} minutes
                  </Text>
                </View>

                <TouchableOpacity style={styles.downloadButton}>
                  <Download size={20} color="#ffffff" strokeWidth={1.5} />
                </TouchableOpacity>
              </View>

              {/* Audio Visualization */}
              <View style={styles.visualizationContainer}>
                <Animated.View 
                  style={[
                    styles.waveform,
                    {
                      opacity: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                      transform: [{
                        scaleY: waveAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1.5],
                        })
                      }]
                    }
                  ]}
                >
                  <Waveform size={120} color="#ffffff" strokeWidth={1} />
                </Animated.View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${getProgressPercentage()}%` }
                    ]} 
                  />
                </View>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                  <Text style={styles.timeText}>{formatTime(totalDuration)}</Text>
                </View>
              </View>

              {/* Player Controls */}
              <View style={styles.playerControls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={stopPlayback}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
                    style={styles.controlGradient}
                  >
                    <Square size={20} color="#ffffff" strokeWidth={1.5} />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, styles.playButton]}
                  onPress={togglePlayback}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.playGradient}
                  >
                    {isPlaying ? (
                      <Pause size={32} color="#ffffff" strokeWidth={1.5} />
                    ) : (
                      <Play size={32} color="#ffffff" strokeWidth={1.5} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton}>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
                    style={styles.controlGradient}
                  >
                    <Volume2 size={20} color="#ffffff" strokeWidth={1.5} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </GradientBackground>
        </Modal>
      </View>
    </GradientBackground>
  );
}

interface ManifestationCardProps {
  manifestation: Manifestation;
  isSelected: boolean;
  onToggle: () => void;
}

function ManifestationCard({ manifestation, isSelected, onToggle }: ManifestationCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.manifestationCard,
        isSelected && styles.manifestationCardSelected
      ]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={isSelected 
          ? ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.2)']
          : ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']
        }
        style={styles.manifestationGradient}
      >
        <View style={styles.manifestationHeader}>
          <View style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected
          ]}>
            {isSelected && <Check size={16} color="#ffffff" strokeWidth={2} />}
          </View>
          <Heart size={16} color="#f59e0b" fill="#f59e0b" strokeWidth={1.5} />
        </View>
        
        <Text style={styles.manifestationText} numberOfLines={3}>
          {manifestation.transformed_text}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    textAlign: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
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
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
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
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#4ade80',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  selectAllButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  selectAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  manifestationCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  manifestationCardSelected: {
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  manifestationGradient: {
    padding: 16,
  },
  manifestationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  manifestationText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    lineHeight: 22,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  durationCard: {
    width: (width - 64) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  durationCardSelected: {
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  durationGradient: {
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  durationLabel: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  durationDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  musicGrid: {
    gap: 12,
  },
  musicCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  musicCardSelected: {
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  musicGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  musicName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginLeft: 16,
    flex: 1,
  },
  musicDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 16,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  generateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  generateText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  
  // Player Modal Styles
  playerContainer: {
    flex: 1,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  closePlayerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerTitleContainer: {
    flex: 1,
  },
  playerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  playerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  downloadButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualizationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  waveform: {
    opacity: 0.8,
  },
  progressContainer: {
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  playerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    paddingBottom: 120,
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
  controlGradient: {
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
  playGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});