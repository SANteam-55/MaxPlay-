const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Replace collectCurrentMoviePartsData
html = html.replace(/window\.collectCurrentMoviePartsData = function\(\) \{[\s\S]*?return parts;\s*\};\s*/, 
`    window.collectCurrentMoviePartsData = function() {
      const cards = document.querySelectorAll('.movie-part-card');
      if (!cards || cards.length === 0) return [];
      const parts = [];

      cards.forEach((card) => {
        const partSources = {};
        window.activeLanguages.forEach((lang) => {
          const inputs = card.querySelectorAll(\`.movie-q-input[data-lang="\${lang}"]\`);
          inputs.forEach(inp => {
            const q = inp.getAttribute('data-quality');
            const val = inp.value.trim();
            if (val && q) {
              if (!partSources[lang]) partSources[lang] = {};
              partSources[lang][q] = val;
            }
          });
        });
        parts.push({ videoSources: partSources });
      });

      return parts;
    };
`);

// Replace syncEpisodesFromDOM
html = html.replace(/window\.syncEpisodesFromDOM = function\(\) \{[\s\S]*?delete ep\.skipMarkers;\s*\};\s*\};\s*/, 
`    window.syncEpisodesFromDOM = function() {
      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      if (!activeSeason || !activeSeason.episodes) return;

      const epCards = document.querySelectorAll('#season-episodes-list .episode-card');
      epCards.forEach((card, epIdx) => {
        if (!activeSeason.episodes[epIdx]) return;
        const ep = activeSeason.episodes[epIdx];

        // Basic Info
        const epNumInput = card.querySelector('.ep-input-num');
        const titleInput = card.querySelector('.ep-input-title');
        const durInput = card.querySelector('.ep-input-dur');
        const thumbInput = card.querySelector('.ep-input-thumb');

        if (epNumInput) ep.episodeNumber = parseInt(epNumInput.value) || (epIdx + 1);
        if (titleInput) ep.title = titleInput.value.trim();
        if (durInput) {
          const rawDur = durInput.value.trim();
          if (rawDur.includes(':')) {
            const parts = rawDur.split(':').map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              ep.duration = parts[0] * 60 + parts[1];
            } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
              ep.duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else {
              ep.duration = 1420; // 23:40
            }
          } else {
            const numVal = parseFloat(rawDur);
            if (!isNaN(numVal)) {
              ep.duration = numVal > 300 ? Math.round(numVal) : Math.round(numVal * 60);
            } else {
              ep.duration = 1420; // 23:40
            }
          }
        }
        if (thumbInput) ep.thumbnailUrl = thumbInput.value.trim();

        // Part 1 Multi-Language Video Sources
        const part1Sources = {};
        window.activeLanguages.forEach(lang => {
          const inputs = card.querySelectorAll(\`.ep-part1-q-input[data-lang="\${lang}"]\`);
          inputs.forEach(inp => {
            const q = inp.getAttribute('data-quality');
            const val = inp.value.trim();
            if (val && q) {
              if (!part1Sources[lang]) part1Sources[lang] = {};
              part1Sources[lang][q] = val;
            }
          });
        });
        ep.videoSources = part1Sources;

        // Fallbacks for legacy fields
        const firstLang = Object.keys(part1Sources)[0];
        if (firstLang && part1Sources[firstLang]) {
          ep.qualityLinks = part1Sources[firstLang];
          ep.videoUrl = ep.qualityLinks['1080p'] || ep.qualityLinks['720p'] || ep.qualityLinks['480p'] || ep.qualityLinks['360p'] || '';
        }

        // Additional Parts (Part 2, Part 3...)
        const extraCards = card.querySelectorAll('.ep-extra-part-card');
        const extraParts = [];
        extraCards.forEach((exCard) => {
          const exSources = {};
          window.activeLanguages.forEach(lang => {
            const inputs = exCard.querySelectorAll(\`.ep-extra-q-input[data-lang="\${lang}"]\`);
            inputs.forEach(inp => {
              const q = inp.getAttribute('data-quality');
              const val = inp.value.trim();
              if (val && q) {
                if (!exSources[lang]) exSources[lang] = {};
                exSources[lang][q] = val;
              }
            });
          });
          extraParts.push({ videoSources: exSources });
        });
        ep.videoLinks = extraParts;

        // Skip Markers
        const introStart = parseInt(card.querySelector('.ep-intro-start')?.value);
        const introEnd = parseInt(card.querySelector('.ep-intro-end')?.value);
        const outroStart = parseInt(card.querySelector('.ep-outro-start')?.value);
        const outroEnd = parseInt(card.querySelector('.ep-outro-end')?.value);
        const creditsStart = parseInt(card.querySelector('.ep-credits-start')?.value);
        const creditsEnd = parseInt(card.querySelector('.ep-credits-end')?.value);
        
        ep.skipMarkers = {};
        if (!isNaN(introStart) && !isNaN(introEnd)) ep.skipMarkers.intro = { start: introStart, end: introEnd };
        if (!isNaN(outroStart) && !isNaN(outroEnd)) ep.skipMarkers.outro = { start: outroStart, end: outroEnd };
        if (!isNaN(creditsStart) && !isNaN(creditsEnd)) ep.skipMarkers.credits = { start: creditsStart, end: creditsEnd };
        if (Object.keys(ep.skipMarkers).length === 0) delete ep.skipMarkers;
      });
    };
`);

