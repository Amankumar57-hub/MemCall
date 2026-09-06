const fs = require('fs');

const missingKeys = [
  "Caregiver",
  "Dashboard",
  "Settings",
  "Emergency",
  "Your Patients",
  "Select a patient below to view their activity and manage reminders.",
  "Link New Patient",
  "No Patient Linked",
  "Link a patient to start monitoring their cognitive wellness, game scores, and medication adherence.",
  "Link a Patient Now",
  "Back to Patients List",
  "Activity for",
  "Detailed Activity & Wellness",
  "New Reminder",
  "Cog. Score",
  "Current Streak",
  "days",
  "Total Games",
  "Game Performance History",
  "No game sessions recorded yet.",
  "Recent Activity Log",
  "No recent activity.",
  "Played",
  "Completed in",
  "seconds with a score of",
  "Active Reminders",
  "No reminders set for this patient.",
  "Create one now",
  "High Contrast Mode",
  "Easier to read interface",
  "Color Theme",
  "Choose your preferred app color"
];

// Reconstruct their Hindi translations based on standard translations (some were lost)
const hindiTranslations = {
  "Caregiver": "देखभालकर्ता",
  "Dashboard": "डैशबोर्ड",
  "Settings": "सेटिंग्स",
  "Emergency": "आपातकालीन",
  "Your Patients": "आपके मरीज",
  "Select a patient below to view their activity and manage reminders.": "उनकी गतिविधि देखने और रिमाइंडर प्रबंधित करने के लिए नीचे एक मरीज चुनें।",
  "Link New Patient": "नया मरीज लिंक करें",
  "No Patient Linked": "कोई मरीज लिंक नहीं है",
  "Link a patient to start monitoring their cognitive wellness, game scores, and medication adherence.": "मरीज की संज्ञानात्मक भलाई की निगरानी शुरू करने के लिए उसे लिंक करें।",
  "Link a Patient Now": "अभी लिंक करें",
  "Back to Patients List": "मरीजों की सूची पर वापस जाएं",
  "Activity for": "गतिविधि:",
  "Detailed Activity & Wellness": "विस्तृत गतिविधि और भलाई",
  "New Reminder": "नया रिमाइंडर",
  "Cog. Score": "कोग. स्कोर",
  "Current Streak": "वर्तमान स्ट्रीक",
  "days": "दिन",
  "Total Games": "कुल खेल",
  "Game Performance History": "खेल प्रदर्शन इतिहास",
  "No game sessions recorded yet.": "अभी तक कोई गेम सत्र रिकॉर्ड नहीं किया गया है।",
  "Recent Activity Log": "हालिया गतिविधि लॉग",
  "No recent activity.": "कोई हालिया गतिविधि नहीं।",
  "Played": "खेला",
  "Completed in": "में पूरा हुआ",
  "seconds with a score of": "सेकंड, स्कोर:",
  "Active Reminders": "सक्रिय रिमाइंडर",
  "No reminders set for this patient.": "इस मरीज के लिए कोई रिमाइंडर सेट नहीं है।",
  "Create one now": "अभी एक बनाएं",
  "High Contrast Mode": "उच्च कंट्रास्ट मोड",
  "Easier to read interface": "पढ़ने में आसान इंटरफ़ेस",
  "Color Theme": "रंग थीम",
  "Choose your preferred app color": "अपना पसंदीदा ऐप रंग चुनें"
};

