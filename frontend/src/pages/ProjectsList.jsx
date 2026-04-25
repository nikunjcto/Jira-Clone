import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { Plus } from "@phosphor-icons/react";
import CreateProjectDialog from "@/components/dialogs/CreateProjectDialog";

export default function ProjectsList() {
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [showCreate, setShowCreate] = useState(false);

    const load = async () => {
        const [p, u] = await Promise.all([api.get("/projects"), api.get("/users")]);
        setProjects(p.data);
        setUsers(u.data);
    };
    useEffect(() => {
        load();
    }, []);

    return (
        <div className="p-8" data-testid="projects-page">
            <div className="flex items-end justify-between border-b border-[#111] pb-6">
                <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                        // ALL WORKSPACES
                    </div>
                    <h1 className="font-display font-black text-5xl tracking-tighter mt-1">
                        Projects
                    </h1>
                </div>
                <button
                    className="brut-btn"
                    data-variant="primary"
                    onClick={() => setShowCreate(true)}
                    data-testid="projects-create-btn"
                >
                    <Plus size={14} weight="bold" /> New
                </button>
            </div>

            <div className="mt-8 border border-[#111] bg-white">
                <div className="grid grid-cols-12 font-mono text-[10px] uppercase tracking-widest text-[#555] border-b border-[#111] bg-[#F4F4F0]">
                    <div className="col-span-1 p-3 border-r border-[#111]">Key</div>
                    <div className="col-span-4 p-3 border-r border-[#111]">Name</div>
                    <div className="col-span-5 p-3 border-r border-[#111]">Description</div>
                    <div className="col-span-2 p-3">Issues</div>
                </div>
                {projects.length === 0 && (
                    <div className="p-8 text-center text-[#555]">No projects yet.</div>
                )}
                {projects.map((p) => (
                    <Link
                        key={p.id}
                        to={`/projects/${p.id}/board`}
                        data-testid={`project-row-${p.key}`}
                        className="grid grid-cols-12 border-b border-[#111] last:border-b-0 hover:bg-[#F4F4F0] transition-colors"
                    >
                        <div className="col-span-1 p-3 border-r border-[#111] font-mono font-bold text-[#001AFF]">
                            {p.key}
                        </div>
                        <div className="col-span-4 p-3 border-r border-[#111] font-semibold">
                            {p.name}
                        </div>
                        <div className="col-span-5 p-3 border-r border-[#111] text-sm text-[#555] truncate">
                            {p.description || "—"}
                        </div>
                        <div className="col-span-2 p-3 font-mono text-sm">{p.issue_count || 0}</div>
                    </Link>
                ))}
            </div>

            <CreateProjectDialog
                open={showCreate}
                onClose={() => setShowCreate(false)}
                onCreated={() => {
                    setShowCreate(false);
                    load();
                }}
                users={users}
            />
        </div>
    );
}
