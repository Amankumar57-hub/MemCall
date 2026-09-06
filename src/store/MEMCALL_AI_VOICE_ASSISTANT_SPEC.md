You are working inside my existing MEMCALL project.

GOAL:
Build and integrate a complete voice-based AI assistant called "MEMCALL" for dementia patients.

IMPORTANT:
- First inspect the entire existing project structure and understand the current architecture.
- Do NOT blindly rewrite existing code.
- Do NOT break the currently working authentication, Supabase integration, dashboard, reminders, games, profiles, or caregiver features.
- Reuse the existing Supabase client, components, styles, routing, authentication and database structure wherever possible.
- Before making changes, identify the exact files that need modification and the files that need to be created.
- Then implement the feature completely.
- Keep the UI simple, friendly, accessible and suitable for dementia patients.

==================================================
1. CORE VOICE ASSISTANT
==================================================

Add a prominent MEMCALL microphone/voice-assistant interface for the logged-in patient.

Patient flow:

Patient taps microphone
        ↓
Microphone starts listening
        ↓
Speech is converted to text
        ↓
MEMCALL AI understands the request
        ↓
Relevant patient information is retrieved securely
        ↓
AI generates a safe response
        ↓
Response is converted to natural speech
        ↓
MEMCALL speaks the answer

The assistant should support:
- microphone input
- speech-to-text
- AI response
- text-to-speech
- speaking/loading/listening states
- retry
- stop speaking
- clear conversation
- graceful error handling

The assistant should feel calm, warm, patient and reassuring.

==================================================
2. IDENTITY
==================================================

The assistant's name must ALWAYS be:

MEMCALL

If patient asks:
"What is your name?"
"Who are you?"
"What should I call you?"

Respond naturally:

"My name is MEMCALL. I am here to help you."

Do not claim to be a human.

==================================================
3. PATIENT CONTEXT
==================================================

The AI must work with the currently authenticated patient.

Securely retrieve only the data belonging to the authenticated patient.

Relevant context can include:

From public.users:
- full_name
- role
- phone_number where appropriate

From patient_profiles:
- language_preference
- current_cognitive_score
- streak_days
- last_active_at

From reminders:
- title
- type
- time
- frequency
- is_active

From game_sessions:
- game_id
- score
- duration_seconds
- played_at

From cognitive_scores:
- score_value
- trend
- recorded_at

From alerts:
- alert_type
- message
- severity
- is_read
- created_at

From caregiver_patient_links:
- linked caregiver relationship where permitted

IMPORTANT:
Never send the entire database to the AI.

Create a secure context/data layer that fetches only relevant information for the authenticated patient and only when needed.

==================================================
4. EXAMPLES OF QUESTIONS
==================================================

The assistant must be able to answer questions such as:

"What is my name?"
"Who are you?"
"When is my next reminder?"
"What do I have to do now?"
"When do I take my medicine?"
"What reminders do I have today?"
"What games did I play today?"
"What was my score?"
"How am I doing?"
"How many days is my streak?"
"What should I do today?"
"Tell me about my reminders."
"What is dementia?"
"Can dementia affect memory?"
"What can help me remember things?"
"I am feeling confused."
"I am worried."
"Tell me something reassuring."

For database-related questions, retrieve verified data before answering.

Never invent patient-specific information.

==================================================
5. MEDICINE SAFETY
==================================================

Medicine-related questions must be handled VERY carefully.

Current reminder data may be used to tell the patient what has been configured in MEMCALL.

Example:

Patient:
"When should I take my medicine?"

Assistant:
"Let me check your reminders. Your medicine reminder is scheduled for 2 PM."

IMPORTANT:
- Never invent a medication.
- Never invent a dosage.
- Never change a dosage.
- Never recommend starting/stopping/changing medication.
- Never contradict a doctor's or caregiver's medication schedule.
- If medication information is missing or unclear, say that the patient should check with their caregiver or healthcare professional.
- Clearly distinguish between a stored reminder and medical advice.

If the current database does not yet have a dedicated medications table, DO NOT fake medication data.

Instead:
1. Detect medication questions.
2. Use existing verified reminder data if it explicitly represents a medication reminder.
3. If a proper medication management structure is required, propose/create a safe medications table and appropriate RLS only if it fits the existing architecture.
4. Do not make unsafe assumptions.

==================================================
6. DEMENTIA-ONLY SCOPE
==================================================

MEMCALL is a specialized dementia support assistant.

The assistant should primarily help with:
- dementia education
- memory support
- reminders
- daily routine
- patient profile
- games
- scores
- caregiver-related information available in the system
- simple supportive conversation related to dementia care

If the user asks unrelated questions such as:
"Who won a football match?"
"Write me a Python program."
"What is today's stock price?"

Respond politely that MEMCALL is specialized for dementia support and cannot help with unrelated topics.

