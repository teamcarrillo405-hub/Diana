/** The class owns the library view; assignment files retain their original ownership. */
export function materialDestination(assignmentId:string,classId:string|null,sourceId?:string):string {
  const base=classId
    ? `/classes/${encodeURIComponent(classId)}/materials/${encodeURIComponent(assignmentId)}`
    : `/study/material/${encodeURIComponent(assignmentId)}`;
  return base+(sourceId?`?source=${encodeURIComponent(sourceId)}`:"");
}

export function originalMaterialUrl(assignmentId: string, sourceId: string) {
  return `/api/materials/source?assignmentId=${encodeURIComponent(assignmentId)}&sourceId=${encodeURIComponent(sourceId)}`;
}

export function isOriginalMaterialType(mime: string | null | undefined): mime is string {
  return mime === "application/pdf" || mime === "image/png" || mime === "image/jpeg" || mime === "image/webp" || mime === "image/gif";
}
