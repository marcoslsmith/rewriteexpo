import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Animated,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Heart, Search, Star, Copy, Trash2, Filter, BookOpen, Sparkles, Calendar, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { storageService } from '../../lib/storage';
import type { Database } from '../../lib/supabase';
import GradientBackground from '../../components/GradientBackground';
import EmptyState from '../../components/EmptyState';
import AnimatedButton from '../../components/AnimatedButton';

const { width } = Dimensions.get('window');

type Manifestation = Database['public']['Tables']['manifestations']['Row'];

export default function Library() {
  const router = useRouter();
  const [manifestations, setManifestations] = useState<Manifestation[]>([]);
  const [filteredManifestations, setFilteredManifestations] = useState<Manifestation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFAB, setShowFAB] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    // Animate in the content when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const isScrollingDown = currentScrollY > lastScrollY.current;
        
        if (isScrollingDown && currentScrollY > 100) {
          setShowFAB(false);
          // Hide tab bar on scroll down
          if ((global as any).hideTabBar) {
            (global as any).hideTabBar();
          }
        } else if (!isScrollingDown) {
          setShowFAB(true);
          // Show tab bar on scroll up
          if ((global as any).showTabBar) {
            (global as any).showTabBar();
          }
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

  useEffect(() => {
    loadManifestations();
  }, []);

  // Reload when tab becomes focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('Library tab focused, reloading manifestations...');
      loadManifestations();
    }, [])
  );
  
  useEffect(() => {
    filterManifestations();
  }, [manifestations, searchQuery, showFavoritesOnly]);

  const loadManifestations = async () => {
    setLoading(true);
    try {
      const data = await storageService.getManifestations();
      console.log('Loaded manifestations:', data.length);
      setManifestations(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error('Error loading manifestations:', error);
      setError('Failed to load manifestations');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadManifestations();
    setRefreshing(false);
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
        // Optimistic update - update UI immediately
        const updatedManifestations = manifestations.map(m => 
          m.id === id ? { ...m, is_favorite: !m.is_favorite } : m
        );
        setManifestations(updatedManifestations);
        
        // Update the database in the background
        await storageService.updateManifestation(id, { is_favorite: !manifestation.is_favorite });
        
        // Only reload if the optimistic update might have failed
        // We'll do a silent background refresh without changing loading states
        storageService.getManifestations().then(data => {
          const sortedData = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setManifestations(sortedData);
        }).catch(error => {
          console.error('Background refresh failed:', error);
          // Revert optimistic update on error
          setManifestations(manifestations);
          setError('Failed to update favorite status.');
          setTimeout(() => setError(null), 3000);
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setManifestations(manifestations);
      setError('Failed to update favorite status.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
        setSuccess('✨ Copied to clipboard!');
      } catch (error) {
        setError('Failed to copy to clipboard');
      }
    } else {
      setSuccess('✨ Copied to clipboard!');
    }
    
    setTimeout(() => setSuccess(null), 2000);
  };

  const deleteManifestation = async (id: string) => {
    try {
      await storageService.deleteManifestation(id);
      await loadManifestations();
      setSuccess('✨ Manifestation deleted');
      setTimeout(() => setSuccess(null), 2000);
    } catch (error) {
      setError('Failed to delete manifestation.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const getTotalManifestations = () => manifestations.length;
  const getFavoriteCount = () => manifestations.filter(m => m.is_favorite).length;
  const getRecentCount = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return manifestations.filter(m => new Date(m.created_at) > oneWeekAgo).length;
  };

  if (loading) {
    return (
      <GradientBackground colors={['#667eea', '#764ba2', '#f093fb']}>
        <View style={styles.loadingContainer}>
          <Sparkles size={48} color="#ffffff" strokeWidth={1.5} />
          <Text style={styles.loadingText}>Loading your sacred collection...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground colors={['#667eea', '#764ba2', '#f093fb']}>
      <View style={styles.container}>
        {/* Hero Header */}
        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#ffffff', '#f8fafc']}
              style={styles.logoBackground}
            >
              <BookOpen size={32} color="#667eea" strokeWidth={2} />
            </LinearGradient>
            <Text style={styles.logoText}>Your Library</Text>
            <Text style={styles.logoSubtext}>Sacred collection of manifestations</Text>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statGradient}
              >
                <Text style={styles.statNumber}>{getTotalManifestations()}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statGradient}
              >
                <Text style={styles.statNumber}>{getFavoriteCount()}</Text>
                <Text style={styles.statLabel}>Favorites</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statGradient}
              >
                <Text style={styles.statNumber}>{getRecentCount()}</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>

        {/* Status Messages */}
        {error && (
          <Animated.View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}
        
        {success && (
          <Animated.View style={styles.successContainer}>
            <Text style={styles.successText}>{success}</Text>
          </Animated.View>
        )}

        {/* Search and Filter Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
              style={styles.searchGradient}
            >
              <Search size={20} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search your manifestations..."
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </LinearGradient>
          </View>
          
          <TouchableOpacity
            style={[styles.filterButton, showFavoritesOnly && styles.filterButtonActive]}
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <LinearGradient
              colors={showFavoritesOnly 
                ? ['#f59e0b', '#f97316'] 
                : ['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']
              }
              style={styles.filterGradient}
            >
              <Heart 
                size={20} 
                color={showFavoritesOnly ? "#ffffff" : "rgba(255, 255, 255, 0.8)"} 
                fill={showFavoritesOnly ? "#ffffff" : "transparent"}
                strokeWidth={1.5} 
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
              colors={['#ffffff']}
            />
          }
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
              iconColor="#ffffff"
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
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity
            onPress={() => onToggleFavorite(manifestation.id)}
            style={styles.favoriteButton}
          >
            <Heart
              size={24}
              color={manifestation.is_favorite ? '#f59e0b' : 'rgba(255, 255, 255, 0.6)'} 
              fill={manifestation.is_favorite ? '#f59e0b' : 'transparent'}
              strokeWidth={1.5}
            />
          </TouchableOpacity>
          
          <View style={styles.dateContainer}>
            <Clock size={14} color="rgba(255, 255, 255, 0.6)" strokeWidth={1.5} />
            <Text style={styles.cardDate}>
              {formatDate(manifestation.created_at)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.manifestationText}>
          {manifestation.transformed_text}
        </Text>
        
        <View style={styles.cardActions}>
          <AnimatedButton onPress={() => onCopy(manifestation.transformed_text)}>
            <View style={styles.actionButton}>
              <Copy size={16} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
              <Text style={styles.actionText}>Copy</Text>
            </View>
          </AnimatedButton>
          
          <AnimatedButton onPress={() => onDelete(manifestation.id)}>
            <View style={styles.actionButton}>
              <Trash2 size={16} color="#ff6b6b" strokeWidth={1.5} />
              <Text style={styles.deleteText}>Delete</Text>
            </View>
          </AnimatedButton>
        </View>
      </LinearGradient>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    textAlign: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoSubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#4ade80',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  filterButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterButtonActive: {
    // Active styling handled by gradient
  },
  filterGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
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
    padding: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  manifestationText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#ffffff',
    fontFamily: 'Inter-Medium',
    marginBottom: 24,
    fontStyle: 'italic',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  deleteText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ff6b6b',
  },
});