Example:
"I'm MEMCALL, your dementia support companion. I can help with your reminders, activities, memory support and dementia-related questions."

==================================================
7. MEDICAL SAFETY / HIGH-RISK QUESTIONS
==================================================

Do not diagnose dementia.

Do not claim that a patient definitely has or does not have a medical condition.

Do not provide emergency medical diagnosis.

Do not make medication decisions.

For serious symptoms or urgent medical concerns:
- respond calmly
- recommend contacting the caregiver, doctor, or appropriate emergency services depending on the situation

Never create false reassurance.

Do not present AI output as a doctor's diagnosis.

==================================================
8. PERSONALITY
==================================================

MEMCALL should sound:

- warm
- gentle
- patient
- respectful
- reassuring
- simple
- friendly
- never childish
- never patronizing
- never frightening

Use short sentences because the target users may have cognitive difficulties.

Avoid unnecessarily complicated medical terminology.

Use the patient's name naturally when appropriate.

Example:

"Hello Mr. Sharma. I'm MEMCALL. How can I help you today?"

Do not overuse the patient's name.

==================================================
9. MULTILINGUAL SUPPORT
==================================================

Respect the patient's language_preference from patient_profiles.

The assistant should be capable of responding in:
- English
- Hindi
- Hinglish

If the patient speaks Hindi, answer in Hindi.

If the patient speaks Hinglish, answer naturally in Hinglish.

If language preference is available, use it as the default.

Keep sentences simple and easy to understand.

==================================================
10. VOICE
==================================================

Implement browser-compatible voice interaction.

Use the best architecture that fits the current project.

Speech-to-text:
- Prefer browser/native speech recognition when supported.
- Provide graceful fallback/error messaging where unavailable.

Text-to-speech:
- Prefer browser SpeechSynthesis where appropriate, or the project's existing voice/TTS infrastructure if already present.
- Choose a calm, natural voice.
- Keep speech rate comfortable and understandable.
- Do not speak excessively long responses.

Add controls:
- Start listening
- Stop listening
- Replay response
- Stop speaking

Show clear visual states:
- Idle
- Listening
- Thinking
- Speaking
- Error

Example UI labels:
"Tap to talk"
"I'm listening..."
"I'm thinking..."
"MEMCALL is speaking..."

==================================================
11. AI BACKEND ARCHITECTURE
==================================================

Do NOT expose secret AI API keys in browser/client-side code.

AI requests requiring secret credentials must go through a secure backend/server/API/edge function appropriate to the existing project.

Inspect the current project and choose the architecture that fits it best.

Use environment variables for secrets.

Never hard-code API keys.

Create a clear separation:

Frontend
    ↓
Secure AI endpoint
    ↓
Authenticated user context
    ↓
Patient data retrieval
    ↓
AI model
    ↓
Safe response
    ↓
Frontend
    ↓
Text-to-speech

==================================================
12. AUTHENTICATION
==================================================

Use the currently authenticated Supabase user.

Do not create a separate login system for MEMCALL assistant.

The assistant must not allow one patient to access another patient's information.

Respect Supabase RLS.

Never accept a patient ID from the frontend as the authority for authorization.

Derive the authenticated user identity from the Supabase session/server authentication.

==================================================
13. DATABASE ACCESS
==================================================

Inspect current Supabase schema before making database changes.

Current relevant tables include:

public.users
public.patient_profiles
public.caregiver_patient_links
public.game_sessions
public.cognitive_scores
public.reminders
public.reminder_logs
public.alerts

Do not duplicate existing tables.

If a new table is genuinely required, create proper:
- primary key
- foreign key
- indexes where useful
- RLS
- appropriate policies
- timestamps
- data validation

Do not weaken existing RLS.

==================================================
14. TOOL / FUNCTION BASED DATA ACCESS
==================================================

Prefer a controlled tool/function approach for patient-specific queries.

Examples of internal functions:

get_patient_profile()
get_today_reminders()
get_next_reminder()
get_recent_game_sessions()
get_recent_cognitive_scores()
get_patient_alerts()

Only retrieve data needed for the user's current question.

Examples:

Question:
"When is my next reminder?"

Only query reminder information.

Question:
"What game did I play today?"

Only query today's game sessions.

Question:
"How is my memory progress?"

Query relevant cognitive scores/profile information.

This reduces hallucination and improves privacy.

==================================================
15. CONVERSATION MEMORY
==================================================

The assistant may maintain short conversation context during the current session.

Do not store sensitive conversation history permanently unless the existing architecture explicitly requires it.

Do not store unnecessary personal information.

The assistant should remember within the current conversation when appropriate.

Example:

Patient:
"What is my next reminder?"

MEMCALL:
"Your next reminder is at 2 PM."

Patient:
"What is it for?"

MEMCALL:
"It is your medicine reminder."

==================================================
16. REMINDER INTEGRATION
==================================================

The assistant must use the existing reminders system.

