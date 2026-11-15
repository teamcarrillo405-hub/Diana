/** Curated publisher links. Linking a resource does not index it or authorize model training. */
export const ALGEBRA_REFERENCE={
  id:"lippman-rasmussen-precalculus-2.3",title:"Precalculus: An Investigation of Functions",
  authors:"David Lippman & Melonie Rasmussen",edition:"2.3",url:"https://www.opentextbookstore.com/precalc/",
  license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/",
  checkedAt:"2026-09-25",trainingPermission:"excluded",
} as const;
export function classReferenceResources(className:string){
  return /\b(algebra|precalculus|pre-calculus)\b/i.test(className)?[ALGEBRA_REFERENCE]:[];
}
