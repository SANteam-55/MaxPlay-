import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  Timestamp, collectionGroup 
} from 'firebase/firestore';
import { db } from './firebase';
import { ContentItem, EpisodeItem, CommentItem, CommentReplyItem } from '../types';

export const CONTENT_COLLECTION = 'content';
export const MESSAGES_COLLECTION = 'messages';
export const USERS_COLLECTION = 'users';

// Fallback sample items
export const SAMPLE_CONTENT_ITEMS: ContentItem[] = [

        {
          id: 'one-piece-egghead',
          title: 'One Piece: Egghead Arc',
          type: 'anime',
          description: 'The Straw Hats arrive at Egghead, the island of the future, where they meet Dr. Vegapunk and face off against CP0 and the Navy.',
          posterUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=1200&auto=format&fit=crop&q=80',
          rating: 9.7,
          year: 2024,
          country: 'Japan',
          genres: ['Adventure', 'Action', 'Comedy'],
          mature: false,
          duration: 1440,
          seasons: 21,
          episodes: 1100,
          uploader: { name: 'Toei Animation', verified: true },
          trending: true,
          featured: false,
          views: 500000,
          languages: ['Hindi', 'English', 'Japanese'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'naruto-shippuden-classic',
          title: 'Naruto Shippuden',
          type: 'anime',
          description: 'Naruto returns to the Hidden Leaf Village after two and a half years of training to take on the Akatsuki and save his friend Sasuke.',
          posterUrl: 'https://images.unsplash.com/photo-1580477651163-f222687c4767?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1580477651163-f222687c4767?w=1200&auto=format&fit=crop&q=80',
          rating: 9.5,
          year: 2007,
          country: 'Japan',
          genres: ['Action', 'Ninja', 'Adventure'],
          mature: false,
          duration: 1440,
          seasons: 21,
          episodes: 500,
          uploader: { name: 'Pierrot', verified: true },
          trending: false,
          featured: false,
          views: 890000,
          languages: ['Hindi', 'English', 'Japanese'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'avatar-way-of-water',
          title: 'Avatar: The Way of Water',
          type: 'movie',
          description: 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns to finish what was previously started, Jake must work with Neytiri and the army of the Navi race to protect their home.',
          posterUrl: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?w=1200&auto=format&fit=crop&q=80',
          rating: 9.2,
          year: 2022,
          country: 'USA',
          genres: ['Sci-Fi', 'Action', 'Adventure'],
          mature: false,
          duration: 11520,
          seasons: 1,
          episodes: 1,
          uploader: { name: '20th Century Studios', verified: true },
          trending: true,
          featured: true,
          views: 1500000,
          languages: ['English', 'Hindi'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'dune-part-two',
          title: 'Dune: Part Two',
          type: 'movie',
          description: 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.',
          posterUrl: 'https://images.unsplash.com/photo-1546143977-96a9ce8b4d8d?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1546143977-96a9ce8b4d8d?w=1200&auto=format&fit=crop&q=80',
          rating: 9.6,
          year: 2024,
          country: 'USA',
          genres: ['Sci-Fi', 'Drama', 'Action'],
          mature: false,
          duration: 9960,
          seasons: 1,
          episodes: 1,
          uploader: { name: 'Warner Bros.', verified: true },
          trending: true,
          featured: true,
          views: 800000,
          languages: ['English', 'Hindi'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'stranger-things-s5',
          title: 'Stranger Things 5',
          type: 'tv',
          description: 'The epic conclusion to the Stranger Things saga. Eleven and the gang face their biggest threat yet as the Upside Down bleeds into Hawkins.',
          posterUrl: 'https://images.unsplash.com/photo-1610403328249-14a51e60086c?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1610403328249-14a51e60086c?w=1200&auto=format&fit=crop&q=80',
          rating: 9.5,
          year: 2025,
          country: 'USA',
          genres: ['Sci-Fi', 'Horror', 'Thriller'],
          mature: true,
          duration: 3600,
          seasons: 5,
          episodes: 8,
          uploader: { name: 'Netflix', verified: true },
          trending: true,
          featured: false,
          views: 400000,
          languages: ['English', 'Hindi'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'breaking-bad-remastered',
          title: 'Breaking Bad: Remastered',
          type: 'tv',
          description: 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his familys future.',
          posterUrl: 'https://images.unsplash.com/photo-1587588354456-ae376af71a25?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1587588354456-ae376af71a25?w=1200&auto=format&fit=crop&q=80',
          rating: 9.9,
          year: 2008,
          country: 'USA',
          genres: ['Crime', 'Drama', 'Thriller'],
          mature: true,
          duration: 3000,
          seasons: 5,
          episodes: 62,
          uploader: { name: 'AMC', verified: true },
          trending: false,
          featured: false,
          views: 2000000,
          languages: ['English'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'solo-leveling-arise',
          title: 'Solo Leveling: ReArise',
          type: 'anime',
          description: 'In a world where hunters must battle deadly monsters to protect mankind, Sung Jinwoo, the weakest hunter, acquires a mysterious system that allows him to level up without limit.',
          posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
          rating: 9.8,
          year: 2024,
          country: 'Japan / South Korea',
          genres: ['Action', 'Fantasy', 'Supernatural'],
          mature: false,
          duration: 1440,
          seasons: 2,
          episodes: 24,
          uploader: { name: 'MaxPlay Originals', verified: true },
          trending: true,
          featured: true,
          views: 245000,
          languages: ['Hindi', 'English', 'Japanese'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'demon-slayer-hashira',
          title: 'Demon Slayer: Hashira Training',
          type: 'anime',
          description: 'The Hashira, the Demon Slayer Corps\' highest-ranking swordsmen, conduct a rigorous training session in preparation for the impending battle against Muzan Kibutsuji.',
          posterUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=80',
          rating: 9.6,
          year: 2024,
          country: 'Japan',
          genres: ['Dark Fantasy', 'Action', 'Demons'],
          mature: false,
          duration: 1380,
          seasons: 4,
          episodes: 8,
          uploader: { name: 'Aniplex Studio', verified: true },
          trending: true,
          featured: false,
          views: 189000,
          languages: ['Hindi', 'English', 'Japanese'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'chainsaw-man-reze',
          title: 'Chainsaw Man: Reze Arc Movie',
          type: 'movie',
          description: 'Denji meets Reze, a girl who works at a local coffee shop. As they grow closer, a dangerous secret threatens to turn Denji\'s newfound happiness into carnage.',
          posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
          rating: 9.4,
          year: 2025,
          country: 'Japan',
          genres: ['Action', 'Horror', 'Supernatural'],
          mature: true,
          duration: 6300,
          seasons: 1,
          episodes: 1,
          uploader: { name: 'MAPPA', verified: true },
          trending: false,
          featured: true,
          views: 95000,
          languages: ['Hindi', 'English'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'jujutsu-kaisen-s3',
          title: 'Jujutsu Kaisen: Culling Game',
          type: 'tv',
          description: 'Following the devastating Shibuya Incident, jujutsu sorcerers find themselves forced into Noritoshi Kamo\'s deadly battle royale known as the Culling Game.',
          posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
          rating: 9.9,
          year: 2025,
          country: 'Japan',
          genres: ['Supernatural', 'Action'],
          mature: false,
          duration: 1400,
          seasons: 3,
          episodes: 12,
          uploader: { name: 'MAPPA Network', verified: true },
          trending: true,
          featured: true,
          views: 310000,
          languages: ['Hindi', 'English', 'Tamil'],
          createdAt: new Date().toISOString()
        }
      ];

// Seed Initial Firestore Content if database is empty
export const seedInitialContentIfEmpty = async () => {
  try {
    const snap = await getDocs(collection(db, CONTENT_COLLECTION));
    if (snap.empty) {
      console.log('Seeding initial content to Firestore...');
      for (const item of SAMPLE_CONTENT_ITEMS) {
        await setDoc(doc(db, CONTENT_COLLECTION, item.id), item);

        // Add dummy episode for each content
        const episodeRef = doc(db, `${CONTENT_COLLECTION}/${item.id}/episodes`, 'ep-1');
        await setDoc(episodeRef, {
          id: 'ep-1',
          episodeNumber: 1,
          title: 'Episode 1: The Beginning of the Awakening',
          duration: 596,
          thumbnailUrl: item.posterUrl,
          videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
          chunks: [],
          qualities: {
            "480p": { chunks: [] },
            "720p": { chunks: [] },
            "1080p": { chunks: [] }
          },
          subtitles: [
            { language: 'English', url: 'https://example.com/subs_en.vtt', downloaded: false },
            { language: 'Hindi', url: 'https://example.com/subs_hi.vtt', downloaded: false }
          ],
          audioTracks: [
            { language: 'Hindi (Dub)', url: 'https://example.com/audio_hi.mp3', isDefault: true },
            { language: 'Japanese (Original)', url: 'https://example.com/audio_jp.mp3', isDefault: false }
          ]
        });
      }
      console.log('Firestore initial seed completed!');
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.code === 'unavailable') {
      // Benign non-admin or offline preview state
    } else {
      console.warn('Initial content seed note:', err?.message || err);
    }
  }
};

// Listen to all content in real-time
export const subscribeToContent = (callback: (items: ContentItem[]) => void) => {
  const q = query(collection(db, CONTENT_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      // Auto seed initial content if database is fresh and empty
      seedInitialContentIfEmpty();
      callback([]);
      return;
    }
    const list: ContentItem[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || '',
        type: data.type || 'anime',
        description: data.description || '',
        posterUrl: data.posterUrl || '',
        backdropUrl: data.backdropUrl || '',
        rating: data.rating || 9.0,
        year: data.year || 2024,
        country: data.country || 'Japan',
        genres: data.genres || ['Action'],
        mature: data.mature || false,
        duration: data.duration || 1400,
        seasons: data.seasons || 1,
        episodes: data.episodes || 12,
        seasonsData: data.seasonsData || null,
        episodesList: data.episodesList || null,
        videoUrl: data.videoUrl || null,
        videoLinks: data.videoLinks || null,
        uploader: data.uploader || { name: 'MaxPlay Admin', verified: true },
        trending: data.trending || false,
        featured: data.featured || false,
        views: data.views || 0,
        availableLanguages: data.availableLanguages || (Array.isArray(data.languages) ? data.languages : undefined),
        videoSources: data.videoSources || undefined,
        qualityLinks: data.qualityLinks || undefined,
        chunks: data.chunks || undefined,
        language: data.language || undefined,
        languages: Array.isArray(data.languages) && data.languages.length > 0
          ? data.languages
          : (Array.isArray(data.availableLanguages) && data.availableLanguages.length > 0
              ? data.availableLanguages
              : (data.language ? [data.language] : [])),
        createdAt: data.createdAt || new Date().toISOString(),
        homeRows: data.homeRows || [],
        searchHotSection: data.searchHotSection || null,
        searchHotPosition: data.searchHotPosition || 0
      } as ContentItem;

    });
    callback(list);
  }, (err) => {
    console.warn('Firestore subscription warning:', err);
  });
};

// Fetch Content Detail by ID
export const fetchContentById = async (id: string): Promise<ContentItem | null> => {
  try {
    const docSnap = await getDoc(doc(db, CONTENT_COLLECTION, id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ContentItem;
    }
    return null;
  } catch (err) {
    console.error('Fetch content by ID error:', err);
    return null;
  }
};

// Subscribe to Episodes subcollection
export const subscribeToEpisodes = (contentId: string, callback: (episodes: EpisodeItem[]) => void) => {
  const epRef = collection(db, `${CONTENT_COLLECTION}/${contentId}/episodes`);
  return onSnapshot(epRef, (snapshot) => {
    const eps: EpisodeItem[] = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as EpisodeItem));
    callback(eps);
  }, (err) => {
    console.warn('Episodes listener warning:', err);
  });
};

// Subscribe to Comments subcollection
export const subscribeToComments = (contentId: string, callback: (comments: CommentItem[]) => void) => {
  const commentsRef = collection(db, `${CONTENT_COLLECTION}/${contentId}/comments`);
  return onSnapshot(commentsRef, (snapshot) => {
    if (!snapshot.empty) {
      const comments: CommentItem[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        contentId,
        ...docSnap.data()
      } as CommentItem));
      // Sort by createdAt desc
      comments.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      callback(comments);
    } else {
      callback([]);
    }
  }, (err) => {
    console.warn('Comments listener warning:', err);
    callback([]);
  });
};

// Add Comment
export const addCommentToContent = async (contentId: string, user: { uid: string; displayName: string; photoURL?: string }, text: string) => {
  try {
    const commentsRef = collection(db, `${CONTENT_COLLECTION}/${contentId}/comments`);
    const docRef = await addDoc(commentsRef, {
      contentId,
      userId: user.uid,
      username: user.displayName || 'MaxPlay User',
      avatarUrl: user.photoURL || '',
      text,
      time: 'Just now',
      likes: 0,
      likedBy: [],
      replies: [],
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.error('Error adding comment:', err);
    throw err;
  }
};

// Add Reply to Comment
export const addReplyToComment = async (
  contentId: string,
  commentId: string,
  user: { uid: string; displayName: string; photoURL?: string },
  text: string,
  replyToUsername?: string
) => {
  try {
    const commentRef = doc(db, `${CONTENT_COLLECTION}/${contentId}/comments`, commentId);
    const commentSnap = await getDoc(commentRef);
    const newReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      commentId,
      userId: user.uid,
      username: user.displayName || 'MaxPlay User',
      avatarUrl: user.photoURL || '',
      replyToUsername: replyToUsername || undefined,
      text,
      time: 'Just now',
      likes: 0,
      likedBy: [],
      createdAt: new Date().toISOString()
    };

    if (commentSnap.exists()) {
      const data = commentSnap.data();
      const existingReplies = data.replies || [];
      await updateDoc(commentRef, {
        replies: [...existingReplies, newReply]
      });
    }
    return newReply;
  } catch (err) {
    console.error('Error adding reply:', err);
    throw err;
  }
};

// Toggle Comment Like
export const toggleCommentLike = async (contentId: string, commentId: string, userId: string) => {
  try {
    const commentRef = doc(db, `${CONTENT_COLLECTION}/${contentId}/comments`, commentId);
    const snap = await getDoc(commentRef);
    if (snap.exists()) {
      const data = snap.data();
      const likedBy: string[] = data.likedBy || [];
      const hasLiked = likedBy.includes(userId);
      const newLikedBy = hasLiked ? likedBy.filter((id: string) => id !== userId) : [...likedBy, userId];
      const newLikes = hasLiked ? Math.max(0, (data.likes || 1) - 1) : (data.likes || 0) + 1;
      await updateDoc(commentRef, {
        likes: newLikes,
        likedBy: newLikedBy
      });
      return { likes: newLikes, isLiked: !hasLiked };
    }
  } catch (err) {
    console.error('Error toggling comment like:', err);
  }
  return null;
};

// Toggle Reply Like
export const toggleReplyLike = async (contentId: string, commentId: string, replyId: string, userId: string) => {
  try {
    const commentRef = doc(db, `${CONTENT_COLLECTION}/${contentId}/comments`, commentId);
    const snap = await getDoc(commentRef);
    if (snap.exists()) {
      const data = snap.data();
      const replies = (data.replies || []).map((r: any) => {
        if (r.id === replyId) {
          const likedBy: string[] = r.likedBy || [];
          const hasLiked = likedBy.includes(userId);
          const newLikedBy = hasLiked ? likedBy.filter((id: string) => id !== userId) : [...likedBy, userId];
          const newLikes = hasLiked ? Math.max(0, (r.likes || 1) - 1) : (r.likes || 0) + 1;
          return { ...r, likes: newLikes, likedBy: newLikedBy };
        }
        return r;
      });
      await updateDoc(commentRef, { replies });
    }
  } catch (err) {
    console.error('Error toggling reply like:', err);
  }
};

// REPORTS & MODERATION
export const REPORTS_COLLECTION = 'reports';

// Submit Comment Report
export const submitCommentReport = async (reportData: {
  commentId: string;
  replyId?: string;
  commentText: string;
  commentAuthorId: string;
  commentAuthorName: string;
  commentAuthorAvatar?: string;
  contentId: string;
  contentTitle: string;
  contentPosterUrl?: string;
  contentType?: string;
  reportedByUserId: string;
  reportedByUserName: string;
  reportedByUserEmail?: string;
  category: string;
  reasonText?: string;
  details?: string;
}) => {
  try {
    const reportsRef = collection(db, REPORTS_COLLECTION);
    
    // Remove undefined values to avoid Firestore addDoc error
    const cleanData = Object.fromEntries(
      Object.entries(reportData).filter(([_, v]) => v !== undefined)
    );

    const docRef = await addDoc(reportsRef, {
      ...cleanData,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.error('Error submitting comment report:', err);
    throw err;
  }
};

// Delete Comment (or Reply) from Content
export const removeCommentFromContent = async (contentId: string, commentId: string, replyId?: string) => {
  try {
    const commentRef = doc(db, `${CONTENT_COLLECTION}/${contentId}/comments`, commentId);
    if (replyId) {
      const snap = await getDoc(commentRef);
      if (snap.exists()) {
        const data = snap.data();
        const replies = (data.replies || []).filter((r: any) => r.id !== replyId);
        await updateDoc(commentRef, { replies });
      }
    } else {
      await deleteDoc(commentRef);
    }
  } catch (err) {
    console.error('Error deleting comment:', err);
    throw err;
  }
};

// Update Report Status
export const updateReportStatus = async (reportId: string, status: 'resolved' | 'dismissed', adminNotes?: string) => {
  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);
    await updateDoc(reportRef, {
      status,
      adminNotes: adminNotes || '',
      resolvedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error updating report status:', err);
    throw err;
  }
};

// Subscribe to User MyList
export const subscribeToMyList = (userId: string, callback: (itemIds: string[]) => void) => {
  const ref = collection(db, `myList/${userId}/items`);
  return onSnapshot(ref, (snapshot) => {
    const ids = snapshot.docs.map(docSnap => docSnap.id);
    callback(ids);
  }, (err) => console.warn('MyList listener warning:', err));
};

// Toggle MyList Item
export const toggleMyListItem = async (userId: string, contentId: string, isCurrentlyAdded: boolean) => {
  try {
    const docRef = doc(db, `myList/${userId}/items`, contentId);
    if (isCurrentlyAdded) {
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, {
        contentId,
        addedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Toggle MyList error:', err);
  }
};

export const subscribeToWatchHistory = (userId: string, callback: (items: any[]) => void) => {
  const ref = collection(db, `watchHistory/${userId}/items`);
  const q = query(ref, orderBy('watchedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(docSnap => docSnap.data());
    callback(items);
  }, (err) => {
    console.warn('Watch history listener warning:', err);
    callback([]);
  });
};

// Subscribe to User Watch Progress
export const getUserProgress = async (userId: string, contentId: string) => {
  try {
    const ref = doc(db, `userProgress/${userId}/progress`, contentId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('Get user progress error:', err);
    return null;
  }
};

export const saveUserProgress = async (userId: string, contentId: string, progressData: any) => {
  try {
    const timestamp = new Date().toISOString();
    const ref = doc(db, `userProgress/${userId}/progress`, contentId);
    await setDoc(ref, {
      contentId,
      ...progressData,
      lastWatchedAt: timestamp
    }, { merge: true });

    // Also record in Watch History with rich playback state
    const historyRef = doc(db, `watchHistory/${userId}/items`, contentId);
    await setDoc(historyRef, {
      contentId,
      title: progressData.title || 'Untitled',
      thumbnailUrl: progressData.thumbnailUrl || '',
      watchedSeconds: progressData.currentTime || progressData.watchedSeconds || 0,
      currentTime: progressData.currentTime || progressData.watchedSeconds || 0,
      duration: progressData.duration || 0,
      percentWatched: progressData.percentWatched || 0,
      seasonIndex: progressData.seasonIndex ?? 0,
      episodeIndex: progressData.episodeIndex ?? 0,
      partIndex: progressData.partIndex ?? 0,
      currentEpisode: (progressData.episodeIndex !== undefined ? progressData.episodeIndex + 1 : progressData.currentEpisode) || 1,
      totalEpisodes: progressData.totalEpisodes || 1,
      activeLanguage: progressData.activeLanguage || '',
      activeQuality: progressData.activeQuality || '',
      partKey: progressData.partKey || '',
      partProgressMap: progressData.partProgressMap || {},
      type: progressData.type || 'anime',
      watchedAt: timestamp
    }, { merge: true });
  } catch (err) {
    console.error('Save user progress error:', err);
  }
};

// Subscribe to Messages / Announcements
export const subscribeToAnnouncements = (userId: string | undefined, callback: (msgs: any[]) => void) => {
  const ref = collection(db, MESSAGES_COLLECTION);
  return onSnapshot(ref, (snapshot) => {
    const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
    const filteredMsgs = msgs.filter(m => !m.targetUserId || m.targetUserId === 'all' || m.targetUserId === userId);
    callback(filteredMsgs);
  }, (err) => console.warn('Messages listener warning:', err));
};

// HERO BANNERS (Realtime Firestore)
export const HERO_BANNERS_COLLECTION = 'heroBanners';

export const subscribeToHeroBanners = (callback: (banners: any[]) => void) => {
  const ref = collection(db, HERO_BANNERS_COLLECTION);
  return onSnapshot(ref, (snapshot) => {
    if (snapshot.empty) {
      callback([]);
      return;
    }

    const banners = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const validBanners = banners.filter((b: any) => b && (b.title || b.imageUrl || b.backdropUrl || b.contentId));
    
    callback(validBanners);
  }, (err) => {
    console.warn('Hero banners listener error:', err);
    callback([]);
  });
};

export const saveHeroBanner = async (banner: any) => {
  if (!banner) return;
  try {
    const bannerId = banner.id || `banner-${Date.now()}`;
    const cleanData = {
      id: bannerId,
      title: banner.title?.trim() || 'Featured Content',
      subtitle: banner.subtitle?.trim() || '',
      imageUrl: banner.imageUrl?.trim() || banner.backdropUrl?.trim() || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200',
      contentId: banner.contentId || '',
      order: Number(banner.order) || 1,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, HERO_BANNERS_COLLECTION, bannerId), cleanData, { merge: true });
  } catch (err) {
    console.error('Save hero banner error:', err);
  }
};

export const deleteHeroBanner = async (bannerId: string) => {
  try {
    await deleteDoc(doc(db, HERO_BANNERS_COLLECTION, bannerId));
  } catch (err) {
    console.error('Delete hero banner error:', err);
  }
};

// SEARCH SETTINGS ("Everyone is Searching" & "Popular Searches")
export const SETTINGS_COLLECTION = 'settings';

export const subscribeToSearchSettings = (callback: (data: { everyoneSearching: string[]; popularSearches: string[] }) => void) => {
  const ref = doc(db, SETTINGS_COLLECTION, 'search');
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as any);
    } else {
      callback({
        everyoneSearching: [],
        popularSearches: []
      });
    }
  }, (err) => console.warn('Search settings listener error:', err));
};

export const saveSearchSettings = async (data: { everyoneSearching: string[]; popularSearches: string[] }) => {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, 'search'), data, { merge: true });
  } catch (err) {
    console.error('Save search settings error:', err);
  }
};

// USER SETTINGS
export const subscribeToUserSettings = (userId: string, callback: (settings: any) => void) => {
  const ref = doc(db, `users/${userId}/preferences`, 'config');
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback({
        darkMode: true,
        autoPlayNext: true,
        wifiOnlyDownloads: false,
        notificationsEnabled: true,
        subtitleLanguage: 'Hindi / English',
        videoQuality: 'Auto (1080p)',
        hardwareAcceleration: true
      });
    }
  }, (err) => console.warn('User settings listener error:', err));
};

