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
  ChevronRight,
  Volume2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storageService } from '../../lib/storage';
import { audioService } from '../../lib/audio';
import { testTTSFunction, testEdgeFunctionDeployment } from '../../lib/testTTS';
import type { Database } from '../../lib/supabase';
import GradientBackground from '../../components/GradientBackground';
import AnimatedButton from '../../components/AnimatedButton';
import AudioPlayer from '../../components/AudioPlayer';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

type Manifestation = Database['public']['Tables']['manifestations']['Row'];

const DURATION_OPTIONS = [
  { value: 3, label: '3 minutes', description: 'Quick session', icon: Clock },
  { value: 10, label: '10 minutes', description: 'Standard session', icon: Clock },
  { value: 30, label: '30 minutes', description: 'Deep session', icon: Clock },
  { value: 60, label: '60 minutes', description: 'Extended session', icon: Clock },
];

const MUSIC_STYLES = [
  { id: 'nature', name: 'Nature Sounds', filename: 'nature_sounds.mp3', description: 'Peaceful forest ambience' },
  { id: 'meditation', name: 'Meditation Bells', filename: 'meditation_bells.mp3', description: 'Calming bell tones' },
  { id: 'ambient', name: 'Ambient Waves', filename: 'ambient_waves.mp3', description: 'Gentle ocean waves' },
];

