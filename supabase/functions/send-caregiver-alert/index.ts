import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getSupabaseAdmin } from "../_shared/supabase.ts"

serve(async (req) => {
  try {
    const payload = await req.json()
    // payload represents the database trigger payload (e.g. from an insert on cognitive_scores)
    
    if (payload.type === 'INSERT' && payload.record.trend === 'declining') {
      const supabase = getSupabaseAdmin()
      const patientId = payload.record.patient_id
      
      // Find linked caregiver
      const { data: link } = await supabase
        .from('caregiver_patient_links')
        .select('caregiver_id')
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .single()
        
      if (link) {
        // Insert alert
        await supabase.from('alerts').insert({
          caregiver_id: link.caregiver_id,
          patient_id: patientId,
          alert_type: 'cognitive_drop',
          message: 'Cognitive score has declined recently. Please check the dashboard.',
          severity: 'warning'
        })
        
        // In a real implementation, you would also trigger FCM / APNs here
        // using the caregiver's push token.
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }
})
