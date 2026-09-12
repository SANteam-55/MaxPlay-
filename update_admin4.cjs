const fs = require('fs');
let content = fs.readFileSync('public/admin.html', 'utf8');

const startStr = "// Movie Links vs Series Episodes";
const endStr = "createdAt: new Date().toISOString()";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex) + endStr.length;

const replacement = `// Movie Links vs Series Episodes
      let movieParts = [];
      let activeSeasons = [];
      let activeEpisodesList = [];
      let firstVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      let mainQualityLinks = {};
      let mainVideoSources = {}; // Multi-Language Matrix

      if (window.currentUploadMode === 'movie') {
        document.querySelectorAll('.movie-part-card').forEach((card, idx) => {
          let partSources = {};
          window.activeLanguages.forEach(lang => {
              const q1080 = card.querySelector(\`.movie-q-1080[data-lang="\${lang}"]\`)?.value.trim() || '';
              const q720 = card.querySelector(\`.movie-q-720[data-lang="\${lang}"]\`)?.value.trim() || '';
              const q480 = card.querySelector(\`.movie-q-480[data-lang="\${lang}"]\`)?.value.trim() || '';
              
              if (q1080 || q720 || q480) {
                  partSources[lang] = {};
                  if (q1080) partSources[lang]['1080p'] = q1080;
                  if (q720) partSources[lang]['720p'] = q720;
                  if (q480) partSources[lang]['480p'] = q480;
              }
          });
          
          if (Object.keys(partSources).length > 0) {
              movieParts.push({ videoSources: partSources }); // Store nested matrix for each part
              if (idx === 0) {
                  mainVideoSources = partSources; // Root level fallback
                  const firstLang = Object.keys(partSources)[0];
                  if (firstLang) {
                      mainQualityLinks = partSources[firstLang];
                      firstVideoUrl = mainQualityLinks['1080p'] || mainQualityLinks['720p'] || mainQualityLinks['480p'] || firstVideoUrl;
                  }
              }
          }
        });
      } else {
        activeSeasons = JSON.parse(JSON.stringify(window.seasonsData));
        activeEpisodesList = activeSeasons.flatMap(s => s.episodes || []);
        
        if (activeEpisodesList.length > 0) {
          const ep1 = activeEpisodesList[0];
          if (ep1.videoSources && typeof ep1.videoSources === 'object') {
             mainVideoSources = ep1.videoSources;
             const firstLang = Object.keys(mainVideoSources)[0];
             if (firstLang) {
                mainQualityLinks = mainVideoSources[firstLang];
             }
          } else if (ep1.qualityLinks && typeof ep1.qualityLinks === 'object') {
             mainQualityLinks = ep1.qualityLinks;
          }
          firstVideoUrl = ep1.videoUrl || (mainQualityLinks['1080p'] || mainQualityLinks['720p'] || mainQualityLinks['480p'] || firstVideoUrl);
        }
      }

      const contentId = window.editingContentId || ('content-' + Date.now());
      const contentDoc = {
        id: contentId,
        title,
        type,
        rating,
        year,
        country,
        seasons: activeSeasons.length || seasons,
        episodes: activeEpisodesList.length,
        genres: genreStr.split(',').map(g => g.trim()).filter(Boolean),
        description: desc,
        posterUrl,
        backdropUrl,
        searchHotSection: searchHotSection || null,
        searchHotPosition: searchHotPosition || 0,
        homeRows: selectedRows,
        videoUrl: firstVideoUrl,
        qualityLinks: mainQualityLinks,
        videoSources: mainVideoSources,
        availableLanguages: window.activeLanguages,
        videoLinks: movieParts.length > 0 ? movieParts : [firstVideoUrl],
        seasonsData: activeSeasons,
        episodesList: activeEpisodesList,
        trending: selectedRows.length > 0,
        createdAt: new Date().toISOString()`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('public/admin.html', content);
