const fs = require('fs');

const translations = {
  "MemCall": ["MemCall", "MemCall", "MemCall", "MemCall"],
  "Today": ["আজি", "Mynta", "Vawiin", "Aji"],
  "Games": ["গেমছ", "Ki Game", "Infiamna", "Khel"],
  "Reminders": ["ৰিমাইণ্ডাৰ", "Jingpynkynmaw", "Hriattirna", "Yaad kuribole"],
  "Profile": ["প্ৰফাইল", "Profile", "Profile", "Profile"],
  "Alerts": ["সতৰ্কবাণী", "Alerts", "Alerts", "Alerts"],
  "Back to Home": ["হোমলৈ উভতি যাওক", "Kyllang sha Home", "Home ah kir leh", "Home te wapas jabi"],
  "Sign Out": ["ছাইন আউট", "Sign Out", "Sign Out", "Sign Out"],
  "Play": ["খেলক", "Ialehkai", "Khelh", "Khelibi"],
  "Save": ["ছেভ কৰক", "Save", "Save", "Save"],
  "Cancel": ["বাতিল কৰক", "Cancel", "Cancel", "Cancel"],
  "How do you feel today?": ["আজি আপোনাৰ কেনে লাগিছে?", "Phi sngew kumno mynta?", "Vawiin ah engtin nge i awm?", "Aji apuni kineka feel kuri ase?"],
  "Tap to Speak": ["ক'বলৈ টিপক", "Kren", "Sawi nan hmet rawh", "Kotha kobole dababi"],
  "Today's Tasks": ["আজিৰ কাম", "Kam Mynta", "Vawiin Tih Tur", "Aji laga Kaam"],
  "Play & Exercise": ["খেল আৰু ব্যায়াম", "Ialehkai bad Exercise", "Khelh leh Exercise", "Khel aru Exercise"],
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
  "Choose your preferred app color": ["ৰং বাছক", "Jied rong", "Rawng thlang rawh", "Rong chunibi"],
  "Angry": ["খং", "Bitart", "Thinrim", "Gussa"],
  "Sad": ["দুখী", "Sngewsih", "Lungngai", "Dukh"],
  "Calm": ["শান্ত", "Jai jai", "Hahdam", "Shaant"],
  "Happy": ["সুখী", "Kmen", "Hlim", "Khushi"],
  "Patient Account": ["ৰোগীৰ একাউণ্ট", "Account Nongpang", "Damlo Account", "Patient Account"],
  "Share Link Code with Caregiver": ["কোড শ্বেয়াৰ কৰক", "Share Code", "Code Share rawh", "Code share kuribi"],
  "Copy": ["কপি কৰক", "Copy", "Copy", "Copy"],
  "Copied!": ["কপি হ'ল!", "La copy!", "Copy a ni!", "Copy hoishe!"],
  "Language": ["ভাষা", "Ktien", "Ṭawng", "Bhasha"],
  "App Settings": ["এপৰ ছেটিংছ", "App Settings", "App Settings", "App Settings"],
  "Privacy & Security": ["গোপনীয়তা আৰু সুৰক্ষা", "Privacy & Security", "Privacy & Security", "Privacy aru Security"],
  "Help & Support": ["সহায়", "Jingiarap", "Ṭanpuina", "Modot"],
  "Choose a Game": ["খেল বাছক", "Jied Khel", "Khel thlang rawh", "Khel chunibi"],
  "Select an activity below to keep your mind active. These games are designed to be enjoyable and helpful.": ["বাছক", "Jied", "Thlang rawh", "Chunibi"],
  "Memory": ["স্মৃতি", "Memory", "Memory", "Memory"],
  "Motor": ["মটৰ", "Motor", "Motor", "Motor"],
  "Audio": ["অডিঅ'", "Audio", "Audio", "Audio"],
  "Social": ["সামাজিক", "Social", "Social", "Social"],
  "Traditional Pattern Match": ["প্ৰতিৰূপ মিলোৱা", "Pattern Match", "Pattern Match", "Pattern Match"],
  "Match the stunning woven designs from local handlooms.": ["মিলাওক", "Pyniahap", "Milh rawh", "Milabi"],
  "Memory Garden": ["মেমৰি গাৰ্ডেন", "Memory Garden", "Memory Garden", "Memory Garden"],
  "Memorize the items in the garden and recall them. Helps improve short-term memory.": ["মনত ৰাখক", "Kynmaw", "Hre reng rawh", "Yaad rakhibi"],
  "Shape Tracer": ["আকৃতি", "Shape", "Shape", "Shape"],
  "Connect the dots in order to trace the hidden shape. Improves motor skills and spatial memory.": ["সংযোগ কৰক", "Pyniasoh", "Zawm rawh", "Milaibi"],
  "Daily Sound Recognition": ["শব্দ চিনি পাওক", "Sngewthuh Jingsawa", "Ri hriatna", "Awaz chunibi"],
  "Listen closely and identify everyday familiar sounds.": ["শুনক", "Sngap", "Ngaithla rawh", "Hunibi"],
  "Family Photo Quiz": ["পৰিয়ালৰ ফটো কুইজ", "Photo Quiz", "Photo Quiz", "Photo Quiz"],
  "Upload photos of your loved ones and play a memory quiz to remember their names.": ["ফটো আপল'ড কৰক", "Upload Photo", "Photo Upload rawh", "Photo upload kuribi"],
  "Your Reminders": ["আপোনাৰ ৰিমাইণ্ডাৰ", "Jingpynkynmaw jong phi", "I Hriattirna", "Apuni laga reminder"],
  "Stay on track with your medications and activities.": ["ট্ৰেকত থাকক", "Track", "Track", "Track"],
  "Create Reminder": ["ৰিমাইণ্ডাৰ বনাওক", "Gaw Jingpynkynmaw", "Hriattirna siam", "Reminder banabi"],
  "Add Reminder": ["ৰিমাইণ্ডাৰ যোগ কৰক", "Add Jingpynkynmaw", "Hriattirna belh", "Reminder dalibi"],
  "Title / Medicine Name": ["নাম", "Kyrteng", "Hming", "Naam"],
  "Time": ["সময়", "Por", "Hun", "Time"],
  "Type": ["প্ৰকাৰ", "Jait", "Chi", "Type"],
  "Frequency": ["ঘনাই", "Frequency", "Frequency", "Frequency"],
  "Save Reminder": ["ছেভ কৰক", "Save", "Save", "Save"],
  "Home": ["ঘৰ", "Home", "Home", "Home / Ghor"],
  "Ask MemCall": ["মেमकলক সোধক", "Kylli MemCall", "MemCall zawt rawh", "MemCall ke hudibi"],
  "Health": ["স্বাস্থ্য", "Koit Khowang", "Hriselna", "Bhal-Gaa"],
  "Friend": ["বন্ধু", "Paralok", "Ṭhian", "Dost"],
  "Good Morning,": ["সুপ্ৰভাত,", "Kumno,", "Chibai,", "Bhal Rati,"],
  "We're here to support you every step of the way.": ["আমি ইয়াত আছোঁ", "Ngi don hangne", "Kan awm e", "Ami khan ase"],
  "Have a wonderful day!": ["শুভ দিন!", "Sngi babha!", "Ni hman nuam le!", "Bhal din hobi!"],
  "Let's make it a great one.": ["ভাল কৰো আহক", "Pynbha", "Ti ṭha ang", "Bhal kuribo"],
  "Brain Games": ["মগজুৰ খেল", "Khel Dohnud", "Thluak Khel", "Dimaag Khel"],
  "Fun games to keep your mind active": ["খেল", "Khel", "Khel", "Khel"],
  "My Family": ["মোৰ পৰিয়াল", "Ka longiing jong nga", "Ka chhungte", "Amar Ghor-manu"],
  "Photos, names and precious memories": ["ফটো", "Photo", "Photo", "Photo"],
  "Today's Plan": ["আজিৰ পৰিকল্পনা", "Plan Mynta", "Vawiin Plan", "Aji laga plan"],
  "See your routine and daily activities": ["ৰুটিন", "Routine", "Routine", "Routine"],
  "Medication": ["দৰব", "Dawai", "Damdawi", "Dawai"],
  "Timely reminders for your medicines": ["দৰবৰ ৰিমাইণ্ডাৰ", "Jingpynkynmaw Dawai", "Damdawi Hriattirna", "Dawai reminder"],
  "Reminiscence": ["স্মৃতি", "Kynmaw", "Hriat chhuah", "Yaad"],
  "Music, stories and memories from past": ["গান আৰু কাহিনী", "Jingrwai bad Khana", "Hla leh thawnthu", "Gaan aru kahani"],
  "Daily Progress": ["দৈনিক প্ৰগতি", "Progress", "Progress", "Progress"],
  "See all": ["সকলো চাওক", "Peit baroh", "En vek", "Sob sabi"],
  "Medicine": ["দৰব", "Dawai", "Damdawi", "Dawai"],
  "Taken": ["লোৱা হৈছে", "La bam", "Ei tawh", "Khaishe"],
  "Meals": ["আহাৰ", "Ja", "Chaw", "Khana"],
  "Activity": ["কাৰ্যকলাপ", "Kam", "Thiltih", "Kaam"],
  "Done": ["কৰা হ'ল", "Dep", "Zo tawh", "Hoishe"],
  "How are you feeling?": ["আপোনাৰ কেনে লাগিছে?", "Phi sngew kumno?", "Engtin nge i awm?", "Kineka feel kuri ase?"],
  "Let us know how you feel today.": ["জনাওক", "Iathuh", "Hrilh rawh", "Janabi"],
  "Great": ["বহু ভাল", "Bha palat", "Ṭha lutuk", "Bishi bhal"],
  "Good": ["ভাল", "Bha", "Ṭha", "Bhal"],
  "Okay": ["ঠিক আছে", "Mynjur", "A ṭha e", "Thik ase"],
  "Tired": ["ভাগৰুৱা", "Thait", "Chau", "Thakishe"],
  "Worried": ["চিন্তিত", "Khuslai", "Ngaihtuah", "Chinta"],
  "Stay connected with your loved ones": ["সংযুক্ত থাকক", "Ia soh", "Inzawm reng rawh", "Mili kine thakibi"],
  "Call your family or send a message.": ["কল কৰক", "Call", "Call rawh", "Call kuribi"],
  "Call Family": ["পৰিয়াললৈ কল কৰক", "Call Iing", "Chhungte Call", "Ghor-manu Call"],
  "Add / Change Photo": ["ফটো সলনি কৰক", "Pynkylla Photo", "Photo Thlak", "Photo change kuribi"]
};

