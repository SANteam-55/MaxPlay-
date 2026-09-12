const fs = require('fs');
let code = fs.readFileSync('src/screens/main/HomeScreen.tsx', 'utf8');

const startIndex = code.indexOf("if (style === 'seasonal_card') {");
const endIndex = code.indexOf("} else if (style === 'landscape_text') {");

if (startIndex !== -1 && endIndex !== -1) {
  const newSeasonal = `if (style === 'seasonal_card') {
                    const collectionIds = item.collectionIds || [];
                    const resolved = collectionIds.map((id: string) => contentList.find((c: any) => c.id === id)).filter(Boolean);
                    
                    const p1 = resolved[0]?.posterUrl || item.customImage || item.posterUrl || 'https://via.placeholder.com/100x140/1a1a1a/666666';
                    const p2 = resolved[1]?.posterUrl || resolved[0]?.backdropUrl || item.backdropUrl || p1;
                    const p3 = resolved[2]?.posterUrl || resolved[1]?.backdropUrl || item.backdropUrl || p1;

                    const displayTitle = item.customTitle || item.title || 'Winter 2026';
                    const titleParts = displayTitle.split(' ');
                    const titleRender = titleParts.length > 1 
                      ? <>{titleParts[0]}<br/>{titleParts.slice(1).join(' ')}</>
                      : displayTitle;

                    return (
                      <div 
                        key={item.id} 
                        onClick={() => onSelectContent(item)} 
                        className="relative shrink-0 w-[230px] sm:w-[240px] h-[115px] rounded-[18px] overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform shadow-xl border border-white/10 group bg-[#121212]"
                      >
                        {/* Blurred Poster Background */}
                        <img src={p1} alt="bg" className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-70 group-hover:scale-140 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-black/70" />
                        
                        {/* Card Contents */}
                        <div className="absolute inset-0 flex items-center justify-between pl-2.5 pr-0 py-2">
                          {/* Left: 3 Overlapping Poster Stack */}
                          <div className="relative w-[100px] h-[98px] shrink-0 my-auto">
                            {/* Card 3 (Back) */}
                            <div className="absolute w-[62px] h-[86px] left-[26px] top-[6px] z-10 rounded-lg overflow-hidden shadow-[0_4px_10px_rgba(0,0,0,0.8)] border border-white/10 opacity-75">
                              <img src={p3} className="w-full h-full object-cover" alt="" />
                            </div>
                            {/* Card 2 (Middle) */}
                            <div className="absolute w-[64px] h-[90px] left-[13px] top-[3px] z-20 rounded-lg overflow-hidden shadow-[0_6px_14px_rgba(0,0,0,0.85)] border border-white/15 opacity-90">
                              <img src={p2} className="w-full h-full object-cover" alt="" />
                            </div>
                            {/* Card 1 (Front) */}
                            <div className="absolute w-[66px] h-[96px] left-0 top-0 z-30 rounded-xl overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.9)] border border-white/25">
                              <img src={p1} className="w-full h-full object-cover" alt="" />
                            </div>
                          </div>
                          
                          {/* Right: Title & Bottom HOT LIST Bar */}
                          <div className="flex-1 flex flex-col justify-between h-full pl-1">
                            {/* Title Area */}
                            <div className="flex-1 flex items-center justify-center pt-1 pr-2">
                              <h3 className="text-[17px] font-black text-white text-center leading-[1.1] italic tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                                {titleRender}
                              </h3>
                            </div>
                            
                            {/* HOT LIST Grey Bar */}
                            <div className="w-full bg-[#52525B]/50 backdrop-blur-md py-1 px-2 border-t border-l border-white/15 rounded-tl-lg rounded-br-[17px] flex items-center justify-center text-center">
                              <span className="text-[11px] font-black text-white italic tracking-widest uppercase drop-shadow">HOT LIST</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } `;

  code = code.substring(0, startIndex) + newSeasonal + code.substring(endIndex);
  fs.writeFileSync('src/screens/main/HomeScreen.tsx', code);
  console.log("Patched HomeScreen.tsx successfully!");
} else {
  console.log("Indices not found:", startIndex, endIndex);
}
