const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const oldSyncFnRegex = /window\.syncEpisodesFromDOM = function\(\) \{[\s\S]*?\}\);\n    \};/g;

html = html.replace(oldSyncFnRegex, 
`window.syncEpisodesFromDOM = function() {
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
          
          // Legacy support (in case they haven't been dynamically generated yet this session)
          const q1080 = card.querySelector(\`.ep-part1-1080[data-lang="\${lang}"]\`)?.value.trim() || '';
          const q720 = card.querySelector(\`.ep-part1-720[data-lang="\${lang}"]\`)?.value.trim() || '';
          const q480 = card.querySelector(\`.ep-part1-480[data-lang="\${lang}"]\`)?.value.trim() || '';
          const q360 = card.querySelector(\`.ep-part1-360[data-lang="\${lang}"]\`)?.value.trim() || '';

          if (q1080 || q720 || q480 || q360) {
            if (!part1Sources[lang]) part1Sources[lang] = {};
            if (q1080 && !part1Sources[lang]['1080p']) part1Sources[lang]['1080p'] = q1080;
            if (q720 && !part1Sources[lang]['720p']) part1Sources[lang]['720p'] = q720;
            if (q480 && !part1Sources[lang]['480p']) part1Sources[lang]['480p'] = q480;
            if (q360 && !part1Sources[lang]['360p']) part1Sources[lang]['360p'] = q360;
          }
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

            const eq1080 = exCard.querySelector(\`.ep-extra-1080[data-lang="\${lang}"]\`)?.value.trim() || '';
            const eq720 = exCard.querySelector(\`.ep-extra-720[data-lang="\${lang}"]\`)?.value.trim() || '';
            const eq480 = exCard.querySelector(\`.ep-extra-480[data-lang="\${lang}"]\`)?.value.trim() || '';
            const eq360 = exCard.querySelector(\`.ep-extra-360[data-lang="\${lang}"]\`)?.value.trim() || '';

            if (eq1080 || eq720 || eq480 || eq360) {
              if (!exSources[lang]) exSources[lang] = {};
              if (eq1080 && !exSources[lang]['1080p']) exSources[lang]['1080p'] = eq1080;
              if (eq720 && !exSources[lang]['720p']) exSources[lang]['720p'] = eq720;
              if (eq480 && !exSources[lang]['480p']) exSources[lang]['480p'] = eq480;
              if (eq360 && !exSources[lang]['360p']) exSources[lang]['360p'] = eq360;
            }
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
    };`);
fs.writeFileSync('public/admin.html', html);
