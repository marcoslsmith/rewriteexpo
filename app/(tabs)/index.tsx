import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Save, Zap, ArrowRight, Plus } from 'lucide-react-native';
import { transformJournalEntry } from '../../lib/ai';
import { storageService } from '../../lib/storage';

const { width } = Dimensions.get('window');

export default function DreamLab() {
  const [journalEntry, setJournalEntry] = useState('');
  const [transformedText, setTransformedText] = useState('');
  const [isTransforming, setIsTransforming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleTransform = async () => {
    if (!journalEntry.trim()) {
      setError('Write something magical first ✨');
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
      setError('Something went wrong. Try again! 🔄');
      console.error('Transformation error:', error);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsTransforming(false);
    }
  };

  const handleSave = async () => {
    if (!transformedText.trim()) {
      setError('Transform your thoughts first! ⚡');
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
      
      setSuccess('Manifestation saved! 🎉');
      setJournalEntry('');
      setTransformedText('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to save. Try again! 💫');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        style={styles.background}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['#ff6b6b', '#ff8e8e', '#ffb3b3']}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Transform</Text>
              <Text style={styles.heroSubtitle}>Your Thoughts Into Power</Text>
              <View style={styles.heroIcon}>
                <Zap size={32} color="#ffffff" strokeWidth={3} />
              </View>
            </View>
          </LinearGradient>
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

        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputHeader}>
            <Plus size={24} color="#ff6b6b" strokeWidth={2.5} />
            <Text style={styles.inputTitle}>What's on your mind?</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Pour your heart out... fears, dreams, struggles, hopes..."
              placeholderTextColor="#64748b"
              value={journalEntry}
              onChangeText={setJournalEntry}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
          
          <TouchableOpacity
            style={[styles.transformButton, isTransforming && styles.buttonDisabled]}
            onPress={handleTransform}
            disabled={isTransforming}
          >
            <LinearGradient
              colors={isTransforming ? ['#64748b', '#475569'] : ['#ff6b6b', '#ff4757']}
              style={styles.buttonGradient}
            >
              {isTransforming ? (
                <>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.buttonText}>Transforming...</Text>
                </>
              ) : (
                <>
                  <Sparkles size={24} color="#ffffff" strokeWidth={2.5} />
                  <Text style={styles.buttonText}>Transform</Text>
                  <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Result Section */}
        {transformedText && (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>Your Manifestation</Text>
            <View style={styles.manifestationCard}>
              <LinearGradient
                colors={['#1e293b', '#334155']}
                style={styles.manifestationGradient}
              >
                <Text style={styles.manifestationText}>{transformedText}</Text>
                <View style={styles.manifestationGlow} />
              </LinearGradient>
            </View>
            
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <LinearGradient
                colors={isSaving ? ['#64748b', '#475569'] : ['#10b981', '#059669']}
                style={styles.buttonGradient}
              >
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Save size={24} color="#ffffff" strokeWidth={2.5} />
                    <Text style={styles.buttonText}>Save to Library</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
          <View style={styles.tipsList}>
            <View style={styles.tip}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>Be honest about your feelings</Text>
            </View>
            <View style={styles.tip}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>Share your biggest challenges</Text>
            </View>
            <View style={styles.tip}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>Dream without limits</Text>
            </View>
            <View style={styles.tip}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>Trust the transformation process</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    height: 280,
    marginTop: 60,
    marginHorizontal: 20,
    marginBottom: 32,
  },
  heroGradient: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  heroTitle: {
    fontSize: 48,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 20,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    letterSpacing: 0.5,
    marginBottom: 24,
  },
  heroIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    borderLeftWidth: 6,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    borderLeftWidth: 6,
    borderLeftColor: '#10b981',
  },
  successText: {
    color: '#059669',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  inputSection: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  inputTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  inputContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  textInput: {
    backgroundColor: '#334155',
    borderRadius: 20,
    padding: 24,
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    minHeight: 160,
    lineHeight: 28,
    textAlignVertical: 'top',
  },
  transformButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    gap: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  resultSection: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  resultTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  manifestationCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  manifestationGradient: {
    padding: 32,
    position: 'relative',
  },
  manifestationText: {
    fontSize: 22,
    fontFamily: 'Poppins-Medium',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  manifestationGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#10b981',
    opacity: 0.1,
    borderRadius: 24,
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  tipsSection: {
    marginHorizontal: 20,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 28,
    marginBottom: 32,
  },
  tipsTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  tipsList: {
    gap: 16,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff6b6b',
  },
  tipText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    lineHeight: 24,
    flex: 1,
  },
  bottomSpacer: {
    height: 120,
  },
});