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
import { Play, Pause, Square, Volume2, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  onClose?: () => void;
  isLooping?: boolean;
  style?: any;
}

export default function AudioPlayer({ 
  audioUrl, 
  title = 'Audio', 
  onClose, 
  isLooping = true,
  style 
}: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    configureAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (audioUrl) {
      loadAudio();
    }
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [audioUrl]);

  const configureAudio = async () => {
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
    } catch (error) {
      console.error('Error configuring audio:', error);
    }
  };

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsLoaded(false);
      }

      console.log('Loading audio from URL:', audioUrl);
      console.log('[AudioPlayer] Attempting to load:', audioUrl);

      if (!audioUrl || typeof audioUrl !== 'string') {
        throw new Error('Invalid audio URL provided');
      }

      let audioSource: any;
      if (audioUrl.startsWith('data:audio/')) {
        console.log('Loading base64 audio data...');
        audioSource = { uri: audioUrl };
      } else if (audioUrl.startsWith('http')) {
        console.log('Loading audio from HTTP URL...');
        audioSource = { uri: audioUrl };
      } else {
        throw new Error('Unsupported audio URL format');
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        audioSource,
        {
          shouldPlay: false,
          isLooping: isLooping,
          volume: 1.0,
        },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsLoaded(true);
      console.log('Audio loaded successfully');

    } catch (error) {
      console.error('Error loading audio:', error);
      setError(error instanceof Error ? error.message : 'Failed to load audio');
      Alert.alert('Audio Error', `Failed to load audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      setError(`Playback error: ${status.error}`);
      setIsPlaying(false);
    }
  };

  const togglePlayback = async () => {
    try {
      if (!sound || !isLoaded) {
        console.log('Sound not loaded, attempting to reload...');
        await loadAudio();
        return;
      }
      if (isPlaying) {
        console.log('Pausing audio...');
        await sound.pauseAsync();
      } else {
        console.log('Playing audio...');
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setError(error instanceof Error ? error.message : 'Playback error');
      Alert.alert('Playback Error', 'Failed to play/pause audio');
    }
  };

  const stopPlayback = async () => {
    try {
      if (sound && isLoaded) {
        console.log('Stopping audio...');
        await sound.stopAsync();
        await sound.setPositionAsync(0);
        setPosition(0);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  const restartPlayback = async () => {
    try {
      if (sound && isLoaded) {
        console.log('Restarting audio...');
        await sound.setPositionAsync(0);
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error restarting playback:', error);
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (duration === 0) return 0;
    return (position / duration) * 100;
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadAudio} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            Audio URL: {audioUrl ? audioUrl.substring(0, 50) + '...' : 'None'}
          </Text>
          <Text style={styles.debugText}>
            Status: {isLoaded ? 'Loaded' : isLoading ? 'Loading' : 'Not Loaded'}
          </Text>
          <Text style={styles.debugText}>
            Format: {audioUrl?.startsWith('data:') ? 'Base64' : 'URL'}
          </Text>
        </View>
      )}

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
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>
            {formatTime(duration)} {isLooping ? '(Loop)' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={restartPlayback}
          disabled={!isLoaded}
        >
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
            style={styles.controlGradient}
          >
            <RotateCcw size={20} color="#ffffff" strokeWidth={1.5} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.playButton]}
          onPress={togglePlayback}
          disabled={isLoading || !!error}
        >
          <LinearGradient
            colors={isLoading ? ['#6b7280', '#4b5563'] : ['#10b981', '#059669']}
            style={styles.playGradient}
          >
            {isLoading ? (
              <Text style={styles.loadingText}>...</Text>
            ) : isPlaying ? (
              <Pause size={32} color="#ffffff" strokeWidth={1.5} />
            ) : (
              <Play size={32} color="#ffffff" strokeWidth={1.5} />
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={stopPlayback}
          disabled={!isLoaded}
        >
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
            style={styles.controlGradient}
          >
            <Square size={20} color="#ffffff" strokeWidth={1.5} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {__DEV__ && (
        <TouchableOpacity onPress={loadAudio} style={styles.testButton}>
          <Text style={styles.testButtonText}>Reload Audio</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    margin: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  debugContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  debugText: {
    color: '#60a5fa',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 8,
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
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  playGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  testButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'center',
  },
  testButtonText: {
    color: '#60a5fa',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});
