import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, List, Trash2, ChevronRight, X, Image as ImageIcon } from 'lucide-react';
import { t } from '../lib/i18n';
import { useAppStore } from '../store/useAppStore';

interface TaskGuide {
  id: string;
  title: string;
  description: string;
  icon_name: string;
}

interface TaskStep {
  id: string;
  step_number: number;
  instruction: string;
  image_url: string | null;
}

export default function TaskGuideManager({ patientId }: { patientId: string }) {
  const { language } = useAppStore();
  const [guides, setGuides] = useState<TaskGuide[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  const [selectedGuide, setSelectedGuide] = useState<TaskGuide | null>(null);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  
  const [newStepInst, setNewStepInst] = useState('');
  const [newStepImage, setNewStepImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    fetchGuides();
  }, [patientId]);

  const fetchGuides = async () => {
    const { data } = await supabase.from('task_guides').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
    if (data) setGuides(data);
    setLoading(false);
  };

  const fetchSteps = async (guideId: string) => {
    setLoadingSteps(true);
    const { data } = await supabase.from('task_steps').select('*').eq('guide_id', guideId).order('step_number', { ascending: true });
    if (data) setSteps(data);
    setLoadingSteps(false);
  };

  const handleCreateGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const { data } = await supabase.from('task_guides').insert({
      patient_id: patientId,
      title: newTitle,
      description: newDesc
    }).select().single();
    
    if (data) {
      setGuides([data, ...guides]);
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
    }
  };

  const handleDeleteGuide = async (id: string) => {
    await supabase.from('task_guides').delete().eq('id', id);
    setGuides(guides.filter(g => g.id !== id));
    if (selectedGuide?.id === id) setSelectedGuide(null);
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepInst.trim() || !selectedGuide) return;
    
    // Auto-split if user pastes multiple steps like "Step 1: ... Step 2: ..."
    let parsedSteps = [newStepInst.trim()];
    if (newStepInst.includes('Step ') || newStepInst.includes('step ')) {
      const parts = newStepInst.split(/(?:\b|(?<=\s))[Ss]tep \d+:/).map(s => s.trim()).filter(s => s.length > 0);
      if (parts.length > 0) {
        parsedSteps = parts;
      }
    }
    
    let currentStepNum = steps.length > 0 ? steps[steps.length - 1].step_number : 0;
    const newStepsAdded = [];
    
    setIsUploading(true);
    let imageUrl = null;
    
    if (newStepImage) {
      try {
        const fileExt = newStepImage.name.split('.').pop() || 'jpg';
        const fileName = `${patientId}/tasks/${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('family_photos').upload(fileName, newStepImage);
        
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('family_photos').getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    
    for (let i = 0; i < parsedSteps.length; i++) {
      const inst = parsedSteps[i];
      currentStepNum++;
      const { data } = await supabase.from('task_steps').insert({
        guide_id: selectedGuide.id,
        step_number: currentStepNum,
        instruction: inst,
        image_url: i === 0 ? imageUrl : null // only attach image to first step if multiple were pasted
      }).select().single();
      
      if (data) {
        newStepsAdded.push(data);
      }
    }
    
    setSteps([...steps, ...newStepsAdded]);
    setNewStepInst('');
    setNewStepImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
  };

  const handleDeleteStep = async (id: string) => {
    await supabase.from('task_steps').delete().eq('id', id);
    setSteps(steps.filter(s => s.id !== id));
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-white/10 rounded-2xl p-6 shadow-sm mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <List size={20} className="text-blue-500" />
          {t('Visual Task Guides', language)}
        </h3>
        <button onClick={() => setShowAddModal(true)} className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
          <Plus size={16} /> New Guide
        </button>
      </div>

      {!selectedGuide ? (
        <div className="space-y-3">
          {guides.length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-xl border border-dashed">No task guides found. Create one to help the patient with daily routines.</p>
          )}
          {guides.map(guide => (
            <div key={guide.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
              <div>
                <h4 className="font-bold text-gray-800 dark:text-white">{guide.title}</h4>
                <p className="text-xs text-gray-500">{guide.description}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setSelectedGuide(guide); fetchSteps(guide.id); }}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  title="Edit Steps"
                >
                  <ChevronRight size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteGuide(guide.id)}
                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in-95 duration-200">
          <button onClick={() => setSelectedGuide(null)} className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-1 hover:text-primary">
            &larr; Back to Guides
          </button>
          
          <h4 className="font-bold text-xl text-gray-800 dark:text-white mb-1">{selectedGuide.title}</h4>
          <p className="text-sm text-gray-500 mb-6 border-b pb-4">Manage the step-by-step instructions for this task.</p>

          <div className="space-y-3 mb-6">
            {loadingSteps ? <Loader2 className="animate-spin mx-auto text-primary" /> : (
              steps.length === 0 ? <p className="text-sm text-gray-500 italic text-center py-4">No steps added yet.</p> :
              steps.map((step, idx) => (
                <div key={step.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{step.instruction}</p>
                  </div>
                  <button onClick={() => handleDeleteStep(step.id)} className="text-red-500 hover:text-red-700 p-2">
                    <X size={18} />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddStep} className="flex flex-col gap-2">
            <div className="flex gap-2 w-full">
              <input 
                type="text"
                value={newStepInst}
                onChange={e => setNewStepInst(e.target.value)}
                placeholder="E.g., Turn on the stove..."
                className="flex-1 border p-3 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                required
              />
              
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => setNewStepImage(e.target.files?.[0] || null)}
              />
              
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className={`p-3 rounded-xl border flex items-center justify-center transition-colors ${newStepImage ? 'bg-green-100 border-green-200 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                title="Attach photo"
              >
                <ImageIcon size={20} />
              </button>

              <button type="submit" disabled={isUploading} className="bg-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1 disabled:opacity-70 min-w-[110px] justify-center">
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Add Step</>}
              </button>
            </div>
            {newStepImage && (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <ImageIcon size={12} /> {newStepImage.name} attached
                <button type="button" onClick={() => { setNewStepImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="ml-2 text-red-500 hover:underline">Remove</button>
              </div>
            )}
          </form>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 w-full max-w-sm border dark:border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Create New Task Guide</h3>
            <form onSubmit={handleCreateGuide}>
              <input 
                type="text" 
                placeholder="Task Title (e.g. Making Tea)" 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                className="w-full border dark:border-white/20 p-3 rounded-xl mb-3 bg-transparent text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary" 
                required 
              />
              <input 
                type="text" 
                placeholder="Short description..." 
                value={newDesc} 
                onChange={e => setNewDesc(e.target.value)} 
                className="w-full border dark:border-white/20 p-3 rounded-xl mb-4 bg-transparent text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary" 
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700 dark:hover:text-gray-200">Cancel</button>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-hover transition-colors">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
