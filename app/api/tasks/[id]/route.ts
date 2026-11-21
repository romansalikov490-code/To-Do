import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try { const { id } = await params; const data = z.object({ completed: z.boolean().optional(), quadrant: z.enum(["do", "schedule", "delegate", "eliminate"]).optional() }).refine(x => x.completed !== undefined || x.quadrant !== undefined).parse(await request.json()); const c = await db(); const changes = []; if (data.completed !== undefined) changes.push({ sql: "UPDATE tasks SET completed=? WHERE id=?", args: [Number(data.completed), id] }); if (data.quadrant !== undefined) changes.push({ sql: "UPDATE tasks SET quadrant=? WHERE id=?", args: [data.quadrant, id] }); await c.batch(changes, "write"); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: "Не удалось обновить задачу." }, { status: 400 }); }
}
export async function DELETE(_: Request, { params }: Context) {
  try { const { id } = await params; const c = await db(); await c.batch([{ sql: "DELETE FROM subtasks WHERE task_id=?", args: [id] }, { sql: "DELETE FROM tasks WHERE id=?", args: [id] }], "write"); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: "Не удалось удалить задачу." }, { status: 500 }); }
}
