import { BodyDoubleUi } from "./body-double-ui";

export default function BodyDoublePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-display">Focus together</h1>
        <p className="text-sm text-muted">
          A calm shared space. Someone else is focusing right now too.
        </p>
      </header>
      <BodyDoubleUi />
    </div>
  );
}
