'use client';

import React, { useState } from 'react';
import {
  X,
  Send,
  ThumbsUp,
  EyeOff,
  Eye,
  Trash2,
  Mail,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { PostComment, PostPerformanceMetric } from '@/types';
import { formatCompactNumber, formatMicroCurrency, formatTimeShort } from '@/lib/utils/formatters';

interface CommentDrawerProps {
  post: PostPerformanceMetric | null;
  comments: PostComment[];
  onClose: () => void;
  onReply: (commentId: string, message: string) => void;
  onToggleLike: (commentId: string) => void;
  onToggleHide: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onSendPrivateReply: (commentId: string, message: string) => void;
}

export function CommentDrawer({
  post,
  comments,
  onClose,
  onReply,
  onToggleLike,
  onToggleHide,
  onDelete,
  onSendPrivateReply,
}: CommentDrawerProps) {
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [dmTargetId, setDmTargetId] = useState<string | null>(null);
  const [dmDraft, setDmDraft] = useState('');

  if (!post) return null;

  const handleSendReply = (commentId: string) => {
    const text = (replyDrafts[commentId] || '').trim();
    if (!text) return;
    onReply(commentId, text);
    setReplyDrafts((prev) => ({ ...prev, [commentId]: '' }));
  };

  const handleSendDm = (commentId: string) => {
    const text = dmDraft.trim();
    if (!text) return;
    onSendPrivateReply(commentId, text);
    setDmDraft('');
    setDmTargetId(null);
  };

  const reactionPills = [
    { emoji: '👍', label: 'Like/Care', count: post.reactions.like },
    { emoji: '❤️', label: 'Love', count: post.reactions.love },
    { emoji: '😮', label: 'Wow', count: post.reactions.wow },
    { emoji: '😂', label: 'Haha', count: post.reactions.haha },
    { emoji: '😢', label: 'Sad', count: post.reactions.sad },
    { emoji: '😡', label: 'Angry', count: post.reactions.angry },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px] animate-fade-in">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-[#EEF1F6] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EEF1F6] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Webhook Inbox
              </span>
              <span className="text-xs font-bold text-slate-500 truncate">{post.pageName}</span>
            </div>
            <h3 className="text-base font-black text-slate-900 mt-1 truncate">
              Post Comments & Moderation
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close comment drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post Summary Card */}
        <div className="p-5 bg-[#F8F9FD] border-b border-[#EEF1F6] space-y-3">
          <div className="flex gap-3">
            {post.mediaUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={post.mediaUrl}
                alt="Post preview"
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                {post.message}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-bold text-slate-500">
                <span>Reach: {formatCompactNumber(post.reach)}</span>
                <span>Views: {formatCompactNumber(post.mediaViews)}</span>
                <span>Shares: {post.sharesCount}</span>
                <span className="text-emerald-600">
                  Est: {formatMicroCurrency(post.estimatedEarningsMicro)}
                </span>
                {post.permalinkUrl && (
                  <a
                    href={post.permalinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                  >
                    <span>FB Post</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Reaction Breakdown Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {reactionPills.map((r) => (
              <span
                key={r.label}
                title={r.label}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#EEF1F6] text-[11px] font-bold text-slate-700"
              >
                <span>{r.emoji}</span>
                <span>{r.count.toLocaleString()}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Comments Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-pink-500" />
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              API: POST /&#123;comment-id&#125;/comments
            </span>
          </div>

          {comments.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
              <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Abhi is post par koi comment nahi hai</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Dashboard se &ldquo;Simulate Live Webhook&rdquo; dabakar live comment test kar sakte ho.
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-2xl border p-4 space-y-3 transition-all ${
                  comment.isHidden
                    ? 'bg-amber-50/50 border-amber-200 opacity-80'
                    : 'bg-white border-[#EEF1F6] shadow-2xs'
                }`}
              >
                {/* Comment Author & Body */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {comment.authorAvatar ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                        {comment.authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-900">
                          {comment.authorName}
                        </span>
                        {comment.isHidden && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Hidden
                          </span>
                        )}
                        {comment.privateReplySent && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            DM Sent
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatTimeShort(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Quick Moderation Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleLike(comment.id)}
                      title="Like comment as Page"
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                        comment.isLikedByPage
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{comment.likeCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleHide(comment.id)}
                      title={comment.isHidden ? 'Unhide comment' : 'Hide spam comment'}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                    >
                      {comment.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDmTargetId(dmTargetId === comment.id ? null : comment.id)
                      }
                      disabled={comment.privateReplySent}
                      title="Send 1-time Private DM Reply (within 7 days)"
                      className={`p-1.5 rounded-lg transition-colors ${
                        comment.privateReplySent
                          ? 'text-emerald-500 cursor-not-allowed'
                          : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(comment.id)}
                      title="Delete comment"
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed pl-10">{comment.message}</p>

                {/* Existing Replies */}
                {comment.replies.length > 0 && (
                  <div className="pl-10 space-y-2">
                    {comment.replies.map((rep) => (
                      <div
                        key={rep.id}
                        className="rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] p-3 space-y-1"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-extrabold text-indigo-700">
                            {rep.authorName}
                          </span>
                          {rep.isPageAuthor && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase">
                              Page Reply
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {formatTimeShort(rep.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">{rep.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 1-Time Private DM Box */}
                {dmTargetId === comment.id && !comment.privateReplySent && (
                  <div className="ml-10 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-indigo-800">
                      <span>Private Messenger Reply (1-time limit, 7-day window)</span>
                      <button
                        type="button"
                        onClick={() => setDmTargetId(null)}
                        className="text-indigo-500 hover:text-indigo-800"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={dmDraft}
                        onChange={(e) => setDmDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendDm(comment.id)}
                        placeholder="Send private DM to commenter..."
                        className="flex-1 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendDm(comment.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
                      >
                        Send DM
                      </button>
                    </div>
                  </div>
                )}

                {/* Public Reply Box */}
                <div className="pl-10 flex items-center gap-2">
                  <input
                    type="text"
                    value={replyDrafts[comment.id] || ''}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && handleSendReply(comment.id)}
                    placeholder={`Reply as ${post.pageName}...`}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-800 focus:outline-none focus:border-[#FF007A] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendReply(comment.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF4E98] hover:opacity-95 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Meta Note */}
        <div className="px-5 py-3 border-t border-[#EEF1F6] bg-slate-50 flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            Live production me commenter ka naam &amp; avatar dikhane ke liye Meta App Review me{' '}
            <strong className="text-slate-700">BAUPA</strong> +{' '}
            <strong className="text-slate-700">pages_manage_engagement</strong> required hai.
          </span>
        </div>
      </div>
    </div>
  );
}
