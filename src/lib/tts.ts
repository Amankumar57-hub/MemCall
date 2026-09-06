const playGoogleTranslateTTS = async (text: string, langCode: string): Promise<void> => {
  const chunks = text.match(/.{1,150}(\s|$)/g) || [text];
  const tlCode = langCode.split('-')[0];
  
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk.trim())}&tl=${tlCode}&client=tw-ob`;
    
    await new Promise<void>((resolve) => {
      const audio = new Audio(url);
      audio.playbackRate = 0.95;
      
      let hasFallenBack = false;
      audio.onended = () => resolve();
      
      audio.onerror = () => {
        if (!hasFallenBack) {
          hasFallenBack = true;
          console.warn('Network TTS failed completely.');
          resolve();
        }
      };
      
      audio.play().catch(e => {
        if (!hasFallenBack) {
          hasFallenBack = true;
          console.warn('Audio play prevented by browser policy:', e);
          resolve();
        }
      });
    });
  }
};

const playLocalTTS = (text: string, langCode: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve(false);
      return;
    }
    
    // Ensure voices are loaded
    const voices = window.speechSynthesis.getVoices();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;

    const langPrefix = langCode.split('-')[0];
    const availableVoices = voices.filter(v => v.lang.startsWith(langPrefix));

    // Filter for female-sounding voices first, avoiding known male voices
    const maleKeywords = ['male', 'boy', 'man', 'david', 'mark', 'daniel', 'rishi'];
    const femaleKeywords = ['female', 'girl', 'woman', 'zira', 'samantha', 'victoria', 'aditi', 'lekha', 'google us english'];
    
    let candidateVoices = availableVoices.filter(v => !maleKeywords.some(mk => v.name.toLowerCase().includes(mk)));
    if (candidateVoices.length === 0) candidateVoices = availableVoices; // Fallback if all are marked male
    
    // Priority 1: Premium/Cloud Female voices
    let bestVoice = candidateVoices.find(v => {
      const name = v.name.toLowerCase();
      const isPremium = name.includes('google') || name.includes('siri') || name.includes('premium') || name.includes('natural') || name.includes('online');
      const isFemale = femaleKeywords.some(fk => name.includes(fk));
      return isPremium && isFemale;
    });

    // Priority 2: Any Female voice
    if (!bestVoice) {
      bestVoice = candidateVoices.find(v => femaleKeywords.some(fk => v.name.toLowerCase().includes(fk)));
    }

    // Priority 3: Any Premium/Cloud voice (Google Hindi/Marathi default to female usually)
    if (!bestVoice) {
      bestVoice = candidateVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('google') || name.includes('siri') || name.includes('premium') || name.includes('natural') || name.includes('online');
      });
    }

    // Fallback: first candidate
    if (!bestVoice) {
      bestVoice = candidateVoices[0];
    }

    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);
    
    window.speechSynthesis.speak(utterance);
  });
};

export const playPremiumVoice = async (text: string, language: string) => {
  if (!text) return;
  
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  const langCode = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-US';
  
  try {
    // Try Web Speech API (Local/Cloud Premium Voices) FIRST
    const success = await playLocalTTS(text, langCode);
    
    // If it fails (or no voice exists for the language), fallback to Google Translate TTS
    if (!success) {
      console.warn("Local voice failed or not found, falling back to Google Translate TTS");
      await playGoogleTranslateTTS(text, langCode);
    }
  } catch (error) {
    console.error("TTS error:", error);
    await playGoogleTranslateTTS(text, langCode);
  }
};
