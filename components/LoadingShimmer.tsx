import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface LoadingShimmerProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export default function LoadingShimmer({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8 
}: LoadingShimmerProps) {
  const shimmerValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerValue]);

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.container, { width, height, borderRadius }]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity,
            borderRadius,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
});