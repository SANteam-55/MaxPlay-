const fs = require('fs');
let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');

const targetProps = `            videoUrl={currentVideoUrl}
            qualityLinks={currentQualityLinks}
            videoSources={item.type === 'movie' ? item.videoSources : currentEpisode?.videoSources}
            availableLanguages={item.availableLanguages}
`;

code = code.replace(/videoUrl={currentVideoUrl}\s*qualityLinks={currentQualityLinks}/, targetProps);

fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
