import { Tabs } from 'expo-router';
import { BookOpen, Heart, Wind, Trophy, Settings } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7c3aed',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          paddingBottom: 12,
          paddingTop: 12,
          height: 92,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter-SemiBold',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dream Lab',
          tabBarIcon: ({ size, color }) => (
            <BookOpen size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewrite"
        options={{
          title: 'My Rewrite',
          tabBarIcon: ({ size, color }) => (
            <Heart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="breathwork"
        options={{
          title: 'Breathwork',
          tabBarIcon: ({ size, color }) => (
            <Wind size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ size, color }) => (
            <Trophy size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}