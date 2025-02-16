'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useData } from '@/contexts/DataContext';

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatMicroplasticsPopup = (properties: GeoJSON.GeoJsonProperties) => {
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

const formatNasaPopup = (properties: GeoJSON.GeoJsonProperties) => {
  if (!properties) return '';
  
  return `
    <p class="flex flex-wrap mb-1 break-all space-x-1">
      <span class="font-semibold">Detection:</span> Floating Marine Debris
    </p>
  `;
};

const formatNtuaPopup = (properties: GeoJSON.GeoJsonProperties) => {
  if (!properties) return '';
  
  return `
    <p class="flex flex-wrap mb-1 break-all space-x-1">
      <span class="font-semibold">Detection:</span> Marine Floating Debris
    </p>
  `;
};

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const layersRef = useRef<Set<string>>(new Set());
  const [isStreetView, setIsStreetView] = useState(true);
  const { layers, getFilteredData, dataPointCount } = useData();
  
  const convertPolygonToPoint = useCallback((feature: GeoJSON.Feature) => {
    if (feature.geometry.type === 'Polygon') {
      const coordinates = feature.geometry.coordinates[0][0];
      return {
        ...feature,
        geometry: {
          type: 'Point',
          coordinates: coordinates
        }
      };
    }
    return feature;
  }, []);

  const updateLayer = useCallback((layer: { id: string, color: string, visible: boolean }) => {
    if (!mapRef.current) return;

    const layerId = `${layer.id}-points`;
    const map = mapRef.current;
    const data = getFilteredData(layer.id);

    // Convert polygon features to points
    const pointData = {
      type: 'FeatureCollection',
      features: data.features.map(convertPolygonToPoint)
    } as GeoJSON.FeatureCollection;

    // Update existing source if it exists
    if (map.getSource(layer.id)) {
      (map.getSource(layer.id) as mapboxgl.GeoJSONSource).setData(pointData);
      
      // Update layer visibility
      map.setPaintProperty(layerId, 'circle-opacity', layer.visible ? 0.8 : 0);
      map.setPaintProperty(layerId, 'circle-stroke-opacity', layer.visible ? 1 : 0);
    } else {
      // Add new source and layer if they don't exist
      map.addSource(layer.id, {
        type: 'geojson',
        data: pointData
      });

      map.addLayer({
        id: layerId,
        type: 'circle',
        source: layer.id,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, layer.id === 'nasa' ? 4 : 3,
            8, layer.id === 'nasa' ? 8 : 6
          ],
          'circle-color': layer.color,
          'circle-opacity': layer.visible ? 0.8 : 0,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': layer.visible ? 1 : 0
        }
      });

      // Add event listeners only once when layer is created
      if (!layersRef.current.has(layerId)) {
        layersRef.current.add(layerId);
        
        map.on('click', layerId, (e) => {
          const feature = e.features?.[0];
          if (!feature) return;

          const coordinates = feature.geometry.type === 'Point' 
            ? (feature.geometry as any).coordinates.slice()
            : e.lngLat.toArray();
            
          const properties = feature.properties;
          const popupContent = layer.id === 'microplastics' 
            ? formatMicroplasticsPopup(properties)
            : layer.id === 'nasa'
            ? formatNasaPopup(properties)
            : formatNtuaPopup(properties);

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
                  ${popupContent}
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
            .addTo(map);
        });

        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      }
    }
  }, [convertPolygonToPoint, getFilteredData]);

  // Initialize map only once
  useEffect(() => {
    if (!mapRef.current && mapContainerRef.current) {
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-105.272148, 40.047050],
        zoom: 2
      });

      mapRef.current.on('load', () => {
        layers.forEach(updateLayer);
      });
    }

    return () => {
      mapRef.current?.remove();
    };
  }, []); // Empty dependency array since we only want to initialize once

  // Update layers when they change
  useEffect(() => {
    if (mapRef.current?.loaded()) {
      layers.forEach(updateLayer);
    }
  }, [layers, updateLayer]);

  const toggleMapStyle = useCallback(() => {
    const satellite = 'mapbox://styles/mapbox/satellite-v9';
    const streets = 'mapbox://styles/mapbox/streets-v12';
    
    if (mapRef.current) {
      mapRef.current.setStyle(isStreetView ? satellite : streets);
      setIsStreetView(!isStreetView);
      
      // Re-add data layers after style change
      mapRef.current.once('style.load', () => {
        layers.forEach(updateLayer);
      });
    }
  }, [isStreetView, layers, updateLayer]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      <div className="absolute top-16 right-4 flex flex-col gap-2">
        {layers.map(layer => layer.visible && (
          <div key={layer.id} className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-md shadow-md">
            <p className="font-medium text-white flex items-center gap-2">
              <span className="w-3 h-3 inline-block rounded-full" style={{ backgroundColor: layer.color }}></span>
              {dataPointCount[layer.id]} points
            </p>
          </div>
        ))}
      </div>

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