export const saveUserSettings = async (userId: string, settings: any) => {
  try {
    const ref = doc(db, `users/${userId}/preferences`, 'config');
    await setDoc(ref, settings, { merge: true });
  } catch (err) {
    console.error('Save user settings error:', err);
  }
};

// SAVE CONTENT WITH EPISODES (Admin API)
export const saveContentWithEpisodes = async (contentItem: ContentItem, episodeList: EpisodeItem[]) => {
  try {
    const contentId = contentItem.id || `content-${Date.now()}`;
    const docData = {
      ...contentItem,
      id: contentId,
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, CONTENT_COLLECTION, contentId), docData, { merge: true });

    // Save episodes subcollection
    if (episodeList && episodeList.length > 0) {
      for (const ep of episodeList) {
        const epId = ep.id || `ep-${ep.episodeNumber || 1}`;
        await setDoc(doc(db, `${CONTENT_COLLECTION}/${contentId}/episodes`, epId), {
          ...ep,
          id: epId
        }, { merge: true });
      }
    }
    return contentId;
  } catch (err) {
    console.error('Save content with episodes error:', err);
    throw err;
  }
};

// DELETE CONTENT ITEM
export const deleteContentItem = async (contentId: string) => {
  try {
    await deleteDoc(doc(db, CONTENT_COLLECTION, contentId));
  } catch (err) {
    console.error('Delete content item error:', err);
    throw err;
  }
};


