const fs = require('fs');
let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');

code = code.replace(/ContentItemItem/g, 'ContentItem');

// Fix toggleMyListItem
code = code.replace(
  /await toggleMyListItem\(user.uid, content, isMyList, myListDocId\);/g,
  `await toggleMyListItem(user.uid, content.id, isMyList);`
);

// Fix addCommentToContent
code = code.replace(
  /await addCommentToContent\(content.id, user.uid, user.email || 'Anonymous', newComment.trim\(\)\);/g,
  `await addCommentToContent(content.id, { uid: user.uid, displayName: user.email?.split('@')[0] || 'User' }, newComment.trim());`
);

// Fix saveUserProgress
code = code.replace(
  /saveUserProgress\(user.uid, content.id, time, content.duration, isEpi\);/g,
  `saveUserProgress(user.uid, content.id, { time, duration: content.duration, episode: isEpi });`
);

// Fix subscribeToMyList
code = code.replace(
  /const match = items.find\(item => item.contentId === content.id\);/g,
  `const match = items.includes(content.id);`
);
code = code.replace(
  /setIsMyList\(!!match\);/g,
  `setIsMyList(match);`
);
code = code.replace(
  /setMyListDocId\(match\?\.id \|\| null\);/g,
  ``
);

fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
