const fs = require('fs');

// Fix types
let typeCode = fs.readFileSync('src/types/index.ts', 'utf8');
typeCode = typeCode.replace('videoSources?: Record<string, Record<string, string>>; // Episode\n  availableLanguages?: string[];\n  videoSources?: Record<string, Record<string, string>>;', 'availableLanguages?: string[];\n  videoSources?: Record<string, Record<string, string>>;');
fs.writeFileSync('src/types/index.ts', typeCode);

// Fix InlinePlayer.tsx
let inlineCode = fs.readFileSync('src/components/player/InlinePlayer.tsx', 'utf8');
// remove the badly placed handleChangeLanguage
inlineCode = inlineCode.replace(/const handleChangeLanguage = \(lang: string\) => \{[\s\S]*?\};\n/, '');

// place it correctly below the useState hooks
const correctInsertPoint = "const handleQualityChange = (q: string) => {";
const handlerFunc = `
  const handleChangeLanguage = (lang: string) => {
    if (lang === activeLanguage) return;
    setActiveLanguage(lang);
    setShowLanguageDrawer(false);
    
    const newLinks = videoSources?.[lang];
    if (newLinks) {
       let targetQ = activeQuality || currentQuality;
       if (!newLinks[targetQ]) {
           const available = Object.keys(newLinks).filter(k => newLinks[k] && newLinks[k].trim() !== '');
           if (available.length > 0) targetQ = available[0];
       }
       if (targetQ && newLinks[targetQ]) {
          const currentTime = videoRef.current ? videoRef.current.currentTime : 0;
          setInternalUrl(newLinks[targetQ]);
          if(targetQ !== activeQuality) setActiveQuality(targetQ);
          setInitialOffsetInChunk(currentTime);
       }
    }
  };
`;

inlineCode = inlineCode.replace(correctInsertPoint, handlerFunc + '\n  ' + correctInsertPoint);
fs.writeFileSync('src/components/player/InlinePlayer.tsx', inlineCode);