const nerTranslations = {
  "Caregiver": ["যতন লওঁতা", "Nongpeit", "Enkawltu", "Caregiver"],
  "Dashboard": ["ডেচবৰ্ড", "Dashboard", "Dashboard", "Dashboard"],
  "Settings": ["ছেটিংছ", "Settings", "Settings", "Settings"],
  "Emergency": ["জৰুৰীকালীন", "Emergency", "Emergency", "Emergency"],
  "Your Patients": ["আপোনাৰ ৰোগীসকল", "Ki Nongpang jong phi", "I Damlote", "Apuni laga Patient khan"],
  "Select a patient below to view their activity and manage reminders.": ["তেওঁলোকৰ কাৰ্যকলাপ চাবলৈ আৰু ৰিমাইণ্ডাৰ পৰিচালনা কৰিবলৈ তলত এজন ৰোগী বাছক।", "Jied ia u nongpang harum ban peit ia ka kam jong ki.", "An thiltih en tur leh hriattirna siam turin damlo thlang rawh.", "Activity sabole aru reminder manage kuribole nite ekta patient chunibi."],
  "Link New Patient": ["নতুন ৰোগী সংযোগ কৰক", "Link Nongpang Bathymmai", "Damlo Thar Link", "Notun Patient Link kuribi"],
  "No Patient Linked": ["কোনো ৰোগী সংযোগ কৰা হোৱা নাই", "Ym don Nongpang ba link", "Damlo Link An Awm Lo", "Eku Patient Link kura nai"],
  "Link a patient to start monitoring their cognitive wellness, game scores, and medication adherence.": ["ৰোগী এজনক সংযোগ কৰক।", "Link ia u nongpang.", "Damlo link rawh.", "Patient link kuribi."],
  "Link a Patient Now": ["এতিয়া সংযোগ কৰক", "Link Mynta", "Link Nghal Rawh", "Itia Link kuribi"],
  "Back to Patients List": ["ৰোগীৰ তালিকালৈ উভতি যাওক", "Kyllang sha List Nongpang", "Damlo List ah kir leh", "Patient List te wapas jabi"],
  "Activity for": ["কাৰ্যকলাপ:", "Kam na ka bynta", "Tana thiltih", "Activity laga:"],
  "Detailed Activity & Wellness": ["সবিশেষ কাৰ্যকলাপ", "Kam Bniah", "Thiltih Kimchang", "Bhal activity"],
  "New Reminder": ["নতুন ৰিমাইণ্ডাৰ", "Jingpynkynmaw bathymmai", "Hriattirna Thar", "Notun Reminder"],
  "Cog. Score": ["স্ক'ৰ", "Score", "Score", "Score"],
  "Current Streak": ["বৰ্তমানৰ ধাৰাবাহিকতা", "Streak", "Streak", "Streak"],
  "days": ["দিন", "sngi", "ni", "din"],
  "Total Games": ["মুঠ খেল", "Khel baroh", "Khelh zawng zawng", "Milaikena khel"],
  "Game Performance History": ["খেলৰ ইতিহাস", "History Khel", "Khelh History", "Khel laga history"],
  "No game sessions recorded yet.": ["কোনো খেল ৰেকৰ্ড কৰা হোৱা নাই।", "Ym pat don khel.", "Khelh chhinchhiah a la awm lo.", "Eku khel record kura nai."],
  "Recent Activity Log": ["শেহতীয়া কাৰ্যকলাপ", "Kam ba dang shu leh", "Thiltih thar", "Notun activity"],
  "No recent activity.": ["কোনো শেহতীয়া কাৰ্যকলাপ নাই।", "Ym don kam thymmai.", "Thiltih thar a awm lo.", "Eku notun activity nai."],
  "Played": ["খেলিছে", "La ialeh", "Khelh tawh", "Khelishe"],
  "Completed in": ["সম্পূৰ্ণ হৈছে:", "Pyndep ha", "Zawh hun", "Khotom hoishe:"],
  "seconds with a score of": ["ছেকেণ্ডত, স্ক'ৰ:", "sekhon, score:", "second, score:", "second, score:"],
  "Active Reminders": ["সক্ৰিয় ৰিমাইণ্ডাৰ", "Jingpynkynmaw", "Hriattirna Nung", "Active Reminder"],
  "No reminders set for this patient.": ["কোনো ৰিমাইণ্ডাৰ নাই।", "Ym don jingpynkynmaw.", "Hriattirna a awm lo.", "Eku reminder nai."],
  "Create one now": ["এতিয়া এটা বনাওক", "Gaw mynta", "Siam nghal rawh", "Itia ekta banabi"],
  "High Contrast Mode": ["উচ্চ কণ্ট্ৰাষ্ট", "High Contrast", "High Contrast", "High Contrast"],
  "Easier to read interface": ["পঢ়িবলৈ সহজ", "Suk ban pule", "Chhiar awlsam", "Pohribole asaan"],
  "Color Theme": ["ৰঙৰ থীম", "Rong Theme", "Rawng Theme", "Rong laga theme"],
  "Choose your preferred app color": ["ৰং বাছক", "Jied rong", "Rawng thlang rawh", "Rong chunibi"]
};

function safeStr(str) {
  if (typeof str !== 'string') return '""';
  const escaped = str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

let toAppend = '';

missingKeys.forEach(k => {
  let en = safeStr(k);
  let hi = safeStr(hindiTranslations[k] || '');
  
  let as = '""', kha = '""', lus = '""', nag = '""';
  if (nerTranslations[k]) {
    as = safeStr(nerTranslations[k][0]);
    kha = safeStr(nerTranslations[k][1]);
    lus = safeStr(nerTranslations[k][2]);
    nag = safeStr(nerTranslations[k][3]);
  }
  
  toAppend += `  ${safeStr(k)}: { en: ${en}, hi: ${hi}, mr: '""', gu: '""', bn: '""', ta: '""', te: '""', as: ${as}, kha: ${kha}, lus: ${lus}, nag: ${nag} },\n`;
});

const filePath = './src/lib/i18n.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Insert the new keys just before the closing brace of the dictionary
const closingBraceIndex = content.lastIndexOf('};');
if (closingBraceIndex !== -1) {
  content = content.slice(0, closingBraceIndex) + toAppend + content.slice(closingBraceIndex);
  fs.writeFileSync(filePath, content);
  console.log('Restored missing keys successfully.');
} else {
  console.error('Could not find closing brace.');
}
