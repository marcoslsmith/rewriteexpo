import OpenAI from 'openai';

const openai = process.env.EXPO_PUBLIC_OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY })
  : null;

const TRANSFORMATION_RULES = [
  { from: /I can't/gi, to: 'I can' },
  { from: /I don't/gi, to: 'I do' },
  { from: /I won't/gi, to: 'I will' },
  { from: /I'm not/gi, to: 'I am' },
  { from: /I never/gi, to: 'I always' },
  { from: /I hate/gi, to: 'I love' },
  { from: /I fear/gi, to: 'I embrace' },
  { from: /I'm scared/gi, to: 'I am brave' },
  { from: /I'm worried/gi, to: 'I am confident' },
  { from: /I'm stressed/gi, to: 'I am peaceful' },
  { from: /I'm tired/gi, to: 'I am energized' },
  { from: /I'm broke/gi, to: 'I am abundant' },
  { from: /I'm alone/gi, to: 'I am loved' },
  { from: /I'm lost/gi, to: 'I am guided' },
  { from: /I'm stuck/gi, to: 'I am free' },
];

const POSITIVE_PREFIXES = [
  'I am grateful for',
  'I celebrate',
  'I welcome',
  'I attract',
  'I manifest',
  'I embrace',
  'I choose',
  'I deserve',
];

function applyRuleBasedTransformation(text: string): string {
  let transformed = text;
  
  // Apply transformation rules
  TRANSFORMATION_RULES.forEach(rule => {
    transformed = transformed.replace(rule.from, rule.to);
  });
  
  // If the text doesn't start with "I am" or "I", add a positive prefix
  if (!/^I\s/i.test(transformed.trim())) {
    const randomPrefix = POSITIVE_PREFIXES[Math.floor(Math.random() * POSITIVE_PREFIXES.length)];
    transformed = `${randomPrefix} ${transformed.toLowerCase()}`;
  }
  
  // Ensure it ends with a period
  if (!transformed.endsWith('.') && !transformed.endsWith('!')) {
    transformed += '.';
  }
  
  return transformed;
}

export async function transformJournalEntry(entry: string): Promise<string> {
  try {
    // Try OpenAI first if available
    if (openai) {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert at transforming journal entries into powerful manifestation statements. 
            Transform the user's journal entry into a positive, present-tense manifestation statement. 
            Focus on what they want to achieve, feel, or become. Use "I am", "I have", "I attract", or similar present-tense language. 
            Keep it concise, powerful, and inspiring. Return only the transformed statement.`
          },
          {
            role: 'user',
            content: entry
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const transformed = response.choices[0]?.message?.content?.trim();
      if (transformed) {
        return transformed;
      }
    }
  } catch (error) {
    console.error('OpenAI transformation failed:', error);
  }
  
  // Fallback to rule-based transformation
  return applyRuleBasedTransformation(entry);
}