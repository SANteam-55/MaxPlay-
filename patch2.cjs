const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Replace renderMovieLinksUI
html = html.replace(/window\.renderMovieLinksUI = function\(linksArray\) \{[\s\S]*?container\.innerHTML = h;\s*\};/g, 
`    window.addCustomQualityMovie = function(partIdx, lang) {
      const q = prompt('Enter custom quality for Part ' + (partIdx + 1) + ' ' + lang + ' audio (e.g. 4k, 1440p):');
      if (!q) return;
      const cleanQ = q.trim();
      if (!cleanQ) return;
      
      const currentParts = window.collectCurrentMoviePartsData();
      if (!currentParts[partIdx]) return;
      if (!currentParts[partIdx].videoSources) currentParts[partIdx].videoSources = {};
      if (!currentParts[partIdx].videoSources[lang]) currentParts[partIdx].videoSources[lang] = {};
      currentParts[partIdx].videoSources[lang][cleanQ] = '';
      
      window.renderMovieLinksUI(currentParts);
    };

    window.renderMovieLinksUI = function(linksArray) {
      const container = document.getElementById('movie-link-rows');
      if (!container) return;
      let h = '';
      const list = (linksArray && linksArray.length > 0) ? linksArray : [{ videoSources: {} }];

      list.forEach((item, i) => {
        let langInputs = '';
        window.activeLanguages.forEach(lang => {
          // Normalize legacy fallback before passing
          let itemSourcesObj = item.videoSources;
          if (window.activeLanguages.indexOf(lang) === 0 && !item.videoSources) {
             let legacyObj = {};
             if (typeof item === 'string') legacyObj['1080p'] = item;
             else if (typeof item === 'object') {
               if(item['1080p'] || item['1080P'] || item['default']) legacyObj['1080p'] = item['1080p'] || item['1080P'] || item['default'];
               if(item['720p'] || item['720P']) legacyObj['720p'] = item['720p'] || item['720P'];
               if(item['480p'] || item['480P']) legacyObj['480p'] = item['480p'] || item['480P'];
               if(item['360p']) legacyObj['360p'] = item['360p'];
             }
             itemSourcesObj = { [lang]: legacyObj };
          }
          
          const btnHtml = \`<button type="button" class="btn-secondary" style="height:36px; width:100%; font-size:11px;" onclick="addCustomQualityMovie(\${i}, '\${lang}')"><i class="fa-solid fa-plus"></i> Add Quality</button>\`;
          const qInputs = window.getQualityInputsHTML(itemSourcesObj, lang, 'movie-q-input', btnHtml);

          langInputs += \`
            <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:10px; margin-top:8px;">
              <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:var(--accent-amber); margin-bottom:8px;">
                <i class="fa-solid fa-language"></i> \${lang} Audio Track
              </div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                \${qInputs}
              </div>
            </div>
          \`;
        });

        h += \`
          <div class="movie-part-card" style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:4px;">
              <span style="font-size:13px; font-weight:800; color:var(--accent-purple); display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-film"></i> Part \${i + 1}
              </span>
              \${i > 0 ? \`
              <button type="button" class="btn-danger" style="height:28px; padding:0 10px; font-size:11px;" onclick="this.closest('.movie-part-card').remove()">
                <i class="fa-solid fa-trash"></i> Remove Part
              </button>\` : \`<span style="font-size:10px; color:var(--text-tertiary);">Main Movie Stream</span>\`}
            </div>
            \${langInputs}
          </div>
        \`;
      });
      container.innerHTML = h;
    };`);

