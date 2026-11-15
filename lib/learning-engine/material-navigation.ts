/** The class owns the library view; assignment files retain their original ownership. */
export function materialDestination(assignmentId:string,classId:string|null,sourceId?:string):string {
  const base=classId
    ? `/classes/${encodeURIComponent(classId)}/materials/${encodeURIComponent(assignmentId)}`
    : `/study/material/${encodeURIComponent(assignmentId)}`;
  return base+(sourceId?`?source=${encodeURIComponent(sourceId)}`:"");
}
