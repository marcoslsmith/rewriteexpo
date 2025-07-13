// components/AudioPlayer.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AudioPlayerProps {
  clipUrls: string[];            // one URL per manifestation
  backgroundUrl?: string;        // optional looping music
  title?: string;
  isLooping?: boolean;
  voiceRate?: number;            // 1.0 normal, <1.0 slower
  style?: any;
}

export default function AudioPlayer({
  clipUrls,
  backgroundUrl,
  title = 'Audio',
  isLooping = true,
  voiceRate = 0.9,
  style,
}: AudioPlayerProps) {
  // we keep the array of Expo.Sound instances in a ref so callbacks always see the current list
  const voiceSoundsRef = useRef<Audio.Sound[]>([]);
  const bgSound = useRef<Audio.Sound | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);

  // refs to track play state & current clip index
  const isPlayingRef = useRef(false);
  const currentClipRef = useRef(0);
  const [currentClip, setCurrentClip] = useState(0);

  // preload all clips + optional background
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);

      // unload existing
      await Promise.all(voiceSoundsRef.current.map(s => s.unloadAsync()));
      voiceSoundsRef.current = [];
      if (bgSound.current) {
        await bgSound.current.unloadAsync();
        bgSound.current = null;
      }
      currentClipRef.current = 0;
      setCurrentClip(0);

      try {
        if (Platform.OS !== 'web') {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
        }

        // load each TTS clip
        const loaded = await Promise.all(
          clipUrls.map(async uri => {
            const { sound } = await Audio.Sound.createAsync(
              { uri },
              { shouldPlay: false, isLooping: false, volume: 1.0 },
              onPlaybackStatusUpdate
            );
            await sound.setRateAsync(voiceRate, true);
            return sound;
          })
        );
        if (!cancelled) voiceSoundsRef.current = loaded;

        // load background music
        if (backgroundUrl && !cancelled) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: backgroundUrl },
            { shouldPlay: false, isLooping, volume: 0.5 }
          );
          bgSound.current = sound;
        }

        if (!cancelled) setIsLoaded(true);
      } catch (e: any) {
        console.error('Audio preload error', e);
        setError(e.message || 'Failed to load audio');
        Alert.alert('Audio Error', e.message || 'Unknown error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clipUrls, backgroundUrl]);

  // playback‐status callback for each clip
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis);
    setDuration(status.durationMillis || 1);

    if (status.didJustFinish && isPlayingRef.current) {
      setTimeout(() => {
        const arr = voiceSoundsRef.current;
        let next = currentClipRef.current + 1;

        if (next >= arr.length) {
          if (!isLooping) {
            setIsPlaying(false);
            isPlayingRef.current = false;
            return;
          }
          next = 0;
        }

        currentClipRef.current = next;
        setCurrentClip(next);

        // reset position then play
        arr[next]
          .setPositionAsync(0)
          .then(() => arr[next].playAsync())
          .catch(console.error);
      }, 2000);
    }
  };

  // toggle play/pause
  const togglePlay = async () => {
    if (!isLoaded) return;
    const arr = voiceSoundsRef.current;

    if (isPlaying) {
      await Promise.all(arr.map(s => s.pauseAsync()));
      if (bgSound.current) await bgSound.current.pauseAsync();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      setIsPlaying(true);
      isPlayingRef.current = true;
      currentClipRef.current = 0;
      setCurrentClip(0);
      await arr[0].playAsync();
      if (bgSound.current) await bgSound.current.playAsync();
    }
  };

  // stop everything
  const stopPlayback = async () => {
    const arr = voiceSoundsRef.current;
    await Promise.all(arr.map(s => s.stopAsync()));
    if (bgSound.current) await bgSound.current.stopAsync();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setPosition(0);
    currentClipRef.current = 0;
    setCurrentClip(0);
  };

  // ─── CLEAN UP WHEN COMPONENT UNMOUNTS ───
  useEffect(() => {
   return () => {
      // stop any playing audio
      stopPlayback().catch(console.error);
      // unload all preloaded TTS clips
      voiceSoundsRef.current.forEach(s => s.unloadAsync().catch(console.error));
      // unload background track
      if (bgSound.current) bgSound.current.unloadAsync().catch(console.error);
    };
  }, []);

  // restart sequence
  const restartPlayback = async () => {
    await stopPlayback();
    await togglePlay();
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (position / duration) * 100 : 0;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={restartPlayback} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>
            {formatTime(duration)} {isLooping ? '(Loop)' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={restartPlayback} disabled={!isLoaded} style={styles.controlButton}>
          <RotateCcw size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlay}
          disabled={isLoading}
          style={[styles.controlButton, styles.playButton]}
        >
          {isLoading ? (
            <Text style={styles.loading}>…</Text>
          ) : isPlaying ? (
            <Pause size={32} color="#fff" />
          ) : (
            <Play size={32} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={stopPlayback} disabled={!isLoaded} style={styles.controlButton}>
          <Square size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    margin: 20,
  },
  title: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorContainer: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  errorText: { color: '#f66', marginBottom: 6 },
  retryButton: {
    backgroundColor: '#ef4444',
    padding: 6,
    borderRadius: 6,
  },
  retryText: { color: '#fff' },
  progressContainer: { marginVertical: 16 },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: { color: 'rgba(255,255,255,0.8)' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  controlButton: {
    marginHorizontal: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 28,
  },
  playButton: {
    backgroundColor: 'rgba(16,185,129,1)',
  },
  loading: { color: '#fff', fontSize: 24 },
});
