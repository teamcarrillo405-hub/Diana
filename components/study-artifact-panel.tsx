"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { generateStudyArtifact } from "@/app/(app)/study-artifacts/actions";
import type { StudyArtifactSourceType } from "@/lib/study-helper/artifacts";
import type { StudyHelperMode } from "@/lib/study-helper/modes";
import styles from "@/components/student-shell/collection.module.css";

export function StudyArtifactPanel({sourceType,sourceId}:{sourceType:StudyArtifactSourceType;sourceId:string;aiMode:"red"|"yellow"|"green";studyMode:StudyHelperMode}) {
  const [pending,startTransition]=useTransition();
  const [status,setStatus]=useState("");
  const [guideId,setGuideId]=useState<string|null>(null);
  function createGuide(){startTransition(async()=>{setStatus("");const result=await generateStudyArtifact({sourceType,sourceId,artifactType:"study_guide",studyMode:"guided_steps"});if(!result.ok){setStatus(result.error);return;}setGuideId(result.id);setStatus("Guide saved.");});}
  return <section aria-label="Practice tools"><h2>Practice</h2><div className={styles.actions}><Link className={styles.primary} href={`/study?source=${sourceType}:${sourceId}`}>Create quiz</Link>{guideId ? <Link href={`/study-artifacts/${guideId}`}>Open guide</Link> : <button type="button" disabled={pending} onClick={createGuide}>{pending ? "Creating guide" : "Create guide"}</button>}</div>{status ? <p role="status">{status}</p> : null}</section>;
}
