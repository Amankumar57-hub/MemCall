import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Loader2 } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { supabase } from '../../../lib/supabase';
import { t } from '../../../lib/i18n';

// Expanded NER Culture based items pool
const ALL_ITEMS = [
  { id: 1, icon: '🦏', name: 'One-Horned Rhino' },
  { id: 2, icon: '🧣', name: 'Gamosa (Assam)' },
  { id: 3, icon: '🎍', name: 'Bamboo Craft' },
  { id: 4, icon: '☕', name: 'Assam Tea' },
  { id: 5, icon: '🦅', name: 'Hornbill Bird' },
  { id: 6, icon: '🌸', name: 'Foxtail Orchid' },
  { id: 7, icon: '🏔️', name: 'Kanchenjunga' },
  { id: 8, icon: '🥁', name: 'Bihu Dhol' },
  { id: 9, icon: '🌊', name: 'Brahmaputra River' },
  { id: 10, icon: '🦌', name: 'Sangai Deer' },
  { id: 11, icon: '🥟', name: 'Momo' },
  { id: 12, icon: '👒', name: 'Jaapi (Hat)' },
  { id: 13, icon: '🍓', name: 'Bhut Jolokia' },
  { id: 14, icon: '🌿', name: 'Tea Garden' },
  { id: 15, icon: '🚣', name: 'Loktak Lake' },
  { id: 16, icon: '🐅', name: 'Royal Bengal Tiger' }
];

export default function NERPatternGame() {
  const navigate = useNavigate();
  const { language } = useAppStore();
  const [cards, setCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [solved, setSolved] = useState<number[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [moves, setMoves] = useState(0);
  const [pairsCount, setPairsCount] = useState(6);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdaptiveDifficulty();
  }, []);

  const fetchAdaptiveDifficulty = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        initializeGame(6);
        return;
      }

      const { data } = await supabase
        .from('game_sessions')
        .select('score_percentage')
        .eq('patient_id', user.id)
        .eq('game_name', 'NERPatternGame')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        const avg = data.reduce((acc, curr) => acc + curr.score_percentage, 0) / data.length;
        if (avg < 50) {
          setPairsCount(3);
          initializeGame(3);
        } else if (avg >= 80) {
          setPairsCount(8);
          initializeGame(8);
        } else {
          setPairsCount(6);
          initializeGame(6);
        }
      } else {
        initializeGame(6);
      }
    } catch (err) {
      initializeGame(6);
    }
  };

  const initializeGame = (count = pairsCount) => {
    setLoading(true);
    // Randomly select items based on difficulty
    const shuffledPool = [...ALL_ITEMS].sort(() => Math.random() - 0.5);
    const selectedItems = shuffledPool.slice(0, count);
    
    const duplicatedItems = [...selectedItems, ...selectedItems];
    // Shuffle the 12 cards
    const shuffled = duplicatedItems
      .sort(() => Math.random() - 0.5)
      .map((item, index) => ({ ...item, uniqueId: index }));
    setCards(shuffled);
    setFlipped([]);
    setSolved([]);
    setMoves(0);
    setDisabled(false);
    setLoading(false);
  };

  const saveScore = async (finalMoves: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const perfectMoves = cards.length;
      let score = Math.round((perfectMoves / finalMoves) * 100);
      if (score > 100) score = 100;

      await supabase.from('game_sessions').insert({
        patient_id: user.id,
        game_name: 'NERPatternGame',
        score_percentage: score
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCardClick = (index: number) => {
    if (disabled || flipped.includes(index) || solved.includes(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setDisabled(true);
      setMoves(m => m + 1);
      const firstIndex = newFlipped[0];
      const secondIndex = newFlipped[1];

      if (cards[firstIndex].id === cards[secondIndex].id) {
        const updatedSolved = [...solved, firstIndex, secondIndex];
        setSolved(updatedSolved);
        setFlipped([]);
        setDisabled(false);
        
        if (updatedSolved.length === cards.length) {
          saveScore(moves + 1);
        }
      } else {
        setTimeout(() => {
          setFlipped([]);
          setDisabled(false);
        }, 1000);
      }
    }
  };

  const isGameOver = solved.length === cards.length && cards.length > 0;

  if (loading) return <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <main className="flex-1 px-4 md:px-8 max-w-5xl mx-auto w-full flex flex-col pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/patient/games')}
            className="p-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-[#5A4B81] dark:text-white">
              {t('NER Heritage Match', language) || 'NER Heritage Match'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
              {t('Match cultural symbols of the North East.', language) || 'Match cultural symbols of the North East.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium mr-2">{t('Moves', language)}:</span>
            <span className="text-lg font-bold text-[#7C3AED]">{moves}</span>
          </div>
          <button 
            onClick={() => fetchAdaptiveDifficulty()}
            className="p-3 bg-[#EFE8FA] dark:bg-gray-700 text-[#7C3AED] dark:text-purple-400 rounded-full shadow-sm hover:opacity-80 transition-opacity"
            aria-label="Restart game"
          >
            <RefreshCw size={24} />
          </button>
        </div>
      </div>

      {/* Game Board */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        {isGameOver ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 text-center max-w-sm w-full animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-[#DCFCE7] text-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Trophy size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('Excellent!', language)}</h2>
            <p className="text-gray-600 dark:text-gray-300 font-medium mb-8">
              {t('You matched all cultural symbols in', language)} {moves} {t('moves', language)}.
            </p>
            <button 
              onClick={() => fetchAdaptiveDifficulty()}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-2xl py-4 transition-colors shadow-sm active:scale-[0.98]"
            >
              {t('Play Again', language)}
            </button>
          </div>
        ) : (
          <div className={`grid gap-4 w-full max-w-2xl ${pairsCount === 3 ? 'grid-cols-3' : pairsCount === 8 ? 'grid-cols-4 md:grid-cols-4' : 'grid-cols-3 md:grid-cols-4'}`}>
            {cards.map((card, index) => {
              const isFlipped = flipped.includes(index) || solved.includes(index);
              return (
                <div 
                  key={card.uniqueId}
                  onClick={() => handleCardClick(index)}
                  className={`relative aspect-square cursor-pointer transition-transform duration-300 ${isFlipped ? 'scale-105' : 'hover:scale-105 active:scale-95'}`}
                >
                  <div className={`absolute w-full h-full rounded-3xl shadow-sm border-2 flex items-center justify-center transition-colors duration-300 ${
                    isFlipped 
                      ? 'bg-white dark:bg-gray-800 border-[#EFE8FA] dark:border-gray-700' 
                      : 'bg-[#7C3AED] border-[#7C3AED]'
                  }`}>
                    {isFlipped ? (
                      <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                        <span className="text-4xl md:text-5xl mb-1 md:mb-2">{card.icon}</span>
                        <span className="text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300 text-center px-1 leading-tight">{card.name}</span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-4 border-white/20 border-t-white/60 animate-pulse"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
