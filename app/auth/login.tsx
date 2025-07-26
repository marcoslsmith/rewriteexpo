import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, SafeAreaView, ImageBackground, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import GradientBackground from '@/components/GradientBackground';
import { X, Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { useFonts, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import * as Font from 'expo-font';

const bgImage = require('../../assets/images/purple-sky.jpg');
const { width, height } = Dimensions.get('window');

function AnimatedGradientBackground({ children }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 12000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // Interpolate between color sets
  const color1 = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(102,126,234,0.7)', 'rgba(240,147,251,0.7)'],
  });
  const color2 = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(118,75,162,0.7)', 'rgba(102,126,234,0.7)'],
  });
  const color3 = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(240,147,251,0.7)', 'rgba(118,75,162,0.7)'],
  });

  // AnimatedLinearGradient workaround: use Animated.View with backgroundColor for a single color, but for multi-color, we animate a value and pass to LinearGradient as a color array
  // So we need to listen to anim and update state for LinearGradient colors
  const [gradientColors, setGradientColors] = useState([
    'rgba(102,126,234,0.7)',
    'rgba(118,75,162,0.7)',
    'rgba(240,147,251,0.7)',
  ]);
  useEffect(() => {
    const id = anim.addListener(({ value }) => {
      // Manually interpolate colors
      const lerp = (a, b, t) => {
        // a, b: rgba strings, t: 0-1
        const parse = (c) => c.match(/\d+\.?\d*/g).map(Number);
        const [ar, ag, ab, aa] = parse(a);
        const [br, bg, bb, ba] = parse(b);
        return `rgba(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)},${(aa + (ba - aa) * t).toFixed(2)})`;
      };
      setGradientColors([
        lerp('rgba(102,126,234,0.7)', 'rgba(240,147,251,0.7)', value),
        lerp('rgba(118,75,162,0.7)', 'rgba(102,126,234,0.7)', value),
        lerp('rgba(240,147,251,0.7)', 'rgba(118,75,162,0.7)', value),
      ]);
    });
    return () => anim.removeListener(id);
  }, [anim]);

  return (
    <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill}>
      {children}
    </LinearGradient>
  );
}

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

  // Load custom fonts
  const [shrikhandFontLoaded, setShrikhandFontLoaded] = useState(false);
  const [glacialFontLoaded, setGlacialFontLoaded] = useState(false);
  
  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Shrikhand': require('../../assets/fonts/Shrikhand-Regular.ttf'),
          'GlacialIndifference': require('../../assets/fonts/GlacialIndifference-Regular.otf'),
          'GlacialIndifference-Bold': require('../../assets/fonts/GlacialIndifference-Bold.otf'),
        });
        setShrikhandFontLoaded(true);
        setGlacialFontLoaded(true);
      } catch (error) {
        console.log('Error loading fonts:', error);
      }
    }
    loadFonts();
  }, []);

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 900,
      delay: 200,
      useNativeDriver: true,
    }).start();
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
    <ImageBackground source={bgImage} style={{ flex: 1 }} resizeMode="cover">
      <AnimatedGradientBackground>
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
                  { fontFamily: shrikhandFontLoaded ? 'Shrikhand' : 'Nunito-ExtraBold' }
                ]}>The Rewrite</Text>
                <Text style={[
                  styles.headline,
                  { fontFamily: glacialFontLoaded ? 'GlacialIndifference-Bold' : (Platform.OS === 'ios' ? 'Inter-Bold' : undefined) }
                ]}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
                <Text style={[
                  styles.subtext,
                  { fontFamily: glacialFontLoaded ? 'GlacialIndifference' : (Platform.OS === 'ios' ? 'Inter-Regular' : undefined) }
                ]}>{isSignUp ? 'Sign up to get started with Rewrite' : 'Sign in to continue your journey'}</Text>
                {error && <Text style={styles.error}>{error}</Text>}
                {success && <Text style={styles.success}>{success}</Text>}
                <View style={styles.inputGroup}>
                  <Mail size={18} color="#764ba2" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#b4b4cc"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Lock size={18} color="#764ba2" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#b4b4cc"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeIcon}>
                    {showPassword ? <EyeOff size={18} color="#764ba2" /> : <Eye size={18} color="#764ba2" />}
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
      </AnimatedGradientBackground>
    </ImageBackground>
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
    backgroundColor: 'rgba(255,255,255,0.95)',
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
    color: '#2d225a',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 18,
    textAlign: 'center',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f0fa',
    borderRadius: 12,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 2,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(118,75,162,0.08)',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#2d225a',
    fontFamily: Platform.OS === 'ios' ? 'Inter-Regular' : undefined,
  },
  eyeIcon: {
    marginLeft: 8,
    padding: 4,
  },
  primaryButton: {
    backgroundColor: '#764ba2',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
    width: '100%',
    shadowColor: '#764ba2',
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
    color: '#a1a1aa',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Inter-Regular' : undefined,
  },
  secondaryButton: {
    padding: 12,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#764ba2',
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
    color: '#a1a1aa',
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
    color: '#764ba2',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
}); 