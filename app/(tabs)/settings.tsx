Here's the fixed version with all missing closing brackets and proper formatting:

```javascript
import React, { useState, useEffect, useRef } from 'react';
// [previous imports remain the same...]

export default function Settings() {
  // [previous state and function definitions remain the same...]

  return (
    <GradientBackground>
      <View style={styles.container}>
        <FloatingActionButton visible={showFAB} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Your account</Text>
          <Text style={styles.title}>Profile & Settings</Text>
        </View>

        {/* Status Messages */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {success && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        <Text style={styles.greeting}>Welcome back</Text>
        <Text style={styles.title}>Your Journey</Text>
        
        {/* User Stats */}
        <View style={styles.statsCard}>
          {/* [statsCard content remains the same...] */}
        </View>
        
        {/* Inspirational Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>"{inspirationalQuote}"</Text>
        </View>

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* [ScrollView content remains the same...] */}
        </Animated.ScrollView>

        {/* Sign In Modal */}
        <Modal
          visible={showSignInModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          {/* [Modal content remains the same...] */}
        </Modal>

        {/* Add Schedule Modal */}
        <Modal
          visible={showScheduleModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          {/* [Modal content remains the same...] */}
        </Modal>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  // [styles definitions remain the same...]
});
```