import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const { completed } = z.object({ completed: z.boolean() }).parse(await request.json()); const { id } = await params; const c = await db(); await c.execute({ sql: "UPDATE subtasks SET completed=? WHERE id=?", args: [Number(completed), id] }); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: "Не удалось обновить шаг." }, { status: 400 }); } }
