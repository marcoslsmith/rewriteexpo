import { Tabs } from 'expo-router';
import { useRef, useEffect, useState } from 'react';
import { Animated, View, StyleSheet, Platform } from 'react-native';
import { CreditCard as Edit3, Heart, Wind, Target, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabLayout() {
  const translateY = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Subtle floating animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    return () => floatAnimation.stop();
  }, []);

  // Function to hide/show tab bar
  const hideTabBar = () => {
    if (isVisible) {
      setIsVisible(false);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 90, // Move down by tab bar height only
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const showTabBar = () => {
    if (!isVisible) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Expose scroll handlers to child screens
  useEffect(() => {
    // Store references globally so child screens can access them
    (global as any).hideTabBar = hideTabBar;
    (global as any).showTabBar = showTabBar;
  }, [isVisible]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 0 : 0, // Flush to bottom
          left: 0,
          right: 0,
          height: 90,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10, // Account for safe area
        },
        tabBarBackground: () => (
          <Animated.View 
            style={[
              styles.tabBarBackground,
              {
                opacity: opacity,
                transform: [
                  { translateY: Animated.add(translateY, floatAnim) }
                ],
              }
            ]}
          >
            <View style={styles.solidBackground}>
              <View style={styles.glassOverlay} />
            </View>
          </Animated.View>
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter-SemiBold',
          marginTop: 6,
          marginBottom: Platform.OS === 'ios' ? 8 : 4,
        },
        tabBarIconStyle: {
          marginTop: 12,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          height: 90,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Journal',
          tabBarIcon: ({ size, color, focused }) => (
            <Animated.View style={{ opacity: opacity }}>
              <TabIcon 
                Icon={Edit3} 
                color={color} 
                focused={focused}
                gradientColors={['#667eea', '#764ba2']}
              />
            </Animated.View>
          ),
          tabBarLabel: ({ children, color, focused }) => (
            <Animated.Text 
              style={[
                {
                  fontSize: 12,
                  fontFamily: 'Inter-SemiBold',
                  marginTop: 6,
                  marginBottom: Platform.OS === 'ios' ? 8 : 4,
                  color: color,
                  opacity: focused ? 0 : 1, // Hide label when focused
                },
                { opacity: opacity }
              ]}
            >
              {children}
            </Animated.Text>
          ),
        }}
      />
      <Tabs.Screen
        name="rewrite"
        options={{
          title: 'Library',
          tabBarIcon: ({ size, color, focused }) => (
            <Animated.View style={{ opacity: opacity }}>
              <TabIcon 
                Icon={Heart} 
                color={color} 
                focused={focused}
                gradientColors={['#f093fb', '#f5576c']}
              />
            </Animated.View>
          ),
          tabBarLabel: ({ children, color, focused }) => (
            <Animated.Text 
              style={[
                {
                  fontSize: 12,
                  fontFamily: 'Inter-SemiBold',
                  marginTop: 6,
                  marginBottom: Platform.OS === 'ios' ? 8 : 4,
                  color: color,
                  opacity: focused ? 0 : 1, // Hide label when focused
                },
                { opacity: opacity }
              ]}
            >
              {children}
            </Animated.Text>
          ),
        }}
      />
      <Tabs.Screen
        name="breathwork"
        options={{
          title: 'Breathe',
          tabBarIcon: ({ size, color, focused }) => (
            <Animated.View style={{ opacity: opacity }}>
              <TabIcon 
                Icon={Wind} 
                color={color} 
                focused={focused}
                gradientColors={['#4facfe', '#00f2fe']}
              />
            </Animated.View>
          ),
          tabBarLabel: ({ children, color, focused }) => (
            <Animated.Text 
              style={[
                {
                  fontSize: 12,
                  fontFamily: 'Inter-SemiBold',
                  marginTop: 6,
                  marginBottom: Platform.OS === 'ios' ? 8 : 4,
                  color: color,
                  opacity: focused ? 0 : 1, // Hide label when focused
                },
                { opacity: opacity }
              ]}
            >
              {children}
            </Animated.Text>
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Growth',
          tabBarIcon: ({ size, color, focused }) => (
            <Animated.View style={{ opacity: opacity }}>
              <TabIcon 
                Icon={Target} 
                color={color} 
                focused={focused}
                gradientColors={['#43e97b', '#38f9d7']}
              />
            </Animated.View>
          ),
          tabBarLabel: ({ children, color, focused }) => (
            <Animated.Text 
              style={[
                {
                  fontSize: 12,
                  fontFamily: 'Inter-SemiBold',
                  marginTop: 6,
                  marginBottom: Platform.OS === 'ios' ? 8 : 4,
                  color: color,
                  opacity: focused ? 0 : 1, // Hide label when focused
                },
                { opacity: opacity }
              ]}
            >
              {children}
            </Animated.Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color, focused }) => (
            <Animated.View style={{ opacity: opacity }}>
              <TabIcon 
                Icon={User} 
                color={color} 
                focused={focused}
                gradientColors={['#fa709a', '#fee140']}
              />
            </Animated.View>
          ),
          tabBarLabel: ({ children, color, focused }) => (
            <Animated.Text 
              style={[
                {
                  fontSize: 12,
                  fontFamily: 'Inter-SemiBold',
                  marginTop: 6,
                  marginBottom: Platform.OS === 'ios' ? 8 : 4,
                  color: color,
                  opacity: focused ? 0 : 1, // Hide label when focused
                },
                { opacity: opacity }
              ]}
            >
              {children}
            </Animated.Text>
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
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
  solidBackground: {
    flex: 1,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#8b5cf6', // Solid purple color
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Reduced overlay for cleaner purple
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Reduced border opacity
    borderBottomWidth: 0,
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