import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FileText, Activity, Brain, CheckCircle } from 'lucide-react';

export default function ClinicalReport() {
  const { patientId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!patientId) return;
      try {
        // Fetch patient profile
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, patient_profiles(*)')
          .eq('id', patientId)
          .single();

        // Fetch recent games
        const { data: games } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('patient_id', patientId)
          .order('played_at', { ascending: false })
          .limit(10);

        // Fetch reminders stats
        const { data: reminders } = await supabase
          .from('reminders')
          .select('*')
          .eq('patient_id', patientId);

        setData({
          profile: profile,
          patientData: profile?.patient_profiles?.[0],
          games: games || [],
          reminders: reminders || [],
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patientId]);

  useEffect(() => {
    if (!loading && data) {
      // Trigger print dialog after a short delay to ensure rendering
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [loading, data]);

  if (loading) {
    return <div className="p-10 text-center">Generating Report...</div>;
  }

  if (!data || !data.profile) {
    return <div className="p-10 text-center text-red-500">Patient data not found.</div>;
  }

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="bg-white text-black p-8 max-w-4xl mx-auto" style={{ fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div className="border-b-2 border-indigo-600 pb-6 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900 mb-2 flex items-center gap-2">
            <FileText size={28} /> MemCall Clinical Report
          </h1>
          <p className="text-gray-600">Generated on {generatedDate}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-800">{data.profile.full_name}</p>
          <p className="text-gray-500">ID: {patientId}</p>
        </div>
      </div>

      {/* Summary Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
          <Activity size={20} className="text-indigo-600" /> Patient Overview
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Cognitive Score</p>
            <p className="text-2xl font-bold text-indigo-600">{data.patientData?.current_cognitive_score || 0}/100</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Active Streak</p>
            <p className="text-2xl font-bold text-amber-600">{data.patientData?.streak_days || 0} Days</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Last Active</p>
            <p className="text-xl font-bold text-gray-800">
              {data.patientData?.last_active_at 
                ? new Date(data.patientData.last_active_at).toLocaleDateString()
                : 'N/A'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Cognitive Activities (Games) */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
          <Brain size={20} className="text-indigo-600" /> Recent Cognitive Activities
        </h2>
        {data.games.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 border-b-2 border-gray-200 font-semibold text-gray-700">Date</th>
                <th className="p-3 border-b-2 border-gray-200 font-semibold text-gray-700">Activity</th>
                <th className="p-3 border-b-2 border-gray-200 font-semibold text-gray-700">Score</th>
                <th className="p-3 border-b-2 border-gray-200 font-semibold text-gray-700">Duration (s)</th>
              </tr>
            </thead>
            <tbody>
              {data.games.map((game: any) => (
                <tr key={game.id} className="border-b border-gray-100">
                  <td className="p-3">{new Date(game.played_at).toLocaleDateString()}</td>
                  <td className="p-3 capitalize">{game.game_id.replace('-', ' ')}</td>
                  <td className="p-3 font-medium">{game.score}</td>
                  <td className="p-3 text-gray-600">{game.duration_seconds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 italic">No recent activities recorded.</p>
        )}
      </div>

      {/* Reminders & Routine */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
          <CheckCircle size={20} className="text-indigo-600" /> Care Routine & Reminders
        </h2>
        {data.reminders.length > 0 ? (
          <ul className="space-y-3">
            {data.reminders.map((rem: any) => (
              <li key={rem.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800">{rem.title}</p>
                  <p className="text-sm text-gray-500 capitalize">{rem.type} • {rem.frequency}</p>
                </div>
                <div className="text-lg font-mono font-bold text-indigo-700">
                  {rem.time.substring(0, 5)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No active routines or reminders set.</p>
        )}
      </div>
      
      {/* Footer */}
      <div className="mt-16 text-center text-sm text-gray-400 border-t pt-4">
        This is an automatically generated clinical report from the MemCall platform.
        <br />For official medical use, please consult with a healthcare professional.
      </div>
    </div>
  );
}
