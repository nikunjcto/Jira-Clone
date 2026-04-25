import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/Visuals";
import { Plus, Trash, ShieldCheck } from "@phosphor-icons/react";

export default function Team() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [showAdd, setShowAdd] = useState(false);

    const load = async () => {
        const { data } = await api.get("/users");
        setUsers(data);
    };
    useEffect(() => {
        load();
    }, []);

    const updateRole = async (id, role) => {
        await api.patch(`/users/${id}/role`, { role });
        load();
    };
    const remove = async (id) => {
        if (!confirm("Remove this team member?")) return;
        await api.delete(`/users/${id}`);
        load();
    };

    return (
        <div className="p-8" data-testid="team-page">
            <div className="flex items-end justify-between border-b border-[#111] pb-6">
                <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">// WORKSPACE PEOPLE</div>
                    <h1 className="font-display font-black text-5xl tracking-tighter mt-1">Team</h1>
                    <p className="text-[#555] mt-2">{users.length} member{users.length === 1 ? "" : "s"}</p>
                </div>
                {user.role === "admin" && (
                    <button onClick={() => setShowAdd(true)} className="brut-btn" data-variant="primary" data-testid="add-member-btn">
                        <Plus size={14} weight="bold" /> Add member
                    </button>
                )}
            </div>

            <div className="mt-8 border border-[#111] bg-white">
                <div className="grid grid-cols-12 font-mono text-[10px] uppercase tracking-widest text-[#555] border-b border-[#111] bg-[#F4F4F0]">
                    <div className="col-span-1 p-3 border-r border-[#111]"></div>
                    <div className="col-span-3 p-3 border-r border-[#111]">Name</div>
                    <div className="col-span-4 p-3 border-r border-[#111]">Email</div>
                    <div className="col-span-2 p-3 border-r border-[#111]">Role</div>
                    <div className="col-span-2 p-3">Actions</div>
                </div>
                {users.map((u) => (
                    <div key={u.id} className="grid grid-cols-12 items-center border-b border-[#111] last:border-b-0" data-testid={`team-row-${u.email}`}>
                        <div className="col-span-1 p-3 border-r border-[#111]">
                            <Avatar name={u.name} color={u.avatar_color} size={32} />
                        </div>
                        <div className="col-span-3 p-3 border-r border-[#111] font-semibold">{u.name}</div>
                        <div className="col-span-4 p-3 border-r border-[#111] text-sm font-mono">{u.email}</div>
                        <div className="col-span-2 p-3 border-r border-[#111]">
                            {user.role === "admin" && u.id !== user.id ? (
                                <select className="brut-input !py-1 !text-xs" value={u.role} onChange={(e) => updateRole(u.id, e.target.value)} data-testid={`role-select-${u.email}`}>
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>
                            ) : (
                                <span className="brut-badge inline-flex items-center gap-1">
                                    {u.role === "admin" && <ShieldCheck size={10} />} {u.role}
                                </span>
                            )}
                        </div>
                        <div className="col-span-2 p-3">
                            {user.role === "admin" && u.id !== user.id && (
                                <button onClick={() => remove(u.id)} className="border border-[#E63946] text-[#E63946] p-1.5 hover:bg-[#E63946] hover:text-white" data-testid={`remove-member-${u.email}`}>
                                    <Trash size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {showAdd && <AddMemberDialog onClose={() => setShowAdd(false)} onCreated={load} />}
        </div>
    );
}

function AddMemberDialog({ onClose, onCreated }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("member");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            await api.post("/users", { name, email, password, role });
            onCreated();
            onClose();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white border border-[#111] w-full max-w-md hard-shadow">
                <div className="border-b border-[#111] p-5">
                    <div className="font-display font-black text-2xl tracking-tighter">Add team member</div>
                </div>
                <form onSubmit={submit} className="p-5 space-y-3" data-testid="add-member-form">
                    <Field label="Full name">
                        <input required className="brut-input" value={name} onChange={(e) => setName(e.target.value)} data-testid="am-name" />
                    </Field>
                    <Field label="Email">
                        <input required type="email" className="brut-input" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="am-email" />
                    </Field>
                    <Field label="Initial password (≥6)">
                        <input required minLength={6} className="brut-input" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="am-password" />
                    </Field>
                    <Field label="Role">
                        <select className="brut-input" value={role} onChange={(e) => setRole(e.target.value)} data-testid="am-role">
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                        </select>
                    </Field>
                    {error && <div className="border border-[#E63946] bg-[#fff5f6] p-2 text-sm text-[#E63946]">{error}</div>}
                    <div className="flex gap-2 pt-2">
                        <button type="button" className="brut-btn flex-1 justify-center" data-variant="ghost" onClick={onClose}>Cancel</button>
                        <button disabled={busy} type="submit" className="brut-btn flex-1 justify-center" data-variant="primary" data-testid="am-submit">
                            {busy ? "Adding…" : "Add member"}
                        </button>
                    </div>
                </form>
            </div>
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
