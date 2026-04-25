import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Trash } from "@phosphor-icons/react";

export default function ProjectSettings() {
    const { project, users, reload } = useOutletContext();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description || "");
    const [leadId, setLeadId] = useState(project.lead_id || "");
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        setName(project.name);
        setDescription(project.description || "");
        setLeadId(project.lead_id || "");
    }, [project]);

    const save = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await api.patch(`/projects/${project.id}`, { name, description, lead_id: leadId || null });
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
            reload();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail) || e.message);
        }
    };

    const remove = async () => {
        if (!confirm(`Delete project ${project.key}? This will permanently remove all issues and sprints.`)) return;
        try {
            await api.delete(`/projects/${project.id}`);
            navigate("/projects");
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail) || e.message);
        }
    };

    return (
        <div className="p-6 max-w-2xl" data-testid="settings-page">
            <h2 className="font-display font-black text-3xl tracking-tighter border-b border-[#111] pb-3">
                Project Settings
            </h2>

            <form onSubmit={save} className="mt-6 space-y-4 brut-card p-5">
                <Field label="Key (immutable)">
                    <input className="brut-input bg-[#F4F4F0] font-mono" value={project.key} disabled />
                </Field>
                <Field label="Name">
                    <input className="brut-input" value={name} onChange={(e) => setName(e.target.value)} data-testid="settings-name" />
                </Field>
                <Field label="Description">
                    <textarea rows={3} className="brut-input" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="settings-description" />
                </Field>
                <Field label="Lead">
                    <select className="brut-input" value={leadId} onChange={(e) => setLeadId(e.target.value)} data-testid="settings-lead">
                        <option value="">— Unassigned —</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </Field>
                {error && <div className="border border-[#E63946] bg-[#fff5f6] p-2 text-sm text-[#E63946]">{error}</div>}
                <div className="flex gap-2">
                    <button className="brut-btn" data-variant="primary" data-testid="settings-save">
                        {saved ? "Saved ✓" : "Save changes"}
                    </button>
                </div>
            </form>

            {user.role === "admin" && (
                <div className="mt-8 border border-[#E63946] p-5">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#E63946]">// danger zone</div>
                    <div className="font-display font-black text-xl tracking-tighter mt-1">Delete project</div>
                    <p className="text-sm text-[#555] mt-1 mb-3">
                        This permanently deletes all issues, sprints and comments tied to {project.key}.
                    </p>
                    <button onClick={remove} className="brut-btn" data-variant="danger" data-testid="settings-delete">
                        <Trash size={14} /> Delete project
                    </button>
                </div>
            )}
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">{label}</label>
            {children}
        </div>
    );
}
