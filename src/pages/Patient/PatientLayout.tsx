import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { Bell, User, Mic, Heart, Brain, CalendarCheck, Loader2, Settings, X, Volume2, Sparkles, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { useVoiceCommand } from '../../hooks/useVoiceCommand'
import { playPremiumVoice } from '../../lib/tts'
import { t } from '../../lib/i18n'

export default function PatientLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language } = useAppStore()

  // Voice AI States
  const [isThinking, setIsThinking] = useState(false)
  const [aiReply, setAiReply] = useState('')
  const [aiItemImage, setAiItemImage] = useState<string | null>(null)
  const [showVoiceWidget, setShowVoiceWidget] = useState(false)
  const dismissTimerRef = useRef<any>(null)
  
  // Reminders state for voice commands
  const [reminders, setReminders] = useState<any[]>([])

  // Speech recognition language: Hindi for 'hi', Marathi for 'mr', Indian English for 'en'
  const recognitionLang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN'
  const { isListening, transcript, interimTranscript, startListening, stopListening, resetTranscript, error } = useVoiceCommand(recognitionLang)

  useEffect(() => {
    // Load reminders for voice assistant context
    const loadRemindersForVoice = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userReminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('patient_id', user.id)
        .eq('is_active', true)
        .order('time', { ascending: true })
      if (userReminders) {
        setReminders(userReminders)
      }
    }
    loadRemindersForVoice()
  }, [location.pathname])

  // Auto-Greeting / Voice Onboarding
  useEffect(() => {
    if (!sessionStorage.getItem('has_greeted_patient')) {
      sessionStorage.setItem('has_greeted_patient', 'true')
      const greeting = language === 'hi' 
        ? "सुप्रभात, मैं मेमकॉल हूँ। मुझसे बात करने के लिए नीचे दिए गए बटन को दबाएं, या किसी को पहचानने के लिए हरा कैमरा बटन दबाएं।"
        : "Hello, I am MemCall. Tap the microphone button below to talk to me, or tap the green camera to scan a face."
      // Small delay to ensure voices are loaded and UI is ready
      setTimeout(() => {
        playPremiumVoice(greeting, language)
      }, 1500)
    }
  }, [language])

  const readAloud = (text: string) => {
    playPremiumVoice(text, language)
  }

  // Format HH:mm into friendly spoken text
  const formatTimeForSpeech = (timeStr: string, lang: string): string => {
    if (!timeStr) return ''
    const [hStr, mStr] = timeStr.split(':')
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    if (isNaN(h)) return timeStr
    
    if (lang === 'hi') {
      const period = h < 12 ? 'सुबह' : h < 16 ? 'दोपहर' : h < 20 ? 'शाम' : 'रात'
      const h12 = h % 12 === 0 ? 12 : h % 12
      return `${period} ${h12}${m > 0 ? ` बजकर ${m} मिनट` : ' बजे'}`
    } else {
      const period = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 === 0 ? 12 : h % 12
      return `${h12}${m > 0 ? `:${m.toString().padStart(2, '0')}` : ''} ${period}`
    }
  }

  // Manage widget visibility
  useEffect(() => {
    if (isListening || isThinking || aiReply || transcript || interimTranscript) {
      setShowVoiceWidget(true)
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    } else if (!isListening && !isThinking && !aiReply) {
      dismissTimerRef.current = setTimeout(() => {
        setShowVoiceWidget(false)
      }, 5000)
    }
  }, [isListening, isThinking, aiReply, transcript, interimTranscript])

  // Handle Ask MemCall button click
  const handleMicButtonClick = async () => {
    if (isThinking) return
    if (isListening) {
      stopListening()
      return
    }
    const greeting = language === 'hi' ? 'हाँ, बताइए, मैं सुन रही हूँ।' : 'Yes, I am listening.'
    setAiReply(greeting)
    setShowVoiceWidget(true)
    await playPremiumVoice(greeting, language)
    startListening()
  }

  // Core Voice AI Command & Navigation Logic
  useEffect(() => {
    if (!transcript) return

    const cleanText = transcript.toLowerCase().trim()
    console.log("MemCall Voice Assistant Heard:", cleanText)

    // Helper to speak, display and optionally execute an action/navigation
    const respondAndAct = (replyText: string, action?: () => void, delayMs: number = 1600) => {
      setAiReply(replyText)
      readAloud(replyText)
      if (action) {
        setTimeout(() => {
          action()
        }, delayMs)
      }
      resetTranscript()
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = setTimeout(() => {
        setAiReply('')
        setShowVoiceWidget(false)
      }, 10000)
    }

    // 0a. CANCEL EMERGENCY SOS ("Emergency band karo", "SOS band karo", "Cancel emergency")
    if (
      cleanText.includes('emergency band') ||
      cleanText.includes('sos band') ||
      cleanText.includes('cancel emergency') ||
      cleanText.includes('cancel sos') ||
      cleanText.includes('alert band') ||
      cleanText.includes('इमरजेंसी बंद') ||
      cleanText.includes('अलर्ट बंद')
    ) {
      const reply = language === 'hi'
        ? "इमरजेंसी अलर्ट बंद कर दिया गया है।"
        : "Emergency alert has been cancelled."
      
      respondAndAct(reply, async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('alerts')
            .update({ is_read: true })
            .eq('patient_id', user.id)
            .eq('alert_type', 'emergency')
            .eq('is_read', false)
        }
        window.dispatchEvent(new CustomEvent('cancel-emergency'))
      }, 400)
      return
    }

    // 0b. EMERGENCY SOS / CAREGIVER CALL ("Caregiver ko bulao", "Kisi ko bulao", "Mujhe kuch chahiye", "Emergency button dabao")
    if (
      cleanText.includes('caregiver ko bula') ||
      cleanText.includes('caregiver bula') ||
      cleanText.includes('call caregiver') ||
      cleanText.includes('caregiver ko call') ||
      cleanText.includes('mujhe kuch chahiye') ||
      cleanText.includes('kisi ko bula') ||
      cleanText.includes('kisi ko call') ||
      cleanText.includes('emergency button') ||
      cleanText.includes('sos button') ||
      cleanText.includes('sos emergency') ||
      cleanText.includes('dabao emergency') ||
      cleanText.includes('click emergency') ||
      (cleanText.includes('emergency') && (cleanText.includes('dabao') || cleanText.includes('click') || cleanText.includes('on') || cleanText.includes('karo'))) ||
      cleanText.includes('emergency') ||
      cleanText.includes('sos') ||
      cleanText.includes('इमरजेंसी बटन') ||
      cleanText.includes('केयरगिवर को बुला') ||
      cleanText.includes('किसी को बुला') ||
      cleanText.includes('मुझे कुछ चाहिए') ||
      cleanText.includes('एसओएस') ||
      cleanText.includes('मदद चाहिए') ||
      cleanText.includes('help me')
    ) {
      const reply = language === 'hi'
        ? "घबराइए नहीं, मैंने तुरंत इमरजेंसी एसओएस एक्टिवेट कर दिया है और केयरगिवर को अलर्ट भेज दिया है। मदद आ रही है।"
        : "Don't worry, I have activated the Emergency SOS alert and notified your caregiver immediately. Help is on the way."
      
      respondAndAct(reply, () => {
        navigate('/patient', { state: { triggerEmergency: true } })
        window.dispatchEvent(new CustomEvent('trigger-emergency'))
      }, 600)
      return
    }

    // 1a. "Tum meri kaise madad kar sakti ho?" / "Tum mere liye kya kar sakti ho?" / "How can you help me?"
    if (
      cleanText.includes('kaise madad') ||
      cleanText.includes('madad kar sakti') ||
      cleanText.includes('madad kar sakte') ||
      cleanText.includes('kya kar sakti') ||
      cleanText.includes('kya kar sakte') ||
      cleanText.includes('how can you help') ||
      cleanText.includes('how do you help') ||
      cleanText.includes('what can you do') ||
      cleanText.includes('कैसे मदद') ||
      cleanText.includes('मदद कर सकती') ||
      cleanText.includes('क्या कर सकती') ||
      cleanText.includes('सहायता')
    ) {
      const reply = language === 'hi'
        ? "मैं आपकी सेवा और सहायता के लिए यहाँ उपलब्ध हूँ। मैं आपके लिए ब्रेन गेम्स खेलने, दवाइयों और दैनिक कार्यों के रिमाइंडर्स सेट करने, आपकी पुरानी यादें और ऑडियो सुनने, और आपके स्वास्थ्य का ध्यान रखने में मदद कर सकती हूँ, जिससे आपकी तबीयत हमेशा ठीक रहे।"
        : language === 'mr'
        ? "मी तुमच्या मदतीसाठी उपलब्ध आहे. मी ब्रेन गेम्स खेळण्यासाठी, औषधांचे रिमाइंडर्स सेट करण्यासाठी आणि जुन्या आठवणी ऐकण्यासाठी मदत करू शकते."
        : "I am here to assist and care for you. I can help you play brain games, manage your medicine and daily reminders, listen to cherished audio memories, and support your well-being so you stay healthy and happy."
      respondAndAct(reply)
      return
    }

    // 1b. "Tum kis liye ho?" / "Tumhara kaam kya hai?" / "Why are you here?" / "What is your purpose?"
    if (
      cleanText.includes('kis liye ho') ||
      cleanText.includes('kisliye ho') ||
      cleanText.includes('kis liye hai') ||
      cleanText.includes('kaam kya hai') ||
      cleanText.includes('kaam kya h') ||
      cleanText.includes('tumhara kaam') ||
      cleanText.includes('aapka kaam') ||
      cleanText.includes('what is your purpose') ||
      cleanText.includes('why are you here') ||
      cleanText.includes('किस लिए हो') ||
      cleanText.includes('तुम्हारा काम') ||
      cleanText.includes('आपका काम')
    ) {
      const reply = language === 'hi'
        ? "मैं आपकी एआई साथी हूँ, मेरा नाम मेमकॉल है। मैं यहाँ आपकी सेवा, याददाश्त को सक्रिय रखने और आपकी सेहत की देखभाल करने के लिए हमेशा आपके साथ उपलब्ध हूँ।"
        : language === 'mr'
        ? "मी तुमची एआय साथी आहे, माझे नाव मेमकॉल आहे. मी तुमच्या स्मरणशक्ती आणि आरोग्याची काळजी घेण्यासाठी नेहमी सोबत आहे."
        : "I am your AI assistant, my name is MemCall. I am here to assist you, keep your memory sharp, and support your health every step of the way."
      respondAndAct(reply)
      return
    }

    // 1c. Identity / Name Question ("Tumhara naam kya hai?")
    if (
      cleanText.includes('naam') || 
      cleanText.includes('name') || 
      cleanText.includes('नाम') || 
      cleanText.includes('kaun ho') || 
      cleanText.includes('who are you') || 
      cleanText.includes('who are u') || 
      cleanText.includes('कौन हो') || 
      cleanText.includes('tum kaun') ||
      cleanText.includes('आप कौन')
    ) {
      const reply = language === 'hi'
        ? "मेरा नाम मेमकॉल है। मैं आपकी याददाश्त और सेहत की देखभाल के लिए हमेशा आपके साथ हूँ।"
        : language === 'mr'
        ? "माझे नाव मेमकॉल आहे. मी तुमच्या स्मरणशक्ती आणि आरोग्यासाठी नेहमी सोबत आहे."
        : "My name is MemCall. I am your cognitive care companion, always here to help you."
      respondAndAct(reply)
      return
    }

    // 2. Set / Add Reminder ("Reminder set karna hai")
    if (
      cleanText.includes('set reminder') ||
      cleanText.includes('add reminder') ||
      cleanText.includes('create reminder') ||
      cleanText.includes('new reminder') ||
      cleanText.includes('reminder set') ||
      cleanText.includes('reminder lagao') ||
      cleanText.includes('alarm lagao') ||
      cleanText.includes('रिमाइंडर सेट') ||
      cleanText.includes('रिमाइंडर लगाओ') ||
      cleanText.includes('नया रिमाइंडर') ||
      cleanText.includes('अलार्म लगाओ')
    ) {
      const reply = language === 'hi'
        ? "रिमाइंडर्स पेज खोल दिया है। ऊपर 'Add' बटन पर क्लिक करके आप अपना नया रिमाइंडर सेट कर सकते हैं।"
        : "Opening your reminders. You can click on the 'Add' button at the top to set your new reminder."
      respondAndAct(reply, () => navigate('/patient/reminders', { state: { openAddModal: true } }))
      return
    }

    // 3. Tell / Read Reminders ("Aaj kya kya karna h", "Aaj ka plan kya h", "Mera reminder dikhao")
    if (
      cleanText.includes('aaj kya kya karna') ||
      cleanText.includes('aaj kya karna') ||
      cleanText.includes('aaj mujhe kya karna') ||
      cleanText.includes('kya kya karna h') ||
      cleanText.includes('kya kya karna hai') ||
      cleanText.includes('kya karna h') ||
      cleanText.includes('kya karna hai') ||
      cleanText.includes('aaj ka plan') ||
      cleanText.includes('plan kya hai') ||
      cleanText.includes('plan kya h') ||
      cleanText.includes('today plan') ||
      cleanText.includes("today's plan") ||
      cleanText.includes('what is my plan') ||
      cleanText.includes('mera plan') ||
      cleanText.includes('reminder dikhao') ||
      cleanText.includes('reminders dikhao') ||
      cleanText.includes('mera reminder dikhao') ||
      cleanText.includes('mere reminder dikhao') ||
      cleanText.includes('mere reminders dikhao') ||
      cleanText.includes('reminder batao') ||
      cleanText.includes('reminders batao') ||
      cleanText.includes('mera reminder') ||
      cleanText.includes('mere reminder') ||
      cleanText.includes('reminder kya') ||
      cleanText.includes('reminders kya') ||
      cleanText.includes('kya reminder') ||
      cleanText.includes('tell me reminder') ||
      cleanText.includes('what are my reminder') ||
      cleanText.includes('show reminder') ||
      cleanText.includes('read reminder') ||
      cleanText.includes('check reminder') ||
      cleanText.includes('list reminder') ||
      cleanText.includes('आज क्या क्या करना') ||
      cleanText.includes('आज क्या करना') ||
      cleanText.includes('आज मुझे क्या करना') ||
      cleanText.includes('आज का प्लान') ||
      cleanText.includes('रिमाइंडर दिखाओ') ||
      cleanText.includes('मेरा रिमाइंडर दिखाओ') ||
      cleanText.includes('मेरे रिमाइंडर दिखाओ') ||
      cleanText.includes('रिमाइंडर बताओ') ||
      cleanText.includes('मेरे रिमाइंडर') ||
      cleanText.includes('रिमाइंडर क्या') ||
      cleanText.includes('दवाई का समय') ||
      ((cleanText.includes('reminder') || cleanText.includes('रिमाइंडर')) && (cleanText.includes('batao') || cleanText.includes('tell') || cleanText.includes('show') || cleanText.includes('kya') || cleanText.includes('क्या') || cleanText.includes('बताओ') || cleanText.includes('दिखाओ')))
    ) {
      const handleReadReminders = async () => {
        navigate('/patient/reminders')
        let currentReminders = reminders
        if (!currentReminders || currentReminders.length === 0) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: userReminders } = await supabase
              .from('reminders')
              .select('*')
              .eq('patient_id', user.id)
              .eq('is_active', true)
              .order('time', { ascending: true })
            if (userReminders) {
              currentReminders = userReminders
              setReminders(userReminders)
            }
          }
        }

        if (currentReminders && currentReminders.length > 0) {
          const reminderListSpeech = currentReminders.map(r => {
            const spokenTime = formatTimeForSpeech(r.time, language)
            return `${r.title} ${spokenTime}`
          }).join(', ')

          const reply = language === 'hi'
            ? `आज के आपके रिमाइंडर्स और प्लान हैं: ${reminderListSpeech}। याद रखिए, समय पर अपनी दवाइयाँ और कार्य ज़रूर पूरा करें!`
            : `Here is your plan and reminders for today: ${reminderListSpeech}. Please remember to complete them on time!`
          respondAndAct(reply)
        } else {
          const reply = language === 'hi'
            ? "आज के लिए आपका कोई पेंडिंग रिमाइंडर या प्लान नहीं है। सब कुछ पूरा हो चुका है!"
            : "You have no pending reminders or tasks planned for today. All clear!"
          respondAndAct(reply)
        }
      }
      handleReadReminders()
      return
    }

    // 4. Specific Games
    // 4a. Traditional Pattern Match
    if (
      cleanText.includes('pattern match') ||
      cleanText.includes('traditional pattern') ||
      cleanText.includes('पैटर्न मैच') ||
      cleanText.includes('ट्रेडिशनल पैटर्न') ||
      cleanText.includes('memory match') ||
      cleanText.includes('पैटर्न') ||
      cleanText.includes('pattern')
    ) {
      const reply = language === 'hi'
        ? "ट्रेडिशनल पैटर्न मैच गेम खोल रही हूँ। चलिए खेलते हैं!"
        : "Opening Traditional Pattern Match game. Let's play!"
      respondAndAct(reply, () => navigate('/patient/games/memory'))
      return
    }

    // 4b. Family Photo Quiz
    if (
      cleanText.includes('family photo quiz') ||
      cleanText.includes('family quiz') ||
      cleanText.includes('photo quiz') ||
      cleanText.includes('फैमिली फोटो क्विज') ||
      cleanText.includes('फैमिली क्विज') ||
      cleanText.includes('परिवार क्विज') ||
      (cleanText.includes('family') && cleanText.includes('quiz')) ||
      (cleanText.includes('photo') && cleanText.includes('quiz')) ||
      (cleanText.includes('family') && cleanText.includes('photo') && cleanText.includes('game'))
    ) {
      const reply = language === 'hi'
        ? "फैमिली फोटो क्विज़ खोल रही हूँ। अपने परिवार को पहचानिए!"
        : "Opening Family Photo Quiz. Let's see your loved ones!"
      respondAndAct(reply, () => navigate('/patient/games/family-quiz'))
      return
    }

    // 4c. Memory Garden
    if (
      cleanText.includes('memory garden') ||
      cleanText.includes('garden') ||
      cleanText.includes('गार्डन') ||
      cleanText.includes('बगीचा')
    ) {
      const reply = language === 'hi'
        ? "मेमोरी गार्डन गेम खोल रही हूँ। चलिए बगीचे की सैर करते हैं!"
        : "Opening Memory Garden for you. Let's explore the garden!"
      respondAndAct(reply, () => navigate('/patient/games/memory-garden'))
      return
    }

    // 4d. Daily Sound Recognition
    if (
      cleanText.includes('sound recognition') ||
      cleanText.includes('sound game') ||
      cleanText.includes('daily sound') ||
      cleanText.includes('sound') ||
      cleanText.includes('साउंड') ||
      cleanText.includes('आवाज़') ||
      cleanText.includes('आवाज') ||
      cleanText.includes('ध्वनि')
    ) {
      const reply = language === 'hi'
        ? "डेली साउंड रिकॉग्निशन गेम खोल रही हूँ। आवाज़ सुनकर पहचानिए!"
        : "Opening Daily Sound Recognition. Listen closely and identify the sound!"
      respondAndAct(reply, () => navigate('/patient/games/sound-recognition'))
      return
    }

    // 4e. Shape Tracer
    if (
      cleanText.includes('shape tracer') ||
      cleanText.includes('shape trace') ||
      cleanText.includes('shape') ||
      cleanText.includes('shapes') ||
      cleanText.includes('शेप') ||
      cleanText.includes('ट्रेसर') ||
      cleanText.includes('आकार')
    ) {
      const reply = language === 'hi'
        ? "शेप ट्रेसर गेम खोल रही हूँ। बिंदुओं को मिलाइए!"
        : "Opening Shape Tracer game for you. Let's connect the dots!"
      respondAndAct(reply, () => navigate('/patient/games/shape-tracer'))
      return
    }

    // 4f. General Games / Brain Games
    if (
      cleanText.includes('play game') ||
      cleanText.includes('game khelna') ||
      cleanText.includes('khelna hai') ||
      cleanText.includes('khelna') ||
      cleanText.includes('games') ||
      cleanText.includes('game') ||
      cleanText.includes('गेम') ||
      cleanText.includes('खेल') ||
      cleanText.includes('ब्रेन गेम')
    ) {
      const reply = language === 'hi'
        ? "ज़रूर! मैं आपके लिए ब्रेन गेम्स खोल रही हूँ।"
        : "Sure! Opening Brain Games for you."
      respondAndAct(reply, () => navigate('/patient/games'))
      return
    }

    // 5. Reminiscence / Audio / Songs / Old Memories ("Audio sunao" / "Audio sunna hai")
    if (
      cleanText.includes('audio sunna') ||
      cleanText.includes('audio sunao') ||
      cleanText.includes('mujhe audio') ||
      cleanText.includes('reminiscence') ||
      cleanText.includes('रेमिनिसेंस') ||
      cleanText.includes('audio') ||
      cleanText.includes('ऑडियो सुनना') ||
      cleanText.includes('ऑडियो सुनाओ') ||
      cleanText.includes('ऑडियो') ||
      cleanText.includes('music sunna') ||
      cleanText.includes('music sunao') ||
      cleanText.includes('music') ||
      cleanText.includes('song') ||
      cleanText.includes('गाना सुनना') ||
      cleanText.includes('गाना सुनाओ') ||
      cleanText.includes('गाना') ||
      cleanText.includes('गाने') ||
      cleanText.includes('गीत सुनना') ||
      cleanText.includes('गीत') ||
      cleanText.includes('संगीत') ||
      cleanText.includes('पुरानी यादें') ||
      cleanText.includes('purani yaadein') ||
      cleanText.includes('yaadein')
    ) {
      const reply = language === 'hi'
        ? "रेमिनिसेंस सेक्शन खोल रही हूँ। यहाँ आप अपनी प्यारी पुरानी यादें और ऑडियो सुन सकते हैं।"
        : "Opening Reminiscence. Here you can listen to your precious audio memories and music."
      respondAndAct(reply, () => navigate('/patient/reminiscence'))
      return
    }

    // 6. Settings
    if (
      cleanText.includes('setting') ||
      cleanText.includes('settings') ||
      cleanText.includes('सेटिंग') ||
      cleanText.includes('सेटिंग्स')
    ) {
      const reply = language === 'hi'
        ? "सेटिंग्स पेज खोल रही हूँ।"
        : "Opening Settings for you."
      respondAndAct(reply, () => navigate('/patient/settings'))
      return
    }

    // 6b. Profile Photo Update ("Profile photo update karna hai" / "Photo kaise change kare")
    if (
      cleanText.includes('profile photo') ||
      cleanText.includes('profile picture') ||
      cleanText.includes('प्रोफाइल फोटो') ||
      cleanText.includes('प्रोफ़ाइल फ़ोटो') ||
      ((cleanText.includes('profile') || cleanText.includes('प्रोफाइल') || cleanText.includes('प्रोफ़ाइल')) && (cleanText.includes('photo') || cleanText.includes('फोटो') || cleanText.includes('तस्वीर') || cleanText.includes('change') || cleanText.includes('update') || cleanText.includes('बदल'))) ||
      ((cleanText.includes('photo') || cleanText.includes('फोटो')) && (cleanText.includes('kaise badle') || cleanText.includes('kaise change') || cleanText.includes('badalna') || cleanText.includes('बदलना') || cleanText.includes('बदलें') || cleanText.includes('update photo') || cleanText.includes('change photo')))
    ) {
      const reply = language === 'hi'
        ? "प्रोफ़ाइल पेज खोल दिया है। अपनी प्रोफ़ाइल फ़ोटो बदलने के लिए ऊपर फ़ोटो के नीचे 'Add / Change Photo' बटन पर क्लिक करके आप अपनी नई फ़ोटो अपलोड कर सकते हैं।"
        : "Opening your Profile page. To update your profile photo, click on the 'Add / Change Photo' button below your photo to upload a new one."
      respondAndAct(reply, () => navigate('/patient/profile'))
      return
    }

    // 7. My Family / Photo Viewing ("Mujhe photo dekhna hai")
    if (
      (cleanText.includes('photo') && (cleanText.includes('dekh') || cleanText.includes('देख') || cleanText.includes('dikha') || cleanText.includes('दिखा'))) ||
      cleanText.includes('photo dekhna') ||
      cleanText.includes('photo dekhni') ||
      cleanText.includes('photos dekhna') ||
      cleanText.includes('photo dikhao') ||
      cleanText.includes('photos dikhao') ||
      cleanText.includes('फोटो देखना') ||
      cleanText.includes('फोटो देखनी') ||
      cleanText.includes('फोटो दिखाओ') ||
      cleanText.includes('तस्वीरें') ||
      cleanText.includes('तस्वीर') ||
      cleanText.includes('see photo') ||
      cleanText.includes('view photo') ||
      cleanText.includes('show photo') ||
      cleanText.includes('look at photo') ||
      cleanText.includes('my family') ||
      cleanText.includes('माई फैमिली') ||
      cleanText.includes('parivar') ||
      cleanText.includes('परिवार') ||
      cleanText.includes('family photo') ||
      cleanText.includes('family photos') ||
      cleanText.includes('family album')
    ) {
      const reply = language === 'hi'
        ? "माई फैमिली सेक्शन खोल रही हूँ। यहाँ आप अपने परिवार की तस्वीरें और वीडियो देख सकते हैं।"
        : "Opening My Family section. Here you can view your family photos and videos."
      respondAndAct(reply, () => navigate('/patient/my-family'))
      return
    }

    // 8. Home / Dashboard
    if (
      cleanText.includes('home') ||
      cleanText.includes('होम') ||
      cleanText.includes('dashboard') ||
      cleanText.includes('main screen') ||
      cleanText.includes('ghar')
    ) {
      const reply = language === 'hi'
        ? "होम स्क्रीन पर वापस आ गए हैं।"
        : "Welcome back to the home screen."
      respondAndAct(reply, () => navigate('/patient'))
      return
    }

    // 9. Conversational Fallback - Supabase AI Assistant Edge Function
    const handleMemCallChat = async () => {
      setIsThinking(true)
      setAiReply('')
      window.speechSynthesis?.cancel()
      try {
        const { data, error } = await supabase.functions.invoke('ai-assistant', {
          body: { transcript, language }
        })
        if (error) throw new Error(error.message)
        if (data?.reply) {
          setAiReply(data.reply)
          if (data.show_item_image) {
            setAiItemImage(data.show_item_image)
          } else {
            setAiItemImage(null)
          }
          readAloud(data.reply)
        } else {
          throw new Error('No reply')
        }
      } catch (err) {
        const fallback = language === 'hi'
          ? "मैं हमेशा आपके साथ हूँ। बताइए, क्या आप कोई गेम खेलना चाहते हैं या अपने रिमाइंडर्स देखना चाहते हैं?"
          : "I am always here with you. Would you like to play a game or check your reminders?"
        setAiReply(fallback)
        readAloud(fallback)
      } finally {
        setIsThinking(false)
        resetTranscript()
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
        dismissTimerRef.current = setTimeout(() => {
          setAiReply('')
          setShowVoiceWidget(false)
        }, 10000)
      }
    }
    handleMemCallChat()

  }, [transcript, navigate, reminders, language])

  return (
    <div className="flex flex-col min-h-full bg-[#FAFAFA] dark:bg-background font-sans pb-32 transition-colors duration-300">
      
      {/* Global Top Header */}
      <header 
        className="px-6 py-4 flex justify-between items-center bg-[#FAFAFA] dark:bg-background sticky top-0 z-10 transition-colors duration-300"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-11 h-11 flex items-center justify-center shrink-0">
            <img src="/memcall-logo.png" alt="MemCall Logo" className="w-full h-full object-contain drop-shadow-sm" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#3B2D60] dark:text-white leading-tight">MemCall</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Together in Every Memory</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (location.pathname !== '/patient') {
                navigate('/patient');
                setTimeout(() => window.dispatchEvent(new Event('trigger-emergency')), 100);
              } else {
                window.dispatchEvent(new Event('trigger-emergency'));
              }
            }}
            className="p-3 bg-red-100 dark:bg-red-900/30 shadow-sm text-red-600 dark:text-red-400 rounded-full border border-red-200 dark:border-red-800/50 transition-colors hover:bg-red-200 dark:hover:bg-red-900/50 animate-pulse"
          >
            <AlertTriangle size={20} />
          </button>
          <button 
            onClick={() => navigate('/patient/settings')}
            className="p-3 bg-white dark:bg-card shadow-sm text-gray-600 dark:text-gray-300 rounded-full border border-gray-100 dark:border-border transition-colors hover:bg-gray-50 dark:hover:bg-primary/20"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={() => navigate('/patient/reminders')}
            className="p-3 bg-white dark:bg-card shadow-sm text-gray-600 dark:text-gray-300 rounded-full border border-gray-100 dark:border-border transition-colors hover:bg-gray-50 dark:hover:bg-primary/20"
          >
            <Bell size={20} />
          </button>
        </div>
      </header>

      {/* Global AI Voice Assistant Floating Widget */}
      {showVoiceWidget && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-white/95 dark:bg-card/95 border border-[#5A4B81]/20 shadow-2xl backdrop-blur-xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-full text-white shadow-sm shrink-0 ${isListening ? 'bg-blue-600 animate-pulse' : isThinking ? 'bg-amber-500' : 'bg-[#5A4B81]'}`}>
                {isThinking ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : isListening ? (
                  <Mic size={20} className="animate-bounce" />
                ) : (
                  <Sparkles size={20} />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#5A4B81] dark:text-primary uppercase tracking-wider flex items-center gap-1.5">
                  MemCall Assistant
                  {isListening && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>}
                </h4>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug mt-0.5">
                  {aiReply
                    ? aiReply
                    : transcript
                    ? `"${transcript}"`
                    : interimTranscript
                    ? `"${interimTranscript}..."`
                    : isListening
                    ? (language === 'hi' ? 'मैं सुन रही हूँ, बोलिए...' : 'Listening to you... Speak now')
                    : isThinking
                    ? (language === 'hi' ? 'सोच रही हूँ...' : 'MemCall is thinking...')
                    : (language === 'hi' ? 'हाँ, बताइए, मैं सुन रही हूँ।' : 'Yes, tell me.')}
                </p>
                {aiItemImage && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm w-full max-w-[240px]">
                    <img src={aiItemImage} alt="Found Item" className="w-full h-auto object-cover" />
                  </div>
                )}
                {error && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>
                )}
              </div>
            </div>
            <button 
              onClick={() => {
                if (isListening) stopListening()
                setShowVoiceWidget(false)
                setAiReply('')
                resetTranscript()
                window.speechSynthesis?.cancel()
              }}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-accent transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <Outlet />

      {/* Global Bottom Nav (Full Width) */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#5A4B81] shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <nav className="max-w-md mx-auto px-6 py-2 flex justify-between items-center text-white relative">
          
          <Link to="/patient" className={`flex flex-col items-center transition-opacity ${location.pathname === '/patient' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
             <div className="mb-1"><Heart size={22} className={location.pathname === '/patient' ? "fill-white text-white" : ""} /></div>
             <span className="text-[10px] font-bold">{t('Home', language)}</span>
          </Link>
          
          <Link to="/patient/games" className={`flex flex-col items-center transition-opacity ${location.pathname.includes('/patient/games') ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
             <div className="mb-1"><Brain size={22} className={location.pathname.includes('/patient/games') ? "fill-white text-white" : ""} /></div>
             <span className="text-[10px] font-bold">{t('Games', language)}</span>
          </Link>
          
          {/* Central Prominent Mic Button (Ask MemCall) */}
          <div className="relative -top-6 flex flex-col items-center justify-center">
             <button 
                onClick={handleMicButtonClick}
                title="Ask MemCall"
                className={`w-[64px] h-[64px] bg-white dark:bg-card rounded-full flex items-center justify-center shadow-lg border-[5px] border-[#FAFAFA] dark:border-background transition-all active:scale-95 z-50 ${isThinking ? 'bg-amber-100 dark:bg-amber-900/50' : isListening ? 'bg-blue-100 ring-4 ring-blue-400 dark:bg-blue-900/50 animate-pulse' : 'hover:shadow-xl'}`}
             >
                {isThinking ? (
                  <Loader2 size={28} className="text-amber-600 dark:text-amber-400 animate-spin" />
                ) : (
                  <Mic size={28} className={`${isListening ? 'text-blue-600 dark:text-blue-400 animate-bounce' : 'text-[#5A4B81] dark:text-white'}`} />
                )}
             </button>
             <span className="text-[10px] font-bold mt-1 text-white/90">{t('Ask MemCall', language)}</span>
          </div>
          
          <Link to="/patient/reminders" className={`flex flex-col items-center transition-opacity ${location.pathname.includes('/patient/reminders') ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
             <div className="mb-1"><CalendarCheck size={22} className={location.pathname.includes('/patient/reminders') ? "fill-white text-white" : ""} /></div>
             <span className="text-[10px] font-bold">{t('Health', language)}</span>
          </Link>
          
          <Link to="/patient/profile" className={`flex flex-col items-center transition-opacity ${location.pathname.includes('/patient/profile') ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
             <div className="mb-1"><User size={22} className={location.pathname.includes('/patient/profile') ? "fill-white text-white" : ""} /></div>
             <span className="text-[10px] font-bold">{t('Profile', language)}</span>
          </Link>

        </nav>
      </div>

    </div>
  )
}