// Safe stringify to handle quotes properly
function safeStr(str) {
  if (typeof str !== 'string') return '""';
  // Escape double quotes and backslashes
  const escaped = str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

const filePath = './src/lib/i18n.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Update LanguageCode type
content = content.replace(
  /type LanguageCode = 'en' \| 'hi' \| 'mr' \| 'gu' \| 'bn' \| 'ta' \| 'te';/,
  "type LanguageCode = 'en' | 'hi' | 'mr' | 'gu' | 'bn' | 'ta' | 'te' | 'as' | 'kha' | 'lus' | 'nag';"
);

const lines = content.split('\n');
const newLines = lines.map(line => {
  if (line.includes("en:") && !line.includes("as:")) {
    const match = line.match(/'(.*?)':/);
    if (match) {
      let key = match[1];
      let rawKey = key.replace(/\\'/g, "'");
      
      let tAs = '""', tKha = '""', tLus = '""', tNag = '""';
      if (translations[rawKey]) {
        const trans = translations[rawKey];
        tAs = safeStr(trans[0]);
        tKha = safeStr(trans[1]);
        tLus = safeStr(trans[2]);
        tNag = safeStr(trans[3]);
      }
      
      return line.replace(' }', `, as: ${tAs}, kha: ${tKha}, lus: ${tLus}, nag: ${tNag} }`);
    }
  }
  return line;
});

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('Translations updated safely.');
