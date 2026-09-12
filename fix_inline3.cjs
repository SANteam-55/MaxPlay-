const fs = require('fs');
let code = fs.readFileSync('src/components/player/InlinePlayer.tsx', 'utf8');

// remove bad block
code = code.replace(/const handleChangeLanguage = \(lang: string\) => \{[\s\S]*?\};\n/, '');

const insertPoint = code.indexOf('const shouldPlayRef = useRef<boolean>(false);');
const handlerFunc = `
  const handleChangeLanguage = (lang: string) => {
    if (lang === activeLanguage) return;
    setActiveLanguage(lang);
    setShowLanguageDrawer(false);
    
    // Auto-select quality
    const newLinks = videoSources?.[lang];
    if (newLinks) {
       let targetQ = currentQuality;
       if (!newLinks[targetQ]) {
           const available = Object.keys(newLinks).filter(k => newLinks[k] && newLinks[k].trim() !== '');
           if (available.length > 0) targetQ = available[0];
       }
       if (targetQ && newLinks[targetQ]) {
          setCurrentQuality(targetQ);
          if (videoRef.current) {
             const currTime = videoRef.current.currentTime;
             // Store the seek time so it seeks after the source changes
             pendingSeekTimeRef.current = currTime;
          }
       }
    }
  };
`;

code = code.substring(0, insertPoint) + handlerFunc + '\n  ' + code.substring(insertPoint);

fs.writeFileSync('src/components/player/InlinePlayer.tsx', code);