export default function AudioTab() {
  const [manifestations, setManifestations] = useState<Manifestation[]>([]);
  const [favorites, setFavorites] = useState<Manifestation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [durationMins, setDurationMins] = useState(10);
  const [musicStyle, setMusicStyle] = useState('nature');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isLooping, setIsLooping] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debugMsg, setDebugMsg] = useState<string | null>(null);
  const [showFAB, setShowFAB] = useState(true);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(50)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
    loadManifestations();
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
          if ((global as any).hideTabBar) {
            (global as any).hideTabBar();
          }
        } else if (!isScrollingDown) {
          setShowFAB(true);
          if ((global as any).showTabBar) {
            (global as any).showTabBar();
          }
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

  async function loadManifestations() {
    try {
      const data = await storageService.getManifestations();
      setManifestations(data);
      const favs = data.filter(m => m.is_favorite);
      setFavorites(favs);
      if (!favs.length) {
        setErrorMsg('Mark some manifestations as favorites first.');
        setTimeout(() => setErrorMsg(null), 5000);
      }
    } catch {
      setErrorMsg('Failed to load manifestations');
      setTimeout(() => setErrorMsg(null), 3000);
    }
  }

  function toggle(id: string) {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  }

  async function generateAudio() {
    if (!selectedIds.size) {
      setErrorMsg('Please select at least one manifestation');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    setIsGenerating(true);
    try {
      const texts = favorites.filter(m => selectedIds.has(m.id)).map(m => m.transformed_text);
      const ttsUrl = await audioService.generatePersonalizedAudio({
        manifestationTexts: texts,
        duration: durationMins,
        musicStyle,
      });
      setGeneratedUrl(ttsUrl);

      // grab background track URL
      const styleObj = MUSIC_STYLES.find(s => s.id === musicStyle)!;
      const { data: bgData, error: bgError } = supabase
        .storage
        .from('audio-files')
        .getPublicUrl(styleObj.filename);
      if (bgError) throw bgError;
      setBackgroundUrl(bgData.publicUrl);

      // config for player
      const secs = audioService.getAudioDuration();
      setTotalSeconds(secs);
      setIsLooping(audioService.isSeamlessLoop());
      setSuccessMsg('Your personalized audio is ready!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setShowPlayer(true);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to generate audio');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  }

  const getTotalManifestations = () => manifestations.length;
  const getFavoriteCount = () => favorites.length;
  const getSelectedCount = () => selectedIds.size;

  return (
    <GradientBackground colors={['#a855f7', '#7c3aed', '#6366f1']}>
      <View style={styles.container}>
        {/* Hero Header */}
        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: fade,
              transform: [{ translateY: slide }],
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
            <Text style={styles.logoSubtext}>Transform manifestations into immersive soundscapes</Text>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statGradient}
              >
                <Text style={styles.statNumber}>{getTotalManifestations()}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statGradient}
              >
                <Text style={styles.statNumber}>{getFavoriteCount()}</Text>
                <Text style={styles.statLabel}>Favorites</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statGradient}
              >
                <Text style={styles.statNumber}>{getSelectedCount()}</Text>
                <Text style={styles.statLabel}>Selected</Text>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>

        {/* Status Messages */}
        {errorMsg && (
          <Animated.View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </Animated.View>
        )}
        
        {successMsg && (
          <Animated.View style={styles.successContainer}>
            <Text style={styles.successText}>{successMsg}</Text>
          </Animated.View>
        )}

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Manifestation Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Heart size={20} color="#ffffff" strokeWidth={1.5} />
              <Text style={styles.sectionTitle}>Select Manifestations</Text>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={() => {
                  const all = favorites.map(m => m.id);
                  setSelectedIds(s => s.size === all.length ? new Set() : new Set(all));
                }}
              >
                <Text style={styles.selectAllText}>
                  {selectedIds.size === favorites.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>

            {favorites.length > 0 ? (
              favorites.map((manifestation, index) => (
                <ManifestationCard
                  key={manifestation.id}
                  manifestation={manifestation}
                  isSelected={selectedIds.has(manifestation.id)}
                  onToggle={() => toggle(manifestation.id)}
                  index={index}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Heart size={32} color="rgba(255, 255, 255, 0.6)" strokeWidth={1.5} />
                <Text style={styles.emptyText}>No favorite manifestations</Text>
                <Text style={styles.emptySubtext}>
                  Mark some manifestations as favorites in your library to create personalized audio
                </Text>
              </View>
            )}
          </View>

          {/* Duration Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color="#ffffff" strokeWidth={1.5} />
              <Text style={styles.sectionTitle}>Session Duration</Text>
            </View>
            
            <View style={styles.optionsGrid}>
              {DURATION_OPTIONS.map((option) => (
                <DurationCard
                  key={option.value}
                  option={option}
                  isSelected={durationMins === option.value}
                  onSelect={() => setDurationMins(option.value)}
                />
              ))}
            </View>
          </View>

          {/* Music Style Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Music size={20} color="#ffffff" strokeWidth={1.5} />
              <Text style={styles.sectionTitle}>Background Music</Text>
            </View>
            
            <View style={styles.musicGrid}>
              {MUSIC_STYLES.map((style) => (
                <MusicStyleCard
                  key={style.id}
                  style={style}
                  isSelected={musicStyle === style.id}
                  onSelect={() => setMusicStyle(style.id)}
                />
              ))}
            </View>
          </View>

          {/* Generate Button */}
          <View style={styles.generateSection}>
            <AnimatedButton 
              onPress={generateAudio} 
              disabled={isGenerating || selectedIds.size === 0}
              style={[
                styles.generateButton,
                (isGenerating || selectedIds.size === 0) && styles.generateButtonDisabled
              ]}
            >
              <LinearGradient
                colors={
                  isGenerating || selectedIds.size === 0 
                    ? ['#6b7280', '#4b5563'] 
                    : ['#10b981', '#059669']
                }
                style={styles.generateButtonGradient}
              >
                <View style={styles.generateButtonContent}>
                  {isGenerating ? (
                    <>
                      <Volume2 size={20} color="#ffffff" strokeWidth={1.5} />
                      <Text style={styles.generateButtonText}>Generating Audio...</Text>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} color="#ffffff" strokeWidth={1.5} />
                      <Text style={styles.generateButtonText}>Generate Personalized Audio</Text>
                      <ChevronRight size={20} color="#ffffff" strokeWidth={1.5} />
                    </>
                  )}
                </View>
              </LinearGradient>
            </AnimatedButton>
          </View>

          {/* Bottom padding for tab bar */}
          <View style={styles.bottomPadding} />
        </Animated.ScrollView>

        {/* Audio Player Modal */}
        <Modal visible={showPlayer} animationType="slide" presentationStyle="pageSheet">
          <GradientBackground colors={['#a855f7', '#7c3aed']}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.modalBackButton}
                  onPress={() => setShowPlayer(false)}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                    style={styles.modalBackButtonGradient}
                  >
                    <ArrowLeft size={24} color="#ffffff" strokeWidth={1.5} />
                  </LinearGradient>
                </TouchableOpacity>
                
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Your Personalized Audio</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedIds.size} manifestation{selectedIds.size > 1 ? 's' : ''} • {durationMins} minutes
                  </Text>
                </View>

                <TouchableOpacity style={styles.modalActionButton}>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                    style={styles.modalActionButtonGradient}
                  >
                    <Download size={20} color="#ffffff" strokeWidth={1.5} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              
              {generatedUrl && (
                <AudioPlayer
                  audioUrl={generatedUrl}
                  backgroundUrl={backgroundUrl!}
                  isLooping={isLooping}
                  title="Your Personalized Audio Session"
                  style={styles.audioPlayer}
                />
              )}
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
  index: number;
}

