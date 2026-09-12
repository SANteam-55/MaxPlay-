const fs = require('fs');
let content = fs.readFileSync('public/admin.html', 'utf8');

// Replace renderMovieLinksUI and addMovieLinkRow
const fnStr = `
    window.renderMovieLinksUI = function(linksArray) {
      const container = document.getElementById('movie-link-rows');
      if (!container) return;
      let h = '';
      const list = (linksArray && linksArray.length > 0) ? linksArray : ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'];
      
      list.forEach((item, i) => {
        let langInputs = '';
        window.activeLanguages.forEach(lang => {
           let q1080 = '', q720 = '', q480 = '';
           if (item && item.videoSources && item.videoSources[lang]) {
               q1080 = item.videoSources[lang]['1080p'] || '';
               q720 = item.videoSources[lang]['720p'] || '';
               q480 = item.videoSources[lang]['480p'] || '';
           } else if (i === 0 && window.activeLanguages.indexOf(lang) === 0 && !item.videoSources) {
               // Fallback to legacy structure for the first language
               if (typeof item === 'string') q1080 = item;
               else if (typeof item === 'object') {
                   q1080 = item['1080p'] || item['1080P'] || item['default'] || '';
                   q720 = item['720p'] || item['720P'] || '';
                   q480 = item['480p'] || item['480P'] || item['360p'] || '';
               }
           }
           langInputs += \`
            <div style="background:rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-top:8px;">
              <div style="font-size:11px; font-weight:800; color:var(--accent-amber); margin-bottom:6px;"><i class="fa-solid fa-language"></i> \${lang} Audio</div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:8px;">
                <div>
                  <label class="form-label" style="font-size:9px; color:#A78BFA;">🟣 1080p</label>
                  <input type="text" class="input-control movie-q-1080" data-lang="\${lang}" value="\${q1080}" placeholder="1080p link...">
                </div>
                <div>
                  <label class="form-label" style="font-size:9px; color:#60A5FA;">🔵 720p</label>
                  <input type="text" class="input-control movie-q-720" data-lang="\${lang}" value="\${q720}" placeholder="720p link...">
                </div>
                <div>
                  <label class="form-label" style="font-size:9px; color:#34D399;">🟢 480p</label>
                  <input type="text" class="input-control movie-q-480" data-lang="\${lang}" value="\${q480}" placeholder="480p link...">
                </div>
              </div>
            </div>
           \`;
        });

        h += \`
          <div class="movie-part-card" style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; font-weight:800; color:var(--accent-purple); display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-film"></i> Part \${i + 1}
              </span>
              <button type="button" class="btn-danger" style="height:28px; padding:0 8px; font-size:11px;" onclick="this.closest('.movie-part-card').remove()">
                <i class="fa-solid fa-trash"></i> Remove Part
              </button>
            </div>
            \${langInputs}
          </div>
        \`;
      });
      container.innerHTML = h;
    };

    window.addMovieLinkRow = function() {
      const container = document.getElementById('movie-link-rows');
      if (!container) return;
      const count = container.querySelectorAll('.movie-part-card').length;
      const div = document.createElement('div');
      div.className = 'movie-part-card';
      div.style.cssText = 'background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;';
      
      let langInputs = '';
      window.activeLanguages.forEach(lang => {
         langInputs += \`
          <div style="background:rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-top:8px;">
            <div style="font-size:11px; font-weight:800; color:var(--accent-amber); margin-bottom:6px;"><i class="fa-solid fa-language"></i> \${lang} Audio</div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:8px;">
              <div>
                <label class="form-label" style="font-size:9px; color:#A78BFA;">🟣 1080p</label>
                <input type="text" class="input-control movie-q-1080" data-lang="\${lang}" value="" placeholder="1080p link...">
              </div>
              <div>
                <label class="form-label" style="font-size:9px; color:#60A5FA;">🔵 720p</label>
                <input type="text" class="input-control movie-q-720" data-lang="\${lang}" value="" placeholder="720p link...">
              </div>
              <div>
                <label class="form-label" style="font-size:9px; color:#34D399;">🟢 480p</label>
                <input type="text" class="input-control movie-q-480" data-lang="\${lang}" value="" placeholder="480p link...">
              </div>
            </div>
          </div>
         \`;
      });

      div.innerHTML = \`
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; font-weight:800; color:var(--accent-purple); display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-film"></i> Part \${count + 1}
          </span>
          <button type="button" class="btn-danger" style="height:28px; padding:0 8px; font-size:11px;" onclick="this.closest('.movie-part-card').remove()">
            <i class="fa-solid fa-trash"></i> Remove Part
          </button>
        </div>
        \${langInputs}
      \`;
      container.appendChild(div);
    };
`;

const regex = /window\.renderMovieLinksUI\s*=\s*function\(linksArray\)\s*\{[\s\S]*?window\.renderSeasonsUI/m;
content = content.replace(regex, fnStr + "\n    // SERIES / SEASONS / EPISODES MANAGER\n    window.renderSeasonsUI");
fs.writeFileSync('public/admin.html', content);
