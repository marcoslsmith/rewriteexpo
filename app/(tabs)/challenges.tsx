Here's the fixed script with the missing closing brackets and characters:

[Previous content remains the same until the CompletedChallengeCard component]

interface ChallengeCardProps {
  challenge: Challenge;
  index: number;
  onStart: () => void;
  completedRuns: ChallengeProgress[];
}

function ChallengeCard({ challenge, index, onStart, completedRuns }: ChallengeCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const IconComponent = challengeIcons[challenge.id as keyof typeof challengeIcons] || Target;
  const gradientColors = challengeGradients[challenge.id as keyof typeof challengeGradients] || ['#667eea', '#764ba2'];

  useEffect(() => {
    // Staggered animation for cards
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: index * 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.challengeCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
        style={styles.challengeCardGradient}
      >
        <View style={styles.challengeCardHeader}>
          <View style={[styles.challengeIconContainer, { backgroundColor: gradientColors[0] }]}>
            <IconComponent size={24} color="#ffffff" strokeWidth={1.5} />
          </View>
          <View style={styles.challengeCardInfo}>
            <Text style={styles.challengeCardTitle}>{challenge.title}</Text>
            <Text style={styles.challengeCardDuration}>{challenge.duration} days</Text>
          </View>
        </View>
        
        <Text style={styles.challengeCardDescription}>{challenge.description}</Text>
        
        {completedRuns.length > 0 && (
          <View style={styles.completedRunsIndicator}>
            <Trophy size={14} color="#fbbf24" strokeWidth={1.5} />
            <Text style={styles.completedRunsText}>
              Completed {completedRuns.length} time{completedRuns.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        
        <AnimatedButton onPress={onStart} style={styles.startButton}>
          <LinearGradient
            colors={gradientColors}
            style={styles.startButtonGradient}
          >
            <View style={styles.startButtonContent}>
              <Play size={16} color="#ffffff" strokeWidth={1.5} />
              <Text style={styles.startButtonText}>
                {completedRuns.length > 0 ? 'Start Again' : 'Start Challenge'}
              </Text>
            </View>
          </LinearGradient>
        </AnimatedButton>
      </LinearGradient>
    </Animated.View>
  );
}

[Styles remain the same]