"use client";

import { useEffect, useState } from "react";
import { taskSwitchMessage } from "@/lib/executive/session";

type LastTask = {
  assignmentId: string;
  classId: string | null;
  title: string;
};

const KEY = "diana:last-task-context";

export function TaskSwitchCue({
  assignmentId,
  classId,
  title,
}: {
  assignmentId: string;
  classId: string | null;
  title: string;
}) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const previous = raw ? JSON.parse(raw) as LastTask : null;
      if (
        previous &&
        previous.assignmentId !== assignmentId &&
        previous.classId &&
        classId &&
        previous.classId !== classId
      ) {
        setMessage(taskSwitchMessage(previous.title, title));
      }
      window.localStorage.setItem(KEY, JSON.stringify({ assignmentId, classId, title }));
    } catch {
      window.localStorage.setItem(KEY, JSON.stringify({ assignmentId, classId, title }));
    }
  }, [assignmentId, classId, title]);

  if (!message) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 text-sm">
      <p className="font-medium">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMessage(null)}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
        >
          Stay here
        </button>
        <button
          type="button"
          onClick={() => setMessage(null)}
          className="rounded-md border border-border px-3 py-2 text-sm"
        >
          Keep going
        </button>
      </div>
    </section>
  );
}
