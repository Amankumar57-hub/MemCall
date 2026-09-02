// Global Audio utilities

export const playClickSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ctx) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.1)
    }
  } catch(e) {
    console.error("Audio playback failed", e)
  }
}

export const playVoice = (text: string, language: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
    utterance.pitch = 1.2
    utterance.rate = 0.9
    
    // Try to find a sweet female voice
    const voices = window.speechSynthesis.getVoices()
    const femaleVoice = voices.find(v => 
      v.lang.includes(utterance.lang) && 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('zira') || 
       v.name.toLowerCase().includes('lekha') || 
       v.name.toLowerCase().includes('aditi'))
    )
    
    if (femaleVoice) {
      utterance.voice = femaleVoice
    }
    
    window.speechSynthesis.speak(utterance)
  }
}
