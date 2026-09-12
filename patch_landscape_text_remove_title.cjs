const fs = require('fs');
let code = fs.readFileSync('src/screens/main/HomeScreen.tsx', 'utf8');

const oldCode = `                  } else if (style === 'landscape_text') {
                    const displayBg = item.customImage || item.backdropUrl || item.posterUrl;
                    const displayTitle = item.customTitle || item.title;
                    return (
                      <div key={item.id} onClick={() => onSelectContent(item)} className="relative shrink-0 w-[240px] h-[135px] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform border border-white/5">
                        <img src={displayBg} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 py-2 px-3 border-t border-white/10 bg-white/5 backdrop-blur-md">
                          <h3 className="text-sm font-black text-white text-center truncate">{item.customTitle || item.title}</h3>
                        </div>
                      </div>
                    );`;

const newCode = `                  } else if (style === 'landscape_text') {
                    const displayBg = item.customImage || item.backdropUrl || item.posterUrl;
                    const displayTitle = item.customTitle || item.title;
                    return (
                      <div key={item.id} onClick={() => onSelectContent(item)} className="relative shrink-0 w-[240px] h-[135px] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform border border-white/5 shadow-lg">
                        <img src={displayBg} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                    );`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/screens/main/HomeScreen.tsx', code);
console.log("Patched HomeScreen.tsx landscape_text mode");
