'use client';

import { useState } from 'react';

export type Comment = {
    id: string;
    authorId: string; // authorId 추가
    authorNickname: string;
    authorProfileImage?: string;
    content: string;
    createdAt: string;
    parentId?: string;
    children?: Comment[];
};

type CommentTranslations = {
    detail: {
        reply: string;
        comments: string;
        noComments: string;
        placeholderComment: string;
        loginToComment: string;
        post: string;
        delete?: string; // 선택 사항
        deleteConfirm?: string; // 선택 사항
    };
};

type User = {
    id: string;
    role?: string;
    [key: string]: any;
};

type CommentSectionProps = {
    comments: Comment[];
    commentCount: number;
    commentInput: string;
    commentLoading: boolean;
    isAuthenticated: boolean;
    currentUser: User | null; // currentUser 추가
    onCommentInputChange: (value: string) => void;
    onCommentSubmit: (parentId?: string, replyContent?: string) => void;
    onCommentDelete: (commentId: string) => void; // onCommentDelete 추가
    t: CommentTranslations;
};

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * CommentList - 스크롤 가능한 댓글 영역(overflow-y-auto 부모 내부에 배치)
 */
export function CommentList({
    comments,
    commentCount,
    isAuthenticated,
    currentUser,
    onCommentSubmit,
    onCommentDelete,
    t,
}: Pick<CommentSectionProps, 'comments' | 'commentCount' | 'isAuthenticated' | 'currentUser' | 'onCommentSubmit' | 'onCommentDelete' | 't'>) {
    // 답글 상태(이 컴포넌트 내부 전용)
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyInput, setReplyInput] = useState('');
    const [replyLoading, setReplyLoading] = useState(false);

    // 어떤 댓글의 답글이 펼쳐져 있는지 추적
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

    const toggleExpand = (commentId: string) => {
        setExpandedComments(prev => {
            const next = new Set(prev);
            if (next.has(commentId)) next.delete(commentId);
            else next.add(commentId);
            return next;
        });
    };

    const handleReplySubmit = (parentId: string) => {
        if (!replyInput.trim()) return;
        setReplyLoading(true);
        onCommentSubmit(parentId, replyInput);
        // 제출 후 답글 상태 초기화
        setReplyInput('');
        setReplyingTo(null);
        setReplyLoading(false);
        // 새 답글이 보이도록 부모 댓글을 자동으로 펼침
        if (!expandedComments.has(parentId)) toggleExpand(parentId);
    };

    const handleDeleteClick = (commentId: string) => {
        if (confirm(t.detail.deleteConfirm || "Are you sure you want to delete this comment?")) {
            onCommentDelete(commentId);
        }
    };

    const renderComment = (c: Comment, depth = 0, parentNickname?: string) => {
        const isExpanded = expandedComments.has(c.id);
        const hasChildren = c.children && c.children.length > 0;

        // 권한 확인: 작성자 또는 관리자
        const canDelete = currentUser && (currentUser.id === c.authorId || currentUser.role === 'ADMIN');

        return (
            <div key={c.id} className="w-full">
                {/* 인스타그램 스타일 행 */}
                <div className={`flex gap-3 py-2 ${depth > 0 ? 'ml-2' : ''}`}>
                    {/* 아바타 */}
                    {c.authorProfileImage ? (
                        <img src={c.authorProfileImage} alt={c.authorNickname || ''} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200 shadow-sm" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200 shadow-sm overflow-hidden">
                            <span className="text-[10px] font-bold text-gray-500">{c.authorNickname ? c.authorNickname[0].toUpperCase() : '?'}</span>
                        </div>
                    )}

                    {/* 내용 영역 */}
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="text-[13px] leading-relaxed">
                            <span className="font-bold mr-2 text-gray-900 leading-none">@{c.authorNickname}</span>
                            <span className="text-gray-700 break-words">
                                {parentNickname && depth > 0 && (
                                    <span className="text-blue-500 font-semibold mr-1">@{parentNickname}</span>
                                )}
                                {c.content}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 mb-1">
                            <span className="text-[11px] text-gray-400 font-medium">{formatDate(c.createdAt)}</span>
                            <button
                                onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                                className="text-[11px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                {t.detail.reply || "\ub2f5\uae00 \ub2ec\uae30"}
                            </button>
                            {canDelete && (
                                <button
                                    onClick={() => handleDeleteClick(c.id)}
                                    className="text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors"
                                >
                                    {t.detail.delete || "삭제"}
                                </button>
                            )}
                        </div>

                        {/* 답글 입력 */}
                        {replyingTo === c.id && (
                            <div className="mt-3 flex gap-2">
                                <input
                                    className="flex-1 bg-transparent border-b border-gray-100 py-1 text-xs focus:border-black outline-none transition-all"
                                    placeholder={`@${c.authorNickname}\ub2d8\uc5d0\uac8c \ub2f5\uae00...`}
                                    value={replyInput}
                                    onChange={e => setReplyInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleReplySubmit(c.id)}
                                    disabled={replyLoading}
                                    autoFocus
                                />
                                <button
                                    onClick={() => handleReplySubmit(c.id)}
                                    disabled={!replyInput.trim() || replyLoading}
                                    className="text-blue-500 font-bold text-xs hover:text-blue-700 disabled:opacity-30"
                                >
                                    {replyLoading ? '...' : '\uac8c\uc2dc'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 하위 답글 */}
                {hasChildren && (
                    <div className="ml-8 flex flex-col">
                        <button
                            onClick={() => toggleExpand(c.id)}
                            className="flex items-center gap-3 py-1 group"
                        >
                            <div className="w-8 border-t border-gray-200 group-hover:border-gray-400 transition-all"></div>
                            <span className="text-[11px] font-bold text-gray-400 group-hover:text-gray-600 transition-colors flex items-center gap-1.5">
                                {isExpanded ? '\ub2f5\uae00 \uc228\uae30\uae30' : `\ub2f5\uae00 ${c.children?.length}\uac1c \ub354 \ubcf4\uae30`}
                            </span>
                        </button>

                        {isExpanded && (
                            <div className="flex flex-col">
                                {c.children?.map(child => renderComment(child, depth + 1, c.authorNickname))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="px-6 py-4 border-t border-gray-100 bg-white min-h-[150px]">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                {t.detail.comments} ({commentCount})
            </h3>

            <div className="flex flex-col gap-3">
                {comments.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <p className="text-sm">{t.detail.noComments}</p>
                    </div>
                ) : comments.map(c => renderComment(c))}
            </div>
        </div>
    );
}

/**
 * CommentInput - 고정 댓글 입력 바(스크롤 영역 바깥에 배치)
 */
export function CommentInput({
    commentInput,
    commentLoading,
    isAuthenticated,
    onCommentInputChange,
    onCommentSubmit,
    t,
}: Pick<CommentSectionProps, 'commentInput' | 'commentLoading' | 'isAuthenticated' | 'onCommentInputChange' | 'onCommentSubmit' | 't'>) {
    return (
        <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
                <input
                    className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-gray-400"
                    placeholder={isAuthenticated ? t.detail.placeholderComment : t.detail.loginToComment}
                    value={commentInput}
                    onChange={e => onCommentInputChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onCommentSubmit()}
                    disabled={!isAuthenticated || commentLoading}
                />
                <button
                    onClick={() => onCommentSubmit()}
                    disabled={!isAuthenticated || !commentInput.trim() || commentLoading}
                    className="bg-black text-white px-4 rounded-xl font-bold text-[10px] hover:bg-gray-800 disabled:opacity-30 transition-all uppercase"
                >
                    {t.detail.post}
                </button>
            </div>
        </div>
    );
}
