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
    <div className="mt-16 m-5 fixed w-fit text-white bg-black/40 backdrop-blur-md rounded-lg shadow-md p-4 z-50">
      <h2 className="text-lg font-semibold mb-2">Options</h2>
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
                <label htmlFor="year" className="block text-sm font-medium">Year</label>
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
                  <label htmlFor="minYear" className="block text-sm font-medium">Min Year</label>
                  <input
                    type="number"
                    id="minYear"
                    value={minYear}
                    onChange={(e) => setMinYear(Number(e.target.value))}
                    className="w-full px-2 py-0.5 rounded-md bg-black/20 border-0 ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="maxYear" className="block text-sm font-medium">Max Year</label>
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
    </div>
  );
};
