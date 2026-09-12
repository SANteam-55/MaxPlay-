const fs = require('fs');
let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');

const targetStr = `        {/* Tab Content */}
        {activeTab === 'forYou' && (
            <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {/* Placeholder for related content to match screenshot */}
                    {[1,2,3].map(i => (
                        <div key={i} className="aspect-video rounded-xl bg-white/5 border border-white/5 relative overflow-hidden group cursor-pointer">
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                               <div className="w-3/4 h-2 bg-white/20 rounded-full" />
                           </div>
                        </div>
                    ))}
                </div>
            </div>
        )}`;

const newStr = `        {/* Tab Content */}
        {activeTab === 'forYou' && (
            <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <div className="aspect-[4/3] rounded-xl bg-white/5 border border-white/10 relative overflow-hidden group cursor-pointer">
                        <img src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80" alt="Anime" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2 sm:p-3">
                            <span className="text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-wider line-clamp-2 leading-tight">A Place Where Only The Strong Stand</span>
                        </div>
                    </div>
                    <div className="aspect-[4/3] rounded-xl bg-white/5 border border-white/10 relative overflow-hidden group cursor-pointer">
                        <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80" alt="Abstract" className="w-full h-full object-cover" />
                    </div>
                    <div className="aspect-[4/3] rounded-xl bg-white/5 border border-white/10 relative overflow-hidden group cursor-pointer">
                        <img src="https://images.unsplash.com/photo-1604011152285-3e284be572e4?w=800&q=80" alt="Red" className="w-full h-full object-cover" />
                    </div>
                </div>
            </div>
        )}`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