function ManifestationCard({ manifestation, isSelected, onToggle, index }: ManifestationCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <TouchableOpacity
        style={[styles.manifestationCard, isSelected && styles.manifestationCardSelected]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={
            isSelected 
              ? ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.2)']
              : ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']
          }
          style={styles.manifestationCardGradient}
        >
          <View style={styles.manifestationCardContent}>
            <Text numberOfLines={2} style={styles.manifestationText}>
              {manifestation.transformed_text}
            </Text>
            <View style={styles.manifestationCardFooter}>
              <Text style={styles.manifestationDate}>
                {new Date(manifestation.created_at).toLocaleDateString()}
              </Text>
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Check size={16} color="#10b981" strokeWidth={2} />
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface DurationCardProps {
  option: typeof DURATION_OPTIONS[0];
  isSelected: boolean;
  onSelect: () => void;
}

function DurationCard({ option, isSelected, onSelect }: DurationCardProps) {
  const IconComponent = option.icon;
  
  return (
    <TouchableOpacity
      style={[styles.durationCard, isSelected && styles.durationCardSelected]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={
          isSelected 
            ? ['rgba(168, 85, 247, 0.3)', 'rgba(168, 85, 247, 0.2)']
            : ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']
        }
        style={styles.durationCardGradient}
      >
        <View style={[styles.durationIconContainer, isSelected && styles.durationIconSelected]}>
          <IconComponent size={20} color={isSelected ? "#a855f7" : "rgba(255, 255, 255, 0.8)"} strokeWidth={1.5} />
        </View>
        <Text style={[styles.durationLabel, isSelected && styles.durationLabelSelected]}>
          {option.label}
        </Text>
        <Text style={styles.durationDescription}>{option.description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

interface MusicStyleCardProps {
  style: typeof MUSIC_STYLES[0];
  isSelected: boolean;
  onSelect: () => void;
}

function MusicStyleCard({ style, isSelected, onSelect }: MusicStyleCardProps) {
  return (
    <TouchableOpacity
      style={[styles.musicCard, isSelected && styles.musicCardSelected]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={
          isSelected 
            ? ['rgba(168, 85, 247, 0.3)', 'rgba(168, 85, 247, 0.2)']
            : ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']
        }
        style={styles.musicCardGradient}
      >
        <View style={[styles.musicIconContainer, isSelected && styles.musicIconSelected]}>
          <Music size={24} color={isSelected ? "#a855f7" : "rgba(255, 255, 255, 0.8)"} strokeWidth={1.5} />
        </View>
        <Text style={[styles.musicName, isSelected && styles.musicNameSelected]}>
          {style.name}
        </Text>
        <Text style={styles.musicDescription}>{style.description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 32,
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
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginLeft: 12,
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  selectAllButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  selectAllText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
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
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
  },
  manifestationCardGradient: {
    padding: 20,
  },
  manifestationCardContent: {
    gap: 12,
  },
  manifestationText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    lineHeight: 24,
  },
  manifestationCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manifestationDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsGrid: {
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
    shadowColor: '#a855f7',
    shadowOpacity: 0.3,
  },
  durationCardGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  durationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  durationIconSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
  },
  durationLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  durationLabelSelected: {
    color: '#ffffff',
  },
  durationDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  musicGrid: {
    gap: 16,
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
    shadowColor: '#a855f7',
    shadowOpacity: 0.3,
  },
  musicCardGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  musicIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicIconSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
  },
  musicName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  musicNameSelected: {
    color: '#ffffff',
  },
  musicDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    flex: 1,
  },
  generateSection: {
    marginTop: 20,
  },
  generateButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  generateButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  bottomPadding: {
    height: 40,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  modalBackButton: {
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
  modalBackButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  modalActionButton: {
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
  modalActionButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPlayer: {
    flex: 1,
    margin: 20,
  },
});