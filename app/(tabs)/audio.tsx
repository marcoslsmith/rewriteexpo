import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import {
  Headphones,
  Clock,
  Music,
  Check,
  ArrowLeft,
  Download,
  Heart,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storageService } from '../lib/storage';
import { audioService } from '../lib/audio';
import AudioPlayer from '../components/AudioPlayer';
import GradientBackground from '../components/GradientBackground';
import AnimatedButton from '../components/AnimatedButton';
import type { Database } from '../lib/supabase';

const { width } = Dimensions.get('window');
type Manifestation = Database['public']['Tables']['manifestations']['Row'];

const DURATION_OPTIONS = [
  { value: 3,  label: '3 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '60 minutes' },
];

const MUSIC_STYLES = [
  { id: 'nature',     name: 'Nature Sounds' },
  { id: 'meditation', name: 'Meditation Bells' },
  { id: 'ambient',    name: 'Ambient Waves' },
];

export default function PersonalizedAudio() {
  const [favorites, setFavorites] = useState<Manifestation[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(10);
  const [music, setMusic] = useState('nature');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string| null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    storageService.getManifestations()
      .then(all => {
        const favs = all.filter(m => m.is_favorite);
        setFavorites(favs);
        if (!favs.length) {
          Alert.alert('No favorites', 'Mark some manifestations as favorites first.');
        }
      })
      .catch(() => Alert.alert('Error', 'Failed to load manifestations'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const generate = async () => {
    if (!selected.size) {
      Alert.alert('Pick at least one');
      return;
    }
    setGenerating(true);
    try {
      const texts = favorites
        .filter(m => selected.has(m.id))
        .map(m => m.transformed_text);
      const url = await audioService.generatePersonalizedAudio({
        manifestationTexts: texts,
        duration,
        musicStyle: music,
      });
      setAudioUrl(url);
      setShowPlayer(true);
    } catch {
      Alert.alert('Error', 'Failed to generate audio');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <GradientBackground colors={['#6366f1','#7c3aed','#a855f7']}>
        <View style={styles.loading}>
          <Headphones size={48} color="#fff" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground colors={['#6366f1','#7c3aed','#a855f7']}>
      <View style={styles.container}>
        <Text style={styles.title}>Your Manifestations</Text>
        <ScrollView style={styles.list}>
          {favorites.map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => toggle(m.id)}
              style={[
                styles.item,
                selected.has(m.id) && styles.itemSelected,
              ]}
            >
              <Heart size={16} color={selected.has(m.id) ? '#10b981' : '#fff'} />
              <Text style={styles.itemText} numberOfLines={2}>
                {m.transformed_text}
              </Text>
              {selected.has(m.id) && <Check size={16} color="#10b981" />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.row}>
          <Text style={styles.label}>Duration:</Text>
          {DURATION_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.value}
              onPress={() => setDuration(o.value)}
              style={[
                styles.option,
                duration === o.value && styles.optionSelected,
              ]}
            >
              <Text style={styles.optionText}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Music:</Text>
          {MUSIC_STYLES.map(s => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setMusic(s.id)}
              style={[
                styles.option,
                music === s.id && styles.optionSelected,
              ]}
            >
              <Text style={styles.optionText}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <AnimatedButton
          onPress={generate}
          disabled={generating || !selected.size}
          style={styles.generateBtn}
        >
          <LinearGradient
            colors={generating ? ['#6b7280','#4b5563'] : ['#10b981','#059669']}
            style={styles.generateGradient}
          >
            <Text style={styles.generateText}>
              {generating ? 'Generating…' : 'Generate Audio'}
            </Text>
          </LinearGradient>
        </AnimatedButton>
      </View>

      <Modal visible={showPlayer} animationType="slide">
        <GradientBackground colors={['#7c3aed','#a855f7']}>
          <View style={styles.playerHeader}>
            <TouchableOpacity onPress={() => setShowPlayer(false)}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.playerTitle}>Your Audio</Text>
            <TouchableOpacity>
              <Download size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {audioUrl && (
            <AudioPlayer
              audioUrl={audioUrl}
              isLooping={audioService.isSeamlessLoop()}
            />
          )}
        </GradientBackground>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:20 },
  loading:   { flex:1,justifyContent:'center',alignItems:'center' },
  loadingText:{ color:'#fff',marginTop:8 },
  title:     { fontSize:24, color:'#fff', marginBottom:12 },
  list:      { flex:1, marginBottom:20 },
  item:      {
    flexDirection:'row',alignItems:'center',
    padding:12,marginBottom:8, borderRadius:8,
    backgroundColor:'rgba(255,255,255,0.1)'
  },
  itemSelected:{
    backgroundColor:'rgba(16,185,129,0.15)'
  },
  itemText:  { color:'#fff', flex:1, marginHorizontal:8 },
  row:       { flexDirection:'row', alignItems:'center', marginBottom:12 },
  label:     { color:'#fff', marginRight:8 },
  option:    {
    padding:8,marginRight:8,borderRadius:6,
    backgroundColor:'rgba(255,255,255,0.1)'
  },
  optionSelected:{
    backgroundColor:'rgba(255,255,255,0.3)'
  },
  optionText:{ color:'#fff' },
  generateBtn:{ marginTop:12 },
  generateGradient:{
    paddingVertical:14, alignItems:'center',borderRadius:8
  },
  generateText:{ color:'#fff',fontSize:16 },
  playerHeader:{
    flexDirection:'row', alignItems:'center',
    paddingTop:Platform.OS==='ios'?60:40,
    padding:16
  },
  playerTitle:{ flex:1,textAlign:'center',color:'#fff',fontSize:18 },
});
