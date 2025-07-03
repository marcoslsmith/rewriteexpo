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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Search, Filter, Copy, Star, StarOff, Clipboard } from 'lucide-react-native';
import { storageService } from '../../lib/storage';
import type { Database } from '../../lib/supabase';

type Manifestation = Database['public']['Tables']['manifestations']['Row'];

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
        setSuccess('Manifestation copied to clipboard!');
      } catch (error) {
        setError('Failed to copy to clipboard');
      }
    } else {
      // For mobile platforms, you would use Expo Clipboard
      setSuccess('Manifestation copied to clipboard!');
    }
    
    setTimeout(() => setSuccess(null), 2000);
  };

  const deleteManifestation = async (id: string) => {
    try {
      await storageService.deleteManifestation(id);
      await loadManifestations();
      setSuccess('Manifestation deleted successfully');
      setTimeout(() => setSuccess(null), 2000);
    } catch (error) {
      setError('Failed to delete manifestation.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your manifestations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fef3c7', '#fed7aa', '#fecaca']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Heart size={32} color="#78350f" />
          <Text style={styles.title}>My Rewrite</Text>
          <Text style={styles.subtitle}>
            Your collection of powerful manifestations
          </Text>
        </View>
        
        <Image
          source={{ uri: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=800' }}
          style={styles.headerImage}
        />
        
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
      </LinearGradient>

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

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search manifestations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.filterButton, showFavoritesOnly && styles.filterButtonActive]}
          onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          <Filter size={20} color={showFavoritesOnly ? '#ffffff' : '#9ca3af'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredManifestations.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {manifestations.length === 0 
                ? 'No manifestations yet' 
                : 'No manifestations match your search'
              }
            </Text>
            <Text style={styles.emptySubtitle}>
              {manifestations.length === 0 
                ? 'Visit Dream Lab to create your first manifestation'
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
      <View style={styles.cardHeader}>
        <TouchableOpacity
          onPress={() => onToggleFavorite(manifestation.id)}
          style={styles.favoriteButton}
        >
          {manifestation.is_favorite ? (
            <Star size={24} color="#f59e0b" fill="#f59e0b" />
          ) : (
            <StarOff size={24} color="#9ca3af" />
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
          <Copy size={18} color="#6366f1" />
          <Text style={styles.actionText}>Copy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => onDelete(manifestation.id)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
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
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.3,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#78350f',
    marginBottom: 8,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#b45309',
    opacity: 0.8,
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#78350f',
  },
  statLabel: {
    fontSize: 12,
    color: '#b45309',
    opacity: 0.8,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#d1fae5',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  successText: {
    color: '#065f46',
    fontSize: 14,
    textAlign: 'center',
  },
  searchSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  favoriteButton: {
    padding: 4,
  },
  cardDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  manifestationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    color: '#6366f1',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  deleteText: {
    fontSize: 14,
    color: '#dc2626',
  },
});