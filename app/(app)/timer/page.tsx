import { TimerUi } from "./timer-ui";

export default function TimerPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Focus session</h1>
        <p className="text-sm text-muted">
          Pick your work block and a reward. Start when you&apos;re ready.
        </p>
      </header>
      <TimerUi />
    </div>
  );
}
