import { NextResponse } from "next/server";
import { z } from "zod";
import { db, listTasks } from "@/lib/db";
import { parseTasks } from "@/lib/gemini";

export const dynamic = "force-dynamic";
const quadrant = z.enum(["do", "schedule", "delegate", "eliminate"]);
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), title: z.string().trim().min(1).max(200), quadrant }),
  z.object({ action: z.literal("parse"), text: z.string().trim().min(1).max(10000), today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ action: z.literal("import"), tasks: z.array(z.object({ id: z.string().min(1).max(100), title: z.string().trim().min(1).max(200), quadrant, completed: z.boolean(), category: z.string().max(60).optional(), reason: z.string().max(200).optional(), deadline: z.string().optional() })).max(500) })
]);
function fail(error: unknown) { console.error(error); return NextResponse.json({ error: error instanceof z.ZodError ? "Некорректные данные запроса или ответа ИИ." : error instanceof Error ? error.message : "Ошибка сервера" }, { status: 500 }); }
export async function GET() { try { return NextResponse.json(await listTasks()); } catch (e) { return fail(e); } }
export async function POST(request: Request) {
  try {
    const data = input.parse(await request.json());
    const c = await db();
    const entries = data.action === "parse" ? (await parseTasks(data.text, data.today)).map(t => ({ ...t, id: crypto.randomUUID(), completed: false })) : data.action === "add" ? [{ id: crypto.randomUUID(), title: data.title, quadrant: data.quadrant, category: null, reason: null, deadline: null, completed: false }] : data.tasks;
    if (entries.length) await c.batch(entries.map(t => ({ sql: "INSERT OR IGNORE INTO tasks (id,title,quadrant,category,reason,deadline,completed,created_at) VALUES (?,?,?,?,?,?,?,?)", args: [t.id, t.title, t.quadrant, t.category ?? null, t.reason ?? null, t.deadline ?? null, Number(t.completed), new Date().toISOString()] })), "write");
    return NextResponse.json(await listTasks());
  } catch (e) { return fail(e); }
}
