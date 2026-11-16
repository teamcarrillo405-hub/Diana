"use client";

import { Plus } from "lucide-react";
import { CampusLobby } from "@/components/dashboard/today-dashboard";
import type { TodayData } from "@/lib/dashboard/today-view";
import navigation from "@/components/screen-design/student-navigation.module.css";
import preview from "./preview.module.css";

// Fictional values only; no session or student records are accessed.
const sampleData: TodayData = {
  plan: [{
    id: "sample-1", title: "Linear equations practice set", subject: "Algebra I",
    color: "#77c892", minutes: 35, due: "Tomorrow", date: "Nov 19", day: "19",
    month: "NOV", ready: false, href: "/assignments/sample-1/workspace",
  }],
  deadlines: [], earlierWork: [], otherReady: [],
  subjects: [
    { name: "English", color: "#a9ddb8", minutes: 75 },
    { name: "Algebra", color: "#77c892", minutes: 50 },
    { name: "Biology", color: "#d1e8d7", minutes: 35 },
  ],
  weekRecords: [
    { id: "sample-3", title: "Cell structure notes", subject: "Biology", status: "Submitted", timing: "Submitted Wed, Nov 18", href: "/assignments/sample-3" },
    { id: "sample-1", title: "Linear equations practice set", subject: "Algebra", status: "In progress", timing: "Due Thu, Nov 19", href: "/assignments/sample-1" },
    { id: "sample-2", title: "Identity quote response", subject: "English", status: "Marked done", timing: "Due Fri, Nov 20", href: "/assignments/sample-2" },
  ],
  total: 6, finished: 3, submitted: 2, sessions: 4,
  planned: [30, 45, 35, 25, 0, 0, 0], studied: [25, 35, 30, 20, 0, 0, 0],
  currentDay: 3, today: "2026-11-19", dateLabel: "Thursday, Nov 19",
  weekLabel: "Nov 16 - Nov 22", horizonLabel: "Thursday, Nov 26",
  assignmentsUnavailable: false, weeklyUnavailable: false, studyUnavailable: false, submissionsUnavailable: false,
};
const tigard = { name: "Tigard High School", primaryColor: "#086224", secondaryColor: "#000000" };
const tigardLogo = "/assets/school-examples/tigard-t-mark.jpg";

/** Sample actions never navigate to account routes. */
export function LobbyPreviewContent() {
  return <>
    <div className={preview.notice} role="note">Lobby design preview · Sample data · Read-only · Tigard High School</div>
    <CampusLobby data={sampleData} schoolBranding={tigard} preview={{ logo: tigardLogo }} navigation={
      <header className={navigation.navigation} data-student-navigation>
        <a className={navigation.brand} aria-label="Diana Lobby"><img src="/screendesign/brand/diana-logo-tight-no-shadow.png" alt="Diana" width="140" height="46" /><span className={navigation.campusWordmark} aria-hidden="true">Diana</span></a>
        <nav aria-label="Sample navigation">{["Lobby", "Work", "Classes", "Calendar", "More"].map(label => <a key={label} aria-current={label === "Lobby" ? "page" : undefined}>{label}</a>)}</nav>
        <div className={navigation.actions}><a className={navigation.add}><Plus size={18} aria-hidden="true" /><span>Add</span></a><a className={navigation.account} aria-label="Sample student"><span aria-hidden="true">S</span></a></div>
      </header>
    } />
  </>;
}
