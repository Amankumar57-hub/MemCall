import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MapPin, Image as ImageIcon, Volume2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { t } from '../../lib/i18n';
import { playPremiumVoice } from '../../lib/tts';

import { db } from '../../lib/db';
import type { PatientItem } from '../../lib/db';

export default function ObjectLocator() {
  const navigate = useNavigate();
  const { language } = useAppStore();
  const [items, setItems] = useState<PatientItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        // ONLINE: Fetch from Supabase
        const { data, error } = await supabase
          .from('patient_items')
          .select('*')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data) {
          setItems(data);
          // Save to local IndexedDB for offline access
          await db.patient_items.clear();
          await db.patient_items.bulkAdd(data);
        }
      } catch (netError) {
        // OFFLINE: Fetch from Dexie
        console.log('Network error, fetching items from local DB', netError);
        const localItems = await db.patient_items
          .where('patient_id')
          .equals(user.id)
          .reverse()
          .sortBy('created_at');
        setItems(localItems);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (itemName: string, locationDesc: string) => {
    const text = language === 'hi' 
      ? `Aapka ${itemName} yahan rakha hai: ${locationDesc}`
      : `Your ${itemName} is located at: ${locationDesc}`;
    
    playPremiumVoice(text, language === 'hi' ? 'hi-IN-Neural2-B' : 'en-US-Neural2-F');
  };

  const filteredItems = items.filter(item => 
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location_desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FCF9EE] dark:bg-[#0F172A] p-6 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={() => navigate('/patient')}
          className="w-16 h-16 bg-white dark:bg-card rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform border-4 border-transparent active:border-primary"
        >
          <ArrowLeft size={32} className="text-gray-800 dark:text-white" />
        </button>
      </div>

      <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">{t('Find My Things', language)}</h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">{t('Look for items added by your caregiver', language)}</p>

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={28} className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('Search for an item...', language)}
          className="w-full pl-14 pr-4 py-6 bg-white dark:bg-card border-2 border-gray-100 dark:border-white/10 rounded-3xl text-2xl shadow-sm focus:border-primary focus:outline-none dark:text-white transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-primary mb-4" size={48} />
          <p className="text-xl text-gray-500">{t('Loading items...', language)}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-card rounded-3xl p-8 shadow-sm">
          <Search size={64} className="text-gray-300 mb-4" />
          <p className="text-2xl text-gray-500 text-center">
            {searchQuery ? t('No items found matching your search.', language) : t('No items have been added yet.', language)}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pb-12">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white dark:bg-card rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-white/10 flex gap-6 items-center">
              {item.image_url ? (
                <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gray-200 shrink-0">
                  <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <ImageIcon size={48} className="text-gray-400" />
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{item.item_name}</h3>
                <div className="flex items-start gap-2 text-xl text-gray-600 dark:text-gray-300">
                  <MapPin size={24} className="shrink-0 text-red-500 mt-1" />
                  <p>{item.location_desc}</p>
                </div>
              </div>
              
              <button 
                onClick={() => handleSpeak(item.item_name, item.location_desc)}
                className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                aria-label="Listen to location"
              >
                <Volume2 size={36} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
