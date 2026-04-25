// Shared visual primitives
import { cn } from "@/lib/utils";

export function Avatar({ name, color = "#111", size = 28, testId }) {
    const initials = (name || "?")
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    return (
        <div
            data-testid={testId}
            className="inline-flex items-center justify-center font-mono font-semibold border border-[#111]"
            style={{
                width: size,
                height: size,
                background: color,
                color: "#fff",
                fontSize: size * 0.4,
            }}
            title={name}
        >
            {initials}
        </div>
    );
}

export function IssueTypeIcon({ type, size = 14 }) {
    const colors = { epic: "#FF6B00", story: "#00A86B", task: "#001AFF", bug: "#E63946" };
    const labels = { epic: "E", story: "S", task: "T", bug: "B" };
    return (
        <span
            className="inline-flex items-center justify-center font-mono font-bold"
            style={{
                width: size,
                height: size,
                background: colors[type] || "#111",
                color: "#fff",
                fontSize: size * 0.7,
                lineHeight: 1,
            }}
        >
            {labels[type] || "?"}
        </span>
    );
}

export function PriorityIcon({ priority, size = 12 }) {
    const map = {
        highest: { color: "#E63946", label: "↑↑" },
        high: { color: "#FF6B00", label: "↑" },
        medium: { color: "#555", label: "=" },
        low: { color: "#0E7C66", label: "↓" },
        lowest: { color: "#00A86B", label: "↓↓" },
    };
    const cfg = map[priority] || map.medium;
    return (
        <span
            className="font-mono font-bold"
            style={{ color: cfg.color, fontSize: size }}
            title={priority}
        >
            {cfg.label}
        </span>
    );
}

export function StatusBadge({ status }) {
    const labels = {
        backlog: "BACKLOG",
        todo: "TO DO",
        in_progress: "IN PROGRESS",
        review: "REVIEW",
        done: "DONE",
    };
    const colors = {
        backlog: "bg-white",
        todo: "bg-white",
        in_progress: "bg-[#FFD600]",
        review: "bg-[#001AFF] text-white",
        done: "bg-[#00A86B] text-white",
    };
    return (
        <span className={cn("brut-badge", colors[status])}>{labels[status] || status}</span>
    );
}
