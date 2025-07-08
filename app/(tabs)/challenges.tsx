import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Target, Play, Calendar, Award, Check, ArrowLeft, X, Trophy, Star, Zap, Heart, BookOpen, Clock, ChevronRight, Users, TrendingUp, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { challengeService, challengePrompts } from '../../lib/challenges';
import { storageService } from '../../lib/storage';
import type { Database } from '../../lib/supabase';
import GradientBackground from '../../components/GradientBackground';
import AnimatedButton from '../../components/AnimatedButton';

const { width } = Dimensions.get('window');

type Challenge = Database['public']['Tables']['challenges']['Row'];
type ChallengeProgress = Database['public']['Tables']['challenge_progress']['Row'];

const challengeIcons = {
  'gratitude-7': Heart,
  'manifestation-21': Star,
  'abundance-14': Trophy,
  'mindfulness-10': Zap,
  'confidence-14': Target,
  'creativity-7': BookOpen,
};

const challengeGradients = {
  'gratitude-7': ['#f093fb', '#f5576c'],
  'manifestation-21': ['#4facfe', '#00f2fe'],
  'abundance-14': ['#43e97b', '#38f9d7'],
  'mindfulness-10': ['#667eea', '#764ba2'],
  'confidence-14': ['#fa709a', '#fee140'],
  'creativity-7': ['#a8edea', '#fed6e3'],
};

export default function Challenges() {
  // ... rest of the component code ...
}

const styles = StyleSheet.create({
  // ... styles object ...
});