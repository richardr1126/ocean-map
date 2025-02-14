import { useState } from 'react';

type SidebarProps = {
  showMicroplastics: boolean;
  onToggleMicroplastics: (show: boolean) => void;
  onYearFilterChange?: (filter: { type: 'single' | 'range', minYear: number, maxYear: number }) => void;
};

export const Sidebar = ({ 
  showMicroplastics, 
  onToggleMicroplastics,
  onYearFilterChange
}: SidebarProps) => {
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
    <div className="w-64 h-full bg-white shadow-lg p-4">
      <h2 className="text-xl font-semibold mb-4 text-black">Microplastics Settings</h2>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showMicroplastics"
            checked={showMicroplastics}
            onChange={(e) => onToggleMicroplastics(e.target.checked)}
            className="w-4 h-4 text-deep-water"
          />
          <label htmlFor="showMicroplastics" className="text-black">Show Microplastics Data</label>
        </div>

        {showMicroplastics && (
          <>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="singleYear"
                  name="filterType"
                  checked={filterType === 'single'}
                  onChange={() => setFilterType('single')}
                  className="text-deep-water"
                />
                <label htmlFor="singleYear" className="text-black">Single Year</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="yearRange"
                  name="filterType"
                  checked={filterType === 'range'}
                  onChange={() => setFilterType('range')}
                  className="text-deep-water"
                />
                <label htmlFor="yearRange" className="text-black">Year Range</label>
              </div>
            </div>

            {filterType === 'single' ? (
              <div className="space-y-2">
                <label htmlFor="year" className="block text-sm font-medium text-black">Year</label>
                <input
                  type="number"
                  id="year"
                  value={singleYear}
                  onChange={(e) => setSingleYear(Number(e.target.value))}
                  className="w-full p-2 border rounded-md text-black"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label htmlFor="minYear" className="block text-sm font-medium text-black">Min Year</label>
                  <input
                    type="number"
                    id="minYear"
                    value={minYear}
                    onChange={(e) => setMinYear(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-black"
                  />
                </div>
                <div>
                  <label htmlFor="maxYear" className="block text-sm font-medium text-black">Max Year</label>
                  <input
                    type="number"
                    id="maxYear"
                    value={maxYear}
                    onChange={(e) => setMaxYear(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-black"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleApply}
              className="w-full bg-deep-water text-white py-2 px-4 rounded-md hover:bg-opacity-90 transition-colors"
            >
              Apply
            </button>
          </>
        )}
      </div>
    </div>
  );
};
