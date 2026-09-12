const fs = require('fs');

let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');

// Fix lucide imports
// Fix Context import
code = code.replace("import { useAuth } from '../../contexts/AuthContext';", "import { useAuthContext } from '../../context/AuthContext';");
// Fix content types
code = code.replace("import { Content } from '../../types';", "import { ContentItem } from '../../types';");
// Fix db/service imports
code = code.replace(
  "import { subscribeToMyList, toggleMyListItem, subscribeToComments, addCommentToContent, saveUserProgress, getUserProgress } from '../../lib/db';",
  "import { subscribeToMyList, toggleMyListItem, subscribeToComments, addCommentToContent, saveUserProgress, getUserProgress } from '../../services/contentService';"
);
// Remove date-fns
code = code.replace("import { formatDistanceToNow } from 'date-fns';", "import { CommentCard } from '../../components/common/CommentCard';");

// Replace Content -> ContentItem
code = code.replace(/Content \| null/g, "ContentItem | null");
code = code.replace(/content: Content/g, "content: ContentItem");
code = code.replace(/<ContentDetailScreenProps> = \({ content, onBack, onStartDownload }\) => {/g, "<ContentDetailScreenProps> = ({ content, onBack, onStartDownload }) => {");

// Replace user destructure
code = code.replace("const { user } = useAuth();", "const { user } = useAuthContext();");

// Replace comment display with CommentCard
const commentListBlock = `              <div className="flex flex-col gap-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
                        <span className="font-bold text-xs text-purple-400">{comment.userEmail?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold text-sm text-white/90">@{comment.userEmail?.split('@')[0]}</span>
                            <span className="text-[10px] text-white/40">{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm text-white/80 whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>`;
const replaceCommentListBlock = `              <div className="flex flex-col gap-3">
                {comments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))}
              </div>`;

code = code.replace(commentListBlock, replaceCommentListBlock);

fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
