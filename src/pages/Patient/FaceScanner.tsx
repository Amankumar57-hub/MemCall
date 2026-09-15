import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Volume2, Maximize } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { t } from '../../lib/i18n';
import { Network } from '@capacitor/network';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { playPremiumVoice } from '../../lib/tts';

export default function FaceScanner() {
  const navigate = useNavigate();
  const { language } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      setResult(null);
      setSnapshotUrl(null);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      setError(t('Camera access denied or unavailable.', language));
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) {}
    
    setIsScanning(true);
    setResult(null);
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Calculate scaled dimensions to avoid Payload Too Large errors
    const MAX_WIDTH = 640;
    const MAX_HEIGHT = 640;
    let width = video.videoWidth;
    let height = video.videoHeight;
    
    if (width > height) {
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
    } else {
      if (height > MAX_HEIGHT) {
        width = Math.round((width * MAX_HEIGHT) / height);
        height = MAX_HEIGHT;
      }
    }

    // Set canvas dimensions to scaled size
    canvas.width = width;
    canvas.height = height;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, width, height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.7);
      
      // Stop the camera once we have captured the frame to save resources
      setSnapshotUrl(base64Image);
      stopCamera();
      
      try {
        setResult(t('Analyzing face...', language));
        
        const { loadFaceModels } = await import('../../lib/syncFamilyMembers');
        const { db } = await import('../../lib/db');
        
        const isLoaded = await loadFaceModels();
        if (!isLoaded) throw new Error("Models not loaded");

        // Detect face in captured image
        const img = new Image();
        img.src = base64Image;
        await new Promise(r => img.onload = r);
        
        const detection = await (window as any).faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        
        if (!detection) {
          const msg = language === 'hi' ? "कोई चेहरा नहीं दिखा।" : "No face detected.";
          setResult(msg);
          playPremiumVoice(msg, language === 'hi' ? 'hi-IN-Neural2-B' : 'en-US-Neural2-F');
          setIsScanning(false);
          return;
        }

        // Match against Dexie database
        const familyMembers = await db.family_members.toArray();
        let bestMatch = null;
        let minDistance = 0.55; // Threshold for face matching

        for (const member of familyMembers) {
          if (member.face_descriptor) {
            const desc1 = new Float32Array(member.face_descriptor);
            const desc2 = detection.descriptor;
            const distance = (window as any).faceapi.euclideanDistance(desc1, desc2);
            
            if (distance < minDistance) {
              minDistance = distance;
              bestMatch = member;
            }
          }
        }

        if (bestMatch) {
          const relText = bestMatch.relation ? `${bestMatch.relation}` : 'family member';
          const msg = language === 'hi' 
            ? `ये आपके ${relText} ${bestMatch.name} हैं।` 
            : `This is your ${relText}, ${bestMatch.name}.`;
          setResult(msg);
          playPremiumVoice(msg, language === 'hi' ? 'hi-IN-Neural2-B' : 'en-US-Neural2-F');
        } else {
          const msg = language === 'hi' 
            ? "मैं इस व्यक्ति को नहीं पहचान पाया।" 
            : "I couldn't recognize this person from your family list.";
          setResult(msg);
          playPremiumVoice(msg, language === 'hi' ? 'hi-IN-Neural2-B' : 'en-US-Neural2-F');
        }
      } catch(err) {
        console.error('Face scanning error:', err);
        const errorMsg = language === 'hi' 
          ? "फेस स्कैनिंग में त्रुटि। कृपया 'मेरी फैमिली' में फोटो चेक करें।"
          : "Error in face scanning. Please check 'My Family' photos.";
        setError(errorMsg);
        playPremiumVoice(errorMsg, language === 'hi' ? 'hi-IN-Neural2-B' : 'en-US-Neural2-F');
      } finally {
        setIsScanning(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full">
        <button onClick={() => navigate('/patient')} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors">
          <ArrowLeft size={28} />
        </button>
        <h1 className="text-xl font-bold tracking-wide shadow-black drop-shadow-md">
          {t('Who is This?', language)}
        </h1>
        <div className="w-12 h-12"></div> {/* spacer */}
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-gray-900">
        {error ? (
          <div className="p-8 text-center max-w-sm">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera size={32} />
            </div>
            <p className="text-red-400 font-medium">{error}</p>
            <button onClick={startCamera} className="mt-6 px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
              {t('Try Again', language)}
            </button>
          </div>
        ) : (
          <>
            {snapshotUrl ? (
              <img 
                src={snapshotUrl} 
                alt="Captured Face" 
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            
            {/* Viewfinder overlay */}
            {!snapshotUrl && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-80 md:w-80 md:h-96 border-4 border-white/40 rounded-[3rem] relative">
                  {/* Corner markers */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-[3rem]"></div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-[3rem]"></div>
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-[3rem]"></div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-[3rem]"></div>
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-24 pb-12 px-6 flex flex-col items-center">
              {result && (
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 mb-8 w-full max-w-md animate-in slide-in-from-bottom-4 flex items-start gap-4 shadow-2xl">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Volume2 size={24} className="text-white" />
                  </div>
                  <p className="text-lg md:text-xl font-bold leading-relaxed">{result}</p>
                </div>
              )}

              {snapshotUrl ? (
                <button 
                  onClick={startCamera}
                  className="px-8 py-4 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl text-white font-bold transition-all border border-white/30 shadow-lg"
                >
                  {t('Scan Again', language) || 'Scan Again'}
                </button>
              ) : (
                <>
                  <button 
                    onClick={captureAndAnalyze}
                    disabled={isScanning}
                    className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 border-4 border-gray-300 relative"
                  >
                    {isScanning ? (
                      <Loader2 size={32} className="text-primary animate-spin" />
                    ) : (
                      <div className="w-20 h-20 bg-primary rounded-full"></div>
                    )}
                  </button>
                  <p className="mt-4 text-white/70 font-medium">
                    {isScanning ? t('Analyzing face...', language) : t('Tap to scan face', language)}
                  </p>
                </>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </main>
    </div>
  );
}
