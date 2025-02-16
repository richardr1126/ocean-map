import { useState } from 'react';

export default function Sidebar({
  showMicroplastics,
  onToggleMicroplastics,
  onYearFilterChange
}: {
  showMicroplastics: boolean;
  onToggleMicroplastics: (show: boolean) => void;
  onYearFilterChange?: (filter: { type: 'single' | 'range', minYear: number, maxYear: number }) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterType, setFilterType] = useState<'single' | 'range'>('single');
  const [singleYear, setSingleYear] = useState<number>(2020);
  const [minYear, setMinYear] = useState<number>(2015);
  const [maxYear, setMaxYear] = useState<number>(2023);

  const handleApply = () => {
    if (onYearFilterChange) {
      onYearFilterChange({
        type: filterType,
        minYear: filterType === 'single' ? singleYear : minYear,
        maxYear: filterType === 'single' ? singleYear : maxYear
      });
    }
  };

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
          <div className="flex flex-col gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showMicroplastics"
                checked={showMicroplastics}
                onChange={(e) => onToggleMicroplastics(e.target.checked)}
                className="w-4 h-4 text-primary"
              />
              <label htmlFor="showMicroplastics">Show Microplastics Data</label>
            </div>

            {showMicroplastics && (
              <>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="singleYear"
                      name="filterType"
                      checked={filterType === 'single'}
                      onChange={() => setFilterType('single')}
                      className="text-primary"
                    />
                    <label htmlFor="singleYear">Single Year</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="yearRange"
                      name="filterType"
                      checked={filterType === 'range'}
                      onChange={() => setFilterType('range')}
                      className="text-primary"
                    />
                    <label htmlFor="yearRange">Year Range</label>
                  </div>
                </div>

                {filterType === 'single' ? (
                  <div className="flex flex-col gap-1">
                    <label htmlFor="year">Year</label>
                    <input
                      type="number"
                      id="year"
                      value={singleYear}
                      onChange={(e) => setSingleYear(Number(e.target.value))}
                      className="w-full px-2 py-0.5 rounded-md bg-black/20 border-0 ring-primary"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="minYear">Min Year</label>
                      <input
                        type="number"
                        id="minYear"
                        value={minYear}
                        onChange={(e) => setMinYear(Number(e.target.value))}
                        className="w-full px-2 py-0.5 rounded-md bg-black/20 border-0 ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="maxYear">Max Year</label>
                      <input
                        type="number"
                        id="maxYear"
                        value={maxYear}
                        onChange={(e) => setMaxYear(Number(e.target.value))}
                        className="w-full px-2 py-0.5 rounded-md bg-black/20 border-0 ring-primary"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleApply}
                  className="flex w-fit bg-black/20 py-1 px-2 rounded-md transform transition-transform hover:scale-[1.07] self-end"
                >
                  Apply
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
