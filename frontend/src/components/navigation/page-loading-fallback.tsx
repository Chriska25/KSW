interface PageLoadingFallbackProps {
  variant?: 'public' | 'admin' | 'client';
}

export function PageLoadingFallback({ variant = 'public' }: PageLoadingFallbackProps) {
  if (variant === 'admin') {
    return (
      <div className="animate-pulse space-y-6 max-w-6xl">
        <div className="h-9 w-56 rounded-lg bg-zinc-800/80" />
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="h-28 rounded-2xl bg-zinc-900/80 border border-zinc-800" />
          <div className="h-28 rounded-2xl bg-zinc-900/80 border border-zinc-800" />
          <div className="h-28 rounded-2xl bg-zinc-900/80 border border-zinc-800" />
        </div>
        <div className="h-72 rounded-2xl bg-zinc-900/60 border border-zinc-800" />
      </div>
    );
  }

  if (variant === 'client') {
    return (
      <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
        <div className="h-9 w-48 rounded-lg bg-zinc-800/80" />
        <div className="h-40 rounded-2xl bg-zinc-900/80 border border-zinc-800" />
        <div className="h-52 rounded-2xl bg-zinc-900/60 border border-zinc-800" />
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="h-6 w-40 bg-zinc-800 rounded-full mx-auto" />
          <div className="h-10 w-3/4 max-w-md bg-zinc-800 rounded-xl mx-auto" />
          <div className="h-4 w-2/3 max-w-sm bg-zinc-900 rounded-lg mx-auto" />
        </div>
        <div className="h-64 rounded-2xl bg-zinc-900/70 border border-zinc-800" />
      </div>
    </div>
  );
}
