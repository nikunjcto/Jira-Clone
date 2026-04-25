import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/api";
import { Avatar, IssueTypeIcon, PriorityIcon, StatusBadge } from "@/components/Visuals";
import { Plus, Play, CheckCircle, Trash } from "@phosphor-icons/react";
import CreateSprintDialog from "@/components/dialogs/CreateSprintDialog";
import CreateIssueDialog from "@/components/dialogs/CreateIssueDialog";
import IssueDialog from "@/components/dialogs/IssueDialog";

export default function ProjectBacklog() {
    const ctx = useOutletContext();
    const { project, users, sprints, issues, reloadSprints, reloadIssues } = ctx;
    const [showCreateSprint, setShowCreateSprint] = useState(false);
    const [createIssueFor, setCreateIssueFor] = useState(null); // { sprintId | "backlog" }
    const [activeIssueId, setActiveIssueId] = useState(null);
    const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

    const groupedBySprint = sprints
        .filter((s) => s.state !== "completed")
        .map((s) => ({
            sprint: s,
            items: issues.filter((i) => i.sprint_id === s.id),
        }));
    const backlog = issues.filter((i) => !i.sprint_id);

    const startSprint = async (id) => {
        await api.post(`/sprints/${id}/start`);
        await Promise.all([reloadSprints(), reloadIssues()]);
    };
    const completeSprint = async (id) => {
        if (!confirm("Complete this sprint? Incomplete issues return to backlog.")) return;
        await api.post(`/sprints/${id}/complete`);
        await Promise.all([reloadSprints(), reloadIssues()]);
    };
    const deleteSprint = async (id) => {
        if (!confirm("Delete this sprint? Issues will be moved to backlog.")) return;
        await api.delete(`/sprints/${id}`);
        await Promise.all([reloadSprints(), reloadIssues()]);
    };

    const moveIssue = async (issueId, sprintId) => {
        await api.patch(`/issues/${issueId}`, { sprint_id: sprintId });
        await reloadIssues();
    };

    return (
        <div className="p-6 space-y-6" data-testid="backlog-page">
            <div className="flex items-end justify-between border-b border-[#111] pb-3">
                <h2 className="font-display font-black text-3xl tracking-tighter">Backlog</h2>
                <button
                    onClick={() => setShowCreateSprint(true)}
                    className="brut-btn"
                    data-variant="primary"
                    data-testid="create-sprint-btn"
                >
                    <Plus size={14} weight="bold" /> Create Sprint
                </button>
            </div>

            {groupedBySprint.map(({ sprint, items }) => (
                <SprintBlock
                    key={sprint.id}
                    sprint={sprint}
                    items={items}
                    userMap={userMap}
                    onStart={() => startSprint(sprint.id)}
                    onComplete={() => completeSprint(sprint.id)}
                    onDelete={() => deleteSprint(sprint.id)}
                    onAddIssue={() => setCreateIssueFor({ sprintId: sprint.id })}
                    onMoveTo={(issueId, target) => moveIssue(issueId, target)}
                    onOpenIssue={(id) => setActiveIssueId(id)}
                    sprints={sprints}
                />
            ))}

            <BacklogBlock
                items={backlog}
                userMap={userMap}
                sprints={sprints.filter((s) => s.state !== "completed")}
                onMoveTo={(issueId, target) => moveIssue(issueId, target)}
                onAddIssue={() => setCreateIssueFor({ sprintId: null })}
                onOpenIssue={(id) => setActiveIssueId(id)}
            />

            <CreateSprintDialog
                open={showCreateSprint}
                onClose={() => setShowCreateSprint(false)}
                onCreated={() => {
                    setShowCreateSprint(false);
                    reloadSprints();
                }}
                projectId={project.id}
            />
            {createIssueFor !== null && (
                <CreateIssueDialog
                    open={createIssueFor !== null}
                    onClose={() => setCreateIssueFor(null)}
                    project={project}
                    users={users}
                    sprints={sprints}
                    issues={issues}
                    defaultSprintId={createIssueFor.sprintId}
                    defaultStatus={createIssueFor.sprintId ? "todo" : "backlog"}
                    onCreated={() => {
                        setCreateIssueFor(null);
                        reloadIssues();
                    }}
                />
            )}
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

function SprintBlock({ sprint, items, userMap, onStart, onComplete, onDelete, onAddIssue, onMoveTo, onOpenIssue, sprints }) {
    const totalPoints = items.reduce((s, i) => s + (i.story_points || 0), 0);
    return (
        <div className="border border-[#111] bg-white" data-testid={`sprint-${sprint.id}`}>
            <div className="border-b border-[#111] px-4 py-3 flex items-center gap-3 bg-[#F4F4F0]">
                <span className={`brut-badge ${sprint.state === "active" ? "bg-[#001AFF] text-white" : ""}`}>
                    {sprint.state.toUpperCase()}
                </span>
                <div className="font-display font-bold text-lg tracking-tight">{sprint.name}</div>
                {sprint.goal && <span className="text-sm text-[#555] truncate">— {sprint.goal}</span>}
                <div className="ml-auto flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                        {items.length} issues · {totalPoints} pts
                    </span>
                    {sprint.state === "planned" && (
                        <button onClick={onStart} className="brut-btn" data-variant="primary" data-testid={`sprint-start-${sprint.id}`}>
                            <Play size={12} weight="fill" /> Start
                        </button>
                    )}
                    {sprint.state === "active" && (
                        <button onClick={onComplete} className="brut-btn" data-testid={`sprint-complete-${sprint.id}`}>
                            <CheckCircle size={12} weight="fill" /> Complete
                        </button>
                    )}
                    <button onClick={onDelete} className="border border-[#E63946] text-[#E63946] p-1.5 hover:bg-[#E63946] hover:text-white" data-testid={`sprint-delete-${sprint.id}`}>
                        <Trash size={12} />
                    </button>
                </div>
            </div>
            {items.length === 0 ? (
                <div className="p-6 text-center font-mono text-[11px] uppercase tracking-widest text-[#999]">
                    // sprint is empty — add issues from backlog
                </div>
            ) : (
                <div className="divide-y divide-[#111]">
                    {items.map((i) => (
                        <IssueRow key={i.id} issue={i} user={userMap[i.assignee_id]} onOpen={() => onOpenIssue(i.id)} sprints={sprints} onMoveTo={onMoveTo} currentSprintId={sprint.id} />
                    ))}
                </div>
            )}
            <div className="border-t border-[#111] p-2 bg-[#F4F4F0]">
                <button onClick={onAddIssue} className="font-mono text-[11px] uppercase tracking-widest hover:underline" data-testid={`sprint-add-issue-${sprint.id}`}>
                    + Add issue
                </button>
            </div>
        </div>
    );
}

function BacklogBlock({ items, userMap, sprints, onMoveTo, onAddIssue, onOpenIssue }) {
    return (
        <div className="border border-[#111] bg-white" data-testid="backlog-block">
            <div className="border-b border-[#111] px-4 py-3 flex items-center gap-3 bg-[#F4F4F0]">
                <span className="brut-badge">BACKLOG</span>
                <div className="font-display font-bold text-lg tracking-tight">Backlog</div>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-[#555]">
                    {items.length} issues
                </span>
            </div>
            {items.length === 0 ? (
                <div className="p-6 text-center font-mono text-[11px] uppercase tracking-widest text-[#999]">
                    // backlog is empty
                </div>
            ) : (
                <div className="divide-y divide-[#111]">
                    {items.map((i) => (
                        <IssueRow key={i.id} issue={i} user={userMap[i.assignee_id]} onOpen={() => onOpenIssue(i.id)} sprints={sprints} onMoveTo={onMoveTo} currentSprintId={null} />
                    ))}
                </div>
            )}
            <div className="border-t border-[#111] p-2 bg-[#F4F4F0]">
                <button onClick={onAddIssue} className="font-mono text-[11px] uppercase tracking-widest hover:underline" data-testid="backlog-add-issue">
                    + Add issue
                </button>
            </div>
        </div>
    );
}

function IssueRow({ issue, user, onOpen, sprints, onMoveTo, currentSprintId }) {
    return (
        <div className="px-3 py-2 flex items-center gap-3 hover:bg-[#F4F4F0]" data-testid={`backlog-row-${issue.key}`}>
            <IssueTypeIcon type={issue.type} />
            <span className="font-mono text-[11px] font-bold text-[#001AFF] w-20">{issue.key}</span>
            <button onClick={onOpen} className="flex-1 text-left text-sm hover:underline truncate">
                {issue.title}
            </button>
            <PriorityIcon priority={issue.priority} />
            <StatusBadge status={issue.status} />
            {issue.story_points != null && (
                <span className="font-mono text-[10px] border border-[#111] px-1.5">{issue.story_points} pts</span>
            )}
            <select
                className="brut-input !py-1 !text-[11px] !w-auto font-mono"
                value={currentSprintId || ""}
                onChange={(e) => onMoveTo(issue.id, e.target.value || null)}
                onClick={(e) => e.stopPropagation()}
                data-testid={`row-move-${issue.key}`}
            >
                <option value="">Backlog</option>
                {sprints.map((s) => (
                    <option key={s.id} value={s.id}>→ {s.name}</option>
                ))}
            </select>
            {user ? <Avatar name={user.name} color={user.avatar_color} size={22} /> : <span className="w-[22px] h-[22px] border border-dashed border-[#999]" />}
        </div>
    );
}
