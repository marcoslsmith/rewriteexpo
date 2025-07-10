import { supabase } from './supabase';

/**
 * Test function to verify background audio files are accessible from Supabase Storage
 */
export async function testBackgroundAudioAccess() {
  console.log('🧪 Testing background audio file access...');
  
  const backgroundFiles = [
    'nature_sounds.mp3',
    'meditation_bells.mp3', 
    'ambient_waves.mp3'
  ];
  
  const results = [];
  
  for (const filename of backgroundFiles) {
    try {
      console.log(`📤 Testing access to: ${filename}`);
      
      // Get public URL
      const { data } = supabase.storage
        .from('audio-files')
        .getPublicUrl(filename);
      
      const publicUrl = data.publicUrl;
      console.log(`🔗 Public URL: ${publicUrl}`);
      
      // Test if the file is accessible
      try {
        const response = await fetch(publicUrl, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        
        if (response.ok) {
          console.log(`✅ ${filename} - Status: ${response.status}, Type: ${contentType}, Size: ${contentLength} bytes`);
          results.push({
            filename,
            url: publicUrl,
            status: response.status,
            contentType,
            contentLength,
            accessible: true
          });
        } else {
          console.error(`❌ ${filename} - Status: ${response.status} ${response.statusText}`);
          results.push({
            filename,
            url: publicUrl,
            status: response.status,
            error: response.statusText,
            accessible: false
          });
        }
      } catch (fetchError) {
        console.error(`❌ ${filename} - Fetch error:`, fetchError);
        results.push({
          filename,
          url: publicUrl,
          error: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
          accessible: false
        });
      }
    } catch (error) {
      console.error(`❌ ${filename} - General error:`, error);
      results.push({
        filename,
        error: error instanceof Error ? error.message : 'Unknown error',
        accessible: false
      });
    }
  }
  
  // Summary
  const accessibleCount = results.filter(r => r.accessible).length;
  console.log(`\n📊 Summary: ${accessibleCount}/${results.length} background audio files accessible`);
  
  if (accessibleCount === results.length) {
    console.log('✅ All background audio files are accessible!');
  } else {
    console.log('❌ Some background audio files are not accessible. Check Supabase Storage policies.');
    console.log('💡 Make sure the files are uploaded to the root of the audio-files bucket');
    console.log('💡 Verify the storage policies allow public read access for these files');
  }
  
  return {
    success: accessibleCount === results.length,
    results,
    accessibleCount,
    totalCount: results.length
  };
}

/**
 * Test the audio generation flow end-to-end
 */
export async function testAudioGenerationFlow() {
  console.log('🧪 Testing complete audio generation flow...');
  
  try {
    // Import audio service
    const { audioService } = await import('./audio');
    
    // Test background music access first
    console.log('1. Testing background music access...');
    const musicResults = await audioService.verifyBackgroundMusicAccess();
    console.log('Background music results:', musicResults);
    
    // Test TTS generation
    console.log('2. Testing TTS generation...');
    const testText = "This is a test manifestation for audio generation.";
    
    try {
      const ttsUrl = await audioService.generateTTSAudio(testText);
      console.log('✅ TTS generation successful:', ttsUrl);
      
      // Test if the TTS URL is accessible
      const isTTSAccessible = await audioService.testAudioUrl(ttsUrl);
      console.log('TTS URL accessible:', isTTSAccessible);
      
      // Test full audio generation
      console.log('3. Testing full audio generation...');
      const fullAudioUrl = await audioService.generatePersonalizedAudio({
        manifestationTexts: [testText],
        duration: 1, // 1 minute for testing
        musicStyle: 'nature'
      });
      
      console.log('✅ Full audio generation successful:', fullAudioUrl);
      
      // Verify the final URL is accessible
      const isFinalAccessible = await audioService.testAudioUrl(fullAudioUrl);
      console.log('Final audio URL accessible:', isFinalAccessible);
      
      return {
        success: true,
        ttsUrl,
        finalAudioUrl: fullAudioUrl,
        musicResults,
        allAccessible: isTTSAccessible && isFinalAccessible
      };
      
    } catch (ttsError) {
      console.error('❌ TTS generation failed:', ttsError);
      return {
        success: false,
        error: 'TTS generation failed',
        details: ttsError
      };
    }
    
  } catch (error) {
    console.error('❌ Audio generation flow test failed:', error);
    return {
      success: false,
      error: 'Test setup failed',
      details: error
    };
  }
}
/**
 * Test a specific background audio URL
 */
export async function testSpecificAudioUrl(url: string) {
  console.log(`🧪 Testing specific audio URL: ${url}`);
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${contentType}`);
    console.log(`Content-Length: ${contentLength}`);
    
    if (response.ok) {
      console.log('✅ URL is accessible');
      return {
        accessible: true,
        status: response.status,
        contentType,
        contentLength
      };
    } else {
      console.log(`❌ URL not accessible: ${response.status} ${response.statusText}`);
      return {
        accessible: false,
        status: response.status,
        error: response.statusText
      };
    }
  } catch (error) {
    console.error('❌ Error testing URL:', error);
    return {
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testBackgroundAudio = testBackgroundAudioAccess;
  (window as any).testAudioUrl = testSpecificAudioUrl;
  (window as any).testAudioFlow = testAudioGenerationFlow;
  console.log('🛠️ Background audio test functions available in console:');
  console.log('  - testBackgroundAudio() - Test all background audio files');
  console.log('  - testAudioUrl(url) - Test a specific audio URL');
  console.log('  - testAudioFlow() - Test complete audio generation flow');
}