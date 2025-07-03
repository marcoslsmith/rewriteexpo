Here's the fixed version with all missing closing brackets and proper structure:

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { Heart, Search, Star, Copy, Trash2, Filter } from 'lucide-react-native';
import { storageService } from '../../lib/storage';
import type { Database } from '../../lib/supabase';
import GradientBackground from '../../components/GradientBackground';
import EmptyState from '../../components/EmptyState';
import AnimatedButton from '../../components/AnimatedButton';
import FloatingActionButton from '../../components/FloatingActionButton';

type Manifestation = Database['public']['Tables']['manifestations']['Row'];

export default function Library() {
  const [manifestations, setManifestations] = useState<Manifestation[]>([]);
  const [filteredManifestations, setFilteredManifestations] = useState<Manifestation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFAB, setShowFAB] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const isScrollingDown = currentScrollY > lastScrollY.current;
        
        if (isScrollingDown && currentScrollY > 100) {
          setShowFAB(false);
        } else if (!isScrollingDown) {
          setShowFAB(true);
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

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
      setTimeout(() => setError(null), 3000);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
        setSuccess('Copied to clipboard!');
      } catch (error) {
        setError('Failed to copy to clipboard');
      }
    } else {
      setSuccess('Copied to clipboard!');
    }
    
    setTimeout(() => setSuccess(null), 2000);
  };

  const deleteManifestation = async (id: string) => {
    try {
      await storageService.deleteManifestation(id);
      await loadManifestations();
      setSuccess('Manifestation deleted');
      setTimeout(() => setSuccess(null), 2000);
    } catch (error) {
      setError('Failed to delete manifestation.');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your library...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.container}>
        <FloatingActionButton visible={showFAB} />
        
        {/* Header */}
        <Text style={styles.greeting}>Your sacred collection</Text>
        <Text style={styles.greeting}>Your collection</Text>
        <Text style={styles.title}>Manifestation Library</Text>
        
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

        {/* Search and Filter */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search size={18} color="#64748b" strokeWidth={1.5} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search manifestations..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.filterButton, showFavoritesOnly && styles.filterButtonActive]}
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Filter size={18} color={showFavoritesOnly ? '#ffffff' : '#64748b'} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {filteredManifestations.length === 0 ? (
            <EmptyState
              icon={Heart}
              title={manifestations.length === 0 
                ? 'Ready to start manifesting?' 
                : 'No manifestations match your search'
              }
              subtitle={manifestations.length === 0 
                ? 'Your first manifestation will live here. Visit Journal to begin your transformation journey.'
                : 'Try adjusting your search or filters to find what you\'re looking for.'
              }
              iconColor="#f472b6"
            />
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
        </Animated.ScrollView>
      </View>
    </GradientBackground>
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
      <TouchableOpacity
        onPress={() => onToggleFavorite(manifestation.id)}
        style={styles.favoriteButton}
      >
        <Heart
          color={manifestation.is_favorite ? '#ef4444' : '#cbd5e1'} 
          fill={manifestation.is_favorite ? '#ef4444' : 'transparent'}
          strokeWidth={1.5}
        />
      </TouchableOpacity>
      
      <Text style={styles.cardDate}>
        {new Date(manifestation.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}
      </Text>
      
      <View style={styles.cardActions}>
        <AnimatedButton onPress={() => onCopy(manifestation.transformed_text)}>
          <View style={styles.actionButtonContent}>
            <Copy size={16} color="#2563eb" strokeWidth={1.5} />
            <Text style={styles.actionText}>Copy</Text>
          </View>
        </AnimatedButton>
        
        <AnimatedButton onPress={() => onDelete(manifestation.id)}>
          <View style={styles.actionButtonContent}>
            <Trash2 size={16} color="#ef4444" strokeWidth={1.5} />
            <Text style={styles.deleteText}>Delete</Text>
          </View>
        </AnimatedButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#0f172a',
    lineHeight: 34,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 32,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748b',
    marginTop: 2,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#16a34a',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0f172a',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    fontFamily: 'Inter-Medium',
    color: '#94a3b8',
  },
  manifestationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1e293b',
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563eb',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  deleteText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ef4444',
  },
  bottomPadding: {
    height: 40,
  },
});