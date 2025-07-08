/*
  # OpenAI Text-to-Speech Edge Function

  1. Purpose
     - Accepts POST requests with text to convert to speech
     - Calls OpenAI TTS API using secure environment variables
     - Returns audio file URL or base64 data

  2. Security
     - Uses Supabase authentication
     - OpenAI API key stored securely in environment variables
     - CORS headers configured for web access

  3. Usage
     - POST /functions/v1/openai-tts
     - Body: { "text": "Your text here", "voice": "alloy", "model": "tts-1" }
     - Returns: { "audioUrl": "...", "audioData": "..." }
*/

import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface TTSRequest {
  text: string;
  voice?: string;
  model?: string;
  response_format?: string;
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
    const body: TTSRequest = await req.json();
    
    if (!body.text || typeof body.text !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'Text is required and must be a string',
          code: 'INVALID_TEXT'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate text length (OpenAI TTS has a 4096 character limit)
    if (body.text.length > 4096) {
      return new Response(
        JSON.stringify({ 
          error: 'Text too long. Maximum 4096 characters allowed.',
          code: 'TEXT_TOO_LONG'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare OpenAI TTS API request
    const openaiRequest = {
      model: body.model || 'tts-1',
      input: body.text,
      voice: body.voice || 'alloy',
      response_format: body.response_format || 'mp3',
    };

    console.log('Calling OpenAI TTS API with:', {
      model: openaiRequest.model,
      voice: openaiRequest.voice,
      response_format: openaiRequest.response_format,
      text_length: body.text.length
    });

    // Call OpenAI TTS API
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiRequest),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI TTS API error:', errorData);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate speech from OpenAI',
          code: 'OPENAI_TTS_ERROR',
          details: openaiResponse.status === 429 ? 'Rate limit exceeded' : 'TTS generation failed'
        }),
        {
          status: openaiResponse.status === 429 ? 429 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the audio data as array buffer
    const audioBuffer = await openaiResponse.arrayBuffer();
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No audio data generated',
          code: 'EMPTY_AUDIO'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Convert to base64 for transmission
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    // For now, return the base64 data directly
    // In production, you might want to upload to Supabase Storage and return a URL
    const response = {
      audioData: audioBase64,
      audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
      format: openaiRequest.response_format,
      voice: openaiRequest.voice,
      model: openaiRequest.model,
      size: audioBuffer.byteLength,
      timestamp: new Date().toISOString(),
    };

    console.log('TTS generation successful:', {
      format: response.format,
      voice: response.voice,
      model: response.model,
      size: response.size
    });

    // Return successful response
    return new Response(
      JSON.stringify(response),
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