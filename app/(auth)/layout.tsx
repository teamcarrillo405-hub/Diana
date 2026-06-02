export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh w-full overflow-x-hidden bg-surface px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-md min-w-0 flex-col justify-center">
        {children}
      </div>
    </main>
  );
}
