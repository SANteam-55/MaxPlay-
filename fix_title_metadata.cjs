const fs = require('fs');
let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');

const titleTarget = `{/* Title */}
        <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {content.title}
            </h1>
        </div>`;

const newTitle = `{/* Title */}
        <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {content.title}
            </h1>
            <button className="flex items-center gap-1.5 text-purple-400 font-semibold text-sm hover:text-purple-300 transition-colors">
                <span>Info</span>
                <Info className="w-4 h-4" />
            </button>
        </div>`;
code = code.replace(titleTarget, newTitle);

const metadataTarget = `<div className="flex items-center gap-1.5 text-purple-400 font-semibold">
              {isSeries ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
              <span className="uppercase">{content.type || (isSeries ? 'SERIES' : 'MOVIE')}</span>
          </div>`;

const newMetadata = `<div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              {isSeries ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
              <span className="uppercase">{content.type || (isSeries ? 'SERIES' : 'MOVIE')}</span>
          </div>`;

code = code.replace(metadataTarget, newMetadata);

fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
