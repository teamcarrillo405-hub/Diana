/** Publisher-approved main-book chapters. The separate solutions manual is excluded. */
export const PRECALCULUS_BOOK={
  id:"lippman-rasmussen-precalculus-2.3",
  assetDirectory:"precalculus-2.3",
  title:"Precalculus: An Investigation of Functions",
  authors:"David Lippman & Melonie Rasmussen",edition:"2.3",
  publisherUrl:"https://www.opentextbookstore.com/precalc/",
  license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/",
  reviewedAt:"2026-09-25",trainingPermission:"excluded",
  chapters:[
    {number:1,title:"Functions",queries:["function domain range","composition inverse functions"]},
    {number:2,title:"Linear Functions",queries:["slope rate of change","absolute value functions"]},
    {number:3,title:"Polynomial and Rational Functions",queries:["polynomial zeros factors","rational functions asymptotes"]},
    {number:4,title:"Exponential and Logarithmic Functions",queries:["exponential growth decay","logarithmic properties"]},
    {number:5,title:"Trigonometric Functions of Angles",queries:["sine cosine circle","right triangle trigonometry"]},
    {number:6,title:"Periodic Functions",queries:["sinusoidal amplitude period","inverse trigonometric functions"]},
    {number:7,title:"Trigonometric Equations and Identities",queries:["trigonometric identities","double angle identities"]},
    {number:8,title:"Further Applications of Trigonometry",queries:["law of sines cosines","vectors dot product"]},
    {number:9,title:"Conics",queries:["ellipse hyperbola","parabola polar coordinates"]},
  ],
} as const;

export const PUBLIC_TEXTBOOK_SCOPE={ownerId:"00000000-0000-4000-8000-000000000001",assignmentId:"00000000-0000-4000-8000-000000000002",classId:null} as const;
export function textbookChapterUrl(number:number){
  if(!PRECALCULUS_BOOK.chapters.some(chapter=>chapter.number===number))throw new Error("Unknown textbook chapter.");
  return `${PRECALCULUS_BOOK.publisherUrl}current2.php?chapter=${number}&format=pdf`;
}
export function textbookAssetPath(number:number){
  if(!PRECALCULUS_BOOK.chapters.some(chapter=>chapter.number===number))throw new Error("Unknown textbook chapter.");
  return `/assets/textbooks/${PRECALCULUS_BOOK.assetDirectory}/chapter-${number}.pdf`;
}
