import { useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CreateSprintDialog({ open, onClose, onCreated, projectId }) {
    const [name, setName] = useState("");
    const [goal, setGoal] = useState("");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            await api.post(`/projects/${projectId}/sprints`, {
                name,
                goal,
                start_date: start || null,
                end_date: end || null,
            });
            setName("");
            setGoal("");
            setStart("");
            setEnd("");
            onCreated?.();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
            <DialogContent className="border border-[#111] bg-white !rounded-none p-0 shadow-[6px_6px_0_0_#111] sm:max-w-md">
                <DialogHeader className="border-b border-[#111] p-5">
                    <DialogTitle className="font-display font-black text-2xl tracking-tighter">
                        New Sprint
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="p-5 space-y-4" data-testid="create-sprint-form">
                    <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">Name</label>
                        <input required value={name} onChange={(e) => setName(e.target.value)} className="brut-input" data-testid="cs-name" />
                    </div>
                    <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">Goal</label>
                        <textarea rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} className="brut-input" data-testid="cs-goal" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">Start</label>
                            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="brut-input" data-testid="cs-start" />
                        </div>
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">End</label>
                            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="brut-input" data-testid="cs-end" />
                        </div>
                    </div>
                    {error && <div className="border border-[#E63946] bg-[#fff5f6] p-2 text-sm text-[#E63946]">{error}</div>}
                    <div className="flex gap-2 pt-2">
                        <button type="button" className="brut-btn flex-1 justify-center" data-variant="ghost" onClick={onClose} data-testid="cs-cancel">Cancel</button>
                        <button type="submit" disabled={busy} className="brut-btn flex-1 justify-center" data-variant="primary" data-testid="cs-submit">
                            {busy ? "Creating…" : "Create sprint"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
