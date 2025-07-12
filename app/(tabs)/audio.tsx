// app/(tabs)/audio.tsx
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
import {
  Headphones,
  Play,
  Pause,
  Square,
  Clock,
  Music,
  Sparkles,
  Check,
  ArrowLeft,
  Download,
  Heart,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storageService } from '../../lib/storage';
import { audioService } from '../../lib/audio';
import { testTTSFunction, testEdgeFunctionDeployment } from '../../lib/testTTS';
import type { Database } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import GradientBackground from '../../components/GradientBackground';
import AnimatedButton from '../../components/AnimatedButton';
import AudioPlayer from '../../components/AudioPlayer';

const { width } = Dimensions.get('window');

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
    filename: 'nature_sounds.mp3',
  },
  {
    id: 'meditation',
    name: 'Meditation Bells',
    description: 'Soft Tibetan singing bowls',
    filename: 'meditation_bells.mp3',
  },
  {
    id: 'ambient',
    name: 'Ambient Waves',
    description: 'Peaceful ocean waves',
    filename: 'ambient_waves.mp3',
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
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState(true);
  const [audioConfig, setAudioConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
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
        setError(
          'You need to mark some manifestations as favorites first. Visit your Library to add favorites.'
        );
      }
    } catch (e) {
      console.error('Error loading manifestations:', e);
      setError('Failed to load manifestations');
    } finally {
      setLoading(false);
    }
  };

  const toggleManifestationSelection = (id: string) => {
    const newSet = new Set(selectedManifestations);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedManifestations(newSet);
  };

  const selectAllManifestations = () => {
    if (selectedManifestations.size === favoriteManifestations.length) {
      setSelectedManifestations(new Set());
    } else {
      setSelectedManifestations(new Set(favoriteManifestations.map(m => m.id)));
    }
  };

  const runTTSTest = async () => {
    setDebugInfo('Running TTS test...');
    setError(null);
    try {
      const result = await testTTSFunction();
      if (result.success) {
        setSuccess('✅ TTS test successful! The Edge Function is working.');
        setDebugInfo(`Audio generated successfully. Size: ${result.audioSize} bytes`);
        if (result.playAudio) setTimeout(() => result.playAudio(), 1000);
      } else {
        setError(`❌ TTS test failed: ${result.error}`);
        setDebugInfo(`Error details: ${JSON.stringify(result.details, null, 2)}`);
      }
    } catch (e: any) {
      setError(`❌ TTS test exception: ${e.message || 'Unknown error'}`);
    }
    setTimeout(() => {
      setSuccess(null);
      setError(null);
      setDebugInfo(null);
    }, 10000);
  };

  const checkDeployment = async () => {
    setDebugInfo('Checking Edge Function deployment...');
    setError(null);
    try {
      const result = await testEdgeFunctionDeployment();
      if (result.deployed && result.accessible) {
        setSuccess('✅ Edge Function is deployed and accessible');
        setDebugInfo('The openai-tts function is properly deployed');
      } else {
        setError(`❌ Edge Function deployment issue: Status ${result.status || 'unknown'}`);
      }
    } catch (e: any) {
      setError(`❌ Deployment check failed: ${e.message || 'Unknown error'}`);
    }
    setTimeout(() => {
      setSuccess(null);
      setError(null);
      setDebugInfo(null);
    }, 8000);
  };

  // ─────────────────────────────────────────────────────────────────
  // ─── UPDATED generateAudio ────────────────────────────────────────
  const generateAudio = async () => {
    if (selectedManifestations.size === 0) {
      setError('Please select at least one manifestation');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      // 1) Build your TTS texts
      const selectedTexts = favoriteManifestations
        .filter(m => selectedManifestations.has(m.id))
        .map(m => m.transformed_text);

      // 2) Generate & upload TTS
      const audioUrl = await audioService.generatePersonalizedAudio({
        manifestationTexts: selectedTexts,
        duration: selectedDuration,
        musicStyle: selectedMusicStyle,
      });

      // 3) Save the TTS URL in state
      setGeneratedAudioUrl(audioUrl);

      // ─── NEW: fetch the chosen background music file ───
      const styleObj = MUSIC_STYLES.find(s => s.id === selectedMusicStyle)!;
      const {
        data: { publicUrl: bgUrl },
      } = supabase.storage.from('audio-files').getPublicUrl(styleObj.filename);
      setBackgroundUrl(bgUrl);
      // ───────────────────────────────────────────────────────

      // 4) Retrieve duration/config and show player
      const actualDuration = audioService.getAudioDuration(audioUrl);
      const config = audioService.parseAudioConfig(audioUrl);
      setTotalDuration(actualDuration);
      setAudioConfig(config);
      setIsLooping(audioService.isSeamlessLoop(audioUrl));

      setShowPlayer(true);
      setSuccess('✨ Your personalized audio is ready!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error('Error generating audio:', e);
      setError('Failed to generate audio. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────

  const togglePlayback = () => {
    if (isPlaying) {
      clearInterval(playbackTimerRef.current!);
      playbackTimerRef.current = null;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playbackTimerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 1;
          if (next >= totalDuration) {
            if (isLooping) return 0;
            clearInterval(playbackTimerRef.current!);
            playbackTimerRef.current = null;
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 1000);
    }
  };

  const stopPlayback = () => {
    clearInterval(playbackTimerRef.current!);
    playbackTimerRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  useEffect(() => {
    return () => {
      clearInterval(playbackTimerRef.current!);
    };
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => (totalDuration ? (currentTime / totalDuration) * 100 : 0);

  if (loading) {
    return (
      <GradientBackground colors={['#a855f7', '#7c3aed', '#6366f1']}>
        <View style={styles.loadingContainer}>
          <Headphones size={48} color="#fff" />
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
          style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.logoContainer}>
            <LinearGradient colors={['#fff', '#f8fafc']} style={styles.logoBackground}>
              <Headphones size={32} color="#a855f7" />
            </LinearGradient>
            <Text style={styles.logoText}>Personalized Audio</Text>
            <Text style={styles.logoSubtext}>
              Transform your manifestations into guided audio
            </Text>
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
        {debugInfo && (
          <Animated.View style={styles.debugContainer}>
            <Text style={styles.debugText}>{debugInfo}</Text>
          </Animated.View>
        )}

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {favoriteManifestations.length === 0 ? (
            <View style={styles.emptyState}>
              {/* Debug Section */}
              <View style={styles.debugSection}>
                <Text style={styles.debugSectionTitle}>🛠️ Troubleshooting</Text>
                <Text style={styles.debugSectionSubtitle}>
                  Test the TTS service to diagnose any issues
                </Text>
                <View style={styles.debugButtons}>
                  <AnimatedButton onPress={checkDeployment} style={styles.debugButton}>
                    <LinearGradient
                      colors={['rgba(59,130,246,0.8)', 'rgba(37,99,235,0.8)']}
                      style={styles.debugButtonGradient}
                    >
                      <Text style={styles.debugButtonText}>Check Deployment</Text>
                    </LinearGradient>
                  </AnimatedButton>
                  <AnimatedButton onPress={runTTSTest} style={styles.debugButton}>
                    <LinearGradient
                      colors={['rgba(16,185,129,0.8)', 'rgba(5,150,105,0.8)']}
                      style={styles.debugButtonGradient}
                    >
                      <Text style={styles.debugButtonText}>Test TTS</Text>
                    </LinearGradient>
                  </AnimatedButton>
                </View>
              </View>
              <Heart size={48} color="rgba(255,255,255,0.6)" />
              <Text style={styles.emptyTitle}>No Favorite Manifestations</Text>
              <Text style={styles.emptySubtitle}>
                Mark some manifestations as favorites in your Library to create personalized audio
                sessions.
              </Text>
            </View>
          ) : (
            <>
              {/* Manifestation Selection, Duration, Music Style & Generate Button */}
              {/* ...your existing jsx here unchanged... */}
            </>
          )}
        </ScrollView>

        {/* Audio Player Modal */}
        <Modal visible={showPlayer} animationType="slide" presentationStyle="pageSheet">
          <GradientBackground colors={['#a855f7', '#7c3aed']}>
            <View style={styles.playerContainer}>
              <View style={styles.playerHeader}>
                <TouchableOpacity style={styles.closePlayerButton} onPress={() => setShowPlayer(false)}>
                  <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.playerTitleContainer}>
                  <Text style={styles.playerTitle}>Your Personalized Audio</Text>
                  <Text style={styles.playerSubtitle}>
                    {selectedManifestations.size} manifestation
                    {selectedManifestations.size > 1 ? 's' : ''} • {selectedDuration} minutes •{' '}
                    {isLooping ? 'Looping' : 'Single Play'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.downloadButton}>
                  <Download size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* ← UPDATED: pass both audio and background */}
             {generatedAudioUrl && backgroundUrl && (
  <AudioPlayer
    audioUrl={generatedAudioUrl}
    backgroundUrl={backgroundUrl}
    title="Your Personalized Audio"
    isLooping={isLooping}
    style={styles.audioPlayerContainer}
                />
              )}
            </View>
          </GradientBackground>
        </Modal>
      </View>
    </GradientBackground>
  );
}

// ... rest of your ManifestationCard and styles unchanged ...

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
  debugContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  debugText: {
    color: '#60a5fa',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  debugSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  debugSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  debugSectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  debugButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  debugButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  debugButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  debugButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  compactDebugSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  compactDebugTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 12,
  },
  compactDebugButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  compactDebugButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  compactDebugButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
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
  musicInfo: {
    flex: 1,
    marginLeft: 16,
  },
  musicName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  musicDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
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
    position: 'relative',
  },
  loopIndicator: {
    position: 'absolute',
    right: 8,
    top: -20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  loopText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
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
  audioInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  audioInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
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
  audioPlayerContainer: {
    flex: 1,
    margin: 0,
    backgroundColor: 'transparent',
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