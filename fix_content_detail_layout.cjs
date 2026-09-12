const fs = require('fs');

let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');

const derivationRegex = /\/\/ \-\-\- Derive Active Playback Data \-\-\-([\s\S]*?)const availableLanguages/g;
const newDerivation = `// --- Derive Active Playback Data ---
  let playerTitle = content.title;
  let playerVideoUrl = content.videoUrl;
  let playerQualityLinks = content.qualityLinks;
  let playerVideoSources = content.videoSources;
  let playerChunks = content.chunks;
  let hasNext = false;
  let activeEpisodeList: any[] = [];
  let totalEpisodes = 0;
  let activeParts: any[] = [];

  if (isSeries && content.seasonsData && content.seasonsData[selectedSeasonIndex]) {
    const season = content.seasonsData[selectedSeasonIndex];
    activeEpisodeList = season.episodes || [];
    totalEpisodes = activeEpisodeList.length;
    if (activeEpisodeList[selectedEpisodeIndex]) {
      const ep = activeEpisodeList[selectedEpisodeIndex];
      playerTitle = \`\${content.title} - \${season.title || \`Season \${selectedSeasonIndex + 1}\`} : \${ep.title}\`;
      activeParts = ep.videoLinks || [];
      
      if (activeParts.length > 0 && selectedPartIndex < activeParts.length) {
          playerVideoUrl = activeParts[selectedPartIndex];
          playerTitle = \`\${playerTitle} (Part \${selectedPartIndex + 1})\`;
      } else {
          if (ep.videoUrl) playerVideoUrl = ep.videoUrl;
          if (ep.qualityLinks) playerQualityLinks = ep.qualityLinks;
          if (ep.videoSources) playerVideoSources = ep.videoSources;
          if (ep.chunks) playerChunks = ep.chunks;
      }
      
      if (activeEpisodeList.length > selectedEpisodeIndex + 1) {
        hasNext = true;
      } else if (content.seasonsData.length > selectedSeasonIndex + 1 && content.seasonsData[selectedSeasonIndex + 1].episodes?.length > 0) {
        hasNext = true;
      }
    }
  } else if (isMovie) {
      activeParts = content.videoLinks || [];
      if (activeParts.length > 0 && selectedPartIndex < activeParts.length) {
          playerVideoUrl = activeParts[selectedPartIndex];
          playerTitle = \`\${content.title} (Part \${selectedPartIndex + 1})\`;
          if (activeParts.length > selectedPartIndex + 1) hasNext = true;
      }
  }

  // Find available languages from current active item
`;
code = code.replace(derivationRegex, newDerivation);

const resourcesBlockRegex = /\{\/\* Resources \/ Episodes Box \*\/\}([\s\S]*?)<\/div>\s*\{\/\* 3\. Tabs \(For You vs Comments\) \*\/\}/g;
const newResourcesBlock = `{/* Resources / Episodes Box */}
        {(activeEpisodeList.length > 0 || availableLanguages.length > 0 || activeParts.length > 0) && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-5 mb-8">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base sm:text-lg">Resources</span>
                        <HelpCircle className="w-4 h-4 text-white/40" />
                    </div>
                    <div className="text-[11px] sm:text-xs text-white/50">
                        Uploaded by <span className="font-semibold text-white/80">MaxPlay Admin</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-6">
                    {availableLanguages.length > 0 && (
                        <div className="relative inline-block">
                            <select 
                                value={activeLanguage}
                                onChange={(e) => setActiveLanguage(e.target.value)}
                                className="appearance-none bg-white/5 border border-white/10 hover:border-white/20 rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold focus:outline-none cursor-pointer transition-colors text-white"
                            >
                                {availableLanguages.map(l => (
                                    <option key={l} value={l} className="bg-[#111] text-white">{l}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                        </div>
                    )}

                    {isSeries && content.seasonsData && content.seasonsData.length > 0 && (
                        <div className="relative inline-block">
                            <select 
                                value={selectedSeasonIndex}
                                onChange={(e) => { setSelectedSeasonIndex(Number(e.target.value)); setSelectedEpisodeIndex(0); setPlaybackPosition(0); setSelectedPartIndex(0); }}
                                className="appearance-none bg-white/5 border border-white/10 hover:border-white/20 rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold focus:outline-none cursor-pointer transition-colors text-white"
                            >
                                {content.seasonsData.map((s, idx) => (
                                    <option key={idx} value={idx} className="bg-[#111] text-white">{s.title || \`Season \${idx + 1}\`}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                        </div>
                    )}
                </div>

                {/* Parts Grid */}
                {activeParts.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-sm font-medium text-white/60">Episode Parts / Links ({activeParts.length})</h3>
                            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">Auto Sequence</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {activeParts.map((part, idx) => {
                                const isCurrentPart = selectedPartIndex === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => { setSelectedPartIndex(idx); setPlaybackPosition(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className={\`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all border \${isCurrentPart ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}\`}
                                    >
                                        <Film className="w-4 h-4 opacity-70" />
                                        <span>Part {idx + 1} {idx === 0 ? '(Main)' : ''}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Episodes Grid */}
                {isSeries && totalEpisodes > 0 && (
                    <>
                        <h3 className="text-sm font-medium text-white/60 mb-3">Episodes ({totalEpisodes})</h3>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4">
                            {activeEpisodeList.map((ep, idx) => {
                                const isCurrent = selectedEpisodeIndex === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => { 
                                            setSelectedEpisodeIndex(idx);
                                            setSelectedPartIndex(0);
                                            setPlaybackPosition(0); 
                                            window.scrollTo({ top: 0, behavior: 'smooth' }); 
                                        }}
                                        className={\`aspect-square flex items-center justify-center rounded-2xl text-base sm:text-lg font-bold transition-all shadow-lg \${isCurrent ? 'bg-purple-500 text-white shadow-purple-500/40 scale-105' : 'bg-white/5 text-white/70 border border-white/5 hover:bg-white/10 hover:border-white/20'}\`}
                                    >
                                        {(idx + 1).toString().padStart(2, '0')}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        )}

      </div>

      {/* 3. Tabs (For You vs Comments) */}`;
code = code.replace(resourcesBlockRegex, newResourcesBlock);

fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
