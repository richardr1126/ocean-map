import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import microplasticsData from '@/data/noaa_microplastics.json';

interface YearFilter {
  type: 'single' | 'range';
  minYear: number;
  maxYear: number;
}

interface DataContextType {
  showMicroplastics: boolean;
  setShowMicroplastics: (show: boolean) => void;
  yearFilter: YearFilter;
  setYearFilter: (filter: YearFilter) => void;
  getFilteredMicroplasticsData: () => GeoJSON.FeatureCollection;
  dataPointCount: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [showMicroplastics, setShowMicroplastics] = useState(true);
  const [yearFilter, setYearFilter] = useState<YearFilter>({
    type: 'range',
    minYear: 1972,
    maxYear: 2022
  });
  const [dataPointCount, setDataPointCount] = useState(0);

  const getFilteredMicroplasticsData = useCallback(() => {
    const filteredData = {
      type: 'FeatureCollection',
      features: (microplasticsData as GeoJSON.FeatureCollection).features.filter((feature: GeoJSON.Feature) => {
        const date = new Date(feature.properties?.Date);
        if (!date) return false;

        const year = date.getFullYear();
        
        if (yearFilter.type === 'single') {
          return year === yearFilter.minYear;
        } else {
          return year >= yearFilter.minYear && year <= yearFilter.maxYear;
        }
      })
    } as GeoJSON.FeatureCollection;

    setDataPointCount(filteredData.features.length);
    return filteredData;
  }, [yearFilter]);

  return (
    <DataContext.Provider value={{
      showMicroplastics,
      setShowMicroplastics,
      yearFilter,
      setYearFilter,
      getFilteredMicroplasticsData,
      dataPointCount
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}