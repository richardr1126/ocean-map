import { useState } from 'react';
import { useData } from '@/contexts/DataContext';

export default function Sidebar() {
  const { layers, toggleLayer, yearFilter, setYearFilter } = useData();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Update filter type and apply changes immediately
  const handleFilterTypeChange = (type: 'single' | 'range') => {
    setYearFilter({
      type,
      minYear: yearFilter.minYear,
      maxYear: yearFilter.maxYear
    });
  };

  // Only show year filter if microplastics layer is visible
  const showYearFilter = layers.some(layer => layer.visible && layer.id === 'microplastics');

  return (
    <div className={`mt-16 m-5 fixed w-fit text-foreground font-medium text-sm sm:text-md bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-lg shadow-md z-50 transition-all ease-in-out ${isCollapsed ? 'p-1' : 'p-4'}`}>
      <div className={`flex flex-row justify-between items-center ${isCollapsed ? 'm-0 mx-1' : 'mb-2'}`}>
        <svg
          className={`w-5 h-5 ${isCollapsed ? 'text-sm' : 'text-md'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-black/20 rounded-full transition-transform"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {layers.map(layer => (
                <div key={layer.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={layer.id}
                    checked={layer.visible}
                    onChange={() => toggleLayer(layer.id)}
                    className="w-4 h-4 text-primary"
                  />
                  <label htmlFor={layer.id} className="flex items-center gap-2">
                    <span className="w-3 h-3 inline-block rounded-full" style={{ backgroundColor: layer.color }}></span>
                    {layer.name}
                  </label>
                </div>
              ))}
            </div>

            {showYearFilter && (
              <div className="flex flex-col gap-2">
                <div className="flex w-full rounded-lg overflow-hidden bg-white/30 dark:bg-black/20 font-semibold">
                  <button
                    className={`flex-1 p-0.5 transition-colors ${yearFilter.type === 'range' ? 'bg-white/30 dark:bg-black/20' : 'hover:bg-white/20 dark:hover:bg-black/10'}`}
                    onClick={() => handleFilterTypeChange('range')}
                  >
                    Range
                  </button>
                  <button
                    className={`flex-1 p-0.5 transition-colors ${yearFilter.type === 'single' ? 'bg-white/30 dark:bg-black/20' : 'hover:bg-white/20 dark:hover:bg-black/10'}`}
                    onClick={() => handleFilterTypeChange('single')}
                  >
                    Year
                  </button>
                </div>

                {yearFilter.type === 'single' ? (
                  <div className="flex flex-col gap-1 self-end">
                    <label htmlFor="year" className='hidden'>Year</label>
                    <input
                      type="number"
                      id="year"
                      value={yearFilter.minYear}
                      onChange={(e) => setYearFilter({
                        type: 'single',
                        minYear: Number(e.target.value),
                        maxYear: Number(e.target.value)
                      })}
                      className="w-20 px-2 py-0.5 rounded-md border-0 ring-primary bg-white/60 dark:bg-black/20"
                    />
                  </div>
                ) : (
                  <div className="flex flex-row justify-between gap-1">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="minYear" className='hidden'>Min</label>
                      <input
                        type="number"
                        id="minYear"
                        value={yearFilter.minYear}
                        onChange={(e) => setYearFilter({
                          type: 'range',
                          minYear: Number(e.target.value),
                          maxYear: yearFilter.maxYear
                        })}
                        className="w-20 px-2 py-0.5 rounded-md bg-white/60 dark:bg-black/20 border-0 ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="maxYear" className='hidden'>Max</label>
                      <input
                        type="number"
                        id="maxYear"
                        value={yearFilter.maxYear}
                        onChange={(e) => setYearFilter({
                          type: 'range',
                          minYear: yearFilter.minYear,
                          maxYear: Number(e.target.value)
                        })}
                        className="w-20 px-2 py-0.5 rounded-md bg-white/60 dark:bg-black/20 border-0 ring-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
