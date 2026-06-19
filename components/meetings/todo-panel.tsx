"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Clock, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Database } from "@/types/database";

type Todo   = Database["public"]["Tables"]["todo_items"]["Row"] & {
  assignee: { full_name: string } | null;
};
type Member = { id: string; full_name: string };

interface TodoPanelProps {
  meetingId: string;
  todos:     Todo[];
  members:   Member[];
  canWrite:  boolean;
}

function fmtDate(d: string | null) {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

export function TodoPanel({ meetingId, todos, members, canWrite }: TodoPanelProps) {
  const router = useRouter();
  const [adding, setAdding]  = useState(false);
  const [text, setText]      = useState("");
  const [assignTo, setAssign] = useState("");
  const [dueDate, setDue]    = useState("");
  const [loading, setLoading] = useState(false);

  async function addTodo() {
    if (!text.trim()) return;
    setLoading(true);
    await createClient().from("todo_items").insert({
      meeting_id:  meetingId,
      text:        text.trim(),
      assigned_to: assignTo || null,
      due_date:    dueDate  || null,
      status:      "acik",
    });
    setText(""); setAssign(""); setDue(""); setAdding(false); setLoading(false);
    router.refresh();
  }

  async function toggleTodo(id: string, current: "acik" | "tamamlandi") {
    await createClient().from("todo_items").update({ status: current === "acik" ? "tamamlandi" : "acik" }).eq("id", id);
    router.refresh();
  }

  async function deleteTodo(id: string) {
    await createClient().from("todo_items").delete().eq("id", id);
    router.refresh();
  }

  const open   = todos.filter((t) => t.status === "acik");
  const closed = todos.filter((t) => t.status === "tamamlandi");

  return (
    <div className="space-y-3">
      {/* Open todos */}
      {open.length > 0 && (
        <ul className="space-y-1">
          {open.map((todo) => {
            const overdue = todo.due_date && new Date(todo.due_date) < new Date();
            return (
              <li key={todo.id} className="flex items-start gap-3 group">
                <button onClick={() => toggleTodo(todo.id, todo.status)} className="mt-0.5 shrink-0 h-5 w-5 rounded border-2 border-gray-300 hover:border-blue-500 flex items-center justify-center transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{todo.text}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {todo.assignee && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <User className="h-3 w-3" />{todo.assignee.full_name}
                      </span>
                    )}
                    {todo.due_date && (
                      <span className={`text-xs flex items-center gap-1 ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                        <Clock className="h-3 w-3" />{fmtDate(todo.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                {canWrite && (
                  <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-xs text-gray-300 hover:text-red-500 transition-all shrink-0">×</button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Closed todos */}
      {closed.length > 0 && (
        <details className="text-xs text-gray-400 cursor-pointer">
          <summary className="select-none hover:text-gray-600">{closed.length} tamamlanan</summary>
          <ul className="space-y-1 mt-2">
            {closed.map((todo) => (
              <li key={todo.id} className="flex items-start gap-3 group">
                <button onClick={() => toggleTodo(todo.id, todo.status)} className="mt-0.5 shrink-0 h-5 w-5 rounded border-2 border-green-400 bg-green-400 flex items-center justify-center transition-colors">
                  <Check className="h-3 w-3 text-white" />
                </button>
                <p className="text-sm text-gray-400 line-through">{todo.text}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {open.length === 0 && closed.length === 0 && (
        <p className="text-sm text-gray-400 italic">Henüz todo yok.</p>
      )}

      {/* Add form */}
      {canWrite && (
        adding ? (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Todo metni..." autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTodo(); } if (e.key === "Escape") setAdding(false); }}
            />
            <div className="flex gap-2">
              <Select value={assignTo} onChange={(e) => setAssign(e.target.value)} className="flex-1">
                <option value="">Kişi seçin...</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </Select>
              <Input type="date" value={dueDate} onChange={(e) => setDue(e.target.value)} className="w-36" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setAdding(false)} className="text-xs h-7 px-2">İptal</Button>
              <Button type="button" onClick={addTodo} disabled={loading || !text.trim()} className="text-xs h-7 px-2">Ekle</Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Todo ekle
          </button>
        )
      )}
    </div>
  );
}