// Add the UI helper
const uiHelperStr = `
    window.getQualityInputsHTML = function(itemSourcesObj, lang, inputClassPrefix, addCustomBtnHtml) {
       let existingQualities = [];
       if (itemSourcesObj && itemSourcesObj[lang]) {
         existingQualities = Object.keys(itemSourcesObj[lang]);
       } else if (window.activeLanguages.indexOf(lang) === 0 && !itemSourcesObj) {
         // fallback handled before
       }
       // Merge activeQualities and existingQualities, deduplicate
       const combined = Array.from(new Set([...window.activeQualities, ...existingQualities]));
       
       // Sort logically if possible
       const orderMap = { '4k': 0, '2160p': 1, '1440p': 2, '1080p': 3, '720p': 4, '480p': 5, '360p': 6 };
       combined.sort((a, b) => {
          let aIdx = orderMap[a.toLowerCase()] ?? 99;
          let bIdx = orderMap[b.toLowerCase()] ?? 99;
          if (aIdx !== bIdx) return aIdx - bIdx;
          return a.localeCompare(b);
       });

       let html = '';
       combined.forEach(q => {
          const val = (itemSourcesObj && itemSourcesObj[lang] && itemSourcesObj[lang][q]) ? itemSourcesObj[lang][q] : '';
          let color = '#fff'; let icon = '🎥';
          let qLower = q.toLowerCase();
          if(qLower.includes('1080') || qLower.includes('fhd')) { color='#A78BFA'; icon='🟣'; }
          else if(qLower.includes('720') || qLower.includes('hd')) { color='#60A5FA'; icon='🔵'; }
          else if(qLower.includes('480') || qLower.includes('sd')) { color='#34D399'; icon='🟢'; }
          else if(qLower.includes('360')) { color='#FBBF24'; icon='🟡'; }
          else if(qLower.includes('4k') || qLower.includes('2160')) { color='#F43F5E'; icon='🔴'; }
          else if(qLower.includes('1440') || qLower.includes('2k')) { color='#D946EF'; icon='💖'; }

          html += \`
            <div>
              <label class="form-label" style="font-size:10px; color:\${color}; font-weight:700; margin-bottom:4px;">\${icon} \${q}</label>
              <input type="text" class="input-control \${inputClassPrefix}" data-lang="\${lang}" data-quality="\${q}" value="\${val}" placeholder="Paste \${q} URL here...">
            </div>\`;
       });
       
       html += \`
          <div style="display:flex; align-items:flex-end; padding-bottom: 2px;">
            \${addCustomBtnHtml}
          </div>
       \`;

       return html;
    };
`;
html = html.replace(/\/\/\s*MOVIE MODE MULTI-PART & MULTI-LANGUAGE COLLECTOR/, uiHelperStr + '\n    // MOVIE MODE MULTI-PART & MULTI-LANGUAGE COLLECTOR');


fs.writeFileSync('public/admin.html', html);
