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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Save, BookOpen } from 'lucide-react-native';
import { transformJournalEntry } from '../../lib/ai';
import { storageService } from '../../lib/storage';

export default function DreamLab() {
  const [journalEntry, setJournalEntry] = useState('');
  const [transformedText, setTransformedText] = useState('');
  const [isTransforming, setIsTransforming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setError(null); // Clear any previous errors on success
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
      
      setSuccess('Your manifestation has been saved to My Rewrite!');
      
      // Clear the form
      setJournalEntry('');
      setTransformedText('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to save your manifestation. Please try again.');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#faf5ff', '#f3e8ff', '#e0e7ff']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <BookOpen size={32} color="#581c87" />
          <Text style={styles.title}>Dream Lab</Text>
          <Text style={styles.subtitle}>
            Transform your thoughts into powerful manifestations
          </Text>
        </View>
        
        <Image
          source={{ uri: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800' }}
          style={styles.headerImage}
        />
      </LinearGradient>

      <View style={styles.content}>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Journal Entry</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Write about your thoughts, feelings, dreams, or challenges... Our AI will transform them into powerful manifestations."
            value={journalEntry}
            onChangeText={setJournalEntry}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          
          <TouchableOpacity
            style={[styles.button, styles.transformButton]}
            onPress={handleTransform}
            disabled={isTransforming}
          >
            {isTransforming ? (
              <>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.buttonText}>Transforming...</Text>
              </>
            ) : (
              <>
                <Sparkles size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Transform with AI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {transformedText ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Manifestation</Text>
            <View style={styles.manifestationCard}>
              <Text style={styles.manifestationText}>{transformedText}</Text>
            </View>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Save size={20} color="#ffffff" />
                  <Text style={styles.buttonText}>Save to My Rewrite</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Tips for Better Manifestations</Text>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Write honestly about your current thoughts and feelings</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Share your challenges, fears, or limiting beliefs</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Describe what you want to create or change in your life</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Our AI will transform your words into empowering affirmations</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  headerImage: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.15,
    transform: [{ rotate: '15deg' }],
  },
  title: {
    fontSize: 36,
    fontFamily: 'Poppins-Bold',
    color: '#581c87',
    marginBottom: 12,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Inter-Medium',
    color: '#7c3aed',
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  content: {
    padding: 24,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    marginHorizontal: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#d1fae5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    marginHorizontal: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  successText: {
    color: '#065f46',
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  section: {
    marginBottom: 36,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#1f2937',
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 20,
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    minHeight: 140,
    backgroundColor: '#fafbfc',
    color: '#1f2937',
    lineHeight: 26,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 20,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  transformButton: {
    backgroundColor: '#7c3aed',
  },
  saveButton: {
    backgroundColor: '#2563eb',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
  manifestationCard: {
    backgroundColor: '#fefbff',
    borderWidth: 1.5,
    borderColor: '#e9d5ff',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  manifestationText: {
    fontSize: 20,
    lineHeight: 32,
    fontFamily: 'Poppins-Medium',
    color: '#581c87',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  tipsSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tipsTitle: {
    fontSize: 19,
    fontFamily: 'Poppins-SemiBold',
    color: '#1e3a8a',
    marginBottom: 18,
    letterSpacing: -0.2,
  },
  tip: {
    marginBottom: 12,
  },
  tipText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1e40af',
    lineHeight: 22,
  },
});