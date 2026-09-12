const fs = require('fs');
let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');

code = code.replace("import { subscribeToMyList, toggleMyListItem, subscribeToComments, addCommentToContent, saveUserProgress, getUserProgress }", "import { subscribeToMyList, toggleMyListItem, subscribeToComments, addCommentToContent, saveUserProgress }");

const blockToRemove = `  // Load progress
  useEffect(() => {
    if (!user || !content) return;
    const fetchProgress = async () => {
      const isEpi = isSeries ? \`S\${selectedSeasonIndex}E\${selectedEpisodeIndex}\` : (isMovie && content.episodesList?.length ? \`P\${selectedPartIndex}\` : undefined);
      const pos = await getUserProgress(user.uid, content.id, isEpi);
      if (pos > 0) setPlaybackPosition(pos);
    };
    fetchProgress();
  }, [user, content, selectedSeasonIndex, selectedEpisodeIndex, selectedPartIndex, isSeries, isMovie]);`;

code = code.replace(blockToRemove, "");

fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
