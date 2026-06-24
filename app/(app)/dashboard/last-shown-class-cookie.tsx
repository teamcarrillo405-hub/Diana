"use client";

import { useEffect } from "react";

const classIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function LastShownClassCookie({ classId }: { classId: string | null }) {
  useEffect(() => {
    if (!classIdPattern.test(classId ?? "")) return;
    document.cookie = `diana_last_class=${encodeURIComponent(classId!)}; Path=/; Max-Age=43200; SameSite=Lax`;
  }, [classId]);

  return null;
}
