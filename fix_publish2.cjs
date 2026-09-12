const fs = require('fs');
let code = fs.readFileSync('public/admin.html', 'utf8');

const regex = /if\s*\(p1u\s*&&\s*!ep\.duration\)\s*\{\s*ep\.duration\s*=\s*await\s*window\.getVideoDuration\(p1u\);\s*\}\s*\/\/\s*Extra parts duration\s*if\s*\(ep\.videoLinks\s*&&\s*Array\.isArray\(ep\.videoLinks\)\)\s*\{\s*for\s*\(let\s*xp\s*of\s*ep\.videoLinks\)\s*\{\s*let\s*xpu\s*=\s*'';\s*for\s*\(let\s*l\s*in\s*xp\.videoSources\)\s*\{\s*if\s*\(xp\.videoSources\[l\]\['1080p'\]\)\s*\{\s*xpu\s*=\s*xp\.videoSources\[l\]\['1080p'\];\s*break;\s*\}\s*if\s*\(xp\.videoSources\[l\]\['720p'\]\)\s*\{\s*xpu\s*=\s*xp\.videoSources\[l\]\['720p'\];\s*break;\s*\}\s*if\s*\(xp\.videoSources\[l\]\['480p'\]\)\s*\{\s*xpu\s*=\s*xp\.videoSources\[l\]\['480p'\];\s*break;\s*\}\s*if\s*\(xp\.videoSources\[l\]\['360p'\]\)\s*\{\s*xpu\s*=\s*xp\.videoSources\[l\]\['360p'\];\s*break;\s*\}\s*\}\s*if\s*\(xpu\s*&&\s*!xp\.duration\)\s*\{\s*xp\.duration\s*=\s*await\s*window\.getVideoDuration\(xpu\);\s*\}\s*\}\s*\}/;

const replacement = `if (p1u && !ep.duration) {
                 ep.duration = await window.getVideoDuration(p1u);
                 if (ep.videoLinks && Array.isArray(ep.videoLinks)) {
                   for (let xp of ep.videoLinks) {
                     let xpu = '';
                     for (let l in xp.videoSources) {
                        if (xp.videoSources[l]['1080p']) { xpu = xp.videoSources[l]['1080p']; break; }
                        if (xp.videoSources[l]['720p']) { xpu = xp.videoSources[l]['720p']; break; }
                        if (xp.videoSources[l]['480p']) { xpu = xp.videoSources[l]['480p']; break; }
                        if (xp.videoSources[l]['360p']) { xpu = xp.videoSources[l]['360p']; break; }
                     }
                     if (xpu) {
                        const xDur = await window.getVideoDuration(xpu);
                        ep.duration += xDur;
                     }
                   }
                 }
              }
              // Even if ep.duration was already set, we might need xp.duration for individual part info (optional)
              if (ep.videoLinks && Array.isArray(ep.videoLinks)) {
                for (let xp of ep.videoLinks) {
                  let xpu = '';
                  for (let l in xp.videoSources) {
                     if (xp.videoSources[l]['1080p']) { xpu = xp.videoSources[l]['1080p']; break; }
                     if (xp.videoSources[l]['720p']) { xpu = xp.videoSources[l]['720p']; break; }
                     if (xp.videoSources[l]['480p']) { xpu = xp.videoSources[l]['480p']; break; }
                     if (xp.videoSources[l]['360p']) { xpu = xp.videoSources[l]['360p']; break; }
                  }
                  if (xpu && !xp.duration) {
                     xp.duration = await window.getVideoDuration(xpu);
                  }
                }
              }`;

code = code.replace(regex, replacement);
fs.writeFileSync('public/admin.html', code);
