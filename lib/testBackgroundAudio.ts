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
  }
  
  return {
    success: accessibleCount === results.length,
    results,
    accessibleCount,
    totalCount: results.length
  };
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
  console.log('🛠️ Background audio test functions available in console:');
  console.log('  - testBackgroundAudio() - Test all background audio files');
  console.log('  - testAudioUrl(url) - Test a specific audio URL');
}