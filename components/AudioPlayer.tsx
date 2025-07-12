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
  /** URL of the mixed TTS + music file */
  audioUrl: string;
  /** URL of the background music file */
  backgroundUrl?: string;
  title?: string;
  isLooping?: boolean;
  style?: any;
  /** control voice speed: 1.0 is normal, <1.0 is slower */
  voiceRate?: number;
}

export default function AudioPlayer({
  audioUrl,
  backgroundUrl: backgroundTrackUrl,
  title = 'Audio',
  isLooping = true,
  voiceRate = 0.9,
  style,
}: AudioPlayerProps) {
  const voiceSound = useRef<Audio.Sound | null>(null);
  const bgSound = useRef<Audio.Sound | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      voiceSound.current?.unloadAsync();
      bgSound.current?.unloadAsync();
    };
  }, []);

  // whenever URLs change, reload both
  useEffect(() => {
    if (!audioUrl) return;
    loadBoth();
  }, [audioUrl, backgroundTrackUrl]);

  const loadBoth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // unload existing
      await voiceSound.current?.unloadAsync();
      await bgSound.current?.unloadAsync();
      voiceSound.current = null;
      bgSound.current = null;
      setIsLoaded(false);

      // configure audio mode
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }

      // 1) load TTS voice
      const { sound: v } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        {
          shouldPlay: false,
          isLooping,
          volume: 1.0,
        },
        onPlaybackStatusUpdate
      );
      voiceSound.current = v;
      // slow it down a bit
      await v.setRateAsync(voiceRate, true);

      // 2) load background loop (if provided)
      if (backgroundTrackUrl) {
        const { sound: b } = await Audio.Sound.createAsync(
          { uri: backgroundTrackUrl },
          {
            shouldPlay: false,
            isLooping,
            volume: 0.5,
          }
        );
        bgSound.current = b;
      }

      setIsLoaded(true);
    } catch (e: any) {
      console.error('Error loading audio:', e);
      setError(e.message || 'Failed to load audio');
      Alert.alert('Audio Error', e.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish && !isLooping) {
        setIsPlaying(false);
        setPosition(0);
      }
    } else if (status.error) {
      console.error('Playback error:', status.error);
      setError(status.error);
      setIsPlaying(false);
    }
  };

  const togglePlayback = async () => {
    try {
      if (!isLoaded) {
        await loadBoth();
        return;
      }
      if (isPlaying) {
        await voiceSound.current?.pauseAsync();
        await bgSound.current?.pauseAsync();
      } else {
        await voiceSound.current?.playAsync();
        await bgSound.current?.playAsync();
      }
    } catch (e: any) {
      console.error('Error toggling playback:', e);
      setError(e.message || 'Playback error');
      Alert.alert('Playback Error', e.message || 'Failed to play/pause');
    }
  };

  const stopPlayback = async () => {
    try {
      await voiceSound.current?.stopAsync();
      await bgSound.current?.stopAsync();
      await voiceSound.current?.setPositionAsync(0);
      await bgSound.current?.setPositionAsync(0);
      setPosition(0);
      setIsPlaying(false);
    } catch (e) {
      console.error('Error stopping playback:', e);
    }
  };

  const restartPlayback = async () => {
    try {
      await voiceSound.current?.setPositionAsync(0);
      await bgSound.current?.setPositionAsync(0);
      await voiceSound.current?.playAsync();
      await bgSound.current?.playAsync();
    } catch (e) {
      console.error('Error restarting playback:', e);
    }
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
          <TouchableOpacity onPress={loadBoth} style={styles.retryButton}>
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
        <TouchableOpacity
          onPress={restartPlayback}
          disabled={!isLoaded}
          style={styles.controlButton}
        >
          <RotateCcw size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlayback}
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

        <TouchableOpacity
          onPress={stopPlayback}
          disabled={!isLoaded}
          style={styles.controlButton}
        >
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
  loading: {
    color: '#fff',
    fontSize: 24,
  },
});
