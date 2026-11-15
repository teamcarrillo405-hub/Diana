import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell/student-shell";
import { SelectionCollection } from "@/components/student-shell/selection-collection";
import styles from "@/components/student-shell/collection.module.css";
export default async function CapturesPage() {
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user) redirect("/login");
 const {data,error}=await supabase.from("inbox_items").select("id,raw,created_at").eq("owner_id",user.id).in("status",["unclassified","classified"]).order("created_at",{ascending:false});
 return <StudentShell active="Work"><main id="main-content" className={styles.main}><header className={styles.heading}><h1>Captured work</h1><Link href="/assignments">Back to Work</Link></header>
 {error ? <p role="status">Captured work could not load. <Link href="/assignments/captures">Try again</Link></p> : <SelectionCollection label="Captured work" items={(data??[]).map(item=>({id:item.id,title:item.raw.replace(/^\[Grayson demo\]\s*/iu, "").slice(0,65)+(item.raw.length>65?"…":""),meta:"Needs details",content:<><p className={styles.muted}>{item.raw}</p><div className={styles.actions}><Link className={styles.primary} href={`/assignments/captures/${item.id}`}>Review capture</Link></div></>}))} empty={<p>No captures waiting for review.</p>} />}
 </main></StudentShell>;
}
