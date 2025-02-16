import { useState } from 'react';
import { useData } from '@/contexts/DataContext';

export default function Sidebar() {
  const { layers, toggleLayer, yearFilter, setYearFilter } = useData();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterType, setFilterType] = useState<'single' | 'range'>(yearFilter.type);

  // Update filter type and apply changes immediately
  const handleFilterTypeChange = (type: 'single' | 'range') => {
    setFilterType(type);
    setYearFilter({
      type,
      minYear: type === 'single' ? yearFilter.minYear : yearFilter.minYear,
      maxYear: type === 'single' ? yearFilter.minYear : yearFilter.maxYear
    });
  };

  const showYearFilter = layers.some(layer => layer.visible && layer.id === 'microplastics');

  return (
    <div className={`mt-16 m-5 fixed w-fit text-white text-sm sm:text-md bg-black/40 backdrop-blur-md rounded-lg shadow-md z-50 transition-all ease-in-out ${isCollapsed ? 'p-1' : 'p-4'}`}>
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
          <div className="flex flex-col gap-3">
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

            {showYearFilter && (
              <>
                <div className="flex w-full rounded-lg overflow-hidden bg-black/20">
                  <button
                    className={`flex-1 p-1 transition-colors ${filterType === 'range' ? 'bg-black/40' : 'hover:bg-black/30'}`}
                    onClick={() => handleFilterTypeChange('range')}
                  >
                    Range
                  </button>
                  <button
                    className={`flex-1 p-1 transition-colors ${filterType === 'single' ? 'bg-black/40' : 'hover:bg-black/30'}`}
                    onClick={() => handleFilterTypeChange('single')}
                  >
                    Year
                  </button>
                </div>

                {filterType === 'single' ? (
                  <div className="flex flex-col gap-1">
                    <label htmlFor="year">Year</label>
                    <input
                      type="number"
                      id="year"
                      value={yearFilter.minYear}
                      onChange={(e) => setYearFilter({
                        type: 'single',
                        minYear: Number(e.target.value),
                        maxYear: Number(e.target.value)
                      })}
                      className="w-full px-2 py-0.5 rounded-md bg-black/20 border-0 ring-primary"
                    />
                  </div>
                ) : (
                  <div className="flex flex-row justify-between gap-1">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="minYear">Min</label>
                      <input
                        type="number"
                        id="minYear"
                        value={yearFilter.minYear}
                        onChange={(e) => setYearFilter({
                          type: 'range',
                          minYear: Number(e.target.value),
                          maxYear: yearFilter.maxYear
                        })}
                        className="w-20 px-2 py-0.5 rounded-md bg-black/20 border-0 ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="maxYear">Max</label>
                      <input
                        type="number"
                        id="maxYear"
                        value={yearFilter.maxYear}
                        onChange={(e) => setYearFilter({
                          type: 'range',
                          minYear: yearFilter.minYear,
                          maxYear: Number(e.target.value)
                        })}
                        className="w-20 px-2 py-0.5 rounded-md bg-black/20 border-0 ring-primary"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
