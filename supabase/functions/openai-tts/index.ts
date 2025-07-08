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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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
      console.error('OpenAI API key not found in environment variables');
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
    let body: TTSRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
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
      text_length: body.text.length,
      text_preview: body.text.substring(0, 50) + '...'
    });

    // Call OpenAI TTS API with proper error handling
    let openaiResponse: Response;
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(openaiRequest),
      });
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

    if (!openaiResponse.ok) {
      let errorDetails = 'Unknown error';
      try {
        const errorData = await openaiResponse.text();
        errorDetails = errorData;
        console.error('OpenAI TTS API error:', {
          status: openaiResponse.status,
          statusText: openaiResponse.statusText,
          error: errorData
        });
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
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: errorCode,
          details: errorDetails,
          status: openaiResponse.status
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
    } catch (bufferError) {
      console.error('Failed to read audio buffer from OpenAI response:', bufferError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process audio data from OpenAI',
          code: 'BUFFER_ERROR'
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
          code: 'EMPTY_AUDIO'
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
      audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    } catch (base64Error) {
      console.error('Failed to convert audio to base64:', base64Error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to encode audio data',
          code: 'ENCODING_ERROR'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Create response with audio data
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
      size: response.size,
      text_length: body.text.length
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
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});