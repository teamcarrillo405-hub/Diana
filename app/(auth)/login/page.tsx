import { Suspense } from "react";
import { LoginForm } from "./form";
export default function LoginPage() {
  return <Suspense fallback={<div role="status"><h1>Sign in</h1><p className="entry-description">Getting your sign-in form ready…</p></div>}><LoginForm /></Suspense>;
}
