import { useEffect, useState } from "react";

type Status = { kind: "loading" } | { kind: "ok"; n: number } | { kind: "error"; message: string };

export default function App() {
    const [status, setStatus] = useState<Status>({ kind: "loading" });

    useEffect(() => {
        fetch("/api/random")
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}`);
                }
                const data = (await response.json()) as { n: number };
                setStatus({ kind: "ok", n: data.n });
            })
            .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : String(err);
                setStatus({ kind: "error", message });
            });
    }, []);

    return (
        <main
            style={{
                fontFamily: "system-ui, sans-serif",
                maxWidth: 640,
                margin: "5rem auto",
                padding: "0 1rem",
                lineHeight: 1.6,
            }}
        >
            <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Serverless React + Postgres</h1>
            <p style={{ color: "#555" }}>A React SPA talking to a serverless API that queries Postgres.</p>
            <section
                style={{
                    marginTop: "2rem",
                    padding: "1.5rem",
                    borderRadius: "0.75rem",
                    background: "#f3f0ff",
                    border: "1px solid #dcd5f7",
                }}
            >
                {status.kind === "loading" && <p>Asking the backend for a random number&hellip;</p>}
                {status.kind === "ok" && (
                    <p style={{ fontSize: "1.25rem", margin: 0 }}>
                        Backend says your lucky number is: <strong>{status.n}</strong>
                    </p>
                )}
                {status.kind === "error" && <p style={{ color: "#b91c1c" }}>Backend error: {status.message}</p>}
            </section>
        </main>
    );
}
