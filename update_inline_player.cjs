const fs = require('fs');
let code = fs.readFileSync('src/components/player/InlinePlayer.tsx', 'utf8');

// Update Interface
code = code.replace(
  "qualityLinks?: Record<string, string> | null;",
  "qualityLinks?: Record<string, string> | null;\n  videoSources?: Record<string, Record<string, string>> | null;\n  availableLanguages?: string[] | null;"
);

// Add LanguageDrawer to imports if not there
if(!code.includes('LanguageDrawer')) {
    code = code.replace("import { QualityDrawer } from './QualityDrawer';", "import { QualityDrawer } from './QualityDrawer';\nimport { LanguageDrawer } from './LanguageDrawer';");
}

// Update component props
code = code.replace(
  "qualityLinks,",
  "qualityLinks,\n  videoSources,\n  availableLanguages,"
);

// We need to add state for activeLanguage
const stateInsert = `
  const [activeLanguage, setActiveLanguage] = useState<string>('');
  const [showLanguageDrawer, setShowLanguageDrawer] = useState(false);

  // Initialize Language
  useEffect(() => {
    if (availableLanguages && availableLanguages.length > 0 && !activeLanguage) {
      setActiveLanguage(availableLanguages[0]);
    } else if (videoSources && Object.keys(videoSources).length > 0 && !activeLanguage) {
      setActiveLanguage(Object.keys(videoSources)[0]);
    }
  }, [availableLanguages, videoSources]);

  // Derive Qualities based on activeLanguage or legacy
`;
code = code.replace("const [isFullscreen, setIsFullscreen] = useState(false);", "const [isFullscreen, setIsFullscreen] = useState(false);\n" + stateInsert);

const deriveQualitiesReplacement = `
  // Quality state - 100% dynamic based only on actual provided non-empty URLs
  const validQualityLinks = React.useMemo(() => {
    const result: Record<string, string> = {};
    const sourceLinks = (videoSources && activeLanguage && videoSources[activeLanguage]) 
        ? videoSources[activeLanguage] 
        : qualityLinks;

    if (sourceLinks && typeof sourceLinks === 'object') {
      Object.entries(sourceLinks).forEach(([k, v]) => {
        if (v && typeof v === 'string' && v.trim().length > 0 && k !== 'default') {
          result[k] = v.trim();
        }
      });
    }
    return result;
  }, [qualityLinks, videoSources, activeLanguage]);
`;
code = code.replace(/const validQualityLinks[\s\S]*?\}, \[qualityLinks\]\);/, deriveQualitiesReplacement);

// Handle change language
const changeLangInsert = `
  const handleChangeLanguage = (lang: string) => {
    if (lang === activeLanguage) return;
    setActiveLanguage(lang);
    setShowLanguageDrawer(false);
    
    // We want to keep the same quality if possible, otherwise fallback
    const newLinks = videoSources?.[lang];
    if (newLinks) {
       let targetQ = activeQuality;
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
code = code.replace("const handleQualityChange = (q: string) => {", changeLangInsert + "\n  const handleQualityChange = (q: string) => {");

// Now update PlayerControls to pass language button logic
// Wait, I need to check if PlayerControls supports language.
fs.writeFileSync('src/components/player/InlinePlayer.tsx', code);
