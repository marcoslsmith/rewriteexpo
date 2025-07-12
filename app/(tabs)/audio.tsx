// tabs/audio.tsx
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
import GradientBackground from '../../components/GradientBackground';
import AnimatedButton from '../../components/AnimatedButton';
import AudioPlayer from '../../components/AudioPlayer';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

type Manifestation = Database['public']['Tables']['manifestations']['Row'];

const DURATION_OPTIONS = [
  { value: 3, label: '3 minutes', description: 'Quick session' },
  { value: 10, label: '10 minutes', description: 'Standard session' },
  { value: 30, label: '30 minutes', description: 'Deep session' },
  { value: 60, label: '60 minutes', description: 'Extended session' },
];

const MUSIC_STYLES = [
  { id: 'nature', name: 'Nature Sounds', filename: 'nature_sounds.mp3' },
  { id: 'meditation', name: 'Meditation Bells', filename: 'meditation_bells.mp3' },
  { id: 'ambient', name: 'Ambient Waves', filename: 'ambient_waves.mp3' },
];

export default function AudioTab() {
  const [manifestations, setManifestations] = useState<Manifestation[]>([]);
  const [favorites, setFavorites] = useState<Manifestation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [durationMins, setDurationMins] = useState(10);
  const [musicStyle, setMusicStyle] = useState('nature');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string| null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string| null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isLooping, setIsLooping] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string| null>(null);
  const [errorMsg, setErrorMsg] = useState<string| null>(null);
  const [debugMsg, setDebugMsg] = useState<string| null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
    loadManifestations();
  }, []);

  async function loadManifestations() {
    try {
      const data = await storageService.getManifestations();
      setManifestations(data);
      const favs = data.filter(m => m.is_favorite);
      setFavorites(favs);
      if (!favs.length) {
        setErrorMsg('Mark some manifestations as favorites first.');
      }
    } catch {
      setErrorMsg('Failed to load manifestations');
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
      return setTimeout(() => setErrorMsg(null), 3000);
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
      const secs = audioService.getAudioDuration(ttsUrl);
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

  return (
    <GradientBackground colors={['#a855f7','#7c3aed','#6366f1']}>
      <View style={styles.header}>
        <Animated.View style={{ opacity: fade, transform:[{ translateY: slide }] }}>
          <Headphones size={48} color="#fff" />
          <Text style={styles.title}>Personalized Audio</Text>
          <Text style={styles.sub}>Transform your manifestations into audio</Text>
        </Animated.View>

        {errorMsg   && <Text style={styles.error}>{errorMsg}</Text>}
        {successMsg && <Text style={styles.success}>{successMsg}</Text>}
        {debugMsg   && <Text style={styles.debug}>{debugMsg}</Text>}

        <ScrollView contentContainerStyle={styles.content}>
          <Section label="Select Manifestations">
            <TouchableOpacity onPress={() => {
              const all = favorites.map(m => m.id);
              setSelectedIds(s => s.size === all.length ? new Set() : new Set(all));
            }}>
              <Text style={styles.link}>{ selectedIds.size === favorites.length ? 'Deselect All' : 'Select All' }</Text>
            </TouchableOpacity>
            {favorites.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.card, selectedIds.has(m.id) && styles.cardSel]}
                onPress={()=>toggle(m.id)}
              >
                <Text numberOfLines={2} style={styles.cardText}>{m.transformed_text}</Text>
                {selectedIds.has(m.id) && <Check size={16} color="#10b981" />}
              </TouchableOpacity>
            ))}
          </Section>

          <Section label="Duration">
            {DURATION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.opt, durationMins===opt.value&&styles.optSel]}
                onPress={()=>setDurationMins(opt.value)}
              >
                <Text>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </Section>

          <Section label="Background Music">
            {MUSIC_STYLES.map(s=>(
              <TouchableOpacity
                key={s.id}
                style={[styles.opt, musicStyle===s.id&&styles.optSel]}
                onPress={()=>setMusicStyle(s.id)}
              >
                <Music size={20} /><Text>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </Section>

          <AnimatedButton onPress={generateAudio} disabled={isGenerating} style={styles.genBtn}>
            <Text style={{ color:'#fff' }}>{isGenerating ? 'Generating...' : 'Generate Audio'}</Text>
          </AnimatedButton>
        </ScrollView>
      </View>

      <Modal visible={showPlayer} animationType="slide">
        <GradientBackground colors={['#a855f7','#7c3aed']}>
          <View style={styles.playerHeader}>
            <TouchableOpacity onPress={()=>setShowPlayer(false)}><ArrowLeft size={24} color="#fff" /></TouchableOpacity>
            <Text style={styles.playerTitle}>Your Personalized Audio</Text>
            <TouchableOpacity><Download size={20} color="#fff" /></TouchableOpacity>
          </View>
          {generatedUrl && (
            <AudioPlayer
              audioUrl={generatedUrl}
              backgroundUrl={backgroundUrl!}
              isLooping={isLooping}
              title="Your Audio"
              style={styles.player}
            />
          )}
        </GradientBackground>
      </Modal>
    </GradientBackground>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginVertical:12 }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flex:1, padding:20 },
  title: { fontSize:24, color:'#fff', fontWeight:'bold', marginTop:12 },
  sub:   { color:'rgba(255,255,255,0.8)', marginBottom:16 },
  error: { color:'#f66', textAlign:'center' },
  success:{ color:'#4ade80', textAlign:'center' },
  debug: { color:'#60a5fa', textAlign:'center' },
  content:{ paddingBottom:80 },
  sectionLabel:{ color:'#fff', fontWeight:'600', marginBottom:8 },
  card:{ backgroundColor:'rgba(255,255,255,0.1)', padding:12, marginBottom:8, borderRadius:8, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  cardSel:{ backgroundColor:'rgba(16,185,129,0.2)' },
  cardText:{ color:'#fff' },
  opt:{ padding:8, backgroundColor:'rgba(255,255,255,0.1)', marginRight:8, borderRadius:6, flexDirection:'row', alignItems:'center' },
  optSel:{ backgroundColor:'rgba(255,255,255,0.2)' },
  link:{ color:'#60a5fa', marginBottom:8 },
  genBtn:{ backgroundColor:'#10b981', padding:14, borderRadius:10, alignItems:'center', marginTop:12 },
  playerHeader:{ flexDirection:'row', alignItems:'center', padding:20, justifyContent:'space-between' },
  playerTitle:{ color:'#fff', fontSize:18 },
  player:{ flex:1 },
});