// DELETE COMMENT FROM CONTENT
export const deleteCommentFromContent = async (contentId: string, commentId: string, userId?: string) => {
  try {
    const commentRef = doc(db, `${CONTENT_COLLECTION}/${contentId}/comments`, commentId);
    if (!userId) {
      await deleteDoc(commentRef);
      return true;
    }
    const snap = await getDoc(commentRef);
    if (snap.exists()) {
      const data = snap.data();
      // Allow delete if userId matches or demo session
      if (data.userId === userId || !data.userId || data.userId.startsWith('user-') || userId.startsWith('user-')) {
        await deleteDoc(commentRef);
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('Error deleting comment from content:', err);
    throw err;
  }
};

// DELETE REPLY FROM COMMENT
export const deleteReplyFromComment = async (contentId: string, commentId: string, replyId: string, userId: string) => {
  try {
    const commentRef = doc(db, `${CONTENT_COLLECTION}/${contentId}/comments`, commentId);
    const snap = await getDoc(commentRef);
    if (snap.exists()) {
      const data = snap.data();
      const replies = data.replies || [];
      const updatedReplies = replies.filter((r: any) => {
        if (r.id === replyId) {
          // If this is the reply to delete, ensure authorization
          return !(r.userId === userId || !r.userId || r.userId.startsWith('user-') || userId.startsWith('user-'));
        }
        return true;
      });
      await updateDoc(commentRef, { replies: updatedReplies });
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error deleting reply from comment:', err);
    throw err;
  }
};

// GET USER ALL COMMENTS, REPLIES & LIKES ACTIVITY
export interface UserCommentsFullActivity {
  myComments: {
    comment: CommentItem;
    content?: ContentItem;
  }[];
  myReplies: {
    reply: CommentReplyItem;
    parentCommentId: string;
    parentUsername: string;
    parentText: string;
    content?: ContentItem;
  }[];
  myLikes: {
    item: {
      id: string;
      text: string;
      username: string;
      avatarUrl?: string;
      likes: number;
      time: string;
      createdAt?: string;
      replyToUsername?: string;
    };
    type: 'comment' | 'reply';
    contentId: string;
    commentId: string;
    replyId?: string;
    content?: ContentItem;
  }[];
}

export const getUserAllCommentsAndActivity = async (
  userId: string,
  allContents: ContentItem[] = []
): Promise<UserCommentsFullActivity> => {
  const result: UserCommentsFullActivity = {
    myComments: [],
    myReplies: [],
    myLikes: [],
  };

  const contentMap = new Map<string, ContentItem>();
  allContents.forEach((c) => {
    contentMap.set(c.id, c);
  });
  SAMPLE_CONTENT_ITEMS.forEach((c) => {
    if (!contentMap.has(c.id)) contentMap.set(c.id, c);
  });

  try {
    // Try collection group query first
    const commentsQuery = query(collectionGroup(db, 'comments'));
    const snapshot = await getDocs(commentsQuery);
    
    if (!snapshot.empty) {
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as CommentItem;
        const commentId = docSnap.id;
        const contentId = data.contentId || docSnap.ref.parent.parent?.id || '';
        const content = contentMap.get(contentId);

        const commentObj: CommentItem = {
          ...data,
          id: commentId,
          contentId,
        };

        // 1. My Comments
        if (data.userId === userId) {
          result.myComments.push({
            comment: commentObj,
            content,
          });
        }

        // 2. My Replies
        if (data.replies && Array.isArray(data.replies)) {
          data.replies.forEach((reply: CommentReplyItem) => {
            if (reply.userId === userId) {
              result.myReplies.push({
                reply: {
                  ...reply,
                  contentId,
                  commentId,
                },
                parentCommentId: commentId,
                parentUsername: data.username,
                parentText: data.text,
                content,
              });
            }
          });
        }

        // 3. My Likes (Comments I liked)
        const likedBy = data.likedBy || [];
        if (likedBy.includes(userId)) {
          result.myLikes.push({
            item: {
              id: commentId,
              text: data.text,
              username: data.username,
              avatarUrl: data.avatarUrl,
              likes: data.likes || 0,
              time: data.time || 'Recently',
              createdAt: data.createdAt,
            },
            type: 'comment',
            contentId,
            commentId,
            content,
          });
        }

        // My Likes (Replies I liked)
        if (data.replies && Array.isArray(data.replies)) {
          data.replies.forEach((reply: CommentReplyItem) => {
            const rLikedBy = reply.likedBy || [];
            if (rLikedBy.includes(userId)) {
              result.myLikes.push({
                item: {
                  id: reply.id,
                  text: reply.text,
                  username: reply.username,
                  avatarUrl: reply.avatarUrl,
                  likes: reply.likes || 0,
                  time: reply.time || 'Recently',
                  createdAt: reply.createdAt,
                  replyToUsername: reply.replyToUsername,
                },
                type: 'reply',
                contentId,
                commentId,
                replyId: reply.id,
                content,
              });
            }
          });
        }
      });
    }
  } catch (err) {
    console.warn('CollectionGroup query fallback warning:', err);
  }

  // Sort all sections by date descending
  result.myComments.sort((a, b) => {
    const tA = new Date(a.comment.createdAt || 0).getTime();
    const tB = new Date(b.comment.createdAt || 0).getTime();
    return tB - tA;
  });

  result.myReplies.sort((a, b) => {
    const tA = new Date(a.reply.createdAt || 0).getTime();
    const tB = new Date(b.reply.createdAt || 0).getTime();
    return tB - tA;
  });

  result.myLikes.sort((a, b) => {
    const tA = new Date(a.item.createdAt || 0).getTime();
    const tB = new Date(b.item.createdAt || 0).getTime();
    return tB - tA;
  });

  return result;
};

// Get User Comments (Simple list)
export const getUserComments = async (userId: string) => {
  try {
    const commentsQuery = query(collectionGroup(db, 'comments'), where('userId', '==', userId));
    const snapshot = await getDocs(commentsQuery);
    const docs = snapshot.docs.map(doc => ({
      id: doc.id,
      contentId: doc.ref.parent.parent?.id,
      ...doc.data()
    }));
    return docs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching user comments:', err);
    return [];
  }
};


export const subscribeToCategories = (callback: (data: any[]) => void) => {
  const q = doc(db, 'settings', 'categories');
  return onSnapshot(q, (docSnap) => {
    if (docSnap.exists()) {
      const list = docSnap.data().list || [];
      callback(list.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
    } else {
      callback([]);
    }
  }, (err) => {
    console.warn('Categories listener note:', err?.message || err);
    callback([]);
  });
};


export const subscribeToHomeRows = (callback: (data: any) => void) => {
  const q = doc(db, 'settings', 'screens_rows');
  return onSnapshot(q, (docSnap) => {
    if (docSnap.exists()) {
      const d = docSnap.data() || {};
      const rows = d.rows && typeof d.rows === 'object' ? d.rows : d;
      callback(rows);
    } else {
      callback({});
    }
  }, (err) => {
    console.warn('Homerows listener note:', err?.message || err);
    callback({});
  });
};

export const subscribeToScreensCategories = (callback: (data: any) => void) => {
  const q = doc(db, 'settings', 'screens_categories');
  return onSnapshot(q, (docSnap) => {
    if (docSnap.exists()) {
      const d = docSnap.data() || {};
      const cats = d.categories && typeof d.categories === 'object' ? d.categories : d;
      callback(cats);
    } else {
      callback({});
    }
  }, (err) => {
    console.warn('Screens categories listener note:', err?.message || err);
    callback({});
  });
};
