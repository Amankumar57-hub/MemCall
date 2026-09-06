import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Play } from 'lucide-react';
import { t } from '../../../lib/i18n';
import { useAppStore } from '../../../store/useAppStore';

interface TaskGuide {
  id: string;
  title: string;
  description: string;
}

interface TaskStep {
  id: string;
  step_number: number;
  instruction: string;
  image_url: string | null;
}

export default function TaskGuideViewer() {
  const { guideId } = useParams();
  const navigate = useNavigate();
  const { language, highContrast, fontSize } = useAppStore();
  
  const [guide, setGuide] = useState<TaskGuide | null>(null);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1); // -1 is the intro screen
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!guideId) return;
      const { data: g } = await supabase.from('task_guides').select('*').eq('id', guideId).single();
      const { data: s } = await supabase.from('task_steps').select('*').eq('guide_id', guideId).order('step_number', { ascending: true });
      
      if (g) setGuide(g);
      if (s) setSteps(s);
      setLoading(false);
    };
    
    fetchData();
  }, [guideId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background flex-col gap-4">
        <p className="text-2xl font-bold">Guide not found.</p>
        <button onClick={() => navigate(-1)} className="text-primary text-xl">&larr; Go Back</button>
      </div>
    );
  }

  const isIntro = currentStepIndex === -1;
  const isComplete = currentStepIndex >= steps.length;
  const currentStep = !isIntro && !isComplete ? steps[currentStepIndex] : null;
  const progressPercent = Math.max(0, Math.min(100, ((currentStepIndex + 1) / steps.length) * 100));

  const nextStep = () => setCurrentStepIndex(prev => prev + 1);
  const prevStep = () => setCurrentStepIndex(prev => Math.max(-1, prev - 1));
  const finishGuide = () => navigate('/patient/reminders');

  return (
    <div className={`min-h-screen flex flex-col ${highContrast ? 'bg-black text-white' : 'bg-[#F8FAFC]'}`}>
      
      {/* Top Bar with Progress */}
      <header className={`p-4 flex items-center gap-4 ${highContrast ? 'bg-black border-b border-white/20' : 'bg-white shadow-sm'}`}>
        <button onClick={() => navigate('/patient/reminders')} className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="font-bold text-sm">{guide.title}</span>
            {currentStepIndex >= 0 && currentStepIndex < steps.length && (
              <span className="font-bold text-sm text-primary">Step {currentStepIndex + 1} of {steps.length}</span>
            )}
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {isIntro && (
          <div className="animate-in fade-in zoom-in-95 duration-500 text-center max-w-lg w-full">
            <div className="w-32 h-32 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-8 shadow-inner">
              <Play size={48} className="ml-2" />
            </div>
            <h1 className="text-4xl font-black mb-4 text-gray-800 dark:text-white">{guide.title}</h1>
            <p className="text-2xl text-gray-600 dark:text-gray-400 mb-12 leading-relaxed">{guide.description}</p>
            
            <button 
              onClick={nextStep}
              className="w-full bg-primary text-white py-6 rounded-3xl text-2xl font-black shadow-xl hover:bg-primary-hover hover:scale-105 transition-all flex justify-center items-center gap-3 active:scale-95"
            >
              {t("Let's Start", language)} <ArrowRight size={28} />
            </button>
          </div>
        )}

        {currentStep && (
          <div className="animate-in slide-in-from-right fade-in duration-300 w-full max-w-2xl flex flex-col items-center text-center">
            {currentStep.image_url ? (
              <div className="w-full h-64 md:h-80 bg-gray-200 rounded-3xl mb-8 overflow-hidden shadow-md">
                <img src={currentStep.image_url} alt="Step visual" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full h-48 bg-blue-50 dark:bg-blue-900/20 rounded-3xl mb-8 flex items-center justify-center border-2 border-dashed border-blue-200 dark:border-blue-800">
                <span className="text-6xl text-blue-300 font-black opacity-50">{currentStepIndex + 1}</span>
              </div>
            )}
            <h2 className={`${currentStep.instruction.length > 60 ? 'text-2xl md:text-3xl' : 'text-4xl md:text-5xl'} font-black text-gray-800 dark:text-white mb-12 leading-relaxed text-balance break-words`}>
              {currentStep.instruction}
            </h2>
          </div>
        )}

        {isComplete && (
          <div className="animate-in zoom-in fade-in duration-500 text-center max-w-lg w-full">
            <div className="w-40 h-40 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-500 mx-auto mb-8 shadow-inner">
              <CheckCircle2 size={80} />
            </div>
            <h1 className="text-4xl font-black mb-4 text-gray-800 dark:text-white">All Done!</h1>
            <p className="text-2xl text-gray-600 dark:text-gray-400 mb-12">Great job completing this task.</p>
            
            <button 
              onClick={finishGuide}
              className="w-full bg-green-500 text-white py-6 rounded-3xl text-2xl font-black shadow-xl hover:bg-green-600 hover:scale-105 transition-all flex justify-center items-center gap-3 active:scale-95"
            >
              Finish
            </button>
          </div>
        )}

      </main>

      {/* Bottom Navigation for Steps */}
      {(!isIntro && !isComplete) && (
        <div className={`p-6 flex gap-4 ${highContrast ? 'bg-black' : 'bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)]'} z-10 relative`}>
          <button 
            onClick={prevStep}
            className="flex-1 py-5 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold text-xl transition-all active:scale-95"
          >
            Back
          </button>
          <button 
            onClick={nextStep}
            className="flex-[2] py-5 rounded-2xl bg-primary text-white font-black text-2xl shadow-lg hover:bg-primary-hover transition-all active:scale-95"
          >
            {currentStepIndex === steps.length - 1 ? 'Done' : 'Next Step'}
          </button>
        </div>
      )}

    </div>
  );
}
