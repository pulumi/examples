export default {
    async fetch(request, env) {
        await env.DB.prepare(
            "CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, visited_at TEXT)",
        ).run();
        await env.DB.prepare("INSERT INTO visits (visited_at) VALUES (?1)")
            .bind(new Date().toISOString())
            .run();
        const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM visits").first();
        return new Response("Hello, world! This page has been visited " + row.count + " times.");
    },
};
