import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Send, Heart, MessageCircle, Loader2, Trash2, RefreshCw, X } from "lucide-react";
import {
  createComment,
  deleteComment,
  fetchComments,
  toggleCommentLike,
} from "@/services/commentsService";

const MAX_COMMENT_LENGTH = 500;

const CommentsPage = ({ currentUser, isAdmin }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState({});
  const [commentsPostingBlocked, setCommentsPostingBlocked] = useState(false);
  const [commentsBannedUntil, setCommentsBannedUntil] = useState(null);
  const commentsRef = useRef([]); // Ref to track comments without causing re-renders

  const userId = currentUser?.user_id ?? null;
  const userAvatar = currentUser?.profile_meta?.avatar || "💀";

  const canPost = useMemo(() => {
    const trimmed = newComment.trim();
    return Boolean(
      userId &&
        !commentsPostingBlocked &&
        trimmed.length > 0 &&
        trimmed.length <= MAX_COMMENT_LENGTH
    );
  }, [newComment, userId, commentsPostingBlocked]);

  const loadComments = useCallback(async (isRefresh = false) => {
    // Check if we have existing comments to determine loading state
    const hasComments = commentsRef.current.length > 0;
    if (isRefresh || hasComments) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const data = await fetchComments(userId);
      const payload = Array.isArray(data) ? data : data.comments ?? [];
      setCommentsPostingBlocked(Boolean(data.comments_posting_blocked));
      setCommentsBannedUntil(data.comments_banned_until ?? null);
      // Ensure all comments have replies array initialized and are properly structured
      const normalizedComments = (payload || []).map(comment => {
        // Deep clone to avoid reference issues
        const normalized = {
          ...comment,
          replies: Array.isArray(comment.replies) ? comment.replies.map(reply => ({
            ...reply,
            replies: [] // Replies don't have nested replies
          })) : []
        };
        return normalized;
      });
      setComments(normalizedComments);
      commentsRef.current = normalizedComments; // Update ref
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load comments.");
      console.error('Error loading comments:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);
  
  // Keep ref in sync with comments state
  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "JUST_NOW";
    
    try {
      // Parse timestamp - should be in ISO 8601 format with Z (UTC) from server
      const date = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return "JUST_NOW";
      }
      
      const now = Date.now();
      const diffMs = now - date.getTime();
      
      // Handle edge cases - if timestamp is more than 24 hours in the future, it's likely a timezone issue
      if (diffMs < -86400000) {
        // More than 24 hours in the future - timezone issue, treat as just now
        console.warn('Timestamp in future (timezone issue):', timestamp, 'diff:', diffMs);
        return "JUST_NOW";
      }
      
      // If negative but less than 24 hours, it might be a small timezone offset, treat as just now
      if (diffMs < 0) {
        return "JUST_NOW";
      }
      
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);

      if (diffSeconds < 60) return "JUST_NOW";
      if (diffMinutes < 60) return `${diffMinutes}_MIN_AGO`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}_HRS_AGO`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}_DAYS_AGO`;
    } catch (error) {
      console.error('Error formatting timestamp:', error, timestamp);
      return "JUST_NOW";
    }
  };

  const handleAddComment = async () => {
    if (!canPost || isSubmitting || commentsPostingBlocked) return;
    setIsSubmitting(true);

    try {
      const { comment } = await createComment({
        userId,
        content: newComment.trim(),
      });
      if (comment) {
        // Reload comments to get proper nested structure with all replies
        await loadComments(true); // Pass true to indicate refresh (keeps existing comments visible)
        setNewComment("");
      }
      setError("");
    } catch (err) {
      setError(err.message || "Unable to submit comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentId) => {
    if (commentsPostingBlocked) return;
    const content = replyContent[parentId]?.trim() || "";
    if (!content || !userId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { comment } = await createComment({
        userId,
        content,
        parentId,
      });
      if (comment) {
        // Reload comments to get proper nested structure
        await loadComments(true); // Pass true to indicate refresh (keeps existing comments visible)
        setReplyContent((prev) => {
          const updated = { ...prev };
          delete updated[parentId];
          return updated;
        });
        setReplyingTo(null);
      }
      setError("");
    } catch (err) {
      setError(err.message || "Unable to submit reply.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleReply = (commentId) => {
    if (replyingTo === commentId) {
      setReplyingTo(null);
      setReplyContent((prev) => {
        const updated = { ...prev };
        delete updated[commentId];
        return updated;
      });
    } else {
      setReplyingTo(commentId);
      if (!replyContent[commentId]) {
        setReplyContent((prev) => ({ ...prev, [commentId]: "" }));
      }
    }
  };

  const handleLike = async (commentId) => {
    if (!userId) return;

    // Optimistic update for both top-level comments and replies
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            liked_by_current_user: !comment.liked_by_current_user,
            likes: comment.liked_by_current_user
              ? Math.max(comment.likes - 1, 0)
              : comment.likes + 1,
          };
        }
        // Also check replies
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: comment.replies.map((reply) =>
              reply.id === commentId
                ? {
                    ...reply,
                    liked_by_current_user: !reply.liked_by_current_user,
                    likes: reply.liked_by_current_user
                      ? Math.max(reply.likes - 1, 0)
                      : reply.likes + 1,
                  }
                : reply
            ),
          };
        }
        return comment;
      })
    );

    try {
      const { comment } = await toggleCommentLike({
        commentId,
        userId,
      });
      if (comment) {
        // Reload to get accurate state
        await loadComments(true); // Pass true to indicate refresh (keeps existing comments visible)
      }
    } catch (err) {
      setError(err.message || "Unable to update like status.");
      loadComments(true);
    }
  };

  const handleDelete = async (commentId) => {
    if (!isAdmin || !userId) return;
    try {
      await deleteComment({ commentId, userId });
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (err) {
      setError(err.message || "Unable to delete comment.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black pt-20 sm:pt-24 pb-8 sm:pb-12 px-3 sm:px-4 md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="text-center mb-6 sm:mb-8 md:mb-10 px-2 sm:px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-green-400 mb-2 sm:mb-3 font-mono tracking-tight">
            OPERATIVE_NETWORK
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-400 font-mono">// SECURE_COMMUNICATIONS</p>
        </div>

        <div className="bg-gray-800/80 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-gray-700 hover:border-green-500/50 transition-all duration-300 mb-6 sm:mb-8">
          {commentsPostingBlocked && (
            <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-950/40 px-4 py-3 text-center text-xs sm:text-sm font-mono text-amber-200">
              COMMENTS_LOCKED: policy violation.
              {commentsBannedUntil ? ` Until ${String(commentsBannedUntil).replace("T", " ")}` : ""}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 mx-auto sm:mx-0 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center text-xl sm:text-2xl border border-green-500/30">
              {userAvatar}
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="TRANSMIT_INTEL_OR_REQUEST_SUPPORT..."
              maxLength={MAX_COMMENT_LENGTH}
              rows={4}
              disabled={commentsPostingBlocked}
              className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg p-3 sm:p-4 text-white text-xs sm:text-sm md:text-base placeholder-gray-500 outline-none focus:border-green-500 focus:bg-gray-700/80 transition-all duration-300 resize-none font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center justify-between">
            <span className="text-gray-400 text-xs sm:text-sm font-mono text-center sm:text-left">
              {newComment.length}/{MAX_COMMENT_LENGTH}_BYTES
            </span>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleAddComment}
                disabled={!canPost || isSubmitting}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg font-semibold transition-all duration-300 border font-mono text-xs sm:text-sm ${
                  !canPost
                    ? "bg-gray-700/50 text-gray-500 border-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-green-500/20 hover:scale-[1.01] border-green-500/30"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    <span className="text-xs sm:text-sm">TRANSMITTING</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">TRANSMIT</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => loadComments(true)}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg font-semibold border border-gray-600 text-gray-300 hover:border-green-500/50 hover:text-green-400 transition-all duration-300 font-mono text-xs sm:text-sm"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="text-xs sm:text-sm">SYNC_FEED</span>
              </button>
            </div>
          </div>
          {error && (
            <p className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-red-400 font-mono break-words">
              {error}
            </p>
          )}
        </div>

        <div className="space-y-4 sm:space-y-5 md:space-y-6 relative">
          {/* Show loading overlay only during refresh, not initial load */}
          {isRefreshing && (
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center py-2">
              <div className="bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-green-500/50 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                <span className="text-xs text-green-400 font-mono">SYNCING...</span>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-green-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center bg-gray-800/60 rounded-2xl border border-dashed border-gray-600 p-8 font-mono text-gray-400">
              NO_TRANSMISSIONS_AVAILABLE
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                userId={userId}
                isAdmin={isAdmin}
                userAvatar={userAvatar}
                replyingTo={replyingTo}
                replyContent={replyContent}
                onReply={handleReply}
                onToggleReply={handleToggleReply}
                onLike={handleLike}
                onDelete={handleDelete}
                formatTimestamp={formatTimestamp}
                isSubmitting={isSubmitting}
                setReplyContent={setReplyContent}
                postingBlocked={commentsPostingBlocked}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Comment Item Component (supports nested replies)
const CommentItem = ({
  comment,
  userId,
  isAdmin,
  userAvatar,
  replyingTo,
  replyContent,
  onReply,
  onToggleReply,
  onLike,
  onDelete,
  formatTimestamp,
  isSubmitting,
  setReplyContent,
  postingBlocked,
}) => {
  const isReplying = replyingTo === comment.id;
  const replyText = replyContent[comment.id] || "";
  const canReply =
    !postingBlocked &&
    replyText.trim().length > 0 &&
    replyText.trim().length <= MAX_COMMENT_LENGTH;

  return (
    <div className="bg-gray-800/80 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-xl sm:text-2xl border border-blue-500/30">
            {comment.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <span className="font-bold text-white font-mono text-sm sm:text-base md:text-lg break-words">
                {comment.user}
              </span>
              {comment.rank && (
                <span className="bg-green-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-mono tracking-wide">
                  {comment.rank}
                </span>
              )}
              <span className="text-gray-400 text-[10px] sm:text-xs md:text-sm font-mono">
                • {formatTimestamp(comment.created_at)}
              </span>
            </div>
            {comment.updated_at && (
              <p className="text-[10px] sm:text-xs text-gray-500 font-mono">
                UPDATED • {formatTimestamp(comment.updated_at)}
              </p>
            )}
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete(comment.id)}
            className="self-start sm:self-auto inline-flex items-center gap-1 sm:gap-2 text-red-400 hover:text-red-300 text-[10px] sm:text-xs font-mono border border-red-500/40 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-red-500/10 transition"
          >
            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
            PURGE
          </button>
        )}
      </div>

      <p className="text-gray-300 leading-relaxed font-mono text-xs sm:text-sm md:text-base break-words">
        {comment.text}
      </p>

      <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 sm:mt-6">
        <button
          type="button"
          onClick={() => onLike(comment.id)}
          className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium font-mono transition-colors duration-200 ${
            comment.liked_by_current_user
              ? "text-green-400"
              : "text-gray-400 hover:text-green-400"
          }`}
        >
          <Heart
            className={`w-3 h-3 sm:w-4 sm:h-4 ${
              comment.liked_by_current_user ? "fill-current" : ""
            }`}
          />
          ACK ({comment.likes})
        </button>
        {userId && !postingBlocked && (
          <button
            type="button"
            onClick={() => onToggleReply(comment.id)}
            className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium font-mono transition-colors duration-200 ${
              isReplying
                ? "text-green-400"
                : "text-gray-400 hover:text-green-400"
            }`}
          >
            <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            RESPOND {comment.replies?.length > 0 && `(${comment.replies.length})`}
          </button>
        )}
      </div>

      {/* Reply Input */}
      {isReplying && userId && !postingBlocked && (
        <div className="mt-4 sm:mt-5 p-3 sm:p-4 bg-gray-700/50 rounded-lg border border-gray-600">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3">
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 mx-auto sm:mx-0 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center text-lg sm:text-xl border border-green-500/30">
              {userAvatar}
            </div>
            <textarea
              value={replyText}
              onChange={(e) =>
                setReplyContent((prev) => ({
                  ...prev,
                  [comment.id]: e.target.value,
                }))
              }
              placeholder={`REPLY_TO_${comment.user.toUpperCase()}...`}
              maxLength={MAX_COMMENT_LENGTH}
              rows={3}
              className="w-full bg-gray-600/50 border-2 border-gray-500 rounded-lg p-2 sm:p-3 text-white text-xs sm:text-sm placeholder-gray-400 outline-none focus:border-green-500 focus:bg-gray-600/80 transition-all duration-300 resize-none font-mono"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center justify-between">
            <span className="text-gray-400 text-xs font-mono text-center sm:text-left">
              {replyText.length}/{MAX_COMMENT_LENGTH}_BYTES
            </span>
            <div className="flex gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onToggleReply(comment.id)}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold border border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white transition-all duration-300 font-mono text-xs sm:text-sm"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => onReply(comment.id)}
                disabled={!canReply || isSubmitting}
                className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition-all duration-300 border font-mono text-xs sm:text-sm ${
                  !canReply
                    ? "bg-gray-700/50 text-gray-500 border-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-green-500/20 hover:scale-[1.01] border-green-500/30"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    <span>TRANSMITTING</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>REPLY</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 sm:mt-5 ml-4 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-gray-600 space-y-3 sm:space-y-4">
          {comment.replies.map((reply) => (
            <div
              key={reply.id}
              className="bg-gray-700/60 rounded-lg p-3 sm:p-4 border border-gray-600/50"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center text-base sm:text-lg border border-purple-500/30">
                  {reply.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <span className="font-semibold text-white font-mono text-xs sm:text-sm md:text-base break-words">
                      {reply.user}
                    </span>
                    {reply.rank && (
                      <span className="bg-purple-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-mono tracking-wide">
                        {reply.rank}
                      </span>
                    )}
                    <span className="text-gray-400 text-[10px] sm:text-xs font-mono">
                      • {formatTimestamp(reply.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed font-mono text-xs sm:text-sm break-words ml-0 sm:ml-12">
                {reply.text}
              </p>
              <div className="flex gap-3 sm:gap-4 mt-2 sm:mt-3 ml-0 sm:ml-12">
                <button
                  type="button"
                  onClick={() => onLike(reply.id)}
                  className={`flex items-center gap-1 sm:gap-2 text-xs font-medium font-mono transition-colors duration-200 ${
                    reply.liked_by_current_user
                      ? "text-green-400"
                      : "text-gray-400 hover:text-green-400"
                  }`}
                >
                  <Heart
                    className={`w-3 h-3 ${
                      reply.liked_by_current_user ? "fill-current" : ""
                    }`}
                  />
                  ACK ({reply.likes})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentsPage;
