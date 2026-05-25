"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Source = { id: string; name: string; sourceType: string };

export function ImportContentForm({ sources }: { sources: Source[] }) {
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [format, setFormat] = useState<"generic" | "staar" | "sat">("generic");
  const [json, setJson] = useState("[]");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const items = JSON.parse(json);
    const res = await fetch("/api/admin/content-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, format, items }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Import failed");
      return;
    }
    setMessage(`Imported batch ${data.batchId} (${data.itemCount} items) → review queue`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <label className="block text-sm">
        Source
        <select
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
        >
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.sourceType})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Format
        <select
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={format}
          onChange={(e) => setFormat(e.target.value as typeof format)}
        >
          <option value="generic">Generic JSON</option>
          <option value="staar">TEA STAAR structure</option>
          <option value="sat">SAT official-style import</option>
        </select>
      </label>
      <label className="block text-sm">
        Items JSON
        <textarea
          className="mt-1 w-full rounded-xl border px-3 py-2 font-mono text-xs min-h-[220px]"
          value={json}
          onChange={(e) => setJson(e.target.value)}
        />
      </label>
      <Button type="submit">Import to review queue</Button>
      {message && <p className="text-sm text-slate-700">{message}</p>}
    </form>
  );
}
