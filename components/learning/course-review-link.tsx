"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export function CourseReviewLink(){
  const [allowed,setAllowed]=useState(false);
  useEffect(()=>{const controller=new AbortController();fetch("/api/learning/course-review?access=1",{signal:controller.signal,cache:"no-store"}).then(async response=>{const body=await response.json();if(!controller.signal.aborted)setAllowed(response.ok&&!!body.profile?.roles?.length);}).catch(()=>{});return ()=>controller.abort();},[]);
  return allowed?<Link href="/settings/course-review">Course review</Link>:null;
}
