import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lightning } from "@phosphor-icons/react";

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const res = await register(name, email, password);
        setBusy(false);
        if (res.ok) navigate("/");
        else setError(res.error);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 dot-grid">
            <div className="w-full max-w-md brut-card p-8 hard-shadow bg-white">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-[#001AFF] flex items-center justify-center">
                        <Lightning size={18} weight="fill" color="#fff" />
                    </div>
                    <div className="font-display font-black text-xl tracking-tighter">
                        TASKFORGE
                    </div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
                    // CREATE WORKSPACE ACCOUNT
                </div>
                <h2 className="font-display font-black text-3xl tracking-tighter mt-1">
                    Register
                </h2>

                <form onSubmit={onSubmit} className="mt-6 space-y-3" data-testid="register-form">
                    <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                            Full name
                        </label>
                        <input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="brut-input"
                            data-testid="register-name"
                        />
                    </div>
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
                            data-testid="register-email"
                        />
                    </div>
                    <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest block mb-1.5">
                            Password (min 6)
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="brut-input"
                            data-testid="register-password"
                        />
                    </div>
                    {error && (
                        <div className="border border-[#E63946] bg-[#fff5f6] p-3 text-sm text-[#E63946]" data-testid="register-error">
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={busy}
                        data-variant="primary"
                        className="brut-btn w-full justify-center"
                        data-testid="register-submit"
                    >
                        {busy ? "Creating…" : "Create account →"}
                    </button>
                </form>
                <div className="mt-6 font-mono text-xs">
                    Already have one?{" "}
                    <Link to="/login" className="underline" data-testid="goto-login">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
