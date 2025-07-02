import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Save } from 'lucide-react-native';
import { transformJournalEntry } from '../../lib/ai';
import { storageService } from '../../lib/storage';
import { Manifestation } from '../../types/global';

export default function DreamLab() {
  const [journalEntry, setJournalEntry] = useState('');
  const [transformedText, setTransformedText] = useState('');
  const [isTransforming, setIsTransforming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleTransform = async () => {
    if (!journalEntry.trim()) {
      Alert.alert('Empty Entry', 'Please write something in your journal first.');
      return;
    }

    setIsTransforming(true);
    try {
      const transformed = await transformJournalEntry(journalEntry);
      setTransformedText(transformed);
    } catch (error) {
      Alert.alert('Error', 'Failed to transform your entry. Please try again.');
      console.error('Transformation error:', error);
    } finally {
      setIsTransforming(false);
    }
  };

  const handleSave = async () => {
    if (!transformedText.trim()) {
      Alert.alert('Nothing to Save', 'Please transform your journal entry first.');
      return;
    }

    setIsSaving(true);
    try {
      const manifestation: Manifestation = {
        id: Date.now().toString(),
        originalEntry: journalEntry,
        transformedText: transformedText,
        isFavorite: false,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await storageService.addManifestation(manifestation);
      Alert.alert('Saved!', 'Your manifestation has been saved to My Rewrite.');
      
      // Clear the form
      setJournalEntry('');
      setTransformedText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save your manifestation. Please try again.');
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
        <Text style={styles.title}>Dream Lab</Text>
        <Text style={styles.subtitle}>
          Transform your thoughts into powerful manifestations
        </Text>
      </LinearGradient>

      <View style={styles.content}>
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
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#581c87',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7c3aed',
    opacity: 0.8,
  },
  content: {
    padding: 20,
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