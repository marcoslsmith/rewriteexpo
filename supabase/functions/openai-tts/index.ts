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
     - Body: { "text": "Your text here", "voice": "nova", "model": "tts-1" }
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
    console.log('TTS Edge Function called with method:', req.method);
    console.log('Environment check - OPENAI_API_KEY exists:', !!OPENAI_API_KEY);

    // Verify OpenAI API key is configured
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not found in environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          code: 'MISSING_API_KEY',
          details: 'Please set OPENAI_API_KEY in Supabase Edge Function secrets'
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
          code: 'METHOD_NOT_ALLOWED',
          details: 'Only POST requests are supported'
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body with better error handling
    let body: TTSRequest;
    try {
      const rawBody = await req.text();
      console.log('Raw request body length:', rawBody.length);
      
      if (!rawBody.trim()) {
        throw new Error('Empty request body');
      }
      
      body = JSON.parse(rawBody);
      console.log('Parsed request body:', {
        hasText: !!body.text,
        textLength: body.text?.length || 0,
        voice: body.voice || 'not specified',
        model: body.model || 'not specified'
      });
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Validate required fields
    if (!body.text || typeof body.text !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'Text is required and must be a string',
          code: 'INVALID_TEXT',
          details: 'The "text" field must be a non-empty string'
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
          code: 'TEXT_TOO_LONG',
          details: `Text length: ${body.text.length} characters`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate voice parameter
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const voice = body.voice || 'nova';
    if (!validVoices.includes(voice)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid voice parameter',
          code: 'INVALID_VOICE',
          details: `Voice must be one of: ${validVoices.join(', ')}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate model parameter
    const validModels = ['tts-1', 'tts-1-hd'];
    const model = body.model || 'tts-1';
    if (!validModels.includes(model)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid model parameter',
          code: 'INVALID_MODEL',
          details: `Model must be one of: ${validModels.join(', ')}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare OpenAI TTS API request
    const openaiRequest = {
      model: model,
      input: body.text,
      voice: voice,
      response_format: body.response_format || 'mp3',
    };

    console.log('Calling OpenAI TTS API with:', {
      model: openaiRequest.model,
      voice: openaiRequest.voice,
      response_format: openaiRequest.response_format,
      text_length: body.text.length,
      text_preview: body.text.substring(0, 100) + (body.text.length > 100 ? '...' : '')
    });

    // Call OpenAI TTS API with comprehensive error handling
    let openaiResponse: Response;
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0',
        },
        body: JSON.stringify(openaiRequest),
      });

      console.log('OpenAI API response status:', openaiResponse.status);
      console.log('OpenAI API response headers:', Object.fromEntries(openaiResponse.headers.entries()));
    } catch (fetchError) {
      console.error('Network error calling OpenAI API:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Network error connecting to OpenAI',
          code: 'NETWORK_ERROR',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown network error'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle OpenAI API errors
    if (!openaiResponse.ok) {
      let errorDetails = 'Unknown error';
      let errorData: any = null;
      
      try {
        const errorText = await openaiResponse.text();
        errorDetails = errorText;
        
        // Try to parse as JSON for more detailed error info
        try {
          errorData = JSON.parse(errorText);
          console.error('OpenAI TTS API error (parsed):', errorData);
        } catch {
          console.error('OpenAI TTS API error (raw):', errorText);
        }
      } catch (e) {
        console.error('Failed to read error response from OpenAI:', e);
      }
      
      // Handle specific OpenAI error codes
      let errorMessage = 'Failed to generate speech from OpenAI';
      let errorCode = 'OPENAI_TTS_ERROR';
      
      if (openaiResponse.status === 401) {
        errorMessage = 'Invalid OpenAI API key';
        errorCode = 'INVALID_API_KEY';
      } else if (openaiResponse.status === 429) {
        errorMessage = 'OpenAI rate limit exceeded';
        errorCode = 'RATE_LIMIT_EXCEEDED';
      } else if (openaiResponse.status === 400) {
        errorMessage = 'Invalid request to OpenAI API';
        errorCode = 'INVALID_REQUEST';
      } else if (openaiResponse.status === 500) {
        errorMessage = 'OpenAI server error';
        errorCode = 'OPENAI_SERVER_ERROR';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: errorCode,
          details: errorDetails,
          status: openaiResponse.status,
          openai_error: errorData
        }),
        {
          status: openaiResponse.status === 429 ? 429 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the audio data as array buffer
    let audioBuffer: ArrayBuffer;
    try {
      audioBuffer = await openaiResponse.arrayBuffer();
      console.log('Audio buffer received, size:', audioBuffer.byteLength, 'bytes');
    } catch (bufferError) {
      console.error('Failed to read audio buffer from OpenAI response:', bufferError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process audio data from OpenAI',
          code: 'BUFFER_ERROR',
          details: bufferError instanceof Error ? bufferError.message : 'Unknown buffer error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      console.error('Empty audio buffer received from OpenAI');
      return new Response(
        JSON.stringify({ 
          error: 'No audio data generated',
          code: 'EMPTY_AUDIO',
          details: 'OpenAI returned empty audio data'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Convert to base64 for transmission
    let audioBase64: string;
    try {
      // Use a more efficient method for base64 conversion
      const uint8Array = new Uint8Array(audioBuffer);
      const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
      audioBase64 = btoa(binaryString);
      
      console.log('Audio converted to base64, length:', audioBase64.length);
    } catch (base64Error) {
      console.error('Failed to convert audio to base64:', base64Error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to encode audio data',
          code: 'ENCODING_ERROR',
          details: base64Error instanceof Error ? base64Error.message : 'Unknown encoding error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Create response with audio data
    const response = {
      success: true,
      audioData: audioBase64,
      audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
      format: openaiRequest.response_format,
      voice: openaiRequest.voice,
      model: openaiRequest.model,
      size: audioBuffer.byteLength,
      text_length: body.text.length,
      timestamp: new Date().toISOString(),
    };

    console.log('TTS generation successful:', {
      format: response.format,
      voice: response.voice,
      model: response.model,
      size: response.size,
      text_length: response.text_length,
      base64_length: audioBase64.length
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
    console.error('Edge function unexpected error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});