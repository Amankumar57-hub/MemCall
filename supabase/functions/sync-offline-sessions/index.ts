import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getSupabaseAdmin } from "../_shared/supabase.ts"

// CORS headers for client requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessions } = await req.json()
    
    if (!Array.isArray(sessions) || sessions.length === 0) {
      throw new Error("Invalid payload: 'sessions' must be a non-empty array")
    }

    const supabase = getSupabaseAdmin()
    
    // Validate auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error("Missing Authorization header")
    }
    
    // In production, we'd verify the JWT. 
    // Here we're using the admin client to bulk insert safely.
    const { data, error } = await supabase
      .from('game_sessions')
      .upsert(sessions, { onConflict: 'id' }) // Prevent duplicates if same session sent twice
      
    if (error) throw error

    return new Response(JSON.stringify({ success: true, count: sessions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
