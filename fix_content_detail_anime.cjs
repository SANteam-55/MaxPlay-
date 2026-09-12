const fs = require('fs');

let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');

// Fix isSeries to include anime and short_tv
code = code.replace(
  `const isSeries = content?.type === 'series';`,
  `const isSeries = content?.type === 'series' || content?.type === 'anime' || content?.type === 'short_tv';`
);

// Fix the Tagline to show type in UPPERCASE with TV icon
code = code.replace(
  `{isSeries ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
              <span>{isSeries ? 'Series' : 'Movie'}</span>`,
  `{isSeries ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
              <span className="uppercase">{content.type || (isSeries ? 'SERIES' : 'MOVIE')}</span>`
);

// Replace Resources block
const resourcesBlockRegex = /\{\/\* Resources \/ Episodes Box \*\/\}([\s\S]*?)<\/div>\s*\{\/\* 3\. Tabs \(For You vs Comments\) \*\/\}/g;
const newResourcesBlock = `{/* Resources / Episodes Box */}
        {(activeEpisodeList.length > 0 || availableLanguages.length > 0 || activeParts.length > 0) && (
            <div className="bg-[#0f0f0f] rounded-2xl p-4 sm:p-5 mb-8">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base sm:text-lg">Resources</span>
                        <HelpCircle className="w-4 h-4 text-white/40" />
                    </div>
                    <div className="text-[11px] sm:text-xs text-white/50">
                        Uploaded by <span className="font-semibold text-white/80">{content.uploader?.name || 'MaxPlay Admin'}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-6">
                    {availableLanguages.length > 0 && (
                        <div className="relative inline-block">
                            <select 
                                value={activeLanguage}
                                onChange={(e) => setActiveLanguage(e.target.value)}
                                className="appearance-none bg-transparent border border-white/10 hover:border-white/20 rounded-xl pl-4 pr-10 py-2 text-sm font-semibold focus:outline-none cursor-pointer transition-colors text-white"
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
                                className="appearance-none bg-transparent border border-white/10 hover:border-white/20 rounded-xl pl-4 pr-10 py-2 text-sm font-semibold focus:outline-none cursor-pointer transition-colors text-white"
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
                            <h3 className="text-xs font-semibold text-white/70">Episode Parts / Links ({activeParts.length})</h3>
                            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#2a1a4a] text-[#a78bfa] border border-[#a78bfa]/30">Auto Sequence</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {activeParts.map((part, idx) => {
                                const isCurrentPart = selectedPartIndex === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => { setSelectedPartIndex(idx); setPlaybackPosition(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className={\`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border \${isCurrentPart ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white' : 'bg-transparent border-white/10 text-white/60 hover:bg-white/5'}\`}
                                    >
                                        <div className="w-4 h-4 flex flex-col gap-0.5 opacity-70">
                                            <div className="w-full h-1/2 border-2 border-current rounded-sm"></div>
                                            <div className="w-full h-1/2 border-2 border-current rounded-sm"></div>
                                        </div>
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
                        <h3 className="text-xs font-semibold text-white/70 mb-3">Episodes ({totalEpisodes})</h3>
                        <div className="flex flex-wrap gap-3">
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
                                        className={\`w-14 h-14 flex items-center justify-center rounded-xl text-base font-bold transition-all border \${isCurrent ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-lg shadow-purple-500/40' : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'}\`}
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
