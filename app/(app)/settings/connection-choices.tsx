import Link from "next/link";
import type { ConnectionOption } from "./connection-options";

/** Canvas needs a school origin before its existing OAuth start route can run. */
export function ConnectionChoices({ options }: { options: readonly ConnectionOption[] }) {
  return <div className="sd-settings-connection-actions">{options.map(option => option.id === "canvas" ? <form key={option.id} className="sd-settings-canvas-connect" action={option.href} method="get">
    <label htmlFor="settings-canvas-school-address">Canvas school address</label>
    <div><input id="settings-canvas-school-address" name="base_url" type="url" required placeholder="https://school.instructure.com" aria-describedby="settings-canvas-help" /><button type="submit">{option.label}</button></div>
    <p id="settings-canvas-help">Use the Canvas address provided by your school.</p>
  </form> : <Link key={option.id} href={option.href}>{option.label}</Link>)}</div>;
}
