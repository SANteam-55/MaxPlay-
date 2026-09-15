const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Restore the original duration input
const oldDurRegex = /<div>\s*<label class="form-label"[^>]*>Duration<\/label>\s*<div style="display:flex; gap:6px;">\s*<input type="text" class="input-control ep-input-dur" value="\$\{ep\.duration[^>]*" placeholder="23:40">\s*<button[^>]*>\s*<i[^>]*><\/i> Calc\s*<\/button>\s*<\/div>\s*<\/div>/g;

html = html.replace(oldDurRegex, 
`<div>
                <label class="form-label" style="font-size:10px; font-weight:700;">Duration</label>
                <input type="text" class="input-control ep-input-dur" value="\${ep.duration ? Math.floor(ep.duration/60) + ':' + (ep.duration%60).toString().padStart(2, '0') : ''}" placeholder="23:40">
              </div>`);

// Add the glassmorphism block before the end of the episode card
const endOfCardRegex = /<button type="button" class="btn-secondary" style="height:32px; font-size:11px; margin-top:8px;" onclick="addEpisodeExtraPart\(\$\{epIdx\}\)">\s*<i class="fa-solid fa-plus"><\/i> Add Splitted Part to Episode\s*<\/button>\s*<\/div>\s*<\/div>/g;

const newBottom = `<button type="button" class="btn-secondary" style="height:32px; font-size:11px; margin-top:8px;" onclick="addEpisodeExtraPart(\${epIdx})">
                <i class="fa-solid fa-plus"></i> Add Splitted Part to Episode
              </button>
            </div>

            <div style="margin-top: 10px; background: rgba(255,255,255,0.02); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div class="ep-total-duration-text" style="font-size: 12px; font-weight: 700; color: var(--text-tertiary);">
                \${ep.duration ? 
                  \`<span style="color:#10B981; font-weight:900; display:inline-flex; align-items:center; gap:6px;"><i class="fa-solid fa-circle-check"></i> \${Math.floor(ep.duration/60).toString().padStart(2, '0') + ':' + (ep.duration%60).toString().padStart(2, '0')}</span> <span style="font-size:12px; color:#aaa; font-weight:normal;">(\${ep.duration}s)</span>\` 
                  : \`<span style="color:#71717A; font-size:11px; font-weight:600;"><i class="fa-regular fa-clock"></i> Not calculated</span>\`
                }
              </div>
              <button type="button" class="btn-secondary" style="padding: 0 16px; height: 32px; font-size: 11px; font-weight: 700; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);" onclick="calculateTotalDuration('episode', this)">
                <i class="fa-solid fa-rotate-right"></i> Calculate
              </button>
            </div>
          </div>`;

html = html.replace(endOfCardRegex, newBottom);

fs.writeFileSync('public/admin.html', html);
console.log('Patched correctly');
