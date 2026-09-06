import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")

    if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
      throw new Error("Missing environment variables")
    }

    const { imageBase64, language } = await req.json()

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Missing imageBase64" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    })

    const authHeader = req.headers.get("Authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 })
    }

    // Fetch family photos for this patient
    const { data: familyMembers } = await supabase
      .from("family_photos")
      .select("name, relation, image_url")
      .eq("patient_id", user.id)

    let contextText = "Family Members Context:\n"
    if (familyMembers && familyMembers.length > 0) {
      familyMembers.forEach(member => {
        contextText += `- ${member.name} (Relation: ${member.relation}) [Photo URL: ${member.image_url}]\n`
      })
    } else {
      contextText += "No family members registered."
    }

    const prompt = `
You are a highly empathetic facial recognition assistant for a dementia patient.
The patient has pointed their camera at a person and wants to know who it is.
Here is the webcam snapshot provided as an image.

${contextText}

If you can confidently match the person in the webcam image to any of the provided family members (based on visual similarity or if you can deduce it), reply in a very sweet, comforting tone.
Example: "Yes, that is your grandson Rohan! He has come to visit you."

If you cannot recognize the person, or there are no family members provided, say:
"I am not entirely sure, but they look very friendly. You can ask them their name."

Reply in ${language === 'hi' ? 'Hindi (Devanagari script)' : language === 'mr' ? 'Marathi' : 'English'}.
Keep your response short (1-2 sentences), sweet, and direct.
Do NOT use markdown. Do NOT use emojis. Output ONLY the response text.
`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: imageBase64.replace(/^data:image\/\w+;base64,/, "")
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 100,
          },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error?.message || "Gemini API failed")
    }

    let reply = "I am not sure who this is, but they look friendly!"
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      reply = data.candidates[0].content.parts[0].text.trim()
    }

    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })

  } catch (error) {
    console.error("Edge Function Error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 })
  }
})
