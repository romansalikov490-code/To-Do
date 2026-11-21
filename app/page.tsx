"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, CircleHelp, GripVertical, ListTodo, Mic, Plus, Sparkles, Trash2, X } from "lucide-react";

type Quadrant = "do" | "schedule" | "delegate" | "eliminate";
type Subtask = { id: string; title: string; minutes: number; completed: boolean };
type Task = { id: string; title: string; quadrant: Quadrant; completed: boolean; category?: string | null; deadline?: string | null; reason?: string | null; subtasks: Subtask[] };
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type RecognitionWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const columns: { id: Quadrant; title: string; subtitle: string; icon: string; color: string; background: string }[] = [
  { id: "do", title: "Срочно и важно", subtitle: "Сделать в первую очередь", icon: "✳", color: "#f0a8cc", background: "#4b2d45" },
  { id: "schedule", title: "Важно, не срочно", subtitle: "Запланировать время", icon: "◷", color: "#d4b2f4", background: "#413150" },
  { id: "delegate", title: "Срочно, не важно", subtitle: "Делегировать или упростить", icon: "↗", color: "#b7b8f5", background: "#343452" },
  { id: "eliminate", title: "Не срочно и не важно", subtitle: "Отложить или исключить", icon: "◌", color: "#bbaacb", background: "#38303f" },
];
const storageKey = "plan-tasks-v1";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stepBusy, setStepBusy] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [listening, setListening] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [adding, setAdding] = useState<Quadrant | null>(null);
  const [newTitle, setNewTitle] = useState("");
  async function request(url: string, method = "GET", body?: unknown) { const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Ошибка запроса"); return result; }
  async function refresh() { setTasks(await request("/api/tasks")); }
  useEffect(() => { (async () => { try { await refresh(); const stored = localStorage.getItem(storageKey); if (stored) { const old = JSON.parse(stored); if (Array.isArray(old) && old.length) { setTasks(await request("/api/tasks", "POST", { action: "import", tasks: old })); setNotice("Задачи из браузера перенесены в базу данных."); } localStorage.removeItem(storageKey); } } catch (e) { setNotice(e instanceof Error ? e.message : "Не удалось загрузить задачи."); } finally { setLoaded(true); } })(); }, []);
  const done = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
  const progress = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const update = async (id: string, changes: Partial<Task>) => { try { await request(`/api/tasks/${id}`, "PATCH", changes); await refresh(); } catch (e) { setNotice(e instanceof Error ? e.message : "Ошибка обновления."); } };
  const add = async (quadrant: Quadrant) => { if (!newTitle.trim()) return; try { setTasks(await request("/api/tasks", "POST", { action: "add", title: newTitle.trim(), quadrant })); setNewTitle(""); setAdding(null); } catch (e) { setNotice(e instanceof Error ? e.message : "Ошибка добавления."); } };
  const remove = async (id: string) => { try { await request(`/api/tasks/${id}`, "DELETE"); await refresh(); } catch (e) { setNotice(e instanceof Error ? e.message : "Ошибка удаления."); } };
  const parse = async () => { if (!text.trim()) { setNotice("Сначала опишите ваши задачи."); return; } setBusy(true); setNotice(""); try { const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; setTasks(await request("/api/tasks", "POST", { action: "parse", text, today })); setText(""); } catch (e) { setNotice(e instanceof Error ? e.message : "Не удалось разобрать задачи."); } finally { setBusy(false); } };
  const makeSteps = async (id: string) => { setStepBusy(id); setNotice(""); try { setTasks(await request(`/api/tasks/${id}/steps`, "POST")); } catch (e) { setNotice(e instanceof Error ? e.message : "Не удалось создать шаги."); } finally { setStepBusy(null); } };
  const toggleStep = async (step: Subtask) => { try { await request(`/api/steps/${step.id}`, "PATCH", { completed: !step.completed }); await refresh(); } catch (e) { setNotice(e instanceof Error ? e.message : "Ошибка обновления шага."); } };
  const startVoice = () => {
    const ctor = (window as RecognitionWindow).SpeechRecognition || (window as RecognitionWindow).webkitSpeechRecognition;
    if (!ctor) { setNotice("Ваш браузер не поддерживает голосовой ввод. Попробуйте Chrome или Edge."); return; }
    const recognition = new ctor(); recognition.lang = "ru-RU"; recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = event => { const transcript = Array.from(event.results).map(result => result[0].transcript).join(" "); setText(previous => [previous.trim(), transcript].filter(Boolean).join(" ")); };
    recognition.onerror = () => { setNotice("Не удалось распознать речь. Проверьте доступ к микрофону."); setListening(false); };
    recognition.onend = () => setListening(false);
    try { recognition.start(); setListening(true); } catch { setNotice("Не удалось запустить микрофон."); }
  };
  return <main className="min-h-screen">
    <header className="topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark"><Check size={17} strokeWidth={3}/></span><span>план<span className="brand-dot">.</span></span><span className="brand-divider"/><span className="brand-caption">пространство для важных дел</span></div><div className="top-progress"><span className="progress-label">Ваш прогресс</span><div className="progress-track"><span style={{width:`${progress}%`}}/></div><b>{done} <span>/ {tasks.length}</span></b></div></div></header>
    <div className="page-shell"><div className="intro"><div><div className="eyebrow"><Sparkles size={14}/> ВАШ ЛИЧНЫЙ ПЛАНИРОВЩИК</div><h1>Меньше хаоса.<br/><span>Больше ясности.</span></h1><p>Освободите голову от задач — мы поможем<br className="desktop-break"/> расставить всё по своим местам.</p></div><div className="intro-aside"><span>ПРОСТРАНСТВО ФОКУСА</span><strong>Один шаг<br/>за другим <span>✳</span></strong></div></div>
    <section className="input-panel"><div className="input-heading"><div className="input-icon"><Sparkles size={18}/></div><div><h2>Что у вас на уме?</h2><p>Запишите всё как есть — порядок наведём вместе.</p></div></div><div className="input-wrap"><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Например: подготовить отчёт к пятнице, записаться к врачу и не забыть позвонить маме..." aria-label="Текст задач"/><button className={`mic ${listening ? "active" : ""}`} onClick={startVoice} disabled={listening} aria-label="Голосовой ввод" title="Голосовой ввод"><Mic size={19}/></button></div><div className="input-bottom"><span><Sparkles size={14}/> {listening ? "Слушаю вас…" : "Можно написать несколько задач сразу"}</span><button className="primary" onClick={parse} disabled={busy || !loaded}><Sparkles size={16}/> {busy ? "Разбираем…" : "Разобрать с ИИ"}</button></div></section>
    {notice && <div className="notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Закрыть"><X size={16}/></button></div>}
    <section className="matrix-section"><div className="matrix-heading"><div><div className="section-kicker">ВАШИ ПРИОРИТЕТЫ</div><h2>Матрица задач <span>{tasks.length}</span></h2><p>Сосредоточьтесь на том, что действительно важно.</p></div><div className="matrix-hint"><GripVertical size={16}/> Перетаскивайте задачи между блоками</div></div>
    <div className="matrix">{columns.map(col => { const items = tasks.filter(t=>t.quadrant===col.id); return <section key={col.id} className="quadrant" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); if(dragging) update(dragging,{quadrant:col.id}); setDragging(null);}}><div className="quadrant-header"><div className="quadrant-title"><span className="quadrant-icon" style={{color:col.color,background:col.background}}>{col.icon}</span><div><h3>{col.title}</h3><p>{col.subtitle}</p></div></div><span className="count">{items.length}</span></div><div className="cards">{items.map(task=><article className={`task-card ${task.completed ? "completed" : ""}`} key={task.id} draggable onDragStart={()=>setDragging(task.id)} onDragEnd={()=>setDragging(null)}><div className="task-main"><button className={`checkbox ${task.completed ? "checked" : ""}`} onClick={()=>update(task.id,{completed:!task.completed})} aria-label={task.completed ? "Отметить невыполненной" : "Отметить выполненной"}>{task.completed && <Check size={13}/>}</button><div className="task-content"><div className="task-name">{task.title}</div>{(task.category || task.reason || task.deadline) && <div className="task-meta">{task.category && <span>{task.category}</span>}{task.reason && <span>✦ {task.reason}</span>}{task.deadline && <span>{task.deadline}</span>}</div>}</div><button className="icon-button delete" aria-label="Удалить задачу" onClick={()=>remove(task.id)}><Trash2 size={15}/></button></div><div className="steps">{task.subtasks?.map(step=><label key={step.id} className={step.completed ? "step done" : "step"}><input type="checkbox" checked={step.completed} onChange={()=>toggleStep(step)}/><span>{step.title}</span><small>{step.minutes} мин</small></label>)}</div><div className="task-actions"><button disabled={!!stepBusy || !!task.subtasks?.length} onClick={()=>makeSteps(task.id)}><Sparkles size={13}/> {stepBusy===task.id ? "Создаём шаги…" : task.subtasks?.length ? "Шаги созданы" : "Разбить на шаги"}</button><label className="move-label"><span className="sr-only">Переместить задачу</span><select value={task.quadrant} onChange={e=>update(task.id,{quadrant:e.target.value as Quadrant})}>{columns.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><ChevronDown size={13}/></label></div></article>)}{!items.length && <div className="empty"><div className="empty-icon"><ListTodo size={19}/></div><span>Здесь пока ничего нет</span><small>Добавьте задачу или перетащите сюда</small></div>}</div>{adding===col.id ? <form className="add-form" onSubmit={e=>{e.preventDefault();add(col.id)}}><input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Название задачи" aria-label="Название задачи"/><button type="submit">Добавить</button><button type="button" aria-label="Отменить" onClick={()=>{setAdding(null);setNewTitle("")}}><X size={16}/></button></form> : <button className="add-button" onClick={()=>{setAdding(col.id);setNewTitle("")}}><Plus size={16}/> Добавить задачу</button>}</section>})}</div></section>
    <footer><span><CircleHelp size={15}/> Матрица Эйзенхауэра помогает отделить важное от срочного</span><span>Сделано для ясной головы <span className="footer-star">✳</span></span></footer></div>
  </main>;
}
