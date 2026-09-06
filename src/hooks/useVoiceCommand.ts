import { useState, useCallback, useRef } from 'react';

// SpeechRecognition type definitions for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useVoiceCommand(lang: string = 'en-IN') {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const interimRef = useRef<string>('');

  const startListening = useCallback((overrideLang?: string) => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    interimRef.current = '';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore abort error
      }
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = overrideLang || lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalStr = '';
      let interimStr = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript;
        } else {
          interimStr += event.results[i][0].transcript;
        }
      }
      
      if (finalStr) {
        const cleaned = finalStr.trim();
        setTranscript(cleaned.toLowerCase());
        setInterimTranscript('');
        interimRef.current = '';
      } else if (interimStr) {
        const cleaned = interimStr.trim();
        setInterimTranscript(cleaned.toLowerCase());
        interimRef.current = cleaned.toLowerCase();
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition notice/error:", event.error);
      if (event.error === 'no-speech') {
        // User didn't speak, do not set hard error
      } else if (event.error === 'not-allowed') {
        setError("Microphone permission was denied.");
      } else {
        setError(event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Fallback: If interim had words but onresult didn't emit final before onend
      if (interimRef.current) {
        setTranscript(interimRef.current);
        setInterimTranscript('');
        interimRef.current = '';
      }
    };

    try {
      recognition.start();
    } catch (e: any) {
      console.warn("Recognition start failed, requesting permission first:", e);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          stream.getTracks().forEach(track => track.stop());
          try {
            recognition.start();
          } catch (err) {
            console.error(err);
          }
        }).catch((err) => {
          console.error("Microphone permission denied:", err);
          setError("Microphone permission denied.");
          setIsListening(false);
        });
      }
    }
  }, [lang]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
      setIsListening(false);
    }
  }, []);

  const resetTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    interimRef.current = '';
  };

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error
  };
}
