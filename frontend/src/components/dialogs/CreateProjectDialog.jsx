import { useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CreateProjectDialog({ open, onClose, onCreated, users }) {
    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [description, setDescription] = useState("");
    const [leadId, setLeadId] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            await api.post("/projects", {
                name,
                key: key.toUpperCase(),
                description,
                lead_id: leadId || null,
            });
            setName("");
            setKey("");
            setDescription("");
            setLeadId("");
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
                        New Project
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="p-5 space-y-4" data-testid="create-project-form">
                    <Field label="Name">
                        <input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="brut-input"
                            placeholder="Acme Web Platform"
                            data-testid="cp-name"
                        />
                    </Field>
                    <Field label="Key (2-10 chars, e.g. ACME)">
                        <input
                            required
                            value={key}
                            onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                            className="brut-input font-mono"
                            placeholder="ACME"
                            data-testid="cp-key"
                        />
                    </Field>
                    <Field label="Description">
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="brut-input"
                            data-testid="cp-description"
                        />
                    </Field>
                    <Field label="Project lead">
                        <select
                            value={leadId}
                            onChange={(e) => setLeadId(e.target.value)}
                            className="brut-input"
                            data-testid="cp-lead"
                        >
                            <option value="">— Me —</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.email})
                                </option>
                            ))}
                        </select>
                    </Field>
                    {error && (
                        <div className="border border-[#E63946] bg-[#fff5f6] p-2 text-sm text-[#E63946]">{error}</div>
                    )}
                    <div className="flex gap-2 pt-2">
                        <button type="button" className="brut-btn flex-1 justify-center" data-variant="ghost" onClick={onClose} data-testid="cp-cancel">
                            Cancel
                        </button>
                        <button type="submit" disabled={busy} className="brut-btn flex-1 justify-center" data-variant="primary" data-testid="cp-submit">
                            {busy ? "Creating…" : "Create"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                {label}
            </label>
            {children}
        </div>
    );
}
