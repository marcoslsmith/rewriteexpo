import { Tabs } from 'expo-router';
import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { Edit3, Heart, Wind, Target, User } from 'lucide-react-native';

export default function TabLayout() {
  const translateY = useRef(new Animated.Value(0)).current;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          paddingBottom: 34,
          paddingTop: 12,
          height: 90,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter-Medium',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Journal',
          tabBarIcon: ({ size, color }) => (
            <Edit3 size={22} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewrite"
        options={{
          title: 'Library',
          tabBarIcon: ({ size, color }) => (
            <Heart size={22} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="breathwork"
        options={{
          title: 'Breathe',
          tabBarIcon: ({ size, color }) => (
            <Wind size={22} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Growth',
          tabBarIcon: ({ size, color }) => (
            <Target size={22} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={22} color={color} strokeWidth={1.5} />
          ),
        }}
      />
    </Tabs>
  );
}