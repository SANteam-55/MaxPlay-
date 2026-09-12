const fs = require('fs');
let code = fs.readFileSync('public/admin.html', 'utf8');

const target = `              if (p1u && !ep.duration) {
                 ep.duration = await window.getVideoDuration(p1u);
              }
              
              // Extra parts duration
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

const replacement = `              if (p1u && !ep.duration) {
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

code = code.replace(target, replacement);
fs.writeFileSync('public/admin.html', code);
