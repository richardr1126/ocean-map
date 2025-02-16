import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import microplasticsData from '@/data/noaa_microplastics.json';
import nasaData from '@/data/combined_nasa_data.json';
import ntuaData from '@/data/combined_ntua_data.json';

interface YearFilter {
  type: 'single' | 'range';
  minYear: number;
  maxYear: number;
}

interface DataLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  data: GeoJSON.FeatureCollection;
}

interface DataContextType {
  layers: DataLayer[];
  toggleLayer: (layerId: string) => void;
  yearFilter: YearFilter;
  setYearFilter: (filter: YearFilter) => void;
  getFilteredData: (layerId: string) => GeoJSON.FeatureCollection;
  dataPointCount: Record<string, number>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<DataLayer[]>([
    {
      id: 'microplastics',
      name: 'NOAA Microplastics',
      color: '#FF4444',
      visible: true,
      data: microplasticsData as GeoJSON.FeatureCollection
    },
    {
      id: 'nasa',
      name: 'NASA Ocean Debris',
      color: '#8A2BE2',
      visible: true,
      data: nasaData as GeoJSON.FeatureCollection
    },
    {
      id: 'ntua',
      name: 'MARIDA NTUA',
      color: '#4CAF50',
      visible: true,
      data: ntuaData as GeoJSON.FeatureCollection
    }
  ]);

  const [yearFilter, setYearFilter] = useState<YearFilter>({
    type: 'range',
    minYear: 1972,
    maxYear: 2022
  });

  const [dataPointCount, setDataPointCount] = useState<Record<string, number>>({
    microplastics: 0,
    nasa: 0,
    ntua: 0
  });

  const toggleLayer = useCallback((layerId: string) => {
    setLayers(currentLayers =>
      currentLayers.map(layer =>
        layer.id === layerId
          ? { ...layer, visible: !layer.visible }
          : layer
      )
    );
  }, []);

  const getFilteredData = useCallback((layerId: string): GeoJSON.FeatureCollection => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return {
      type: 'FeatureCollection',
      features: []
    } as GeoJSON.FeatureCollection;

    const filteredData = {
      type: 'FeatureCollection',
      features: layer.data.features.filter((feature: GeoJSON.Feature) => {
        // NASA and NTUA data don't have dates, so return all features
        if (layerId === 'nasa' || layerId === 'ntua') return true;

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

    setDataPointCount(prev => ({
      ...prev,
      [layerId]: filteredData.features.length
    }));

    return filteredData;
  }, [layers, yearFilter]);

  return (
    <DataContext.Provider value={{
      layers,
      toggleLayer,
      yearFilter,
      setYearFilter,
      getFilteredData,
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