import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getSupabaseAdmin } from "../_shared/supabase.ts"

serve(async (req) => {
  try {
    const supabase = getSupabaseAdmin()
    
    // In a real application, you would calculate the start and end of the week,
    // fetch all game_sessions for that period grouped by patient_id,
    // compute an average score or a weighted score,
    // and then insert it into `cognitive_scores` table.
    
    // Example pseudocode for the algorithm:
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekDateStr = lastWeek.toISOString();

    const { data: patients, error: patientError } = await supabase.from('users').select('id').eq('role', 'patient');
    if (patientError) throw patientError;
      
    if (patients) {
      for (const patient of patients) {
        // Fetch sessions from last 7 days
        const { data: sessions } = await supabase.from('game_sessions')
          .select('score')
          .eq('patient_id', patient.id)
          .gte('played_at', lastWeekDateStr);
          
        let avgScore = 0;
        if (sessions && sessions.length > 0) {
          const sum = sessions.reduce((acc, curr) => acc + curr.score, 0);
          avgScore = Math.round(sum / sessions.length);
        }

        // Fetch previous score to determine trend
        const { data: previousScore } = await supabase.from('cognitive_scores')
          .select('score_value')
          .eq('patient_id', patient.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single();

        let trend = 'stable';
        if (previousScore) {
          if (avgScore < previousScore.score_value - 10) trend = 'declining';
          else if (avgScore > previousScore.score_value + 10) trend = 'improving';
        }
        
        if (sessions && sessions.length > 0) {
          await supabase.from('cognitive_scores').insert({
            patient_id: patient.id,
            score_value: avgScore,
            trend: trend,
            recorded_at: new Date().toISOString()
          });

          // Also update the patient_profiles current score
          await supabase.from('patient_profiles')
            .update({ current_cognitive_score: avgScore })
            .eq('user_id', patient.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ message: "Cognitive scores computed successfully" }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }
})
