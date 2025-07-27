import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, SafeAreaView, Animated, Dimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import PurpleSkyBackground from '@/components/PurpleSkyBackground';
import { X, Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { useFonts, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import * as Font from 'expo-font';

const { width, height } = Dimensions.get('window');



export default function LoginScreen() {
  const { clearAllAuthData } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const [fontsLoaded] = useFonts({
    'Nunito-ExtraBold': Nunito_800ExtraBold,
  });

  // Load custom fonts - optimized to prevent re-renders
  const [customFontsLoaded, setCustomFontsLoaded] = useState(false);
  
  useEffect(() => {
    let isMounted = true;
    
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Shrikhand': require('../../assets/fonts/Shrikhand-Regular.ttf'),
          'GlacialIndifference': require('../../assets/fonts/GlacialIndifference-Regular.otf'),
          'GlacialIndifference-Bold': require('../../assets/fonts/GlacialIndifference-Bold.otf'),
        });
        if (isMounted) {
          setCustomFontsLoaded(true);
        }
      } catch (error) {
        // Font loading error handled silently
      }
    }
    
    loadFonts();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Only run animation once when component mounts
    const animation = Animated.timing(cardAnim, {
      toValue: 1,
      duration: 900,
      delay: 200,
      useNativeDriver: true,
    });
    
    animation.start();
    
    return () => {
      animation.stop();
    };
  }, []);

  const handleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setSuccess('Account created! Please check your email to confirm your account.');
        } else if (data.session) {
          setSuccess('Account created and signed in successfully! Redirecting...');
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 1500);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccess('Signed in successfully! Redirecting...');
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      }
      setEmail('');
      setPassword('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PurpleSkyBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.centeredContainer}>
          <Animated.View
            style={{
              opacity: cardAnim,
              transform: [
                {
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
              width: '100%',
              alignItems: 'center',
            }}
          >
            <View style={styles.card}>
                              <Text style={[
                  styles.logoText,
                  { fontFamily: customFontsLoaded ? 'Shrikhand' : 'Nunito-ExtraBold' }
                ]}>The Rewrite</Text>
                <Text style={[
                  styles.headline,
                  { fontFamily: customFontsLoaded ? 'GlacialIndifference-Bold' : (Platform.OS === 'ios' ? 'Inter-Bold' : undefined) }
                ]}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
                <Text style={[
                  styles.subtext,
                  { fontFamily: customFontsLoaded ? 'GlacialIndifference' : (Platform.OS === 'ios' ? 'Inter-Regular' : undefined) }
                ]}>{isSignUp ? 'Sign up to get started with Rewrite' : 'Sign in to continue your journey'}</Text>
              {error && <Text style={styles.error}>{error}</Text>}
              {success && <Text style={styles.success}>{success}</Text>}
              <View style={styles.inputGroup}>
                <Mail size={18} color="#647696" style={styles.inputIcon} />
                                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    spellCheck={false}
                  />
              </View>
              <View style={styles.inputGroup}>
                <Lock size={18} color="#647696" style={styles.inputIcon} />
                                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    autoCorrect={false}
                    spellCheck={false}
                  />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeIcon}>
                  {showPassword ? <EyeOff size={18} color="#647696" /> : <Eye size={18} color="#647696" />}
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSignIn}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
                </Text>
              </TouchableOpacity>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={styles.secondaryButtonText}>
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.privacyNote}>By continuing, you agree to our Terms & Privacy Policy.</Text>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </PurpleSkyBackground>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#764ba2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  headline: {
    fontSize: 24,
    color: '#647696',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 15,
    color: '#647696',
    marginBottom: 18,
    textAlign: 'center',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 2,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#647696',
    fontFamily: Platform.OS === 'ios' ? 'Inter-Regular' : undefined,
  },
  eyeIcon: {
    marginLeft: 8,
    padding: 4,
  },
  primaryButton: {
    backgroundColor: '#6B9FFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
    width: '100%',
    shadowColor: '#6B9FFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Inter-SemiBold' : undefined,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#647696',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Inter-Regular' : undefined,
  },
  secondaryButton: {
    padding: 12,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#647696',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Inter-SemiBold' : undefined,
    textAlign: 'center',
  },
  error: {
    color: '#ff6b6b',
    marginBottom: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  success: {
    color: '#4ade80',
    marginBottom: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  privacyNote: {
    fontSize: 12,
    color: '#647696',
    marginTop: 10,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Inter-Regular' : undefined,
  },
  dot: {
    position: 'absolute',
    backgroundColor: '#fff',
  },
  logoText: {
    fontSize: 42,
    color: '#647696',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
}); 