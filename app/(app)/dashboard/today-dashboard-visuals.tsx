export function HomeworkProgressGauge({
  percent,
  completed,
  total,
}: {
  percent: number;
  completed: number;
  total: number;
}) {
  const normalizedPercent = Math.max(0, Math.min(100, Math.round(percent)));
  const segmentCount = Math.max(1, Math.min(12, total || 5));
  const filledSegmentCount = total > 12
    ? Math.round((normalizedPercent / 100) * segmentCount)
    : Math.min(segmentCount, Math.max(0, completed));
  const factualContext = total > 0
    ? `${completed} of ${total} assignments complete`
    : "No assignments due this week";

  return (
    <div
      className="today-homework-progress"
      role="img"
      aria-label={`${normalizedPercent}% complete this week. ${factualContext}`}
    >
      <div className="today-homework-progress-heading">
        <span>This Week</span>
      </div>
      <div className="today-homework-progress-meter" aria-hidden="true">
        <div
          className="today-homework-progress-track"
          style={{ gridTemplateColumns: `repeat(${segmentCount}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: segmentCount }, (_, index) => (
            <span
              key={index}
              data-complete={index < filledSegmentCount || undefined}
            />
          ))}
        </div>
        <strong>{normalizedPercent}%</strong>
      </div>
      <span className="today-homework-progress-caption">
        {factualContext}
      </span>
    </div>
  );
}
