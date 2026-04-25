import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import api from "@/lib/api";
import { Avatar, IssueTypeIcon, PriorityIcon } from "@/components/Visuals";
import IssueDialog from "@/components/dialogs/IssueDialog";

const COLUMNS = [
    { id: "todo", label: "TO DO" },
    { id: "in_progress", label: "IN PROGRESS" },
    { id: "review", label: "REVIEW" },
    { id: "done", label: "DONE" },
];

export default function ProjectBoard() {
    const ctx = useOutletContext();
    const { project, users, sprints, issues, reloadIssues } = ctx;
    const [activeIssueId, setActiveIssueId] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const [activeSprintId, setActiveSprintId] = useState("all");
    const [assigneeFilter, setAssigneeFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");

    const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

    const activeSprint = sprints.find((s) => s.state === "active");
    useEffect(() => {
        if (activeSprintId === "all" && activeSprint) setActiveSprintId(activeSprint.id);
    }, [activeSprint, activeSprintId]);

    const filtered = issues.filter((i) => {
        if (i.status === "backlog") return false;
        if (activeSprintId !== "all" && i.sprint_id !== activeSprintId) return false;
        if (assigneeFilter !== "all" && i.assignee_id !== assigneeFilter && !(assigneeFilter === "unassigned" && !i.assignee_id))
            return false;
        if (typeFilter !== "all" && i.type !== typeFilter) return false;
        return true;
    });

    const grouped = COLUMNS.reduce((acc, c) => {
        acc[c.id] = filtered.filter((i) => i.status === c.id);
        return acc;
    }, {});

    const onDrop = async (e, status) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        setDragOver(null);
        if (!id) return;
        const issue = issues.find((i) => i.id === id);
        if (!issue || issue.status === status) return;
        await api.patch(`/issues/${id}`, { status });
        reloadIssues();
    };

    return (
        <div className="flex flex-col h-full" data-testid="board-page">
            <div className="border-b border-[#111] bg-white px-6 py-3 flex flex-wrap items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#555]">Sprint:</span>
                <select
                    className="brut-input !w-auto"
                    value={activeSprintId}
                    onChange={(e) => setActiveSprintId(e.target.value)}
                    data-testid="board-sprint-filter"
                >
                    <option value="all">All sprints</option>
                    {sprints.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name} · {s.state}
                        </option>
                    ))}
                </select>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#555]">Assignee:</span>
                <select className="brut-input !w-auto" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} data-testid="board-assignee-filter">
                    <option value="all">All</option>
                    <option value="unassigned">Unassigned</option>
                    {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#555]">Type:</span>
                <select className="brut-input !w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} data-testid="board-type-filter">
                    <option value="all">All</option>
                    <option value="task">Task</option>
                    <option value="story">Story</option>
                    <option value="bug">Bug</option>
                    <option value="epic">Epic</option>
                </select>
                <div className="ml-auto font-mono text-[10px] uppercase tracking-widest text-[#555]">
                    {filtered.length} issues
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                <div className="grid grid-cols-4 min-w-[1100px] h-full">
                    {COLUMNS.map((col) => (
                        <div
                            key={col.id}
                            className={`kanban-col ${dragOver === col.id ? "drop-target" : ""}`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(col.id);
                            }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={(e) => onDrop(e, col.id)}
                            data-testid={`column-${col.id}`}
                        >
                            <div className="px-4 py-3 border-b border-[#111] flex items-center justify-between bg-white">
                                <span className="font-mono text-[11px] uppercase tracking-widest font-bold">
                                    {col.label}
                                </span>
                                <span className="brut-badge">{grouped[col.id].length}</span>
                            </div>
                            <div className="p-3 space-y-3 flex-1 scroll-y">
                                {grouped[col.id].map((issue) => (
                                    <BoardCard
                                        key={issue.id}
                                        issue={issue}
                                        user={userMap[issue.assignee_id]}
                                        onClick={() => setActiveIssueId(issue.id)}
                                    />
                                ))}
                                {grouped[col.id].length === 0 && (
                                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#999] text-center py-8">
                                        // empty
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {activeIssueId && (
                <IssueDialog
                    open={!!activeIssueId}
                    onClose={() => setActiveIssueId(null)}
                    issueId={activeIssueId}
                    users={users}
                    sprints={sprints}
                    issues={issues}
                    onChanged={reloadIssues}
                />
            )}
        </div>
    );
}

function BoardCard({ issue, user, onClick }) {
    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", issue.id);
                e.dataTransfer.effectAllowed = "move";
            }}
            onClick={onClick}
            data-testid={`issue-card-${issue.key}`}
            className="brut-card p-3 hard-shadow-hover cursor-pointer"
        >
            <div className="text-sm font-semibold leading-snug">{issue.title}</div>
            {issue.labels?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {issue.labels.slice(0, 3).map((l) => (
                        <span key={l} className="brut-badge bg-[#FFD600]">{l}</span>
                    ))}
                </div>
            )}
            <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5">
                    <IssueTypeIcon type={issue.type} />
                    <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#001AFF]">
                        {issue.key}
                    </span>
                    <PriorityIcon priority={issue.priority} />
                    {issue.story_points != null && (
                        <span className="font-mono text-[10px] font-bold border border-[#111] px-1">{issue.story_points}</span>
                    )}
                </div>
                {user && <Avatar name={user.name} color={user.avatar_color} size={22} />}
            </div>
        </div>
    );
}
