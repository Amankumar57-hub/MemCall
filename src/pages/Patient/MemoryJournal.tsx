import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mic, Square, Loader2, Save, Sparkles, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { t } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';

// SpeechRecognition type definitions
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

import { db } from '../../lib/db';

export default function MemoryJournal() {
  const navigate = useNavigate();
  const { language } = useAppStore();
  const [profile, setProfile] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [journals, setJournals] = useState<any[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const fetchProfileAndJournals = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const { data: user } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        setProfile(user);

        if (user) {
          try {
            // ONLINE: Fetch from Supabase
            const { data: j, error } = await supabase
              .from('patient_journals')
              .select('*')
              .eq('patient_id', user.id)
              .order('created_at', { ascending: false });
              
            if (error) throw error;
            
            if (j) {
              setJournals(j);
              // Save to local IndexedDB for offline access
              await db.patient_journals.clear();
              await db.patient_journals.bulkAdd(j);
            }
          } catch (netError) {
            // OFFLINE: Fetch from Dexie
            console.log('Network error, fetching journals from local DB', netError);
            const localJournals = await db.patient_journals
              .where('patient_id')
              .equals(user.id)
              .reverse()
              .sortBy('created_at');
            setJournals(localJournals);
          }
        }
      } catch (err) {
        console.error("Auth error", err);
      }
    };
    fetchProfileAndJournals();
  }, []);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        if (isRecording) {
          // Restart if it stopped unexpectedly while supposedly recording
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
    }
  }, [language, isRecording]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const saveJournal = async () => {
    if (!transcript.trim() || !profile) return;
    
    setIsProcessing(true);
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    try {
      if (!navigator.onLine) {
        const offlineJournal = {
          patient_id: profile.id,
          transcription: transcript,
          ai_mood: 'neutral',
          ai_summary: 'Saved Offline',
          created_at: new Date().toISOString()
        };
        
        await db.sync_queue.add({
          table_name: 'patient_journals',
          operation: 'INSERT',
          payload: offlineJournal,
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        // Optimistic UI update for offline mode
        setJournals([{id: 'offline-' + Date.now(), ...offlineJournal}, ...journals]);
        setTranscript('');
      } else {
        // Send to AI for mood analysis
        const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-assistant', {
          body: { 
            prompt: `Analyze the following diary entry from a dementia patient and determine their primary mood. Reply in strict JSON format with two keys: "mood" (string, strictly one of: happy, sad, anxious, confused, neutral) and "summary" (a short 1-sentence summary of what they talked about in English).\n\nEntry: "${transcript}"` 
          }
        });

        let aiMood = 'neutral';
        let aiSummary = 'No summary available';

        if (aiResponse && !aiError) {
          try {
            // Attempt to parse JSON from AI response if it wrapped it in markdown or directly returned it
            let rawJson = aiResponse.reply || aiResponse.response || '{}';
            if (rawJson.includes('```json')) {
              rawJson = rawJson.split('```json')[1].split('```')[0].trim();
            } else if (rawJson.includes('```')) {
              rawJson = rawJson.split('```')[1].trim();
            }
            const parsed = JSON.parse(rawJson);
            if (parsed.mood) aiMood = parsed.mood.toLowerCase();
            if (parsed.summary) aiSummary = parsed.summary;
          } catch (e) {
            console.error('Failed to parse AI response', e, aiResponse);
          }
        }

        // Save to database
        const { data: newJournal, error: insertError } = await supabase.from('patient_journals').insert({
          patient_id: profile.id,
          transcription: transcript,
          ai_mood: aiMood,
          ai_summary: aiSummary
        }).select().single();

        if (insertError) throw insertError;
        
        setJournals([newJournal, ...journals]);
        setTranscript('');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save journal. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getMoodEmoji = (mood: string) => {
    switch(mood) {
      case 'happy': return '😄';
      case 'sad': return '😟';
      case 'anxious': return '😰';
      case 'confused': return '🤔';
      default: return '😐';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-6 py-4 flex items-center gap-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={() => navigate('/patient')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{t('Memory Journal', language)}</h1>
          <p className="text-xs text-gray-500">{t('Record your daily thoughts', language)}</p>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-3xl mx-auto">
        
        {/* Recording Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
            <BookOpen size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">How was your day?</h2>
          <p className="text-gray-500 mb-8 text-sm max-w-xs mx-auto">
            Tap the microphone and tell me about your day, any memories, or how you are feeling right now.
          </p>

          {/* Transcript Preview */}
          {transcript && (
            <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-left mb-6 min-h-[100px] relative">
              <p className="text-gray-700 italic">"{transcript}"</p>
              {isRecording && (
                <div className="flex gap-1 items-center mt-3 text-blue-500">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <span className="text-xs font-bold">Listening...</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleRecording}
              disabled={isProcessing}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white disabled:opacity-50 disabled:animate-none`}
            >
              {isRecording ? <Square size={32} /> : <Mic size={36} />}
            </button>
            
            {(transcript && !isRecording) && (
              <button
                onClick={saveJournal}
                disabled={isProcessing}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                Save Entry
              </button>
            )}
          </div>
        </div>

        {/* Past Journals */}
        <div>
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-purple-500" /> Previous Entries
          </h3>
          <div className="space-y-4">
            {journals.length === 0 ? (
              <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                You haven't recorded any journals yet.
              </p>
            ) : (
              journals.map(j => (
                <div key={j.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-start">
                  <div className="text-3xl bg-gray-50 p-2 rounded-xl border border-gray-100">
                    {getMoodEmoji(j.ai_mood)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-400">
                        {new Date(j.created_at).toLocaleDateString()} at {new Date(j.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize bg-gray-100 text-gray-600">
                        {j.ai_mood}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm mb-2 italic">"{j.transcription}"</p>
                    {j.ai_summary && j.ai_summary !== 'No summary available' && (
                      <p className="text-xs text-purple-600 font-medium bg-purple-50 inline-block px-2 py-1 rounded-md">
                        AI: {j.ai_summary}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