Examples:

Patient:
"What should I do now?"

MEMCALL checks active/current reminder data.

Patient:
"When is my next reminder?"

MEMCALL checks the database and answers with the actual configured reminder.

Also support future reminder integration.

Do not create fake reminder entries.

==================================================
17. PROACTIVE REMINDER VOICE
==================================================

If the existing application supports browser notifications/timers, integrate voice reminders carefully.

At an active reminder time, the UI may show:

"MEMCALL reminder"

and optionally speak:

"Hello. This is MEMCALL. You have a reminder now. Please check your reminder instructions."

For medication reminders:
"You have a medicine reminder now. Please follow the medication schedule provided by your caregiver or healthcare professional."

Do not announce a medication name/dose unless that information is verified in the database and intended to be shown.

==================================================
18. ACCESSIBILITY
==================================================

Design for dementia-friendly usability.

Requirements:
- large microphone button
- large readable text
- high contrast
- minimal clutter
- simple navigation
- obvious states
- avoid too many controls
- clear error messages
- keyboard accessibility where possible
- screen-reader-friendly labels
- responsive mobile and desktop layout

The main interaction should be extremely simple.

==================================================
19. ERROR HANDLING
==================================================

Handle:
- microphone permission denied
- microphone unavailable
- speech recognition unavailable
- network failure
- AI timeout
- Supabase query failure
- invalid/empty response
- text-to-speech unavailable
- expired authentication session

Never show technical errors directly to the patient.

Instead show something friendly such as:

"Sorry, I couldn't hear you. Please try again."

"I'm having trouble checking that right now. Please try again."

==================================================
20. SECURITY
==================================================

This application deals with sensitive health-related information.

Implement:
- authenticated access only
- Supabase RLS
- secure server-side AI calls
- environment variables for secrets
- least-privilege data access
- no API keys in frontend bundles
- no cross-patient data access
- no unnecessary logging of private patient conversations

Do not log sensitive patient information unnecessarily.

==================================================
21. UI
==================================================

Create a beautiful MEMCALL assistant experience consistent with the existing application design.

Suggested main card:

MEMCALL
Your AI Support Companion

[ 🎤 ]

"Tap to talk"

Below it:
- live transcription
- AI response
- replay button
- stop button

Optional:
conversation history within current session.

Do not make the UI visually overwhelming.

==================================================
22. PERFORMANCE
==================================================

Avoid unnecessary database requests.

Do not load every patient record at page load.

Fetch context only when needed.

Use loading states.

Avoid multiple duplicate AI requests for one spoken question.

==================================================
23. IMPLEMENTATION PROCESS
==================================================

Follow this exact process:

STEP 1:
Inspect project architecture.

STEP 2:
Identify:
- framework
- frontend entry points
- authentication implementation
- Supabase client
- current dashboard
- reminders implementation
- profile implementation
- game implementation
- environment variable setup
- backend/API/edge functions if any

STEP 3:
Report the files you plan to modify/create.

STEP 4:
Implement the assistant.

STEP 5:
Implement secure patient-context retrieval.

STEP 6:
Implement AI endpoint/service.

STEP 7:
Implement speech recognition.

STEP 8:
Implement text-to-speech.

STEP 9:
Implement dementia safety system prompt / response guardrails.

STEP 10:
Integrate reminders, games, profile and cognitive scores.

STEP 11:
Add responsive accessible UI.

STEP 12:
Run the existing build/tests/type checks/linting available in the project.

STEP 13:
Fix errors.

STEP 14:
Verify that existing functionality has not been broken.

==================================================
24. TEST CASES
==================================================

After implementation, test at minimum:

1. "What is your name?"
Expected: MEMCALL identifies itself.

2. "What is my name?"
Expected: returns authenticated patient's name from database.

3. "When is my next reminder?"
Expected: returns actual reminder data.

4. "What game did I play today?"
Expected: returns actual game session data.

5. "What was my score?"
Expected: returns actual score when available.

6. "Tell me about dementia."
Expected: simple dementia-focused educational answer.

7. Ask unrelated question.
Expected: politely decline and redirect to MEMCALL's supported purpose.

8. Ask for medication advice that is not in database.
Expected: do not invent information; recommend checking caregiver/doctor.

9. Test microphone permission denial.
Expected: friendly error.

10. Log out.
Expected: assistant cannot access patient data.

11. Test with another account.
Expected: first patient's data must never be visible.

==================================================
25. IMPORTANT FINAL RULE
==================================================

Do not tell me that this feature is implemented unless you have actually modified the project and verified the relevant code.

Before finishing:
- summarize files changed
- summarize new database changes, if any
- summarize environment variables required
- summarize how to run/test the assistant
- clearly identify anything that still requires manual setup in Supabase or the AI provider dashboard

Start by inspecting the existing MEMCALL project now.
Do not modify files during the inspection step.