import { useEffect, useState, useCallback } from "react";
import { useParams, NavLink, Outlet } from "react-router-dom";
import api from "@/lib/api";
import { Plus, GearSix, Kanban, ListChecks, ListBullets } from "@phosphor-icons/react";
import CreateIssueDialog from "@/components/dialogs/CreateIssueDialog";

export default function ProjectShell() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [users, setUsers] = useState([]);
    const [sprints, setSprints] = useState([]);
    const [issues, setIssues] = useState([]);
    const [showCreate, setShowCreate] = useState(false);

    const loadProject = useCallback(async () => {
        const { data } = await api.get(`/projects/${id}`);
        setProject(data);
    }, [id]);

    const loadIssues = useCallback(async () => {
        const { data } = await api.get(`/projects/${id}/issues`);
        setIssues(data);
    }, [id]);

    const loadSprints = useCallback(async () => {
        const { data } = await api.get(`/projects/${id}/sprints`);
        setSprints(data);
    }, [id]);

    const loadUsers = useCallback(async () => {
        const { data } = await api.get(`/users`);
        setUsers(data);
    }, []);

    useEffect(() => {
        loadProject();
        loadIssues();
        loadSprints();
        loadUsers();
    }, [loadProject, loadIssues, loadSprints, loadUsers]);

    if (!project) {
        return <div className="p-8 font-mono text-sm">Loading project…</div>;
    }

    const ctx = {
        project,
        users,
        sprints,
        issues,
        reload: () => Promise.all([loadIssues(), loadSprints(), loadProject()]),
        reloadIssues: loadIssues,
        reloadSprints: loadSprints,
    };

    return (
        <div className="flex flex-col h-full" data-testid="project-shell">
            <div className="border-b border-[#111] bg-white px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-[#001AFF] text-white flex items-center justify-center font-mono font-bold text-sm">
                    {project.key}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                        // PROJECT / {project.key}
                    </div>
                    <h1 className="font-display font-black text-2xl tracking-tighter truncate" data-testid="project-name">
                        {project.name}
                    </h1>
                </div>
                <button
                    className="brut-btn"
                    data-variant="primary"
                    onClick={() => setShowCreate(true)}
                    data-testid="create-issue-btn"
                >
                    <Plus size={14} weight="bold" /> New Issue
                </button>
            </div>

            <div className="border-b border-[#111] bg-[#F4F4F0] px-6 flex">
                <Tab to={`/projects/${id}/board`} icon={<Kanban size={14} />} label="Board" testId="tab-board" />
                <Tab to={`/projects/${id}/backlog`} icon={<ListBullets size={14} />} label="Backlog" testId="tab-backlog" />
                <Tab to={`/projects/${id}/issues`} icon={<ListChecks size={14} />} label="Issues" testId="tab-issues" />
                <Tab to={`/projects/${id}/settings`} icon={<GearSix size={14} />} label="Settings" testId="tab-settings" />
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
                <Outlet context={ctx} />
            </div>

            <CreateIssueDialog
                open={showCreate}
                onClose={() => setShowCreate(false)}
                project={project}
                users={users}
                sprints={sprints}
                issues={issues}
                onCreated={() => {
                    setShowCreate(false);
                    loadIssues();
                }}
            />
        </div>
    );
}

function Tab({ to, icon, label, testId }) {
    return (
        <NavLink
            to={to}
            data-testid={testId}
            className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 font-mono text-[11px] uppercase tracking-widest border-r border-[#111] ${
                    isActive ? "bg-[#111] text-white" : "hover:bg-white"
                }`
            }
        >
            {icon} {label}
        </NavLink>
    );
}
