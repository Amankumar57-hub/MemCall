export async function generateGeminiResponse(
  transcript: string,
  context: {
    language: string
    patientName: string
    currentMood?: string
    page?: string
  }
) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  
  if (!apiKey) {
    console.warn("No Gemini API Key found in .env.local")
    return context.language === 'hi' 
      ? "माफ़ कीजिए, मैं अभी आपसे बात नहीं कर सकती। सिस्टम में कुछ दिक्कत है।"
      : "I'm sorry, I cannot connect to my brain right now. Please add the API key."
  }

  const systemPrompt = `You are Sahayak (or Assistant), a sweet, caring, and highly positive AI voice assistant for an elderly patient named ${context.patientName}. 
Currently, the patient is on the ${context.page || 'Dashboard'} page.
Their current mood is recorded as: ${context.currentMood || 'Unknown'}.
The user prefers to speak in ${context.language === 'hi' ? 'Hindi' : 'English'}.
Always reply in ${context.language === 'hi' ? 'Hindi (in Devanagari script)' : 'English'}.

Guidelines:
1. Be extremely encouraging, respectful, and sweet.
2. Keep your answers very short (1-2 sentences max) because they will be read aloud by Text-to-Speech.
3. If they are sad or angry, comfort them and suggest playing a relaxing game like 'Memory Garden' or 'Memory Match'.
4. If they ask a general question, answer it simply and positively.
5. If they just say hello, greet them warmly.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              parts: [{ text: transcript }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100, // keep it short
          }
        })
      }
    )

    const data = await response.json()
    
    if (data.error) {
      console.error("Gemini API Error:", data.error)
      throw new Error(data.error.message)
    }

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim()
    }

    throw new Error("Invalid response format")
  } catch (error) {
    console.error("Failed to generate AI response:", error)
    return context.language === 'hi'
      ? "मुझे आपकी बात समझ नहीं आई, कृपया फिर से कहें।"
      : "I didn't quite catch that. Could you say it again?"
  }
}
