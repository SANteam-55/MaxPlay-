const fs = require('fs');
let code = fs.readFileSync('src/screens/content/CollectionDetailScreen.tsx', 'utf8');

// 1. Add getTagGradient helper before the component
const insertHelper = `const getTagGradient = (index: number) => {
  switch (index) {
    case 0: return 'bg-gradient-to-br from-pink-500 to-rose-600';
    case 1: return 'bg-gradient-to-br from-orange-400 to-orange-600';
    case 2: return 'bg-gradient-to-br from-amber-400 to-amber-600';
    case 3: return 'bg-gradient-to-br from-blue-400 to-blue-600';
    default: return 'bg-gradient-to-br from-gray-500 to-gray-700';
  }
};

export const CollectionDetailScreen`;
code = code.replace('export const CollectionDetailScreen', insertHelper);


// 2. Change the Content List container
const oldContainer = `<div className="px-4 pt-4 flex flex-col gap-4">`;
const newContainer = `<div className="relative z-10 -mt-6 pt-6 px-4 pb-12 flex flex-col gap-5 bg-[#12131A] rounded-t-[24px] min-h-[50vh] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">`;
code = code.replace(oldContainer, newContainer);


// 3. Change the Item wrapper
const oldWrapper = `className="flex gap-4 bg-[#121212] rounded-xl overflow-hidden cursor-pointer hover:bg-[#1C1C1E] transition-colors border border-white/5 p-2"`;
const newWrapper = `className="flex gap-4 items-start cursor-pointer transition-opacity hover:opacity-80"`;
code = code.replace(oldWrapper, newWrapper);


// 4. Change Poster wrapper (add bg removal since we don't need padding/border on item)
// Wait, the poster already has `rounded-lg overflow-hidden bg-[#1A1A1A]`.
const oldPoster = `<div className="relative w-[90px] aspect-[3/4] shrink-0 rounded-lg overflow-hidden bg-[#1A1A1A]">`;
const newPoster = `<div className="relative w-[100px] aspect-[3/4] shrink-0 rounded-lg overflow-hidden bg-[#1A1A1A] shadow-md">`;
code = code.replace(oldPoster, newPoster);


// 5. Change Ranking Tag
const oldRankTag = `<div className="absolute top-0 left-0 bg-[#EC4899] px-1.5 py-0.5 rounded-br-lg z-10 flex flex-col items-center justify-center leading-none">
                  <span className="text-[7px] font-black text-white/90 uppercase">TOP</span>
                  <span className="text-[11px] font-black text-white">{String(index + 1).padStart(2, '0')}</span>
                </div>`;
const newRankTag = `<div className={\`absolute top-0 left-0 \${getTagGradient(index)} px-1.5 py-0.5 rounded-br-lg z-10 flex flex-col items-center justify-center leading-none shadow-md\`}>
                  <span className="text-[7px] font-black text-white/90 uppercase tracking-wide">TOP</span>
                  <span className="text-[13px] font-black text-white">{String(index + 1).padStart(2, '0')}</span>
                </div>`;
code = code.replace(oldRankTag, newRankTag);


// 6. Change Language Tag
const oldLangTag = `<div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-semibold text-white">
                    {item.language}
                  </div>`;
const newLangTag = `<div className="absolute top-0 right-0 bg-black/80 px-1.5 py-0.5 rounded-bl-lg text-[9px] font-semibold text-white shadow-sm">
                    {item.language}
                  </div>`;
code = code.replace(oldLangTag, newLangTag);


// 7. Details adjustments
const oldDetails = `<div className="flex-1 flex flex-col justify-center py-1 overflow-hidden">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className="text-[14px] font-bold text-white line-clamp-2 leading-tight">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0 bg-black/40 px-1.5 py-0.5 rounded">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-semibold text-white">{Number(item.rating || 9.0).toFixed(1)}</span>
                  </div>
                </div>
                
                <p className="text-[11px] text-[#A1A1AA] line-clamp-2 mb-3 leading-snug">
                  {item.description || 'Action packed adventure awaits in this highly rated title.'}
                </p>

                <div>
                  <button className="flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white px-3 py-1.5 rounded-lg transition-colors shadow-lg shadow-emerald-500/20 active:scale-95">
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span className="text-[11px] font-bold">Play</span>
                  </button>
                </div>
              </div>`;

const newDetails = `<div className="flex-1 flex flex-col justify-center overflow-hidden">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className="text-[15px] font-bold text-white line-clamp-2 leading-tight">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-[12px] font-bold text-white/90">{Number(item.rating || 9.0).toFixed(1)}</span>
                  </div>
                </div>
                
                <p className="text-[11.5px] text-[#9CA3AF] line-clamp-2 mb-2 leading-snug pr-2">
                  {item.description || 'Action packed adventure awaits in this highly rated title.'}
                </p>

                <div>
                  <button className="flex items-center gap-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] hover:opacity-90 text-white px-4 py-1.5 rounded-md transition-all shadow-lg active:scale-95 w-fit mt-1">
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span className="text-[12px] font-bold">Play</span>
                  </button>
                </div>
              </div>`;

code = code.replace(oldDetails, newDetails);

fs.writeFileSync('src/screens/content/CollectionDetailScreen.tsx', code);
console.log("Patched CollectionDetailScreen.tsx");
