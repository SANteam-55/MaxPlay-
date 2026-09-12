const fs = require('fs');
let code = fs.readFileSync('src/screens/main/HomeScreen.tsx', 'utf8');

const oldSeasonal = `                  if (style === 'seasonal_card') {
                    const displayBg = item.customImage || item.backdropUrl || item.posterUrl;
                    const displayTitle = item.customTitle || item.title;
                    return (
                      <div key={item.id} onClick={() => onSelectContent(item)} className="relative shrink-0 w-[260px] h-[130px] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform">
                        <img src={displayBg} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-between p-3">
                           <div className="w-[80px] h-[100px] shrink-0 rounded-lg overflow-hidden border border-white/20 shadow-lg">
                             <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1 ml-3 flex flex-col justify-center items-end text-right pr-2">
                             <div className="backdrop-blur-md bg-white/10 px-3 py-1 rounded-full mb-1 border border-white/10">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{row.tagFilter || 'HOT LIST'}</span>
                             </div>
                             <h3 className="text-sm font-black text-white leading-tight drop-shadow-md">{item.customTitle || item.title}</h3>
                           </div>
                        </div>
                      </div>
                    );
                  } else if (style === 'landscape_text') {`;

const newSeasonal = `                  if (style === 'seasonal_card') {
                    const collectionIds = item.collectionIds || [];
                    const item1 = contentList.find((c: any) => c.id === collectionIds[0]);
                    const item2 = contentList.find((c: any) => c.id === collectionIds[1]);
                    const item3 = contentList.find((c: any) => c.id === collectionIds[2]);
                    
                    const p1 = item1?.posterUrl || item.customImage || 'https://via.placeholder.com/100x140/1a1a1a/666666';
                    const p2 = item2?.posterUrl || 'https://via.placeholder.com/100x140/2a2a2a/666666';
                    const p3 = item3?.posterUrl || 'https://via.placeholder.com/100x140/3a3a3a/666666';

                    const displayTitle = item.customTitle || item.title;
                    // Split title to emulate the stacked text effect (e.g. "Spring" \\n "2026")
                    const titleParts = displayTitle.split(' ');
                    const titleRender = titleParts.length > 1 
                      ? <>{titleParts[0]}<br/>{titleParts.slice(1).join(' ')}</>
                      : displayTitle;

                    return (
                      <div key={item.id} onClick={() => onSelectContent(item)} className="relative shrink-0 w-[290px] h-[140px] rounded-[20px] overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform shadow-lg border border-white/10 group">
                        {/* Blurred Background */}
                        <img src={p1} alt="bg" className="absolute inset-0 w-full h-full object-cover blur-sm opacity-60 group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/80" />
                        
                        <div className="absolute inset-0 flex items-center p-3">
                          {/* Left: 3 Overlapping Cards */}
                          <div className="relative w-[135px] h-[105px] shrink-0 ml-1">
                            {/* Card 3 (Back) */}
                            <div className="absolute w-[70px] h-[95px] left-[65px] top-[5px] z-10 rounded-md overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.8)] border border-white/10 opacity-80">
                              <img src={p3} className="w-full h-full object-cover" />
                            </div>
                            {/* Card 2 (Middle) */}
                            <div className="absolute w-[70px] h-[95px] left-[32px] top-[5px] z-20 rounded-md overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.9)] border border-white/10 opacity-90">
                              <img src={p2} className="w-full h-full object-cover" />
                            </div>
                            {/* Card 1 (Front) */}
                            <div className="absolute w-[75px] h-[105px] left-0 top-[0px] z-30 rounded-md overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.9)] border-2 border-white/20">
                              <img src={p1} className="w-full h-full object-cover" />
                            </div>
                          </div>
                          
                          {/* Right: Title & HOT LIST Pill */}
                          <div className="flex-1 ml-4 flex flex-col justify-center items-center h-full">
                            <div className="flex-1 flex items-center justify-center">
                              <h3 className="text-[19px] font-black text-white text-center leading-tight drop-shadow-xl italic">
                                {titleRender}
                              </h3>
                            </div>
                            
                            <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 w-full text-center border-y border-white/20 shadow-inner rounded-md mb-1">
                              <span className="text-[12px] font-black text-white uppercase italic tracking-widest drop-shadow-md">HOT LIST</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (style === 'landscape_text') {`;

code = code.replace(oldSeasonal, newSeasonal);

fs.writeFileSync('src/screens/main/HomeScreen.tsx', code);
console.log("Patched HomeScreen.tsx seasonal_card mode");
