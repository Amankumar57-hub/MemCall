export const playPremiumVoice = (text: string, language: string) => {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set language code
  utterance.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 1.1; // Slightly higher pitch for a "sweet" female voice

  // Safari/Chrome have different ways of loading voices, so we ensure they are loaded
  const setBestVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    // We want a high-quality female voice
    const premiumKeywords = ['google', 'siri', 'samantha', 'lekha', 'zira', 'karen', 'tessa'];
    
    // First try to find a premium female voice matching the language
    let bestVoice = voices.find(v => 
      v.lang.startsWith(utterance.lang.split('-')[0]) && 
      premiumKeywords.some(keyword => v.name.toLowerCase().includes(keyword))
    );

    // Fallback 1: Any voice for the specific language that has "female" or premium keywords
    if (!bestVoice) {
      bestVoice = voices.find(v => 
        v.lang.startsWith(utterance.lang.split('-')[0]) && 
        (v.name.toLowerCase().includes('female') || premiumKeywords.some(keyword => v.name.toLowerCase().includes(keyword)))
      );
    }

    // Fallback 2: Any voice for the language
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
    }

    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    setBestVoice();
  } else {
    // Wait for voices to load (especially on Safari/Chrome on first load)
    window.speechSynthesis.onvoiceschanged = () => {
      setBestVoice();
    };
    // Fallback if event doesn't fire
    setTimeout(setBestVoice, 1000);
  }
};
