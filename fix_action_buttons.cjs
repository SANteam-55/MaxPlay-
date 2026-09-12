const fs = require('fs');
let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');

const targetStr = `        {/* Action Buttons Row */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <button 
            onClick={handleMyListToggle}
            className="flex flex-col items-center justify-center gap-2 aspect-square max-h-[90px] rounded-2xl bg-[#111] hover:bg-[#1a1a1a] transition-colors"
          >
            {isMyList ? <Check className="w-5 h-5 text-white/80" /> : <Plus className="w-5 h-5 text-white/80" />}
            <span className="font-semibold text-[11px] text-white/90">Add to list</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-2 aspect-square max-h-[90px] rounded-2xl bg-[#111] hover:bg-[#1a1a1a] transition-colors">
            <Share2 className="w-5 h-5 text-white/80" />
            <span className="font-semibold text-[11px] text-white/90">Share</span>
          </button>
          <button onClick={() => setActiveTab('comments')} className="flex flex-col items-center justify-center gap-2 aspect-square max-h-[90px] rounded-2xl bg-[#111] hover:bg-[#1a1a1a] transition-colors">
            <MessageSquare className="w-5 h-5 text-white/80" />
            <span className="font-semibold text-[11px] text-white/90">Comment ({comments.length})</span>
          </button>
          <button onClick={() => setShowDetails(true)} className="flex flex-col items-center justify-center gap-2 aspect-square max-h-[90px] rounded-2xl bg-[#111] hover:bg-[#1a1a1a] transition-colors">
            <Info className="w-5 h-5 text-white/80" />
            <span className="font-semibold text-[11px] text-white/90">View details</span>
          </button>
        </div>`;

const newStr = `        {/* Action Buttons Row */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <button 
            onClick={handleMyListToggle}
            className="flex flex-col items-center justify-center gap-2 aspect-square max-h-[90px] rounded-2xl bg-[#111] border border-white/5 hover:bg-[#1a1a1a] transition-colors"
          >
            {isMyList ? <Check className="w-5 h-5 text-white/80" strokeWidth={1.5} /> : <Plus className="w-5 h-5 text-white/80" strokeWidth={1.5} />}
            <span className="font-semibold text-[11px] text-white/90">Add to list</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-2 aspect-square max-h-[90px] rounded-2xl bg-[#111] border border-white/5 hover:bg-[#1a1a1a] transition-colors">
            <Share2 className="w-5 h-5 text-white/80" strokeWidth={1.5} />
            <span className="font-semibold text-[11px] text-white/90">Share</span>
          </button>
          <button onClick={() => setActiveTab('comments')} className="flex flex-col items-center justify-center gap-2 aspect-square max-h-[90px] rounded-2xl bg-[#111] border border-white/5 hover:bg-[#1a1a1a] transition-colors">
            <MessageSquare className="w-5 h-5 text-white/80" strokeWidth={1.5} />
            <span className="font-semibold text-[11px] text-white/90">Comment ({comments.length})</span>
          </button>
          <button onClick={() => setShowDetails(true)} className="flex flex-col items-center justify-center gap-2 aspect-square max-h-[90px] rounded-2xl bg-[#111] border border-white/5 hover:bg-[#1a1a1a] transition-colors">
            <Info className="w-5 h-5 text-white/80" strokeWidth={1.5} />
            <span className="font-semibold text-[11px] text-white/90">View details</span>
          </button>
        </div>`;

code = code.replace(targetStr, newStr);
fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
