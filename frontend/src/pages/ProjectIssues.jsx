import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Avatar, IssueTypeIcon, PriorityIcon, StatusBadge } from "@/components/Visuals";
import IssueDialog from "@/components/dialogs/IssueDialog";

export default function ProjectIssues() {
    const ctx = useOutletContext();
    const { users, sprints, issues, reloadIssues } = ctx;
    const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
    const sprintMap = useMemo(() => Object.fromEntries(sprints.map((s) => [s.id, s])), [sprints]);
    const [active, setActive] = useState(null);
    const [q, setQ] = useState("");
    const [statusF, setStatusF] = useState("all");
    const [typeF, setTypeF] = useState("all");

    const filtered = issues.filter((i) => {
        if (q && !(`${i.key} ${i.title}`.toLowerCase().includes(q.toLowerCase()))) return false;
        if (statusF !== "all" && i.status !== statusF) return false;
        if (typeF !== "all" && i.type !== typeF) return false;
        return true;
    });

    return (
        <div className="p-6" data-testid="issues-page">
            <div className="flex items-end justify-between border-b border-[#111] pb-3 mb-4">
                <h2 className="font-display font-black text-3xl tracking-tighter">Issues</h2>
                <div className="flex items-center gap-2">
                    <input className="brut-input !w-56" placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="issues-filter-input" />
                    <select className="brut-input !w-auto" value={statusF} onChange={(e) => setStatusF(e.target.value)} data-testid="issues-status-filter">
                        <option value="all">All status</option>
                        <option value="backlog">Backlog</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                    </select>
                    <select className="brut-input !w-auto" value={typeF} onChange={(e) => setTypeF(e.target.value)} data-testid="issues-type-filter">
                        <option value="all">All types</option>
                        <option value="task">Task</option>
                        <option value="story">Story</option>
                        <option value="bug">Bug</option>
                        <option value="epic">Epic</option>
                    </select>
                </div>
            </div>

            <div className="border border-[#111] bg-white">
                <div className="grid grid-cols-12 font-mono text-[10px] uppercase tracking-widest text-[#555] border-b border-[#111] bg-[#F4F4F0]">
                    <div className="col-span-1 p-2 border-r border-[#111]">Type</div>
                    <div className="col-span-1 p-2 border-r border-[#111]">Key</div>
                    <div className="col-span-4 p-2 border-r border-[#111]">Title</div>
                    <div className="col-span-1 p-2 border-r border-[#111]">P</div>
                    <div className="col-span-2 p-2 border-r border-[#111]">Status</div>
                    <div className="col-span-2 p-2 border-r border-[#111]">Sprint</div>
                    <div className="col-span-1 p-2">Assignee</div>
                </div>
                {filtered.length === 0 && (
                    <div className="p-6 text-center font-mono text-[11px] uppercase tracking-widest text-[#999]">
                        // no issues match
                    </div>
                )}
                {filtered.map((i) => {
                    const u = userMap[i.assignee_id];
                    const s = sprintMap[i.sprint_id];
                    return (
                        <button
                            key={i.id}
                            onClick={() => setActive(i.id)}
                            className="grid grid-cols-12 w-full text-left border-b border-[#111] last:border-b-0 hover:bg-[#F4F4F0]"
                            data-testid={`issue-row-${i.key}`}
                        >
                            <div className="col-span-1 p-2 border-r border-[#111] flex items-center"><IssueTypeIcon type={i.type} /></div>
                            <div className="col-span-1 p-2 border-r border-[#111] font-mono font-bold text-[#001AFF]">{i.key}</div>
                            <div className="col-span-4 p-2 border-r border-[#111] truncate text-sm">{i.title}</div>
                            <div className="col-span-1 p-2 border-r border-[#111]"><PriorityIcon priority={i.priority} /></div>
                            <div className="col-span-2 p-2 border-r border-[#111]"><StatusBadge status={i.status} /></div>
                            <div className="col-span-2 p-2 border-r border-[#111] text-sm truncate">{s?.name || "—"}</div>
                            <div className="col-span-1 p-2">
                                {u ? <Avatar name={u.name} color={u.avatar_color} size={22} /> : <span className="font-mono text-[10px] text-[#555]">—</span>}
                            </div>
                        </button>
                    );
                })}
            </div>

            {active && (
                <IssueDialog
                    open={!!active}
                    onClose={() => setActive(null)}
                    issueId={active}
                    users={users}
                    sprints={sprints}
                    issues={issues}
                    onChanged={reloadIssues}
                />
            )}
        </div>
    );
}
