const fs = require('fs');

let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');

const oldNext = `  const handleNextEpisode = () => {
    setPlaybackPosition(0);
    if (isSeries && content.seasonsData) {
      const season = content.seasonsData[selectedSeasonIndex];
      if (season.episodes && season.episodes.length > selectedEpisodeIndex + 1) {
        setSelectedEpisodeIndex(prev => prev + 1);
      } else if (content.seasonsData.length > selectedSeasonIndex + 1) {
        setSelectedSeasonIndex(prev => prev + 1);
        setSelectedEpisodeIndex(0);
      }
    } else if (isMovie && content.episodesList && content.episodesList.length > selectedPartIndex + 1) {
      setSelectedPartIndex(prev => prev + 1);
    }
  };`;

const newNext = `  const handleNextEpisode = () => {
    setPlaybackPosition(0);
    
    // Auto-sequence logic for parts
    if (activeParts.length > 0 && selectedPartIndex + 1 < activeParts.length) {
        setSelectedPartIndex(prev => prev + 1);
        return;
    }

    // Reset part index when moving to next episode
    setSelectedPartIndex(0);

    if (isSeries && content.seasonsData) {
      const season = content.seasonsData[selectedSeasonIndex];
      if (season.episodes && season.episodes.length > selectedEpisodeIndex + 1) {
        setSelectedEpisodeIndex(prev => prev + 1);
      } else if (content.seasonsData.length > selectedSeasonIndex + 1) {
        setSelectedSeasonIndex(prev => prev + 1);
        setSelectedEpisodeIndex(0);
      }
    } else if (isMovie && activeParts.length > selectedPartIndex + 1) {
      setSelectedPartIndex(prev => prev + 1);
    }
  };`;

code = code.replace(oldNext, newNext);

fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
