import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { patient_id, language = 'en' } = await req.json()

    if (!patient_id) {
      return new Response(JSON.stringify({ error: 'patient_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials")
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch patient data
    const { data: profile } = await supabase
      .from('patient_profiles')
      .select('full_name')
      .eq('id', patient_id)
      .single()

    const name = profile?.full_name || 'The patient'

    // Fetch last 3 days of journal entries
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: journals } = await supabase
      .from('memory_journal')
      .select('content, sentiment, created_at')
      .eq('patient_id', patient_id)
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    const journalText = journals?.map((j: any) => `[${new Date(j.created_at).toLocaleDateString()}] Mood: ${j.sentiment || 'neutral'} - Note: ${j.content}`).join('\n') || 'No recent journal entries.'

    const langName =
      language === "hi"
        ? "Hindi (in Devanagari script)"
        : language === "mr"
        ? "Marathi (in Devanagari script)"
        : "English"

    const prompt = `You are an AI assistant for caregivers of dementia patients. 
Analyze the recent journal entries for the patient named ${name}. 
Generate a short, empathetic, and highly actionable 2-3 sentence summary of their recent well-being.
Always respond in ${langName}. Do not use markdown. Keep it very concise.

Recent Journal Entries:
${journalText}
`

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error("Missing Gemini API key")
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`
    
    const geminiBody = {
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 150
      }
    }

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    })

    const data = await res.json()
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!summary) {
      throw new Error("Failed to generate summary")
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})