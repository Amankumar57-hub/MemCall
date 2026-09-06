const fs = require('fs');
const file = './src/lib/i18n.ts';
let content = fs.readFileSync(file, 'utf8');

// Update LanguageCode type
content = content.replace(
  /type LanguageCode = 'en' \| 'hi' \| 'mr' \| 'gu' \| 'bn' \| 'ta' \| 'te';/,
  "type LanguageCode = 'en' | 'hi' | 'mr' | 'gu' | 'bn' | 'ta' | 'te' | 'as' | 'kha' | 'lus' | 'nag';"
);

// Update dictionary objects
content = content.replace(/\{([^}]+)\}/g, (match) => {
  if (match.includes('en:') && !match.includes('as:')) {
    return match.replace(' }', ", as: '', kha: '', lus: '', nag: '' }");
  }
  return match;
});

fs.writeFileSync(file, content);
console.log('Updated i18n.ts');
