'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import microplasticsData from '@/data/nasa_microplastics.json';

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatMicroplasticsData = (properties: GeoJSON.GeoJsonProperties) => {
  if (!properties) return '';
  
  const relevantData = {
    'Method': properties.SAMPMETHOD,
    'Density': properties.DENSTEXT,
    'Unit': properties.UNIT,
    'Organization': properties.ORG,
    'Date': formatDate(properties.Date),
    'Reference': properties.SHORTREF,
    'DOI': properties.DOI
  };

  return Object.entries(relevantData)
    .map(([key, value]) => value ? 
    `
    <p class="flex flex-wrap mb-1 break-all space-x-1">
      <span class="font-semibold">${key}:</span> ${value}
    <p>
    ` : '')
    .join('');
};

interface MapProps {
  showMicroplastics: boolean;
  yearFilter: {
    type: 'single' | 'range';
    minYear: number;
    maxYear: number;
  };
}

export default function Map({ showMicroplastics, yearFilter }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isStreetView, setIsStreetView] = useState(true);
  const [dataPointCount, setDataPointCount] = useState(0);

  const filterDataByYear = useCallback(() => {
    if (!mapRef.current || !mapRef.current.getSource('microplastics')) return;

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
    (mapRef.current.getSource('microplastics') as mapboxgl.GeoJSONSource).setData(filteredData);
  }, [yearFilter]);

  const addDataLayers = useCallback(() => {
    if (!mapRef.current) return;

    // Add the GeoJSON as a source
    if (!mapRef.current.getSource('microplastics')) {
      mapRef.current.addSource('microplastics', {
        type: 'geojson',
        data: microplasticsData as GeoJSON.FeatureCollection
      });

      // Initialize data point count when source is first added
      const filteredData = (microplasticsData as GeoJSON.FeatureCollection).features.filter((feature: GeoJSON.Feature) => {
        const date = new Date(feature.properties?.Date);
        if (!date) return false;
        
        const year = date.getFullYear();
        
        if (yearFilter.type === 'single') {
          return year === yearFilter.minYear;
        } else {
          return year >= yearFilter.minYear && year <= yearFilter.maxYear;
        }
      });
      setDataPointCount(filteredData.length);
    }

    // Add a layer to visualize the points
    if (!mapRef.current.getLayer('microplastics-points')) {
      mapRef.current.addLayer({
        id: 'microplastics-points',
        type: 'circle',
        source: 'microplastics',
        paint: {
          'circle-color': '#FF0000',
          'circle-radius': 6,
          'circle-opacity': showMicroplastics ? 0.7 : 0
        }
      });

      // Add click handler for popups
      mapRef.current.on('click', 'microplastics-points', (e) => {
        const feature = e.features?.[0] as GeoJSON.Feature | undefined;
        if (!feature) return;

        const coordinates = feature.geometry.type === 'Point' 
          ? (feature.geometry.coordinates as [number, number])
          : e.lngLat.toArray();

        const properties = feature.properties;
        
        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`
            <div class="flex flex-col text-deep-water p-2 max-w-sm">
              <div class="mb-3">
                <div class="mb-1">
                  <span class="font-semibold">Latitude:</span> ${coordinates[1].toFixed(4)}°
                </div>
                <div class="mb-1">
                  <span class="font-semibold">Longitude:</span> ${coordinates[0].toFixed(4)}°
                </div>
              </div>
              <div class="flex flex-col space-y-0.5">
                ${formatMicroplasticsData(properties)}
              </div>
              ${properties?.DOI ? `
                <button class="mt-2 text-sm">
                  <a href="${properties.DOI}" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     class="text-blue-600 hover:text-blue-800 hover:underline">
                    View Research Paper
                  </a>
                </button>
              ` : ''}
            </div>
          `)
          .addTo(mapRef.current!);
      });

      // Add hover handlers
      mapRef.current.on('mouseenter', 'microplastics-points', () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = 'pointer';
        }
      });

      mapRef.current.on('mouseleave', 'microplastics-points', () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = '';
        }
      });
    } else {
      mapRef.current.setPaintProperty(
        'microplastics-points',
        'circle-opacity',
        showMicroplastics ? 0.7 : 0
      );
    }
  }, [showMicroplastics, yearFilter]);

  const loadMap = useCallback(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (mapContainerRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-105.272148, 40.047050],
        zoom: 2
      });

      mapRef.current.on('load', () => {
        addDataLayers();
      });
    }
  }, [addDataLayers]);

  const toggleMapStyle = useCallback(() => {
    const satellite = 'mapbox://styles/mapbox/satellite-v9';
    const streets = 'mapbox://styles/mapbox/streets-v12';
    
    if (mapRef.current) {
      mapRef.current.setStyle(isStreetView ? satellite : streets);
      setIsStreetView(!isStreetView);
      
      // Re-add data layers after style change
      mapRef.current.once('style.load', () => {
        addDataLayers();
      });
    }
  }, [isStreetView, addDataLayers]);

  useEffect(() => {
    loadMap();

    return () => {
      mapRef.current?.remove(); // Cleanup
    };
  }, [loadMap]);

  // Add useEffect to handle year filter changes
  useEffect(() => {
    filterDataByYear();
  }, [filterDataByYear]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {showMicroplastics && (
        <div className="absolute top-16 right-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-md shadow-md">
          <p className="font-medium text-white">
            Showing {dataPointCount} data points
          </p>
        </div>
      )}

      <button
        onClick={toggleMapStyle}
        className="group absolute bottom-4 right-4 ml-auto bg-black/40 backdrop-blur-md p-2 rounded-md shadow-md hover:bg-deep-water transition-colors text-2xl"
      >
        <span className="transition-opacity duration-200 group-hover:opacity-0">
          {isStreetView ? '🚦' : '🛰️'}
        </span>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {isStreetView ? '🛰️' : '🚦'}
        </span>
      </button>
    </div>
  );
}
