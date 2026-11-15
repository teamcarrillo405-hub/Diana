import { DianaWordmark } from "@/components/screen-design/primitives";
import styles from "@/components/student-shell/shared-report.module.css";
import type { ExternalScoutPortfolio } from "@/lib/sharing/types";
export function TeacherSnapshotView({portfolio}:{portfolio:ExternalScoutPortfolio}) {
 const expires = new Date(portfolio.expiresAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
 return <div className={styles.root}><main id="main-content" className={styles.paper}>
  <header><DianaWordmark tight tone="dark" /><p>Selected student work</p><h1>{portfolio.title}</h1>{portfolio.description ? <p>{portfolio.description}</p> : null}</header>
  <section><h2>{portfolio.items.length} work samples</h2>{portfolio.items.length ? portfolio.items.map(item=><details key={item.id}><summary>{item.title}</summary><p>{item.reflectionText || "No reflection included."}</p></details>) : <p>No work is included in this share.</p>}</section>
  <footer><p>Private link · Expires {expires}</p></footer>
 </main></div>;
}
