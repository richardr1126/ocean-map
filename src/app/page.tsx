'use client';

import Map from '@/components/Map';
import Sidebar from '@/components/Sidebar';
import { DataProvider } from '@/contexts/DataContext';

export default function Home() {
  return (
    <DataProvider>
      <main className="z-10 w-full h-screen">
        <Sidebar />
        <Map />
      </main>
    </DataProvider>
  );
}
