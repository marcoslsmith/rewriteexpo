import { supabase } from './supabase';

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

async function callOpenAIEdgeFunction(prompt: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        prompt: `Transform this journal entry into a powerful, positive manifestation statement. Use present-tense language like "I am", "I have", "I attract", or "I create". Make it inspiring and empowering: "${prompt}"`,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 150
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Edge function failed');
    }

    if (data?.response) {
      return data.response;
    }

    throw new Error('No response from Edge function');
  } catch (error) {
    console.error('Failed to call OpenAI Edge function:', error);
    throw error;
  }
}

export async function transformJournalEntry(entry: string): Promise<string> {
  try {
    // Try Supabase Edge Function first (most secure and reliable)
    return await callOpenAIEdgeFunction(entry);
  } catch (error) {
    console.error('AI transformation failed, using rule-based fallback:', error);
    // Fallback to rule-based transformation
    return applyRuleBasedTransformation(entry);
  }
}