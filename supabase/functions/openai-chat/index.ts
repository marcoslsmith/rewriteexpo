/*
  # OpenAI Chat Edge Function

  1. Purpose
     - Accepts POST requests with a prompt string
     - Calls OpenAI GPT-4 API using secure environment variables
     - Returns AI assistant's response as JSON

  2. Security
     - Uses Supabase authentication
     - OpenAI API key stored securely in environment variables
     - CORS headers configured for web access

  3. Usage
     - POST /functions/v1/openai-chat
     - Body: { "prompt": "Your message here" }
     - Returns: { "response": "AI response", "usage": {...} }
*/

import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface ChatRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Verify OpenAI API key is configured
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          code: 'MISSING_API_KEY'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: ChatRequest = await req.json();
    
    if (!body.prompt || typeof body.prompt !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'Prompt is required and must be a string',
          code: 'INVALID_PROMPT'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare OpenAI API request
    const openaiRequest = {
      model: body.model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that transforms thoughts and feelings into positive, empowering manifestations. Focus on present-tense, affirmative language that helps users visualize and embody their desired outcomes.'
        },
        {
          role: 'user',
          content: body.prompt
        }
      ],
      max_tokens: body.maxTokens || 500,
      temperature: body.temperature || 0.7,
    };

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiRequest),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get response from OpenAI',
          code: 'OPENAI_API_ERROR',
          details: openaiResponse.status === 429 ? 'Rate limit exceeded' : 'API request failed'
        }),
        {
          status: openaiResponse.status === 429 ? 429 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const openaiData: OpenAIResponse = await openaiResponse.json();

    // Extract the response
    const assistantResponse = openaiData.choices[0]?.message?.content;
    
    if (!assistantResponse) {
      return new Response(
        JSON.stringify({ 
          error: 'No response generated',
          code: 'EMPTY_RESPONSE'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return successful response
    return new Response(
      JSON.stringify({
        response: assistantResponse.trim(),
        usage: openaiData.usage,
        model: body.model || 'gpt-4',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});