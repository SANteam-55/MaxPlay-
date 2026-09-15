const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Update getQualityInputsHTML
const oldGetHtmlRegex = /window\.getQualityInputsHTML = function[\s\S]*?return html;\s*\};/g;

html = html.replace(oldGetHtmlRegex, 
`window.getQualityInputsHTML = function(itemSourcesObj, lang, inputClassPrefix, addCustomBtnHtml) {
       let combined = [];
       
       if (itemSourcesObj && itemSourcesObj[lang] !== undefined) {
         // Language already initialized for this part/episode
         combined = Object.keys(itemSourcesObj[lang]);
       } else {
         // New language or completely new episode/part
         combined = [...window.activeQualities];
       }
       
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

          const removeBtn = \`
                <button type="button" onclick="this.closest('.q-input-wrap').remove();" style="background:transparent; border:none; color:var(--text-tertiary); cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; width: 24px; height: 24px; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.color='#ef4444';" onmouseout="this.style.background='transparent'; this.style.color='var(--text-tertiary)';">
                  <i class="fa-solid fa-xmark"></i>
                </button>
          \`;

          html += \`
            <div class="q-input-wrap" style="position: relative;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label class="form-label" style="font-size:10px; color:\${color}; font-weight:700; margin-bottom:0;">\${icon} \${q}</label>
                \${removeBtn}
              </div>
              <input type="text" class="input-control \${inputClassPrefix}" data-lang="\${lang}" data-quality="\${q}" value="\${val}" placeholder="Paste \${q} URL here...">
            </div>\`;
       });
       
       html += \`
          <div style="display:flex; align-items:flex-end; padding-bottom: 2px;">
            \${addCustomBtnHtml}
          </div>
       \`;

       return html;
    };`);

// Update collectCurrentMoviePartsData
const oldCollectRegex = /window\.collectCurrentMoviePartsData = function[\s\S]*?return parts;\s*\};/g;

html = html.replace(oldCollectRegex, 
`window.collectCurrentMoviePartsData = function() {
      const cards = document.querySelectorAll('.movie-part-card');
      if (!cards || cards.length === 0) return [];
      const parts = [];

      cards.forEach((card) => {
        const partSources = {};
        window.activeLanguages.forEach((lang) => {
          partSources[lang] = {};
          const inputs = card.querySelectorAll(\`.movie-q-input[data-lang="\${lang}"]\`);
          inputs.forEach(inp => {
            const q = inp.getAttribute('data-quality');
            const val = inp.value.trim();
            if (q) {
              partSources[lang][q] = val;
            }
          });
        });
        parts.push({ videoSources: partSources });
      });

      return parts;
    };`);

// Update syncEpisodesFromDOM - replacing the whole function to ensure correctness
const oldSyncRegex = /window\.syncEpisodesFromDOM = function[\s\S]*?delete ep\.skipMarkers;\s*\};\s*\};/g;
html = html.replace(oldSyncRegex, 
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
          part1Sources[lang] = {};
          const inputs = card.querySelectorAll(\`.ep-part1-q-input[data-lang="\${lang}"]\`);
          inputs.forEach(inp => {
            const q = inp.getAttribute('data-quality');
            const val = inp.value.trim();
            if (q) {
              part1Sources[lang][q] = val;
            }
          });
          
          // Legacy support (in case they haven't been dynamically generated yet this session)
          const q1080 = card.querySelector(\`.ep-part1-1080[data-lang="\${lang}"]\`)?.value.trim() || '';
          const q720 = card.querySelector(\`.ep-part1-720[data-lang="\${lang}"]\`)?.value.trim() || '';
          const q480 = card.querySelector(\`.ep-part1-480[data-lang="\${lang}"]\`)?.value.trim() || '';
          const q360 = card.querySelector(\`.ep-part1-360[data-lang="\${lang}"]\`)?.value.trim() || '';

          if (q1080 || q720 || q480 || q360) {
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
            exSources[lang] = {};
            const inputs = exCard.querySelectorAll(\`.ep-extra-q-input[data-lang="\${lang}"]\`);
            inputs.forEach(inp => {
              const q = inp.getAttribute('data-quality');
              const val = inp.value.trim();
              if (q) {
                exSources[lang][q] = val;
              }
            });

            const eq1080 = exCard.querySelector(\`.ep-extra-1080[data-lang="\${lang}"]\`)?.value.trim() || '';
            const eq720 = exCard.querySelector(\`.ep-extra-720[data-lang="\${lang}"]\`)?.value.trim() || '';
            const eq480 = exCard.querySelector(\`.ep-extra-480[data-lang="\${lang}"]\`)?.value.trim() || '';
            const eq360 = exCard.querySelector(\`.ep-extra-360[data-lang="\${lang}"]\`)?.value.trim() || '';

            if (eq1080 || eq720 || eq480 || eq360) {
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


// Update renderEpisodesList to add calculate duration button
const durationHtmlRegex = /<div>\s*<label class="form-label"[^>]*>Duration<\/label>\s*<input type="text" class="input-control ep-input-dur"[^>]*>\s*<\/div>/g;

html = html.replace(durationHtmlRegex, 
`<div>
                <label class="form-label" style="font-size:10px; font-weight:700;">Duration</label>
                <div style="display:flex; gap:6px;">
                  <input type="text" class="input-control ep-input-dur" value="\${ep.duration ? Math.floor(ep.duration/60) + ':' + (ep.duration%60).toString().padStart(2, '0') : ''}" placeholder="23:40">
                  <button type="button" class="btn-secondary" style="padding: 0 12px; font-size: 11px; height: 36px; white-space: nowrap;" onclick="calculateTotalDuration('episode', this)">
                    <i class="fa-solid fa-rotate-right"></i> Calc
                  </button>
                </div>
              </div>`);


fs.writeFileSync('public/admin.html', html);
