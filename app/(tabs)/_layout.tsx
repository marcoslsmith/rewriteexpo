import { Tabs } from 'expo-router';
import { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet, Platform } from 'react-native';
import { CreditCard as Edit3, Heart, Wind, Target, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabLayout() {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle floating animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    return () => floatAnimation.stop();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        tabBarStyle: {
          position: 'absolute',
          bottom: 30,
          left: 20,
          right: 20,
          height: 80,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          <Animated.View 
            style={[
              styles.tabBarBackground,
              {
                transform: [{ translateY }],
              }
            ]}
          >
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.95)', 'rgba(118, 75, 162, 0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              <View style={styles.glassOverlay} />
            </LinearGradient>
          </Animated.View>
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter-SemiBold',
          marginTop: 4,
          marginBottom: 8,
        },
        tabBarIconStyle: {
          marginTop: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Journal',
          tabBarIcon: ({ size, color, focused }) => (
            <TabIcon 
              Icon={Edit3} 
              color={color} 
              focused={focused}
              gradientColors={['#667eea', '#764ba2']}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rewrite"
        options={{
          title: 'Library',
          tabBarIcon: ({ size, color, focused }) => (
            <TabIcon 
              Icon={Heart} 
              color={color} 
              focused={focused}
              gradientColors={['#f093fb', '#f5576c']}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="breathwork"
        options={{
          title: 'Breathe',
          tabBarIcon: ({ size, color, focused }) => (
            <TabIcon 
              Icon={Wind} 
              color={color} 
              focused={focused}
              gradientColors={['#4facfe', '#00f2fe']}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Growth',
          tabBarIcon: ({ size, color, focused }) => (
            <TabIcon 
              Icon={Target} 
              color={color} 
              focused={focused}
              gradientColors={['#43e97b', '#38f9d7']}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color, focused }) => (
            <TabIcon 
              Icon={User} 
              color={color} 
              focused={focused}
              gradientColors={['#fa709a', '#fee140']}
            />
          ),
        }}
      />
    </Tabs>
  );
}

interface TabIconProps {
  Icon: any;
  color: string;
  focused: boolean;
  gradientColors: string[];
}

function TabIcon({ Icon, color, focused, gradientColors }: TabIconProps) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  const glowAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.1 : 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(glowAnim, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  if (focused) {
    return (
      <Animated.View 
        style={[
          styles.activeIconContainer,
          {
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.activeIconGradient}
        >
          <Animated.View 
            style={[
              styles.iconGlow,
              {
                opacity: glowAnim,
              }
            ]}
          />
          <Icon size={24} color="#ffffff" strokeWidth={2} />
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.inactiveIconContainer,
        {
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <Icon size={22} color={color} strokeWidth={1.5} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  gradient: {
    flex: 1,
    borderRadius: 25,
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  activeIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 34,
    shadowColor: '#ffffff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  inactiveIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});