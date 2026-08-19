'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const routeKeyRef = useRef('');

  useEffect(() => {
    const routeKey = `${pathname}?${searchParams?.toString() ?? ''}`;
    if (!routeKeyRef.current) {
      routeKeyRef.current = routeKey;
      return;
    }
    if (routeKey === routeKeyRef.current) return;
    routeKeyRef.current = routeKey;

    setVisible(true);
    setProgress(12);

    const step1 = window.setTimeout(() => setProgress(38), 60);
    const step2 = window.setTimeout(() => setProgress(62), 160);
    const step3 = window.setTimeout(() => setProgress(84), 320);
    const finish = window.setTimeout(() => {
      setProgress(100);
      window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }, 480);

    return () => {
      window.clearTimeout(step1);
      window.clearTimeout(step2);
      window.clearTimeout(step3);
      window.clearTimeout(finish);
    };
  }, [pathname, searchParams]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] h-0.5 pointer-events-none overflow-hidden bg-border"
      aria-hidden
    >
      <div
        className="h-full bg-primary transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <RouteProgressBar />
    </Suspense>
  );
}
