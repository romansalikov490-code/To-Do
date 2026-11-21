import "server-only";
import { z } from "zod";

const task = z.object({ title: z.string().trim().min(1).max(200), category: z.string().trim().min(1).max(60), quadrant: z.enum(["do", "schedule", "delegate", "eliminate"]), reason: z.string().trim().min(1).refine(s => s.split(/\s+/).length <= 7), deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() });
const tasks = z.object({ tasks: z.array(task).min(1).max(30) });
const steps = z.object({ steps: z.array(z.object({ title: z.string().trim().min(1).max(200), minutes: z.number().int().min(1).max(1440) })).min(3).max(5) });
const taskSchema = { type: "object", properties: { tasks: { type: "array", items: { type: "object", properties: { title: { type: "string" }, category: { type: "string" }, quadrant: { type: "string", enum: ["do", "schedule", "delegate", "eliminate"] }, reason: { type: "string" }, deadline: { type: ["string", "null"] } }, required: ["title", "category", "quadrant", "reason", "deadline"] } } }, required: ["tasks"] };
const stepSchema = { type: "object", properties: { steps: { type: "array", items: { type: "object", properties: { title: { type: "string" }, minutes: { type: "integer" } }, required: ["title", "minutes"] } } }, required: ["steps"] };

async function generate(prompt: string, schema: object) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Укажите GEMINI_API_KEY в .env.local");
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema } }), cache: "no-store", signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Ошибка Gemini API (${response.status}). Проверьте ключ и доступ к модели.`);
  const data = await response.json();
  const result = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("");
  if (!result) throw new Error("Gemini не вернул результат. Попробуйте ещё раз.");
  try { return JSON.parse(result); } catch { throw new Error("Gemini вернул некорректный ответ. Попробуйте ещё раз."); }
}
export async function parseTasks(text: string, today: string) {
  const output = await generate(`Сегодня ${today}. Извлеки из пользовательского текста отдельные задачи. Названия и категории на русском. quadrant: do — срочно и важно, schedule — важно и не срочно, delegate — срочно и не важно, eliminate — не срочно и не важно. reason — причина приоритета, не более 7 слов. deadline — дата YYYY-MM-DD, или null если срок неизвестен. Не выдумывай срок. Пользовательский текст: ${text}`, taskSchema);
  return tasks.parse(output).tasks;
}
export async function decompose(title: string) {
  return steps.parse(await generate(`Разбей задачу на 3–5 конкретных последовательных действий на русском. Для каждого укажи оценку времени в минутах. Задача: ${title}`, stepSchema)).steps;
}
