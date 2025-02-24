'use client';

import Map from '@/components/Map';
import Sidebar from '@/components/Sidebar';
import { DataProvider } from '@/contexts/DataContext'
import { SimulationProvider } from '@/contexts/SimulationContext'

export default function Home() {
  return (
    <DataProvider>
      <SimulationProvider>
        <main className="z-10 w-full h-screen">
          <Sidebar />
          <Map />
        </main>
      </SimulationProvider>
    </DataProvider>
  );
}
