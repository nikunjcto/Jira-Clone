import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { IssueTypeIcon, PriorityIcon, StatusBadge } from "@/components/Visuals";

export default function Search() {
    const [params] = useSearchParams();
    const q = params.get("q") || "";
    const [data, setData] = useState({ issues: [], projects: [] });

    useEffect(() => {
        if (!q) return;
        api.get(`/search?q=${encodeURIComponent(q)}`).then((r) => setData(r.data));
    }, [q]);

    return (
        <div className="p-8" data-testid="search-page">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">// SEARCH RESULTS FOR</div>
            <h1 className="font-display font-black text-4xl tracking-tighter mt-1">"{q}"</h1>

            <h2 className="font-display font-bold text-xl tracking-tight mt-8 border-b border-[#111] pb-2">
                Projects ({data.projects.length})
            </h2>
            <div className="border border-[#111] bg-white mt-4">
                {data.projects.length === 0 && <div className="p-4 text-sm text-[#555]">No project matches.</div>}
                {data.projects.map((p) => (
                    <Link key={p.id} to={`/projects/${p.id}/board`} className="grid grid-cols-12 border-b border-[#111] last:border-b-0 hover:bg-[#F4F4F0]" data-testid={`search-project-${p.key}`}>
                        <div className="col-span-2 p-2 border-r border-[#111] font-mono font-bold text-[#001AFF]">{p.key}</div>
                        <div className="col-span-10 p-2">{p.name}</div>
                    </Link>
                ))}
            </div>

            <h2 className="font-display font-bold text-xl tracking-tight mt-8 border-b border-[#111] pb-2">
                Issues ({data.issues.length})
            </h2>
            <div className="border border-[#111] bg-white mt-4">
                {data.issues.length === 0 && <div className="p-4 text-sm text-[#555]">No issue matches.</div>}
                {data.issues.map((i) => (
                    <Link key={i.id} to={`/projects/${i.project_id}/issues`} className="grid grid-cols-12 items-center border-b border-[#111] last:border-b-0 hover:bg-[#F4F4F0]" data-testid={`search-issue-${i.key}`}>
                        <div className="col-span-1 p-2 border-r border-[#111]"><IssueTypeIcon type={i.type} /></div>
                        <div className="col-span-2 p-2 border-r border-[#111] font-mono font-bold text-[#001AFF]">{i.key}</div>
                        <div className="col-span-6 p-2 border-r border-[#111] truncate">{i.title}</div>
                        <div className="col-span-1 p-2 border-r border-[#111]"><PriorityIcon priority={i.priority} /></div>
                        <div className="col-span-2 p-2"><StatusBadge status={i.status} /></div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
