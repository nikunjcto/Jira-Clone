import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/Visuals";
import { useState } from "react";
import api from "@/lib/api";
import {
    SquaresFour,
    FolderSimple,
    Users,
    MagnifyingGlass,
    SignOut,
    Lightning,
} from "@phosphor-icons/react";

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState("");

    const onSearch = (e) => {
        e.preventDefault();
        if (search.trim()) {
            navigate(`/search?q=${encodeURIComponent(search.trim())}`);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#F4F4F0]">
            {/* Sidebar */}
            <aside className="w-60 shrink-0 border-r border-[#111] bg-white flex flex-col">
                <div className="px-5 py-5 border-b border-[#111] flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#001AFF] flex items-center justify-center">
                        <Lightning size={18} weight="fill" color="#fff" />
                    </div>
                    <div>
                        <div className="font-display font-black text-lg tracking-tighter leading-none">
                            TASKFORGE
                        </div>
                        <div className="font-mono text-[9px] uppercase tracking-widest text-[#555]">
                            v1.0 / brutalist
                        </div>
                    </div>
                </div>

                <nav className="flex flex-col py-3" data-testid="main-nav">
                    <SidebarLink to="/" icon={<SquaresFour size={16} />} testId="nav-dashboard">
                        Dashboard
                    </SidebarLink>
                    <SidebarLink to="/projects" icon={<FolderSimple size={16} />} testId="nav-projects">
                        Projects
                    </SidebarLink>
                    <SidebarLink to="/team" icon={<Users size={16} />} testId="nav-team">
                        Team
                    </SidebarLink>
                </nav>

                <div className="mt-auto border-t border-[#111] px-4 py-3 flex items-center gap-3">
                    <Avatar
                        name={user?.name || user?.email}
                        color={user?.avatar_color || "#001AFF"}
                        size={32}
                        testId="user-avatar"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" data-testid="user-name">
                            {user?.name || user?.email}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                            {user?.role}
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="border border-[#111] p-1.5 hover:bg-[#111] hover:text-white transition-colors"
                        data-testid="logout-btn"
                        title="Sign out"
                    >
                        <SignOut size={14} />
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="border-b border-[#111] bg-white px-6 py-3 flex items-center gap-4">
                    <form onSubmit={onSearch} className="flex-1 flex items-center gap-2 max-w-xl">
                        <div className="flex items-center gap-2 flex-1 border border-[#111] bg-white px-3 py-2 focus-within:shadow-[2px_2px_0_0_#001AFF]">
                            <MagnifyingGlass size={16} />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search issues, projects, keys (e.g. PRJ-12)…"
                                className="flex-1 bg-transparent outline-none text-sm"
                                data-testid="global-search-input"
                            />
                        </div>
                    </form>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                        {new Date().toISOString().slice(0, 10)} · {user?.email}
                    </div>
                </header>
                <main className="flex-1 overflow-auto">{children}</main>
            </div>
        </div>
    );
}

function SidebarLink({ to, icon, children, testId }) {
    return (
        <NavLink
            to={to}
            end={to === "/"}
            data-testid={testId}
            className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm border-l-4 ${
                    isActive
                        ? "bg-[#111] text-white border-[#001AFF] font-semibold"
                        : "border-transparent hover:bg-[#F4F4F0]"
                }`
            }
        >
            {icon}
            <span>{children}</span>
        </NavLink>
    );
}
