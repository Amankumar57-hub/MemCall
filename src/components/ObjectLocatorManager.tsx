import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, MapPin, Trash2, Image as ImageIcon, Search } from 'lucide-react';
import { t } from '../lib/i18n';
import { useAppStore } from '../store/useAppStore';

interface PatientItem {
  id: string;
  item_name: string;
  location_desc: string;
  image_url: string | null;
}

export default function ObjectLocatorManager({ patientId }: { patientId: string }) {
  const { language } = useAppStore();
  const [items, setItems] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newLocationDesc, setNewLocationDesc] = useState('');
  const [newItemImage, setNewItemImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    fetchItems();
  }, [patientId]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('patient_items')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
      
    if (data) setItems(data);
    setLoading(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newLocationDesc.trim()) return;
    
    setIsUploading(true);
    let imageUrl = null;
    
    if (newItemImage) {
      try {
        const fileExt = newItemImage.name.split('.').pop() || 'jpg';
        const fileName = `${patientId}/items/${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('family_photos').upload(fileName, newItemImage);
        
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('family_photos').getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    
    const { data } = await supabase.from('patient_items').insert({
      patient_id: patientId,
      item_name: newItemName.trim(),
      location_desc: newLocationDesc.trim(),
      image_url: imageUrl
    }).select().single();
    
    if (data) {
      setItems([data, ...items]);
      setShowAddModal(false);
      setNewItemName('');
      setNewLocationDesc('');
      setNewItemImage(null);
    }
    setIsUploading(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await supabase.from('patient_items').delete().eq('id', id);
    setItems(items.filter(i => i.id !== id));
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="bg-white dark:bg-card rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-border mt-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <Search size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Object Locator</h3>
            <p className="text-sm text-gray-500">Help patient find their belongings.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-hover transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.length === 0 ? (
          <p className="text-gray-500 italic text-sm col-span-2 py-4">No items added yet. Click "Add Item" to start.</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="border dark:border-white/10 rounded-2xl p-4 flex gap-4 bg-gray-50 dark:bg-white/5 relative group">
              {item.image_url ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                  <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <ImageIcon className="text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 dark:text-white text-lg">{item.item_name}</h4>
                <div className="flex items-start gap-1 text-sm text-gray-600 dark:text-gray-300 mt-1">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-red-500" />
                  <p>{item.location_desc}</p>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteItem(item.id)}
                className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-800 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border dark:border-white/10"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 w-full max-w-sm border dark:border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Add New Item</h3>
            <form onSubmit={handleAddItem}>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Item Name (e.g. Glasses)</label>
              <input 
                type="text" 
                value={newItemName} 
                onChange={e => setNewItemName(e.target.value)} 
                className="w-full border dark:border-white/20 p-3 rounded-xl mb-3 bg-transparent text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
                required 
              />
              
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Location (e.g. On the bedside table)</label>
              <textarea 
                value={newLocationDesc} 
                onChange={e => setNewLocationDesc(e.target.value)} 
                className="w-full border dark:border-white/20 p-3 rounded-xl mb-4 bg-transparent text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]" 
                required
              />
              
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Item Photo (Optional)</label>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => setNewItemImage(e.target.files?.[0] || null)}
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className={`w-full p-3 rounded-xl border flex items-center justify-center gap-2 mb-6 transition-colors ${newItemImage ? 'bg-green-100 border-green-200 text-green-700' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
              >
                <ImageIcon size={20} />
                {newItemImage ? newItemImage.name : 'Upload Photo'}
              </button>

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700">Cancel</button>
                <button type="submit" disabled={isUploading} className="bg-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 disabled:opacity-70">
                  {isUploading && <Loader2 size={16} className="animate-spin" />}
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
