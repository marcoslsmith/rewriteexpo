import { supabase } from './supabase';

/**
 * Test function to verify the OpenAI TTS Edge Function is working
 * This can be called from the browser console or a test component
 */
export async function testTTSFunction() {
  console.log('🧪 Testing OpenAI TTS Edge Function...');
  
  try {
    // Test with a simple text
    const testText = "Hello, this is a test of the text-to-speech function.";
    
    console.log('📤 Sending request to Edge Function...');
    console.log('Test text:', testText);
    
    const { data, error } = await supabase.functions.invoke('openai-tts', {
      body: {
        text: testText,
        voice: 'nova',
        model: 'tts-1',
        response_format: 'mp3'
      }
    });

    if (error) {
      console.error('❌ Edge Function Error:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }

    console.log('📥 Edge Function Response:', {
      hasData: !!data,
      success: data?.success,
      hasAudioUrl: !!data?.audioUrl,
      hasAudioData: !!data?.audioData,
      audioSize: data?.size,
      voice: data?.voice,
      model: data?.model
    });

    if (data?.success && data?.audioUrl) {
      console.log('✅ TTS Function Test Successful!');
      console.log('🎵 Audio URL generated (first 100 chars):', data.audioUrl.substring(0, 100) + '...');
      
      // Optionally play the audio to test it
      if (typeof window !== 'undefined') {
        console.log('🔊 Creating audio element for testing...');
        const audio = new Audio(data.audioUrl);
        audio.volume = 0.5;
        
        return {
          success: true,
          audioUrl: data.audioUrl,
          audioSize: data.size,
          playAudio: () => {
            console.log('▶️ Playing test audio...');
            audio.play().catch(e => console.error('Audio play error:', e));
          }
        };
      }
      
      return {
        success: true,
        audioUrl: data.audioUrl,
        audioSize: data.size
      };
    } else {
      console.error('❌ Invalid response from TTS function:', data);
      return {
        success: false,
        error: 'Invalid response format',
        details: data
      };
    }
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
}

/**
 * Test the Edge Function deployment and configuration
 */
export async function testEdgeFunctionDeployment() {
  console.log('🔍 Testing Edge Function deployment...');
  
  try {
    // Test if the function exists by making an OPTIONS request
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-tts`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      }
    });
    
    console.log('OPTIONS response status:', response.status);
    console.log('OPTIONS response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ Edge Function is deployed and accessible');
      return { deployed: true, accessible: true };
    } else {
      console.error('❌ Edge Function not accessible:', response.status, response.statusText);
      return { deployed: false, accessible: false, status: response.status };
    }
  } catch (error) {
    console.error('❌ Failed to test Edge Function deployment:', error);
    return { deployed: false, accessible: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testTTS = testTTSFunction;
  (window as any).testTTSDeployment = testEdgeFunctionDeployment;
  console.log('🛠️ TTS test functions available in console:');
  console.log('  - testTTS() - Test the TTS function');
  console.log('  - testTTSDeployment() - Test if function is deployed');
}