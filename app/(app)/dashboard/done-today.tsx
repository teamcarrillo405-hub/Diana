export function DoneToday({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <p className="text-sm text-ok font-medium">
      {count === 1 ? "1 thing done today." : `${count} things done today.`}
    </p>
  );
}
