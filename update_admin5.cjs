const fs = require('fs');
let content = fs.readFileSync('public/admin.html', 'utf8');

const regexEpRender = /window\.renderEpisodesList\s*=\s*function\(\)\s*\{[\s\S]*?window\.createNewEpisodeBox/m;
const fnEpRender = `
    window.renderEpisodesList = function() {
      const listContainer = document.getElementById('season-episodes-list');
      if (!listContainer) return;
      const activeSeason = window.seasonsData[window.currentSeasonIdx] || { episodes: [] };
      const episodes = activeSeason.episodes || [];
      if (episodes.length === 0) {
        listContainer.innerHTML = \`<div style="background:var(--bg-tertiary); padding:24px; border-radius:10px; text-align:center; color:var(--text-tertiary); border:1px solid var(--border-color);">No episodes in this season yet. Click "+ Add Episode Box" or "⚡ Auto-Generate Episodes".</div>\`;
        return;
      }
      let h = '';
      episodes.forEach((ep, epIdx) => {
        let langInputs = '';
        window.activeLanguages.forEach(lang => {
           let eq1080 = '', eq720 = '', eq480 = '';
           if (ep.videoSources && ep.videoSources[lang]) {
               eq1080 = ep.videoSources[lang]['1080p'] || '';
               eq720 = ep.videoSources[lang]['720p'] || '';
               eq480 = ep.videoSources[lang]['480p'] || '';
           } else if (window.activeLanguages.indexOf(lang) === 0 && !ep.videoSources) {
               // Fallback to legacy
               if (ep.qualityLinks) {
                   eq1080 = ep.qualityLinks['1080p'] || ep.qualityLinks['1080P'] || ep.qualityLinks['default'] || '';
                   eq720 = ep.qualityLinks['720p'] || ep.qualityLinks['720P'] || '';
                   eq480 = ep.qualityLinks['480p'] || ep.qualityLinks['480P'] || '';
               } else if (ep.videoUrl) {
                   eq1080 = ep.videoUrl;
               }
           }
           
           langInputs += \`
            <div style="background:rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:10px; margin-top:8px;">
              <div style="font-size:11px; font-weight:800; color:var(--accent-amber); margin-bottom:6px;"><i class="fa-solid fa-language"></i> \${lang} Audio</div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:6px;">
                <div>
                  <label class="form-label" style="font-size:9px; color:#A78BFA;">🟣 1080p</label>
                  <input type="text" class="input-control" value="\${eq1080}" placeholder="1080p link..." onchange="updateEpisodeVideoSource(\${epIdx}, '\${lang}', '1080p', this.value)">
                </div>
                <div>
                  <label class="form-label" style="font-size:9px; color:#60A5FA;">🔵 720p</label>
                  <input type="text" class="input-control" value="\${eq720}" placeholder="720p link..." onchange="updateEpisodeVideoSource(\${epIdx}, '\${lang}', '720p', this.value)">
                </div>
                <div>
                  <label class="form-label" style="font-size:9px; color:#34D399;">🟢 480p</label>
                  <input type="text" class="input-control" value="\${eq480}" placeholder="480p link..." onchange="updateEpisodeVideoSource(\${epIdx}, '\${lang}', '480p', this.value)">
                </div>
              </div>
            </div>
           \`;
        });

        h += \`
          <div class="episode-card" style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:800; font-size:14px; color:var(--accent-cyan); display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-circle-play"></i> Episode Box \${ep.episodeNumber || (epIdx + 1)}
              </span>
              <button type="button" class="btn-danger" style="height:28px; padding:0 10px; font-size:11px;" onclick="deleteEpisodeCard(\${epIdx})"><i class="fa-solid fa-trash"></i> Delete Ep</button>
            </div>
            
            <div style="display:grid; grid-template-columns: 80px 2fr 1fr; gap:10px;">
              <div>
                <label class="form-label" style="font-size:10px;">Ep #</label>
                <input type="number" class="input-control" value="\${ep.episodeNumber || (epIdx + 1)}" onchange="updateEpisodeField(\${epIdx}, 'episodeNumber', parseInt(this.value))">
              </div>
              <div>
                <label class="form-label" style="font-size:10px;">Title</label>
                <input type="text" class="input-control" value="\${ep.title || ''}" placeholder="Episode Title" onchange="updateEpisodeField(\${epIdx}, 'title', this.value)">
              </div>
              <div>
                <label class="form-label" style="font-size:10px;">Duration (Mins)</label>
                <input type="number" class="input-control" value="\${ep.duration ? Math.round(ep.duration / 60) : 24}" onchange="updateEpisodeField(\${epIdx}, 'duration', parseInt(this.value) * 60)">
              </div>
            </div>
            <div>
              <label class="form-label" style="font-size:10px;">Thumbnail URL</label>
              <input type="text" class="input-control" value="\${ep.thumbnailUrl || ''}" placeholder="https://..." onchange="updateEpisodeField(\${epIdx}, 'thumbnailUrl', this.value)">
            </div>

            <!-- Video Matrix Sources -->
            <div style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:10px; padding:12px;">
              <label class="form-label" style="font-size:11px; font-weight:700; color:var(--text-primary); margin-bottom:8px;">
                Video Stream URLs
              </label>
              \${langInputs}
            </div>
          </div>
        \`;
      });
      listContainer.innerHTML = h;
    };

    window.updateEpisodeVideoSource = function(epIdx, lang, quality, val) {
       const activeSeason = window.seasonsData[window.currentSeasonIdx];
       if (!activeSeason || !activeSeason.episodes[epIdx]) return;
       const ep = activeSeason.episodes[epIdx];
       if (!ep.videoSources) ep.videoSources = {};
       if (!ep.videoSources[lang]) ep.videoSources[lang] = {};
       ep.videoSources[lang][quality] = val;
    };

    window.createNewEpisodeBox`;

content = content.replace(regexEpRender, fnEpRender);

// Update autoGenerateEpisodesPrompt
const autoGenRegex = /window\.autoGenerateEpisodesPrompt\s*=\s*function\(\)\s*\{[\s\S]*?window\.renderReviewSummary/m;
const fnAutoGen = `
    window.autoGenerateEpisodesPrompt = function() {
      const count = parseInt(prompt('How many episodes to auto-generate?', '12'));
      if (!count || count <= 0) return;
      const baseLink = prompt('Enter base link (use {lang} for language, {ep} for episode number)\\nExample: https://cdn.com/{lang}/ep{ep}_1080p.mp4', 'https://cdn.com/{lang}/ep{ep}_1080p.mp4');
      if (!baseLink) return;
      
      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      const currentCount = activeSeason.episodes.length;
      
      for (let i = 1; i <= count; i++) {
        let epNum = currentCount + i;
        let vSources = {};
        
        window.activeLanguages.forEach(lang => {
             const langStr = lang.toLowerCase();
             const epUrl = baseLink.replace(/{ep}/g, epNum).replace(/{lang}/g, langStr);
             vSources[lang] = {
                 '1080p': epUrl,
                 '720p': '',
                 '480p': ''
             };
        });

        activeSeason.episodes.push({
          episodeNumber: epNum,
          title: 'Episode ' + epNum,
          duration: 1440,
          thumbnailUrl: '',
          videoSources: vSources
        });
      }
      renderEpisodesList();
      showToast('Generated ' + count + ' episodes!');
    };

    window.renderReviewSummary`;

content = content.replace(autoGenRegex, fnAutoGen);
fs.writeFileSync('public/admin.html', content);
