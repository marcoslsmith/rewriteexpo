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
      return;
    }

    setIsTransforming(true);
    setError(null);
    
    try {
      const transformed = await transformJournalEntry(journalEntry);
      setTransformedText(transformed);
    } catch (error) {
      setError('Failed to transform your entry. Please try again.');
      console.error('Transformation error:', error);
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
            placeholder="Write about your thoughts, feelings, dreams, or challenges..."
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
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Sparkles size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Transform</Text>
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
            <Text style={styles.tipText}>• Write honestly about your current situation</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Include your emotions and feelings</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Focus on what you want to create or change</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Be specific about your dreams and goals</Text>
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
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    position: 'relative',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.3,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#581c87',
    marginBottom: 8,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#7c3aed',
    opacity: 0.8,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#065f46',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 15,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 15,
    gap: 8,
  },
  transformButton: {
    backgroundColor: '#a855f7',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  manifestationCard: {
    backgroundColor: '#faf5ff',
    borderWidth: 2,
    borderColor: '#e9d5ff',
    borderRadius: 12,
    padding: 20,
  },
  manifestationText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#581c87',
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tipsSection: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 15,
  },
  tip: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});