'use client';

import { useEffect, useState } from 'react';

export default function Year() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  // suppressHydrationWarning: server renders nothing, client fills the year in.
  return <span suppressHydrationWarning>{year ?? ''}</span>;
}
