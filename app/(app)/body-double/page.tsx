import { BodyDoubleUi } from "./body-double-ui";
import { AppTopNav } from "../app-top-nav";

export default function BodyDoublePage() {
  return (
    <>
      <AppTopNav active="Work" />
      <div className="diana-page space-y-6">
        <header className="space-y-1">
          <h1 className="text-display">Focus together</h1>
          <p className="text-sm text-muted">
            A calm shared space. Someone else is focusing right now too.
          </p>
        </header>
        <BodyDoubleUi />
      </div>
    </>
  );
}
