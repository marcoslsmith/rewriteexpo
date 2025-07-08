import { supabase } from './supabase';
import type { Database } from './supabase';

type Challenge = Database['public']['Tables']['challenges']['Row'];

export const challengePrompts: { [challengeId: string]: { [day: number]: string } } = {
  'gratitude-7': {
    1: 'What are three things you\'re genuinely grateful for today?',
    2: 'Write about a person who has positively impacted your life.',
    3: 'What aspects of your health and body are you thankful for?',
    4: 'Describe a challenging experience that helped you grow.',
    5: 'What opportunities do you have that you might take for granted?',
    6: 'Write about a small pleasure that brought you joy recently.',
    7: 'Reflect on your gratitude journey - how has your perspective shifted?',
  },
  'manifestation-21': {
    1: 'What is your biggest dream or goal? Write it as if it\'s already happened.',
    2: 'Describe how achieving your dream would make you feel.',
    3: 'What limiting beliefs might be holding you back?',
    4: 'Write about a time when you successfully manifested something.',
    5: 'What would you do if you knew you couldn\'t fail?',
    6: 'How would your ideal day look from start to finish?',
    7: 'What are you willing to let go of to make space for your dreams?',
    8: 'Write a letter to your future self who has achieved your goals.',
    9: 'What inspired action can you take today toward your dreams?',
    10: 'How do you want to feel every day? Describe those emotions.',
    11: 'What would you create if resources were unlimited?',
    12: 'Write about the person you\'re becoming on this journey.',
    13: 'What synchronicities or signs have you noticed lately?',
    14: 'How has your relationship with yourself changed?',
    15: 'What are you most excited about in your future?',
    16: 'Write about a challenge that became a blessing.',
    17: 'How do you want to impact others through your success?',
    18: 'What would your ideal life look like in 5 years?',
    19: 'What are you ready to receive into your life?',
    20: 'How has your confidence grown during this challenge?',
    21: 'Celebrate your journey - what has shifted within you?',
  },
  'abundance-14': {
    1: 'What does abundance mean to you beyond money?',
    2: 'Write about the abundance already present in your life.',
    3: 'How can you share your gifts with the world?',
    4: 'What would you do with unlimited resources?',
    5: 'Describe a time when you felt truly abundant.',
    6: 'What opportunities are you grateful for?',
    7: 'How can you approach challenges with an abundant mindset?',
    8: 'What are you ready to receive more of in your life?',
    9: 'How do you celebrate your wins, big and small?',
    10: 'What would you create if you felt completely abundant?',
    11: 'How has your relationship with money evolved?',
    12: 'What legacy do you want to leave?',
    13: 'How do you practice generosity in your daily life?',
    14: 'What abundance affirmations resonate most with you?',
  },
  'mindfulness-10': {
    1: 'What does being present mean to you?',
    2: 'Describe a moment today when you felt fully aware.',
    3: 'How do you notice when your mind is wandering?',
    4: 'What brings you back to the present moment?',
    5: 'Write about a time when mindfulness helped you.',
    6: 'How has your awareness of thoughts and emotions changed?',
    7: 'What do you observe when you pause and breathe?',
    8: 'How can you bring more mindfulness to daily activities?',
    9: 'What have you learned about acceptance and letting go?',
    10: 'How will you continue your mindfulness practice?',
  },
  'confidence-14': {
    1: 'What does confidence mean to you?',
    2: 'Write about a time when you felt truly confident.',
    3: 'What limiting beliefs about yourself are you ready to release?',
    4: 'How do you want to show up in the world?',
    5: 'What are your unique strengths and talents?',
    6: 'How has fear held you back, and how can you move through it?',
    7: 'What would you do if you knew you couldn\'t fail?',
    8: 'How do you celebrate your achievements, big and small?',
    9: 'What does your confident self look like?',
    10: 'How can you support others in building their confidence?',
    11: 'What boundaries do you need to set to honor yourself?',
    12: 'How has your self-talk evolved during this challenge?',
    13: 'What are you most proud of about your growth?',
    14: 'How will you maintain and continue building your confidence?',
  },
  'creativity-7': {
    1: 'What does creativity mean to you?',
    2: 'When do you feel most creative and inspired?',
    3: 'What creative blocks do you want to overcome?',
    4: 'How can you make space for more creativity in your life?',
    5: 'What would you create if there were no limitations?',
    6: 'How does creativity connect you to your authentic self?',
    7: 'What creative practices will you continue after this challenge?',
  },
};

export const challengeService = {
  async getChallenges(): Promise<Challenge[]> {
    try {
      console.log('Loading challenges from Supabase...');
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Supabase challenges error:', error);
        throw error;
      }
      console.log('Challenges loaded from Supabase:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Error loading challenges:', error);
      console.log('Using fallback challenges...');
      // Return default challenges as fallback
      return [
        {
          id: 'gratitude-7',
          title: '7-Day Gratitude Journey',
          description: 'Transform your mindset with daily gratitude practice',
          duration: 7,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'manifestation-21',
          title: '21-Day Manifestation Mastery',
          description: 'Build powerful manifestation habits over 21 days',
          duration: 21,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'abundance-14',
          title: '14-Day Abundance Mindset',
          description: 'Shift into an abundance mindset in just 2 weeks',
          duration: 14,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ];
    }
  },
};