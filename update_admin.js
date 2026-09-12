const fs = require('fs');
let content = fs.readFileSync('public/admin.html', 'utf8');

// 1. Add window.activeLanguages and updateActiveLanguages
const globalsScript = `
    window.activeLanguages = ['English'];
    window.updateActiveLanguages = function() {
        const checked = Array.from(document.querySelectorAll('.lang-checkbox:checked')).map(cb => cb.value);
        window.activeLanguages = checked.length > 0 ? checked : ['English'];
        if (window.currentUploadMode === 'movie') {
            const list = [];
            document.querySelectorAll('.movie-part-card').forEach(card => list.push({})); // dummy to preserve count
            renderMovieLinksUI(list.length > 0 ? list : [{}]);
        } else {
            renderEpisodesList();
        }
    };
`;
content = content.replace("window.cachedContentDocs = [...DEFAULT_SAMPLE_CONTENT];", globalsScript + "\n    window.cachedContentDocs = [...DEFAULT_SAMPLE_CONTENT];");

// 2. Add UI for Languages in Step 1
const langUI = `
              <div class="form-group">
                <label class="form-label">Available Audio Languages</label>
                <div style="display:flex; gap:12px; flex-wrap:wrap;" id="languages-checkbox-container">
                  <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:#D4D4D8;"><input type="checkbox" class="lang-checkbox" value="English" checked onchange="updateActiveLanguages()"> English</label>
                  <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:#D4D4D8;"><input type="checkbox" class="lang-checkbox" value="Hindi" onchange="updateActiveLanguages()"> Hindi</label>
                  <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:#D4D4D8;"><input type="checkbox" class="lang-checkbox" value="Japanese" onchange="updateActiveLanguages()"> Japanese</label>
                  <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:#D4D4D8;"><input type="checkbox" class="lang-checkbox" value="Tamil" onchange="updateActiveLanguages()"> Tamil</label>
                  <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:#D4D4D8;"><input type="checkbox" class="lang-checkbox" value="Telugu" onchange="updateActiveLanguages()"> Telugu</label>
                </div>
              </div>
`;
content = content.replace('<div class="form-group">\n                <label class="form-label">Genres (Comma separated)</label>', langUI + '\n              <div class="form-group">\n                <label class="form-label">Genres (Comma separated)</label>');

fs.writeFileSync('public/admin.html', content);
