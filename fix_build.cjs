const fs = require('fs');
let code = fs.readFileSync('public/admin.html', 'utf8');

const target = `                    // First element is Part 1, rest are Part 2+
                    const part1 = epLinks[0] || {};
                    const sources = {};
                    if (part1.videoSources) Object.assign(sources, part1.videoSources);
                    else if (part1.url) sources['Hindi'] = part1.qualities || { '1080p': part1.url };

                    const extraParts = epLinks.slice(1).map(part => {
                      const xtraSources = {};
                      if (part.videoSources) Object.assign(xtraSources, part.videoSources);
                      else if (part.url) xtraSources['Hindi'] = part.qualities || { '1080p': part.url };
                      return { videoSources: xtraSources };
                    });`;

const replacement = `                    // First element is Part 1, rest are Part 2+
                    const part1 = epLinks[0] || {};
                    const sources = {};
                    const defaultLang = (window.activeLanguages && window.activeLanguages.length > 0) ? window.activeLanguages[0] : 'Hindi';
                    
                    if (part1.videoSources) Object.assign(sources, part1.videoSources);
                    else if (part1.url) sources[defaultLang] = part1.qualities || { '1080p': part1.url };

                    const extraParts = epLinks.slice(1).map(part => {
                      const xtraSources = {};
                      if (part.videoSources) Object.assign(xtraSources, part.videoSources);
                      else if (part.url) xtraSources[defaultLang] = part.qualities || { '1080p': part.url };
                      return { videoSources: xtraSources };
                    });`;

code = code.replace(target, replacement);
fs.writeFileSync('public/admin.html', code);
