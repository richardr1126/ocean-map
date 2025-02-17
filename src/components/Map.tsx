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

const calculatePolygonCentroid = (coordinates: number[][][]) => {
  let totalX = 0;
  let totalY = 0;
  let pointCount = 0;

  // Handle the outer ring of the polygon
  coordinates[0].forEach(point => {
    totalX += point[0];
    totalY += point[1];
    pointCount++;
  });

  return [totalX / pointCount, totalY / pointCount];
};

const createPointFeatureFromPolygon = (feature: GeoJSON.Feature): GeoJSON.Feature => {
  const geometry = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  let centroid;

  if (geometry.type === 'Polygon') {
    centroid = calculatePolygonCentroid(geometry.coordinates);
  } else {
    // For MultiPolygon, use the centroid of the first polygon
    centroid = calculatePolygonCentroid(geometry.coordinates[0]);
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: centroid
    },
    properties: feature.properties
  };
};

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const layersRef = useRef<Set<string>>(new Set());
  const [isStreetView, setIsStreetView] = useState(true);
  const { layers, getFilteredData, dataPointCount } = useData();

  const updateLayer = useCallback((layer: { id: string, color: string, visible: boolean }) => {
    if (!mapRef.current) return;

    const layerId = `${layer.id}-layer`;
    const map = mapRef.current;
    const data = getFilteredData(layer.id);

    // Remove existing layers and sources
    [layerId, `${layerId}-point`].forEach(id => {
      if (layersRef.current.has(id) && map.getLayer(id)) {
        map.removeLayer(id);
        layersRef.current.delete(id);
      }
    });

    if (map.getSource(layer.id)) {
      map.removeSource(layer.id);
    }
    if (map.getSource(`${layer.id}-point`)) {
      map.removeSource(`${layer.id}-point`);
    }

    // Add layer if it's meant to be visible
    if (layer.visible) {
      const firstFeature = data.features[0];
      const isPolygon = firstFeature?.geometry.type === 'Polygon' || firstFeature?.geometry.type === 'MultiPolygon';

      if (isPolygon && layer.id !== 'microplastics') {
        // Add the original polygon source
        map.addSource(layer.id, {
          type: 'geojson',
          data: data
        });

        // Create a point source from polygon centroids only for NASA and NTUA data
        const pointData: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: data.features.map(createPointFeatureFromPolygon)
        };

        map.addSource(`${layer.id}-point`, {
          type: 'geojson',
          data: pointData
        });

        // Add point layer for all zoom levels (but fade out at high zoom)
        const pointLayerId = `${layerId}-point`;
        const pointLayer: mapboxgl.LayerSpecification = {
          id: pointLayerId,
          type: 'circle',
          source: `${layer.id}-point`,
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 6,
              8, 4
            ],
            'circle-color': layer.color,
            'circle-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              9, 0.6,  // Full opacity until zoom level 9
              11, 0    // Fade to completely transparent by zoom level 12
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              9, 1,
              11, 0
            ]
          }
        };
        map.addLayer(pointLayer);
        layersRef.current.add(pointLayerId);

        // Add polygon layer that fades in at higher zoom levels
        const polygonLayer: mapboxgl.LayerSpecification = {
          id: layerId,
          type: 'fill',
          source: layer.id,
          paint: {
            'fill-color': layer.color,
            'fill-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              9, 0,    // Completely transparent until zoom level 9
              11, 0.6  // Fade to full opacity by zoom level 12
            ],
            'fill-outline-color': '#ffffff'
          }
        };
        map.addLayer(polygonLayer);
        layersRef.current.add(layerId);

        // Add click handlers for both layers
        [pointLayerId, layerId].forEach(id => {
          map.on('click', id, (e) => {
            const feature = e.features?.[0];
            if (!feature) return;

            const coordinates = e.lngLat;
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
                      <span class="font-semibold">Latitude:</span> ${coordinates.lat.toFixed(4)}°
                    </div>
                    <div class="mb-1">
                      <span class="font-semibold">Longitude:</span> ${coordinates.lng.toFixed(4)}°
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

          map.on('mouseenter', id, () => {
            map.getCanvas().style.cursor = 'pointer';
          });

          map.on('mouseleave', id, () => {
            map.getCanvas().style.cursor = '';
          });
        });
      } else {
        // For non-polygon data or microplastics, use regular circle layer
        map.addSource(layer.id, {
          type: 'geojson',
          data: data
        });

        const layerConfig: mapboxgl.LayerSpecification = {
          id: layerId,
          type: 'circle',
          source: layer.id,
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 4,
              8, 6
            ],
            'circle-color': layer.color,
            'circle-opacity': 0.6,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 1
          }
        };

        map.addLayer(layerConfig);
        layersRef.current.add(layerId);

        // Add event listeners for regular layers
        map.on('click', layerId, (e) => {
          const feature = e.features?.[0];
          if (!feature) return;

          const coordinates = e.lngLat;
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
                    <span class="font-semibold">Latitude:</span> ${coordinates.lat.toFixed(4)}°
                  </div>
                  <div class="mb-1">
                    <span class="font-semibold">Longitude:</span> ${coordinates.lng.toFixed(4)}°
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
  }, [getFilteredData]);

  const loadMap = useCallback(() => {
    // Only initialize map if it hasn't been initialized yet
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
  }, [layers, updateLayer]);

  // Initialize map only once
  useEffect(() => {
    loadMap();
  }, [loadMap]); // Empty dependency array since we only want to initialize once

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

      <div className="absolute top-16 right-4 flex flex-col gap-2 bg-white/30 dark:bg-black/40 backdrop-blur-md px-4 py-2 rounded-md shadow-md">
        {layers.map(layer => layer.visible && (
          <p key={layer.id} className="font-medium text-foreground flex items-center gap-2">
            <span className="w-3 h-3 inline-block rounded-full" style={{ backgroundColor: layer.color }}></span>
            {dataPointCount[layer.id]} points
          </p>
        ))}
      </div>

      <button
        onClick={toggleMapStyle}
        className="group absolute bottom-4 right-4 ml-auto bg-white/30 dark:bg-black/40 backdrop-blur-md p-2 rounded-md shadow-md hover:bg-deep-water transition-colors text-2xl"
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
