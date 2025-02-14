'use client';

import Map from '@/components/Map';
import { Sidebar } from '@/components/Sidebar';
import { useState } from 'react';

export default function Home() {
  const [showMicroplastics, setShowMicroplastics] = useState(true);
  const [showVessels, setShowVessels] = useState(false);
  const [yearFilter, setYearFilter] = useState<{
    type: 'single' | 'range';
    minYear: number;
    maxYear: number;
  }>({ type: 'single', minYear: 2020, maxYear: 2020 });

  return (
    <main className="z-10 w-full h-[calc(100vh-64px)] flex">
      <Sidebar 
        showMicroplastics={showMicroplastics}
        onToggleMicroplastics={setShowMicroplastics}
        showVessels={showVessels}
        onToggleVessels={setShowVessels}
        onYearFilterChange={setYearFilter}
      />
      <div className="flex-1">
        <Map 
          showMicroplastics={showMicroplastics}
          showVessels={showVessels}
          yearFilter={yearFilter}
        />
      </div>
    </main>
  );
}