// Replace renderEpisodesList
html = html.replace(/window\.renderEpisodesList = function\(\) \{[\s\S]*?listContainer\.innerHTML = h;\s*\};/g,
`    window.addCustomQualityEpisodePart1 = function(epIdx, lang) {
      const q = prompt('Enter custom quality for Episode Box ' + (epIdx + 1) + ' Main Part (' + lang + ') (e.g. 4k, 1440p):');
      if (!q || !q.trim()) return;
      window.syncEpisodesFromDOM();
      const s = window.seasonsData[window.currentSeasonIdx];
      if (!s || !s.episodes[epIdx]) return;
      
      const ep = s.episodes[epIdx];
      if (!ep.videoSources) ep.videoSources = {};
      if (!ep.videoSources[lang]) ep.videoSources[lang] = {};
      ep.videoSources[lang][q.trim()] = '';
      window.renderEpisodesList();
    };

    window.addCustomQualityEpisodeExtra = function(epIdx, extraIdx, lang) {
      const q = prompt('Enter custom quality for Episode Box ' + (epIdx + 1) + ' Part ' + (extraIdx + 2) + ' (' + lang + ') (e.g. 4k, 1440p):');
      if (!q || !q.trim()) return;
      window.syncEpisodesFromDOM();
      const s = window.seasonsData[window.currentSeasonIdx];
      if (!s || !s.episodes[epIdx]) return;
      
      const ep = s.episodes[epIdx];
      if (!ep.videoLinks || !ep.videoLinks[extraIdx]) return;
      
      const ex = ep.videoLinks[extraIdx];
      if (!ex.videoSources) ex.videoSources = {};
      if (!ex.videoSources[lang]) ex.videoSources[lang] = {};
      ex.videoSources[lang][q.trim()] = '';
      window.renderEpisodesList();
    };

    window.renderEpisodesList = function() {
      const listContainer = document.getElementById('season-episodes-list');
      if (!listContainer) return;

      const activeSeason = window.seasonsData[window.currentSeasonIdx] || { episodes: [] };
      const episodes = activeSeason.episodes || [];

      // Synchronize active season episode count in UI elements
      const epBadge = document.getElementById('active-season-ep-badge');
      if (epBadge) epBadge.innerText = \`\${episodes.length} Episode\${episodes.length === 1 ? '' : 's'}\`;
      const selector = document.getElementById('season-selector');
      if (selector && selector.options[window.currentSeasonIdx]) {
        const title = activeSeason.seasonTitle || ('Season ' + (activeSeason.seasonNumber || (window.currentSeasonIdx + 1)));
        selector.options[window.currentSeasonIdx].text = \`\${title} (\${episodes.length} eps)\`;
      }
      const pillsBar = document.getElementById('season-pills-bar');
      if (pillsBar && pillsBar.children[window.currentSeasonIdx]) {
        const cntSpan = pillsBar.children[window.currentSeasonIdx].querySelector('.season-pill-cnt');
        if (cntSpan) cntSpan.innerText = \`\${episodes.length} eps\`;
      }

      if (episodes.length === 0) {
        listContainer.innerHTML = \`<div style="background:var(--bg-tertiary); padding:28px; border-radius:12px; text-align:center; color:var(--text-tertiary); border:1px solid var(--border-color);">No episodes in this season yet. Click "+ Add Episode Box" or "⚡ Auto-Generate Episodes".</div>\`;
        return;
      }

      let h = '';
      episodes.forEach((ep, epIdx) => {
        // Render Part 1 Multi-Language Inputs
        let part1LangsHTML = '';
        window.activeLanguages.forEach(lang => {
          let itemSourcesObj = ep.videoSources;
          // legacy fallback omitted for simplicity or just passed as is
          const btnHtml = \`<button type="button" class="btn-secondary" style="height:36px; width:100%; font-size:11px;" onclick="addCustomQualityEpisodePart1(\${epIdx}, '\${lang}')"><i class="fa-solid fa-plus"></i> Add Quality</button>\`;
          const qInputs = window.getQualityInputsHTML(itemSourcesObj, lang, 'ep-part1-q-input', btnHtml);

          part1LangsHTML += \`
            <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:10px; margin-top:8px;">
              <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:var(--accent-amber); margin-bottom:8px;">
                <i class="fa-solid fa-language"></i> \${lang} Audio Track
              </div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                \${qInputs}
              </div>
            </div>
          \`;
        });

        // Render Additional Splitted Parts (Part 2, Part 3...)
        let extraParts = ep.videoLinks || [];
        let extraPartsHTML = '';

        extraParts.forEach((extraItem, extraIdx) => {
          let extraLangsHTML = '';
          window.activeLanguages.forEach(lang => {
            let exSourcesObj = extraItem.videoSources;
            // Legacy fallback
            if (window.activeLanguages.indexOf(lang) === 0 && !extraItem.videoSources) {
               let legacyObj = {};
               if (typeof extraItem === 'string') legacyObj['1080p'] = extraItem;
               else if (typeof extraItem === 'object') {
                 if(extraItem['1080p'] || extraItem['1080P'] || extraItem['default']) legacyObj['1080p'] = extraItem['1080p'] || extraItem['1080P'] || extraItem['default'];
                 if(extraItem['720p'] || extraItem['720P']) legacyObj['720p'] = extraItem['720p'] || extraItem['720P'];
                 if(extraItem['480p'] || extraItem['480P']) legacyObj['480p'] = extraItem['480p'] || extraItem['480P'];
                 if(extraItem['360p']) legacyObj['360p'] = extraItem['360p'];
               }
               exSourcesObj = { [lang]: legacyObj };
            }

            const btnHtml = \`<button type="button" class="btn-secondary" style="height:36px; width:100%; font-size:11px;" onclick="addCustomQualityEpisodeExtra(\${epIdx}, \${extraIdx}, '\${lang}')"><i class="fa-solid fa-plus"></i> Add Quality</button>\`;
            const qInputs = window.getQualityInputsHTML(exSourcesObj, lang, 'ep-extra-q-input', btnHtml);

            extraLangsHTML += \`
              <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:10px; margin-top:8px;">
                <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:var(--accent-amber); margin-bottom:8px;">
                  <i class="fa-solid fa-language"></i> \${lang} Audio Track
                </div>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                  \${qInputs}
                </div>
              </div>
            \`;
          });

          extraPartsHTML += \`
            <div class="ep-extra-part-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-top:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
                <span style="font-size:12px; font-weight:800; color:var(--text-secondary);"><i class="fa-solid fa-film"></i> Part \${extraIdx + 2}</span>
                <button type="button" class="btn-danger" style="height:26px; padding:0 8px; font-size:10px;" onclick="removeEpisodeExtraPart(\${epIdx}, \${extraIdx})">
                  <i class="fa-solid fa-trash"></i> Remove Part
                </button>
              </div>
              \${extraLangsHTML}
            </div>
          \`;
        });

        // Safe skip markers extraction for UI
        let sm = ep.skipMarkers || {};
        let iStart = sm.intro?.start ?? '';
        let iEnd = sm.intro?.end ?? '';
        let oStart = sm.outro?.start ?? '';
        let oEnd = sm.outro?.end ?? '';
        let cStart = sm.credits?.start ?? '';
        let cEnd = sm.credits?.end ?? '';

        h += \`
          <div class="episode-card" style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:14px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
              <span style="font-weight:800; font-size:15px; color:var(--accent-cyan); display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-circle-play"></i> Episode Box \${ep.episodeNumber || (epIdx + 1)}
              </span>
              <button type="button" class="btn-danger" style="height:30px; padding:0 12px; font-size:11px;" onclick="deleteEpisodeCard(\${epIdx})">
                <i class="fa-solid fa-trash"></i> Delete Ep
              </button>
            </div>
            
            <div style="display:grid; grid-template-columns: 90px 2fr 1fr; gap:12px;">
              <div>
                <label class="form-label" style="font-size:10px; font-weight:700;">Episode #</label>
                <input type="number" class="input-control ep-input-num" value="\${ep.episodeNumber || (epIdx + 1)}">
              </div>
              <div>
                <label class="form-label" style="font-size:10px; font-weight:700;">Episode Title</label>
                <input type="text" class="input-control ep-input-title" value="\${ep.title || ''}" placeholder="E.g. The Beginning...">
              </div>
              <div>
                <label class="form-label" style="font-size:10px; font-weight:700;">Duration</label>
                <input type="text" class="input-control ep-input-dur" value="\${ep.duration ? Math.floor(ep.duration/60) + ':' + (ep.duration%60).toString().padStart(2, '0') : ''}" placeholder="23:40">
              </div>
            </div>

            <div>
              <label class="form-label" style="font-size:10px; font-weight:700;">Episode Thumbnail URL</label>
              <input type="text" class="input-control ep-input-thumb" value="\${ep.thumbnailUrl || ''}" placeholder="https://... (Optional)">
            </div>

            <div style="background:rgba(0,0,0,0.2); border-radius:8px; padding:10px; border:1px solid rgba(255,255,255,0.05);">
              <label class="form-label" style="font-size:11px; font-weight:800; color:var(--text-primary); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-forward-step"></i> Skip Markers (Seconds)
              </label>
              <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px;">
                <div style="display:flex; gap:6px;">
                  <input type="number" class="input-control ep-intro-start" value="\${iStart}" placeholder="Intro Start">
                  <input type="number" class="input-control ep-intro-end" value="\${iEnd}" placeholder="Intro End">
                </div>
                <div style="display:flex; gap:6px;">
                  <input type="number" class="input-control ep-outro-start" value="\${oStart}" placeholder="Outro Start">
                  <input type="number" class="input-control ep-outro-end" value="\${oEnd}" placeholder="Outro End">
                </div>
                <div style="display:flex; gap:6px;">
                  <input type="number" class="input-control ep-credits-start" value="\${cStart}" placeholder="Credits Start">
                  <input type="number" class="input-control ep-credits-end" value="\${cEnd}" placeholder="Credits End">
                </div>
              </div>
            </div>

            <div style="margin-top:4px;">
              <div style="font-size:13px; font-weight:800; margin-bottom:8px; color:var(--text-secondary);"><i class="fa-solid fa-play"></i> Main Video Links (Part 1)</div>
              \${part1LangsHTML}
            </div>

            <div style="margin-top:8px;">
              \${extraPartsHTML}
              <button type="button" class="btn-secondary" style="height:32px; font-size:11px; margin-top:8px;" onclick="addEpisodeExtraPart(\${epIdx})">
                <i class="fa-solid fa-plus"></i> Add Splitted Part to Episode
              </button>
            </div>

          </div>
        \`;
      });
      listContainer.innerHTML = h;
    };`);

fs.writeFileSync('public/admin.html', html);
