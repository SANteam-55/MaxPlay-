const fs = require('fs');
let code = fs.readFileSync('src/components/player/InlinePlayer.tsx', 'utf8');

code = code.replace(
  /const activeVideoUrl = "https:\/\/storage.googleapis.com\/gtv-videos-bucket\/sample\/BigBuckBunny.mp4";/,
  `const activeVideoUrl = useMemo(() => {
    if (videoSources && typeof videoSources === 'object') {
      const langs = Object.keys(videoSources);
      if (langs.length > 0) {
        const targetLang = activeLanguage && videoSources[activeLanguage] ? activeLanguage : langs[0];
        const langLinks = videoSources[targetLang];
        if (langLinks && typeof langLinks === 'object') {
          if (langLinks['1080p']) return langLinks['1080p'];
          if (langLinks['720p']) return langLinks['720p'];
          const firstKey = Object.keys(langLinks)[0];
          if (firstKey) return langLinks[firstKey];
        }
      }
    }
    if (qualityLinks && typeof qualityLinks === 'object') {
      if (qualityLinks['1080p']) return qualityLinks['1080p'];
      if (qualityLinks['720p']) return qualityLinks['720p'];
      const firstKey = Object.keys(qualityLinks)[0];
      if (firstKey) return qualityLinks[firstKey];
    }
    if (videoUrl) return videoUrl;
    return 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }, [qualityLinks, videoSources, videoUrl, activeLanguage]);`
);
fs.writeFileSync('src/components/player/InlinePlayer.tsx', code);
