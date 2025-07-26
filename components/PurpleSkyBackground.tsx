import React from 'react';
import { ImageBackground, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const bgImage = require('../assets/images/purple-sky.jpg');

interface PurpleSkyBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  overlayOpacity?: number;
}

export default function PurpleSkyBackground({ 
  children, 
  style, 
  overlayOpacity = 0 
}: PurpleSkyBackgroundProps) {
  return (
    <ImageBackground 
      source={bgImage} 
      style={[styles.background, style]} 
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
}); 