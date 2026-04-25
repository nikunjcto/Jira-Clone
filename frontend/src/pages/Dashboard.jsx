import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Plus, FolderSimple, ArrowRight } from "@phosphor-icons/react";
import CreateProjectDialog from "@/components/dialogs/CreateProjectDialog";

export default function Dashboard() {
    const { user } = useAuth();
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

    const totalIssues = projects.reduce((s, p) => s + (p.issue_count || 0), 0);

    return (
        <div className="p-8" data-testid="dashboard-page">
            <div className="flex items-end justify-between gap-6 border-b border-[#111] pb-6">
                <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                        // {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                    </div>
                    <h1 className="font-display font-black text-5xl tracking-tighter mt-1">
                        Hello, {user?.name?.split(" ")[0] || "Builder"}.
                    </h1>
                    <p className="text-[#555] mt-2 max-w-xl">
                        Your workspace. Spin up a project, draft sprints, and ship.
                    </p>
                </div>
                <button
                    className="brut-btn"
                    data-variant="primary"
                    onClick={() => setShowCreate(true)}
                    data-testid="dashboard-create-project"
                >
                    <Plus size={14} weight="bold" /> New Project
                </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 mt-8 border border-[#111] bg-white">
                <Stat label="Projects" value={projects.length} />
                <Stat label="Issues" value={totalIssues} bordered />
                <Stat label="Team" value={users.length} />
            </div>

            {/* Projects grid */}
            <div className="mt-10">
                <div className="flex items-baseline justify-between border-b border-[#111] pb-2 mb-4">
                    <h2 className="font-display font-black text-2xl tracking-tighter">
                        Projects
                    </h2>
                    <Link to="/projects" className="font-mono text-[11px] uppercase tracking-widest underline" data-testid="see-all-projects">
                        See all →
                    </Link>
                </div>
                {projects.length === 0 ? (
                    <EmptyProjects onCreate={() => setShowCreate(true)} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#111] bg-white">
                        {projects.slice(0, 9).map((p, i) => (
                            <ProjectCard key={p.id} project={p} index={i} />
                        ))}
                    </div>
                )}
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

function Stat({ label, value, bordered }) {
    return (
        <div className={`p-6 ${bordered ? "border-x border-[#111]" : ""}`}>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                {label}
            </div>
            <div className="font-display font-black text-5xl tracking-tighter mt-1">
                {String(value).padStart(2, "0")}
            </div>
        </div>
    );
}

function ProjectCard({ project, index }) {
    return (
        <Link
            to={`/projects/${project.id}/board`}
            data-testid={`project-card-${project.key}`}
            className="group block p-5 border-r border-b border-[#111] hover:bg-[#F4F4F0] transition-colors relative"
        >
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#001AFF] text-white flex items-center justify-center font-mono text-[11px] font-bold">
                    {project.key}
                </div>
                <span className="brut-badge">PRJ_{String(index + 1).padStart(3, "0")}</span>
            </div>
            <div className="font-display font-bold text-xl tracking-tight mt-3">
                {project.name}
            </div>
            <p className="text-sm text-[#555] mt-1 line-clamp-2 min-h-[2.5em]">
                {project.description || "—"}
            </p>
            <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                    {project.issue_count || 0} issues
                </span>
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </Link>
    );
}

function EmptyProjects({ onCreate }) {
    return (
        <div className="border border-[#111] bg-white p-12 text-center" data-testid="empty-projects">
            <div className="inline-flex items-center justify-center w-16 h-16 border border-[#111] mb-4">
                <FolderSimple size={28} />
            </div>
            <div className="font-display font-black text-2xl tracking-tighter">
                No projects yet
            </div>
            <p className="text-[#555] mt-2 max-w-sm mx-auto">
                Create your first project to start tracking issues, sprints, and velocity.
            </p>
            <button onClick={onCreate} className="brut-btn mt-6" data-variant="primary" data-testid="empty-create-project">
                <Plus size={14} weight="bold" /> Create Project
            </button>
        </div>
    );
}
