import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lightning } from "@phosphor-icons/react";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const res = await login(email, password);
        setBusy(false);
        if (res.ok) navigate("/");
        else setError(res.error);
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left panel: brutal grid + branding */}
            <div className="hidden lg:flex flex-col border-r border-[#111] dot-grid relative">
                <div className="absolute inset-0 bg-[#F4F4F0]/60" />
                <div className="relative z-10 p-12 flex flex-col h-full">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#001AFF] flex items-center justify-center">
                            <Lightning size={22} weight="fill" color="#fff" />
                        </div>
                        <div className="font-display font-black text-2xl tracking-tighter">
                            TASKFORGE
                        </div>
                    </div>
                    <div className="mt-auto">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-[#555] mb-3">
                            // PROJECT MANAGEMENT, REFORGED
                        </div>
                        <h1 className="font-display font-black text-6xl leading-[0.95] tracking-tighter">
                            Plan.<br />
                            Ship.<br />
                            <span className="bg-[#001AFF] text-white px-2">Repeat.</span>
                        </h1>
                        <p className="mt-6 max-w-md text-[#333]">
                            A brutalist take on Jira. Sprints, kanban, backlogs, issues —
                            engineered for technical teams who hate fluff.
                        </p>
                        <div className="mt-12 grid grid-cols-3 border border-[#111] bg-white">
                            <Stat label="Issue Types" value="04" />
                            <Stat label="Statuses" value="05" border />
                            <Stat label="Priorities" value="05" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right panel: form */}
            <div className="flex items-center justify-center p-6 lg:p-12 bg-white">
                <div className="w-full max-w-md">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                        // STEP 01 — AUTHENTICATE
                    </div>
                    <h2 className="font-display font-black text-4xl tracking-tighter mt-2">
                        Sign in
                    </h2>
                    <p className="text-[#555] mt-2 text-sm">
                        Use your TaskForge credentials.
                    </p>

                    <form onSubmit={onSubmit} className="mt-8 space-y-4" data-testid="login-form">
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="brut-input"
                                data-testid="login-email"
                                placeholder="you@team.dev"
                            />
                        </div>
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="brut-input"
                                data-testid="login-password"
                                placeholder="••••••••"
                            />
                        </div>
                        {error && (
                            <div
                                data-testid="login-error"
                                className="border border-[#E63946] bg-[#fff5f6] p-3 text-sm text-[#E63946]"
                            >
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={busy}
                            className="brut-btn w-full justify-center"
                            data-variant="primary"
                            data-testid="login-submit"
                        >
                            {busy ? "Authenticating…" : "Sign in →"}
                        </button>
                    </form>

                    <div className="mt-6 font-mono text-xs">
                        New here?{" "}
                        <Link to="/register" className="underline" data-testid="goto-register">
                            Create account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, border }) {
    return (
        <div className={`p-4 ${border ? "border-x border-[#111]" : ""}`}>
            <div className="font-display font-black text-3xl tracking-tighter">{value}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#555] mt-1">
                {label}
            </div>
        </div>
    );
}
