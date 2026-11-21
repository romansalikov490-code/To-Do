import { NextResponse } from "next/server";
import { db, listTasks } from "@/lib/db";
import { decompose } from "@/lib/gemini";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const c = await db();
    const task = await c.execute({ sql: "SELECT title FROM tasks WHERE id=?", args: [id] });
    if (!task.rows.length) return NextResponse.json({ error: "Задача не найдена." }, { status: 404 });
    const existing = await c.execute({ sql: "SELECT id FROM subtasks WHERE task_id=? LIMIT 1", args: [id] });
    if (existing.rows.length) return NextResponse.json({ error: "Шаги уже созданы." }, { status: 409 });
    const steps = await decompose(String(task.rows[0].title));
    const tx = await c.transaction("write");
    try {
      const current = await tx.execute({ sql: "SELECT id FROM tasks WHERE id=? AND NOT EXISTS (SELECT 1 FROM subtasks WHERE task_id=?)", args: [id, id] });
      if (!current.rows.length) { await tx.rollback(); return NextResponse.json({ error: "Задача удалена или шаги уже созданы." }, { status: 409 }); }
      for (const step of steps) await tx.execute({ sql: "INSERT INTO subtasks (id,task_id,title,minutes) VALUES (?,?,?,?)", args: [crypto.randomUUID(), id, step.title, step.minutes] });
      await tx.commit();
    } catch (e) { await tx.rollback(); throw e; } finally { tx.close(); }
    return NextResponse.json(await listTasks());
  } catch (e) { console.error(e); return NextResponse.json({ error: e instanceof Error ? e.message : "Не удалось создать шаги." }, { status: 500 }); }
}
