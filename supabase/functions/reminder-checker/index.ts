import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getSupabaseAdmin } from "../_shared/supabase.ts"

serve(async (req) => {
  try {
    const supabase = getSupabaseAdmin()
    
    // In a real application, you'd calculate current time UTC
    // and query the reminders table for items where due_time matches current time (within a 1 minute window)
    
    const now = new Date();
    // Convert to UTC HH:MM string to match DB format (or handle local timezone if stored differently)
    // Assuming DB stores time as 'HH:MM:SS' or 'HH:MM'
    const hours = now.getUTCHours().toString().padStart(2, '0');
    const minutes = now.getUTCMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    // In PostgreSQL, time comparison can be exact or range based. 
    // We will do a generic fetch for active reminders around this time.
    const { data: dueReminders, error } = await supabase
      .from('reminders')
      .select('*, patient_id')
      .like('time', `${timeString}%`) // e.g. '09:30:00' matches '09:30%'
      .eq('is_active', true);
      
    if (error) throw error;
      
    if (dueReminders && dueReminders.length > 0) {
      for (const reminder of dueReminders) {
        // Here you would trigger FCM push notifications to the patient
        // via a service like Resend, Firebase Admin, etc.
        
        await supabase.from('alerts').insert({
           patient_id: reminder.patient_id,
           alert_type: 'reminder',
           message: `It is time for: ${reminder.title}`,
           severity: 'info'
        });
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Reminders checked" }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }
})
