// A simple dictionary for translations across the app.
type LanguageCode = 'en' | 'hi' | 'mr' | 'gu' | 'bn' | 'ta' | 'te';

const dictionary: Record<string, Record<LanguageCode, string>> = {
  // Common
  'MemCall': { en: 'MemCall', hi: 'MemCall', mr: 'मेमकॉल', gu: 'MemCall', bn: 'MemCall', ta: 'MemCall', te: 'MemCall' },
  'Today': { en: 'Today', hi: 'आज', mr: 'आज', gu: 'Today', bn: 'Today', ta: 'Today', te: 'Today' },
  'Games': { en: 'Games', hi: 'खेल', mr: 'खेळ', gu: 'Games', bn: 'Games', ta: 'Games', te: 'Games' },
  'Reminders': { en: 'Reminders', hi: 'याद दिलाएं', mr: 'रिमाइंडर्स', gu: 'Reminders', bn: 'Reminders', ta: 'Reminders', te: 'Reminders' },
  'Profile': { en: 'Profile', hi: 'प्रोफ़ाइल', mr: 'प्रोफाइल', gu: 'Profile', bn: 'Profile', ta: 'Profile', te: 'Profile' },
  'Alerts': { en: 'Alerts', hi: 'अलर्ट', mr: 'इशारे', gu: 'Alerts', bn: 'Alerts', ta: 'Alerts', te: 'Alerts' },
  
  // Navigation / Actions
  'Back to Home': { en: 'Back to Home', hi: 'होम पर वापस जाएं', mr: 'मुख्यपृष्ठावर परत जा', gu: 'Back to Home', bn: 'Back to Home', ta: 'Back to Home', te: 'Back to Home' },
  'Sign Out': { en: 'Sign Out', hi: 'लॉग आउट', mr: 'लॉग आउट', gu: 'Sign Out', bn: 'Sign Out', ta: 'Sign Out', te: 'Sign Out' },
  'Play': { en: 'Play', hi: 'खेलें', mr: 'खेळा', gu: 'Play', bn: 'Play', ta: 'Play', te: 'Play' },
  'Save': { en: 'Save', hi: 'सेव करें', mr: 'सेव्ह करा', gu: 'Save', bn: 'Save', ta: 'Save', te: 'Save' },
  'Cancel': { en: 'Cancel', hi: 'रद्द करें', mr: 'रद्द करा', gu: 'Cancel', bn: 'Cancel', ta: 'Cancel', te: 'Cancel' },

  // Dashboard specific
  'How do you feel today?': { en: 'How do you feel today?', hi: 'आज आप कैसा महसूस कर रहे हैं?', mr: 'आज तुम्हाला कसे वाटत आहे?', gu: 'How do you feel today?', bn: 'How do you feel today?', ta: 'How do you feel today?', te: 'How do you feel today?' },
  'Tap to Speak': { en: 'Tap to Speak', hi: 'बोलने के लिए टैप करें', mr: 'बोलण्यासाठी टॅप करा', gu: 'Tap to Speak', bn: 'Tap to Speak', ta: 'Tap to Speak', te: 'Tap to Speak' },
  'Today\'s Tasks': { en: 'Today\'s Tasks', hi: 'आज के कार्य', mr: 'आजची कामे', gu: 'Today\'s Tasks', bn: 'Today\'s Tasks', ta: 'Today\'s Tasks', te: 'Today\'s Tasks' },
  'Play & Exercise': { en: 'Play & Exercise', hi: 'खेल और व्यायाम', mr: 'खेळ आणि व्यायाम', gu: 'Play & Exercise', bn: 'Play & Exercise', ta: 'Play & Exercise', te: 'Play & Exercise' },

  // Moods
  'Angry': { en: 'Angry', hi: 'गुस्सा', mr: 'राग', gu: 'Angry', bn: 'Angry', ta: 'Angry', te: 'Angry' },
  'Sad': { en: 'Sad', hi: 'उदास', mr: 'दुःखी', gu: 'Sad', bn: 'Sad', ta: 'Sad', te: 'Sad' },
  'Calm': { en: 'Calm', hi: 'शांत', mr: 'शांत', gu: 'Calm', bn: 'Calm', ta: 'Calm', te: 'Calm' },
  'Happy': { en: 'Happy', hi: 'खुश', mr: 'आनंदी', gu: 'Happy', bn: 'Happy', ta: 'Happy', te: 'Happy' },

  // Profile specific
  'Patient Account': { en: 'Patient Account', hi: 'रोगी खाता', mr: 'रुग्ण खाते', gu: 'Patient Account', bn: 'Patient Account', ta: 'Patient Account', te: 'Patient Account' },
  'Share Link Code with Caregiver': { en: 'Share Link Code with Caregiver', hi: 'देखभालकर्ता के साथ लिंक कोड साझा करें', mr: 'केअरगिव्हरसोबत लिंक कोड शेअर करा', gu: 'Share Link Code with Caregiver', bn: 'Share Link Code with Caregiver', ta: 'Share Link Code with Caregiver', te: 'Share Link Code with Caregiver' },
  'Copy': { en: 'Copy', hi: 'कॉपी करें', mr: 'कॉपी करा', gu: 'Copy', bn: 'Copy', ta: 'Copy', te: 'Copy' },
  'Copied!': { en: 'Copied!', hi: 'कॉपी हो गया!', mr: 'कॉपी झाले!', gu: 'Copied!', bn: 'Copied!', ta: 'Copied!', te: 'Copied!' },
  'Language': { en: 'Language', hi: 'भाषा', mr: 'भाषा', gu: 'Language', bn: 'Language', ta: 'Language', te: 'Language' },
  'App Settings': { en: 'App Settings', hi: 'ऐप सेटिंग्स', mr: 'अॅप सेटिंग्ज', gu: 'App Settings', bn: 'App Settings', ta: 'App Settings', te: 'App Settings' },
  'Privacy & Security': { en: 'Privacy & Security', hi: 'गोपनीयता और सुरक्षा', mr: 'गोपनीयता आणि सुरक्षा', gu: 'Privacy & Security', bn: 'Privacy & Security', ta: 'Privacy & Security', te: 'Privacy & Security' },
  'Help & Support': { en: 'Help & Support', hi: 'मदद और समर्थन', mr: 'मदत आणि सपोर्ट', gu: 'Help & Support', bn: 'Help & Support', ta: 'Help & Support', te: 'Help & Support' },

  // Game List
  'Choose a Game': { en: 'Choose a Game', hi: 'एक खेल चुनें', mr: 'एक खेळ निवडा', gu: 'Choose a Game', bn: 'Choose a Game', ta: 'Choose a Game', te: 'Choose a Game' },
  'Select an activity below to keep your mind active. These games are designed to be enjoyable and helpful.': {
    en: 'Select an activity below to keep your mind active. These games are designed to be enjoyable and helpful.',
    hi: 'अपने दिमाग को सक्रिय रखने के लिए नीचे दी गई एक गतिविधि चुनें। ये गेम मज़ेदार और मददगार होने के लिए डिज़ाइन किए गए हैं।',
    mr: 'तुमचे मन सक्रिय ठेवण्यासाठी खालीलपैकी एक क्रियाकलाप निवडा. हे खेळ आनंददायक आणि उपयुक्त ठरावेत यासाठी डिझाइन केले आहेत.',
    gu: '', bn: '', ta: '', te: ''
  },
  
  // Games
  'Memory': { en: 'Memory', hi: 'मेमोरी', mr: 'स्मरणशक्ती', gu: 'Memory', bn: 'Memory', ta: 'Memory', te: 'Memory' },
  'Motor': { en: 'Motor', hi: 'मोटर', mr: 'मोटर', gu: 'Motor', bn: 'Motor', ta: 'Motor', te: 'Motor' },
  'Audio': { en: 'Audio', hi: 'ऑडियो', mr: 'ऑडिओ', gu: 'Audio', bn: 'Audio', ta: 'Audio', te: 'Audio' },
  'Social': { en: 'Social', hi: 'सामाजिक', mr: 'सामाजिक', gu: 'Social', bn: 'Social', ta: 'Social', te: 'Social' },

  'Traditional Pattern Match': { en: 'Traditional Pattern Match', hi: 'पारंपरिक पैटर्न मिलान', mr: 'पारंपारिक पॅटर्न मॅच', gu: '', bn: '', ta: '', te: '' },
  'Match the stunning woven designs from local handlooms.': { en: 'Match the stunning woven designs from local handlooms.', hi: 'स्थानीय हथकरघों के शानदार बुने हुए डिज़ाइनों का मिलान करें।', mr: 'स्थानिक हातमागावरील सुंदर विणलेल्या डिझाईन्स जुळवा.', gu: '', bn: '', ta: '', te: '' },
  
  'Memory Garden': { en: 'Memory Garden', hi: 'मेमोरी गार्डन', mr: 'मेमरी गार्डन', gu: '', bn: '', ta: '', te: '' },
  'Memorize the items in the garden and recall them. Helps improve short-term memory.': { en: 'Memorize the items in the garden and recall them. Helps improve short-term memory.', hi: 'बगीचे में मौजूद चीज़ों को याद रखें। यह याददाश्त सुधारने में मदद करता है।', mr: 'बागेतील वस्तू लक्षात ठेवा. यामुळे स्मरणशक्ती सुधारण्यास मदत होते.', gu: '', bn: '', ta: '', te: '' },
  
  'Shape Tracer': { en: 'Shape Tracer', hi: 'आकार ट्रेसर', mr: 'आकार ट्रेसर', gu: '', bn: '', ta: '', te: '' },
  'Connect the dots in order to trace the hidden shape. Improves motor skills and spatial memory.': { en: 'Connect the dots in order to trace the hidden shape. Improves motor skills and spatial memory.', hi: 'छिपे हुए आकार को ट्रेस करने के लिए बिंदुओं को जोड़ें।', mr: 'लपलेला आकार ट्रेस करण्यासाठी ठिपके जोडा.', gu: '', bn: '', ta: '', te: '' },
  
  'Daily Sound Recognition': { en: 'Daily Sound Recognition', hi: 'ध्वनि पहचान', mr: 'आवाज ओळख', gu: '', bn: '', ta: '', te: '' },
  'Listen closely and identify everyday familiar sounds.': { en: 'Listen closely and identify everyday familiar sounds.', hi: 'ध्यान से सुनें और रोज़मर्रा की परिचित आवाज़ों को पहचानें।', mr: 'लक्षपूर्वक ऐका आणि रोजचे ओळखीचे आवाज ओळखा.', gu: '', bn: '', ta: '', te: '' },
  
  'Family Photo Quiz': { en: 'Family Photo Quiz', hi: 'परिवार फोटो क्विज़', mr: 'कौटुंबिक फोटो क्विझ', gu: '', bn: '', ta: '', te: '' },
  'Upload photos of your loved ones and play a memory quiz to remember their names.': { en: 'Upload photos of your loved ones and play a memory quiz to remember their names.', hi: 'अपने प्रियजनों की तस्वीरें अपलोड करें और उनके नाम याद रखने के लिए एक मेमोरी क्विज़ खेलें।', mr: 'तुमच्या प्रियजनांचे फोटो अपलोड करा आणि त्यांची नावे लक्षात ठेवण्यासाठी मेमरी क्विझ खेळा.', gu: '', bn: '', ta: '', te: '' },

  // Reminders
  'Your Reminders': { en: 'Your Reminders', hi: 'आपके रिमाइंडर्स', mr: 'तुमचे रिमाइंडर्स', gu: '', bn: '', ta: '', te: '' },
  'Stay on track with your medications and activities.': { en: 'Stay on track with your medications and activities.', hi: 'अपनी दवाओं और गतिविधियों के साथ ट्रैक पर रहें।', mr: 'तुमच्या औषधे आणि क्रियाकलापांबद्दल अपडेट राहा.', gu: '', bn: '', ta: '', te: '' },
  'Create Reminder': { en: 'Create Reminder', hi: 'रिमाइंडर बनाएं', mr: 'रिमाइंडर तयार करा', gu: '', bn: '', ta: '', te: '' },
  'Add Reminder': { en: 'Add Reminder', hi: 'नया रिमाइंडर जोड़ें', mr: 'नवीन रिमाइंडर जोडा', gu: '', bn: '', ta: '', te: '' },
  'Title / Medicine Name': { en: 'Title / Medicine Name', hi: 'शीर्षक / दवा का नाम', mr: 'शीर्षक / औषधाचे नाव', gu: '', bn: '', ta: '', te: '' },
  'Time': { en: 'Time', hi: 'समय', mr: 'वेळ', gu: '', bn: '', ta: '', te: '' },
  'Type': { en: 'Type', hi: 'प्रकार', mr: 'प्रकार', gu: '', bn: '', ta: '', te: '' },
  'Frequency': { en: 'Frequency', hi: 'आवृत्ति', mr: 'वारंवारता', gu: '', bn: '', ta: '', te: '' },
  'Save Reminder': { en: 'Save Reminder', hi: 'रिमाइंडर सेव करें', mr: 'रिमाइंडर सेव्ह करा', gu: '', bn: '', ta: '', te: '' }
};

export const t = (key: string, currentLang: string): string => {
  const lang = currentLang as LanguageCode;
  
  if (dictionary[key]) {
    // If the specific translation exists for the current lang, use it.
    if (dictionary[key][lang] && dictionary[key][lang] !== '') {
      return dictionary[key][lang];
    }
    // Fallback to English if translation is missing
    return dictionary[key]['en'];
  }
  
  // If key completely missing from dictionary, return the key itself
  return key;
};
