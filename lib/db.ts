import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;
let initialized: Promise<void> | undefined;

export async function db() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("Укажите TURSO_DATABASE_URL в .env.local");
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  const current = client;
  if (!initialized) initialized = (async () => {
    await current.batch([
      "CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT, quadrant TEXT NOT NULL, reason TEXT, deadline TEXT, completed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS subtasks (id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, title TEXT NOT NULL, minutes INTEGER NOT NULL, completed INTEGER NOT NULL DEFAULT 0)",
      "CREATE INDEX IF NOT EXISTS subtasks_task_id ON subtasks(task_id)"
    ], "write");
  })().catch(error => { initialized = undefined; throw error; });
  await initialized;
  return current;
}

export async function listTasks() {
  const c = await db();
  const [tasks, steps] = await Promise.all([c.execute("SELECT * FROM tasks ORDER BY created_at DESC, rowid DESC"), c.execute("SELECT * FROM subtasks ORDER BY rowid")]);
  return tasks.rows.map(t => ({ id: String(t.id), title: String(t.title), quadrant: String(t.quadrant), category: t.category, reason: t.reason, deadline: t.deadline, completed: Boolean(t.completed), subtasks: steps.rows.filter(s => s.task_id === t.id).map(s => ({ id: String(s.id), title: String(s.title), minutes: Number(s.minutes), completed: Boolean(s.completed) })) }));
}
