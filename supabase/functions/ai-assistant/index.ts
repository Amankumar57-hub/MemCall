import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  try {
    // Environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")

    // Check required secrets
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL is not set")
    }

    if (!supabaseAnonKey) {
      throw new Error("SUPABASE_ANON_KEY is not set")
    }

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not set")
    }

    // Read request
    const { transcript, language, imageBase64 } = await req.json()

    if (!transcript && !imageBase64) {
      return new Response(
        JSON.stringify({
          error: "Missing transcript or image",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 400,
        }
      )
    }

    // Supabase client
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization:
              req.headers.get("Authorization") || "",
          },
        },
      }
    )

    // Get authenticated user
    const authHeader = req.headers.get("Authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 401,
        }
      )
    }

    // Get patient profile
    const { data: profile } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .single()

    const { data: profileData } = await supabase
      .from("patient_profiles")
      .select("preferred_name, current_cognitive_score, streak_days")
      .eq("user_id", user.id)
      .single()

    if (imageBase64) {
      // Analyze Face Logic
      const { data: familyMembers } = await supabase
        .from("family_members")
        .select("name, relation, avatar_url")
        .eq("user_id", user.id)

      let contextText = "Family Members Context:\n"
      if (familyMembers && familyMembers.length > 0) {
        familyMembers.forEach((member: any) => {
          contextText += `- ${member.name} (Relation: ${member.relation}) [Photo URL: ${member.avatar_url}]\n`
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
"this photo is not available in your file"

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
    }

    // Normal Assistant Logic
    const { data: reminders } = await supabase
      .from("reminders")
      .select("title, time, type")
      .eq("patient_id", user.id)
      .eq("is_active", true)

    const { data: patientItems } = await supabase
      .from("patient_items")
      .select("item_name, location_desc, image_url")
      .eq("patient_id", user.id)

    // Language
    const langName =
      language === "hi"
        ? "Hindi (in Devanagari script)"
        : language === "mr"
        ? "Marathi (in Devanagari script)"
        : "English"

    // Patient context
    let patientContext =
      `Patient Name: ${profile?.full_name || "Patient"}\n`

    if (profileData) {
      patientContext +=
        `Cognitive Score: ${
          profileData.current_cognitive_score || 0
        }, Streak: ${
          profileData.streak_days || 0
        } days\n`
    }

    if (reminders && reminders.length > 0) {
      patientContext += "Active Reminders:\n"

      reminders.forEach((r) => {
        patientContext +=
          `- ${r.time}: ${r.title} (${r.type})\n`
      })
    } else {
      patientContext +=
        "No active reminders right now.\n"
    }

    if (patientItems && patientItems.length > 0) {
      patientContext += "Patient's Belongings Locations:\n"
      patientItems.forEach(item => {
        patientContext += `- Item: ${item.item_name} | Location: ${item.location_desc} | Image: ${item.image_url || 'none'}\n`
      })
    } else {
      patientContext += "No belongings registered yet.\n"
    }

    // System prompt
    const systemPrompt = `
You are "MEMCALL", a very sweet, loving, patient, and cheerful AI assistant for a dementia patient.

Your name is ALWAYS MEMCALL.
Do not claim to be a human.

When asked "what is your name?", respond naturally:
"My name is MEMCALL. I am here to help you."

Patient Context:
${patientContext}

Guidelines:

1. Always reply in ${langName} in a very sweet, lovely tone.
2. Be extremely encouraging, respectful, and sweet.
3. Keep answers conversational and warm.
4. Keep answers to 2-4 short sentences.
5. Do NOT use emojis.
6. MEDICAL SAFETY:
   Never invent a medication.
   Never recommend starting, stopping, or changing medication.
   Never contradict a doctor's schedule.
   Do not diagnose.
7. DEMENTIA SCOPE:
   If asked unrelated questions like stock prices or coding, politely decline.
8. If the patient asks where a specific item is (e.g. "where are my glasses?"), check the "Patient's Belongings Locations" list. If found, tell them the location warmly and include the image URL in the JSON response. If not found, tell them you don't know but they can ask their caregiver.
9. If the patient's tone seems highly anxious, scared, or they are repetitively asking the same worried questions, set anxiety_detected to true.

IMPORTANT: You MUST respond in pure JSON format only (no markdown blocks).
Format:
{
  "reply": "Your sweet response here.",
  "show_item_image": "image_url_here_if_asked_and_found_otherwise_null",
  "anxiety_detected": true_or_false
}
`

    // Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: systemPrompt,
              },
            ],
          },

          contents: [
            {
              parts: [
                {
                  text: transcript,
                },
              ],
            },
          ],

          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 250,
          },
        }),
      }
    )

    const data = await response.json()

    // Gemini API error
    if (!response.ok) {
      console.error(
        "Gemini API Error:",
        JSON.stringify(data)
      )

      throw new Error(
        data?.error?.message ||
        `Gemini API request failed with status ${response.status}`
      )
    }

    // Extract response
    let rawResponse = "{}"
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      rawResponse = data.candidates[0].content.parts[0].text.trim()
    }
    
    // Remove markdown code blocks if present
    if (rawResponse.startsWith('```json')) {
      rawResponse = rawResponse.replace(/```json\n?/, '').replace(/```$/, '').trim();
    } else if (rawResponse.startsWith('```')) {
      rawResponse = rawResponse.replace(/```\n?/, '').replace(/```$/, '').trim();
    }

    let parsed = { reply: "Sorry, I couldn't understand.", show_item_image: null, anxiety_detected: false }
    try {
      parsed = JSON.parse(rawResponse)
    } catch (e) {
      console.error("Failed to parse Gemini JSON response", rawResponse)
      parsed.reply = rawResponse
    }

    // Insert alert if high anxiety is detected
    if (parsed.anxiety_detected) {
      const { data: links } = await supabase
        .from('caregiver_patient_links')
        .select('caregiver_id')
        .eq('patient_id', user.id)
      
      if (links && links.length > 0) {
        const caregiverId = links[0].caregiver_id
        await supabase.from('alerts').insert({
          patient_id: user.id,
          caregiver_id: caregiverId,
          type: 'Anxiety Alert',
          message: `The AI assistant detected high anxiety or repetitive worried questions from the patient.`
        })
      }
    }

    return new Response(
      JSON.stringify(parsed),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error(
      "Edge Function Error:",
      error
    )

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    )
  }
})