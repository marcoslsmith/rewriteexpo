import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Search, Filter, Copy, Star, StarOff, Library, Sparkles } from 'lucide-react-native';
import { storageService } from '../../lib/storage';
import type { Database } from '../../lib/supabase';

type Manifestation = Database['public']['Tables']['manifestations']['Row'];

const { width } = Dimensions.get('window');

export default function MyRewrite() {
  const [manifestations, setManifestations] = useState<Manifestation[]>([]);
  const [filteredManifestations, setFilteredManifestations] = useState<Manifestation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadManifestations();
  }, []);

  useEffect(() => {
    filterManifestations();
  }, [manifestations, searchQuery, showFavoritesOnly]);

  const loadManifestations = async () => {
    try {
      const data = await storageService.getManifestations();
      setManifestations(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error('Error loading manifestations:', error);
      setError('Failed to load manifestations');
    } finally {
      setLoading(false);
    }
  };

  const filterManifestations = () => {
    let filtered = manifestations;

    if (showFavoritesOnly) {
      filtered = filtered.filter(m => m.is_favorite);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.transformed_text.toLowerCase().includes(query) ||
        m.original_entry.toLowerCase().includes(query) ||
        m.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredManifestations(filtered);
  };

  const toggleFavorite = async (id: string) => {
    try {
      const manifestation = manifestations.find(m => m.id === id);
      if (manifestation) {
        await storageService.updateManifestation(id, { is_favorite: !manifestation.is_favorite });
        await loadManifestations();
      }
    } catch (error) {
      setError('Failed to update favorite status.');
    }
  };

  const copyToClipboard = async (text: string) => {
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
        setSuccess('Copied to clipboard! ✨');
      } catch (error) {
        setError('Failed to copy to clipboard');
      }
    } else {
      setSuccess('Copied to clipboard! ✨');
    }
    
    setTimeout(() => setSuccess(null), 2000);
  };

  const deleteManifestation = async (id: string) => {
    try {
      await storageService.deleteManifestation(id);
      await loadManifestations();
      setSuccess('Manifestation deleted 🗑️');
      setTimeout(() => setSuccess(null), 2000);
    } catch (error) {
      setError('Failed to delete manifestation.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          style={styles.loadingGradient}
        >
          <Sparkles size={48} color="#ff6b6b" strokeWidth={2} />
          <Text style={styles.loadingText}>Loading your manifestations...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Library size={32} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.title}>Your Library</Text>
            <Text style={styles.subtitle}>Collection of powerful manifestations</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{manifestations.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{manifestations.filter(m => m.is_favorite).length}</Text>
                <Text style={styles.statLabel}>Favorites</Text>
              </View>
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

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748b" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your manifestations..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.filterButton, showFavoritesOnly && styles.filterButtonActive]}
          onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          <Filter size={20} color={showFavoritesOnly ? '#ffffff' : '#64748b'} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredManifestations.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={64} color="#475569" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>
              {manifestations.length === 0 
                ? 'No manifestations yet' 
                : 'No manifestations match your search'
              }
            </Text>
            <Text style={styles.emptySubtitle}>
              {manifestations.length === 0 
                ? 'Visit Create to make your first manifestation'
                : 'Try adjusting your search or filters'
              }
            </Text>
          </View>
        ) : (
          filteredManifestations.map((manifestation) => (
            <ManifestationCard
              key={manifestation.id}
              manifestation={manifestation}
              onToggleFavorite={toggleFavorite}
              onCopy={copyToClipboard}
              onDelete={deleteManifestation}
            />
          ))
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

interface ManifestationCardProps {
  manifestation: Manifestation;
  onToggleFavorite: (id: string) => void;
  onCopy: (text: string) => void;
  onDelete: (id: string) => void;
}

function ManifestationCard({ manifestation, onToggleFavorite, onCopy, onDelete }: ManifestationCardProps) {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#1e293b', '#334155']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity
            onPress={() => onToggleFavorite(manifestation.id)}
            style={styles.favoriteButton}
          >
            {manifestation.is_favorite ? (
              <Star size={24} color="#fbbf24" fill="#fbbf24" strokeWidth={2} />
            ) : (
              <StarOff size={24} color="#64748b" strokeWidth={2} />
            )}
          </TouchableOpacity>
          
          <Text style={styles.cardDate}>
            {new Date(manifestation.created_at).toLocaleDateString()}
          </Text>
        </View>
        
        <Text style={styles.manifestationText}>
          {manifestation.transformed_text}
        </Text>
        
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onCopy(manifestation.transformed_text)}
          >
            <Copy size={18} color="#10b981" strokeWidth={2} />
            <Text style={styles.actionText}>Copy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDelete(manifestation.id)}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#cbd5e1',
  },
  header: {
    marginTop: 60,
    marginHorizontal: 20,
    marginBottom: 32,
    height: 240,
  },
  headerGradient: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 24,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 32,
  },
  stat: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  successText: {
    color: '#059669',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  searchSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  filterButton: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterButtonActive: {
    backgroundColor: '#ff6b6b',
    borderColor: '#ff6b6b',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardDate: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748b',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  manifestationText: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: 'Poppins-Medium',
    color: '#ffffff',
    marginBottom: 20,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#10b981',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#ef4444',
  },
  bottomSpacer: {
    height: 120,
  },
});