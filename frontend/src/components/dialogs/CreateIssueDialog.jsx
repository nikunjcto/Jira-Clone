import { useState, useEffect } from "react";
import api, { formatApiError } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ISSUE_TYPES = ["task", "story", "bug", "epic"];
const PRIORITIES = ["highest", "high", "medium", "low", "lowest"];
const STATUSES = ["backlog", "todo", "in_progress", "review", "done"];

export default function CreateIssueDialog({
    open,
    onClose,
    onCreated,
    project,
    users,
    sprints,
    issues,
    defaultStatus = "backlog",
    defaultSprintId = null,
}) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("task");
    const [priority, setPriority] = useState("medium");
    const [status, setStatus] = useState(defaultStatus);
    const [assigneeId, setAssigneeId] = useState("");
    const [sprintId, setSprintId] = useState(defaultSprintId || "");
    const [parentId, setParentId] = useState("");
    const [storyPoints, setStoryPoints] = useState("");
    const [labels, setLabels] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setStatus(defaultStatus);
        setSprintId(defaultSprintId || "");
    }, [defaultStatus, defaultSprintId, open]);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            await api.post(`/projects/${project.id}/issues`, {
                title,
                description,
                type,
                priority,
                status,
                assignee_id: assigneeId || null,
                sprint_id: sprintId || null,
                parent_id: parentId || null,
                labels: labels.split(",").map((l) => l.trim()).filter(Boolean),
                story_points: storyPoints ? Number(storyPoints) : null,
            });
            setTitle("");
            setDescription("");
            setType("task");
            setPriority("medium");
            setAssigneeId("");
            setParentId("");
            setStoryPoints("");
            setLabels("");
            onCreated?.();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setBusy(false);
        }
    };

    const epics = (issues || []).filter((i) => i.type === "epic");

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
            <DialogContent className="border border-[#111] bg-white !rounded-none p-0 shadow-[6px_6px_0_0_#111] sm:max-w-2xl">
                <DialogHeader className="border-b border-[#111] p-5">
                    <DialogTitle className="font-display font-black text-2xl tracking-tighter">
                        New Issue · <span className="font-mono text-base text-[#001AFF]">{project.key}</span>
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="p-5 space-y-4" data-testid="create-issue-form">
                    <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                            Title
                        </label>
                        <input
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="brut-input"
                            data-testid="ci-title"
                        />
                    </div>
                    <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                            Description
                        </label>
                        <textarea
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="brut-input"
                            data-testid="ci-description"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Select label="Type" value={type} onChange={setType} options={ISSUE_TYPES} testId="ci-type" />
                        <Select label="Priority" value={priority} onChange={setPriority} options={PRIORITIES} testId="ci-priority" />
                        <Select label="Status" value={status} onChange={setStatus} options={STATUSES} testId="ci-status" />
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                                Assignee
                            </label>
                            <select
                                className="brut-input"
                                value={assigneeId}
                                onChange={(e) => setAssigneeId(e.target.value)}
                                data-testid="ci-assignee"
                            >
                                <option value="">Unassigned</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                                Sprint
                            </label>
                            <select
                                className="brut-input"
                                value={sprintId}
                                onChange={(e) => setSprintId(e.target.value)}
                                data-testid="ci-sprint"
                            >
                                <option value="">Backlog (no sprint)</option>
                                {sprints.filter((s) => s.state !== "completed").map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} {s.state === "active" ? "· active" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {type !== "epic" && (
                            <div>
                                <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                                    Epic link
                                </label>
                                <select
                                    className="brut-input"
                                    value={parentId}
                                    onChange={(e) => setParentId(e.target.value)}
                                    data-testid="ci-epic"
                                >
                                    <option value="">— None —</option>
                                    {epics.map((e2) => (
                                        <option key={e2.id} value={e2.id}>
                                            {e2.key} · {e2.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                                Story points
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={storyPoints}
                                onChange={(e) => setStoryPoints(e.target.value)}
                                className="brut-input"
                                data-testid="ci-story-points"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                                Labels (comma separated)
                            </label>
                            <input
                                value={labels}
                                onChange={(e) => setLabels(e.target.value)}
                                className="brut-input"
                                data-testid="ci-labels"
                                placeholder="frontend, urgent"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="border border-[#E63946] bg-[#fff5f6] p-2 text-sm text-[#E63946]">{error}</div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button type="button" className="brut-btn flex-1 justify-center" data-variant="ghost" onClick={onClose} data-testid="ci-cancel">
                            Cancel
                        </button>
                        <button type="submit" disabled={busy} className="brut-btn flex-1 justify-center" data-variant="primary" data-testid="ci-submit">
                            {busy ? "Creating…" : "Create issue"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Select({ label, value, onChange, options, testId }) {
    return (
        <div>
            <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                {label}
            </label>
            <select className="brut-input" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o.replace("_", " ").toUpperCase()}
                    </option>
                ))}
            </select>
        </div>
    );
}
