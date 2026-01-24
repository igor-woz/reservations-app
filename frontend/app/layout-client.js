'use client';

import Header from '@/components/Header';
import { useState, useEffect } from 'react';

export default function RootLayoutClient({ children }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <>
      <Header />
      <main className="container">
        {children}
      </main>
    </>
  );
}