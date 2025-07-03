import { Tabs } from 'expo-router';
import { BookOpen, Heart, Wind, Trophy, Settings } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ff6b6b',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: '#ff6b6b',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.3,
          shadowRadius: 24,
          paddingBottom: 16,
          paddingTop: 16,
          height: 100,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter-Bold',
          marginTop: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Create',
          tabBarIcon: ({ size, color }) => (
            <BookOpen size={size} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewrite"
        options={{
          title: 'Library',
          tabBarIcon: ({ size, color }) => (
            <Heart size={size} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="breathwork"
        options={{
          title: 'Breathe',
          tabBarIcon: ({ size, color }) => (
            <Wind size={size} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Grow',
          tabBarIcon: ({ size, color }) => (
            <Trophy size={size} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} strokeWidth={2.5} />
          ),
        }}
      />
    </Tabs>
  );
}