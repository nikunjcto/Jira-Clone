import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, IssueTypeIcon, PriorityIcon, StatusBadge } from "@/components/Visuals";
import { Trash, Paperclip, X, DownloadSimple } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";

const ISSUE_TYPES = ["task", "story", "bug", "epic"];
const PRIORITIES = ["highest", "high", "medium", "low", "lowest"];
const STATUSES = ["backlog", "todo", "in_progress", "review", "done"];

export default function IssueDialog({ open, onClose, issueId, users, sprints, issues, onChanged }) {
    const { user } = useAuth();
    const [issue, setIssue] = useState(null);
    const [comments, setComments] = useState([]);
    const [activity, setActivity] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [tab, setTab] = useState("comments");

    const loadAll = useCallback(async () => {
        if (!issueId) return;
        const [i, c, a, at] = await Promise.all([
            api.get(`/issues/${issueId}`),
            api.get(`/issues/${issueId}/comments`),
            api.get(`/issues/${issueId}/activity`),
            api.get(`/issues/${issueId}/attachments`),
        ]);
        setIssue(i.data);
        setComments(c.data);
        setActivity(a.data);
        setAttachments(at.data);
    }, [issueId]);

    useEffect(() => {
        if (open) loadAll();
    }, [open, loadAll]);

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const updateField = async (field, value) => {
        await api.patch(`/issues/${issueId}`, { [field]: value });
        await loadAll();
        onChanged?.();
    };

    const addComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        await api.post(`/issues/${issueId}/comments`, { body: newComment });
        setNewComment("");
        await loadAll();
    };

    const deleteComment = async (id) => {
        await api.delete(`/comments/${id}`);
        await loadAll();
    };

    const uploadAttachment = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/issues/${issueId}/attachments`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        e.target.value = "";
        await loadAll();
    };

    const deleteAttachment = async (id) => {
        await api.delete(`/attachments/${id}`);
        await loadAll();
    };

    const deleteIssue = async () => {
        if (!confirm("Delete this issue permanently?")) return;
        await api.delete(`/issues/${issueId}`);
        onChanged?.();
        onClose?.();
    };

    if (!issue) {
        return (
            <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
                <DialogContent className="border border-[#111] bg-white !rounded-none p-6 sm:max-w-3xl">
                    <DialogTitle className="sr-only">Loading issue</DialogTitle>
                    <div className="font-mono text-sm">Loading…</div>
                </DialogContent>
            </Dialog>
        );
    }

    const epics = (issues || []).filter((i) => i.type === "epic" && i.id !== issue.id);

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
            <DialogContent className="border border-[#111] bg-white !rounded-none p-0 shadow-[6px_6px_0_0_#111] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogTitle className="sr-only">{issue.key} — {issue.title}</DialogTitle>
                <DialogDescription className="sr-only">Issue detail dialog with comments, activity log and attachments.</DialogDescription>
                {/* Header */}
                <div className="border-b border-[#111] px-5 py-3 flex items-center gap-3 bg-[#F4F4F0]">
                    <IssueTypeIcon type={issue.type} size={16} />
                    <span className="font-mono font-bold text-[#001AFF]" data-testid="issue-key">
                        {issue.key}
                    </span>
                    <StatusBadge status={issue.status} />
                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={deleteIssue} className="brut-btn" data-variant="danger" data-testid="issue-delete">
                            <Trash size={14} /> Delete
                        </button>
                        <button onClick={onClose} className="border border-[#111] p-1.5 hover:bg-[#111] hover:text-white" data-testid="issue-close">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto grid grid-cols-1 lg:grid-cols-3">
                    {/* Main column */}
                    <div className="lg:col-span-2 p-6 border-r border-[#111]">
                        <input
                            value={issue.title}
                            onChange={(e) => setIssue({ ...issue, title: e.target.value })}
                            onBlur={(e) => e.target.value !== issue.title || updateField("title", e.target.value)}
                            className="font-display font-black text-2xl tracking-tighter w-full bg-transparent border-b border-transparent hover:border-[#111] focus:border-[#001AFF] outline-none py-1"
                            data-testid="issue-title"
                        />

                        <div className="mt-6">
                            <div className="font-mono text-[10px] uppercase tracking-widest text-[#555] mb-2">
                                Description
                            </div>
                            <textarea
                                value={issue.description || ""}
                                onChange={(e) => setIssue({ ...issue, description: e.target.value })}
                                onBlur={(e) => updateField("description", e.target.value)}
                                rows={5}
                                placeholder="Add a description…"
                                className="brut-input"
                                data-testid="issue-description"
                            />
                        </div>

                        {/* Tabs */}
                        <div className="mt-6 border-b border-[#111] flex gap-0">
                            <TabBtn active={tab === "comments"} onClick={() => setTab("comments")} testId="tab-comments">
                                Comments ({comments.length})
                            </TabBtn>
                            <TabBtn active={tab === "activity"} onClick={() => setTab("activity")} testId="tab-activity">
                                Activity ({activity.length})
                            </TabBtn>
                            <TabBtn active={tab === "attachments"} onClick={() => setTab("attachments")} testId="tab-attachments">
                                Attachments ({attachments.length})
                            </TabBtn>
                        </div>

                        {tab === "comments" && (
                            <div className="mt-4 space-y-3" data-testid="comments-section">
                                <form onSubmit={addComment} className="flex gap-2">
                                    <input
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Write a comment…"
                                        className="brut-input flex-1"
                                        data-testid="comment-input"
                                    />
                                    <button type="submit" className="brut-btn" data-variant="primary" data-testid="comment-submit">
                                        Post
                                    </button>
                                </form>
                                {comments.length === 0 && (
                                    <div className="text-sm text-[#555] font-mono">// no comments yet</div>
                                )}
                                {comments.map((c) => {
                                    const author = userMap[c.user_id] || { name: "Unknown" };
                                    return (
                                        <div key={c.id} className="border border-[#111] bg-white p-3 flex gap-3" data-testid={`comment-${c.id}`}>
                                            <Avatar name={author.name} color={author.avatar_color || "#111"} size={28} />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm font-semibold">{author.name}</div>
                                                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                                                        {new Date(c.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="text-sm mt-1 whitespace-pre-wrap">{c.body}</div>
                                            </div>
                                            {(c.user_id === user.id || user.role === "admin") && (
                                                <button onClick={() => deleteComment(c.id)} className="text-[#E63946] hover:underline text-xs">
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {tab === "activity" && (
                            <div className="mt-4 space-y-2" data-testid="activity-section">
                                {activity.length === 0 && (
                                    <div className="text-sm text-[#555] font-mono">// no activity yet</div>
                                )}
                                {activity.map((a) => {
                                    const author = userMap[a.user_id] || { name: "?" };
                                    return (
                                        <div key={a.id} className="flex items-start gap-3 text-sm border-l-2 border-[#111] pl-3 py-1">
                                            <Avatar name={author.name} color={author.avatar_color || "#111"} size={22} />
                                            <div className="flex-1">
                                                <span className="font-semibold">{author.name}</span>{" "}
                                                <span className="text-[#333]">{a.detail}</span>
                                                <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                                                    {new Date(a.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {tab === "attachments" && (
                            <div className="mt-4 space-y-3" data-testid="attachments-section">
                                <label className="brut-btn cursor-pointer inline-flex" data-variant="ghost" data-testid="attachment-upload-label">
                                    <Paperclip size={14} /> Upload file
                                    <input type="file" className="hidden" onChange={uploadAttachment} data-testid="attachment-upload-input" />
                                </label>
                                {attachments.length === 0 && (
                                    <div className="text-sm text-[#555] font-mono">// no attachments</div>
                                )}
                                {attachments.map((a) => (
                                    <div key={a.id} className="border border-[#111] bg-white p-2 flex items-center gap-3" data-testid={`attachment-${a.id}`}>
                                        <Paperclip size={14} />
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold truncate">{a.filename}</div>
                                            <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                                                {(a.size / 1024).toFixed(1)} KB
                                            </div>
                                        </div>
                                        <a
                                            href={`${api.defaults.baseURL}/attachments/${a.id}/download`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="border border-[#111] p-1.5 hover:bg-[#111] hover:text-white"
                                            data-testid={`attachment-download-${a.id}`}
                                        >
                                            <DownloadSimple size={14} />
                                        </a>
                                        {(a.uploaded_by === user.id || user.role === "admin") && (
                                            <button onClick={() => deleteAttachment(a.id)} className="border border-[#E63946] text-[#E63946] p-1.5 hover:bg-[#E63946] hover:text-white">
                                                <Trash size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside className="p-5 bg-[#F4F4F0]">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-[#555] mb-3">
                            Details
                        </div>
                        <div className="brut-card divide-y divide-[#111]">
                            <SidebarRow label="Status">
                                <select className="brut-input bg-white" value={issue.status} onChange={(e) => updateField("status", e.target.value)} data-testid="side-status">
                                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>)}
                                </select>
                            </SidebarRow>
                            <SidebarRow label="Type">
                                <select className="brut-input bg-white" value={issue.type} onChange={(e) => updateField("type", e.target.value)} data-testid="side-type">
                                    {ISSUE_TYPES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                </select>
                            </SidebarRow>
                            <SidebarRow label="Priority">
                                <select className="brut-input bg-white" value={issue.priority} onChange={(e) => updateField("priority", e.target.value)} data-testid="side-priority">
                                    {PRIORITIES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                </select>
                            </SidebarRow>
                            <SidebarRow label="Assignee">
                                <select className="brut-input bg-white" value={issue.assignee_id || ""} onChange={(e) => updateField("assignee_id", e.target.value || null)} data-testid="side-assignee">
                                    <option value="">Unassigned</option>
                                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </SidebarRow>
                            <SidebarRow label="Sprint">
                                <select className="brut-input bg-white" value={issue.sprint_id || ""} onChange={(e) => updateField("sprint_id", e.target.value || null)} data-testid="side-sprint">
                                    <option value="">Backlog</option>
                                    {sprints.filter((s) => s.state !== "completed").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </SidebarRow>
                            {issue.type !== "epic" && (
                                <SidebarRow label="Epic link">
                                    <select className="brut-input bg-white" value={issue.parent_id || ""} onChange={(e) => updateField("parent_id", e.target.value || null)} data-testid="side-epic">
                                        <option value="">— None —</option>
                                        {epics.map((e2) => <option key={e2.id} value={e2.id}>{e2.key} · {e2.title}</option>)}
                                    </select>
                                </SidebarRow>
                            )}
                            <SidebarRow label="Story points">
                                <input
                                    type="number"
                                    min="0"
                                    value={issue.story_points ?? ""}
                                    onChange={(e) => setIssue({ ...issue, story_points: e.target.value })}
                                    onBlur={(e) => updateField("story_points", e.target.value === "" ? null : Number(e.target.value))}
                                    className="brut-input bg-white"
                                    data-testid="side-points"
                                />
                            </SidebarRow>
                            <SidebarRow label="Reporter">
                                <div className="flex items-center gap-2 px-3 py-2">
                                    <Avatar name={userMap[issue.reporter_id]?.name} color={userMap[issue.reporter_id]?.avatar_color} size={22} />
                                    <span className="text-sm">{userMap[issue.reporter_id]?.name || "—"}</span>
                                </div>
                            </SidebarRow>
                        </div>
                        <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-[#555]">
                            Created {new Date(issue.created_at).toLocaleString()}
                        </div>
                    </aside>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function TabBtn({ active, onClick, children, testId }) {
    return (
        <button
            onClick={onClick}
            data-testid={testId}
            className={`px-4 py-2 font-mono text-[11px] uppercase tracking-widest border-r border-[#111] -mb-px ${
                active ? "bg-[#111] text-white" : "hover:bg-[#F4F4F0]"
            }`}
        >
            {children}
        </button>
    );
}

function SidebarRow({ label, children }) {
    return (
        <div className="grid grid-cols-3 items-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#555] px-3 py-2 border-r border-[#111]">
                {label}
            </div>
            <div className="col-span-2">{children}</div>
        </div>
    );
}
