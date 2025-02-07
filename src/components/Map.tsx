'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isStreetView, setIsStreetView] = useState(true);

  const loadMap = useCallback(() => {
  // useCallback is used to memoize a function so that it doesn't re-calculate/initialize on every state change, which regular functions will do
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (mapContainerRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-105.272148, 40.047050],
        zoom: 8
      });
    }
  }, []);

  const toggleMapStyle = useCallback(() => {
    const satellite = 'mapbox://styles/mapbox/satellite-v9';
    const streets = 'mapbox://styles/mapbox/streets-v12';
    
    if (mapRef.current) {
      mapRef.current.setStyle(isStreetView ? satellite : streets);
      setIsStreetView(!isStreetView);
    }
  }, [isStreetView]);
  // useCallback dependencies are so that the function "re-renders" when the state changes

  useEffect(() => {
    loadMap();

    return () => {
      mapRef.current?.remove(); // Cleanup
    };
  }, [loadMap]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      <button
        onClick={toggleMapStyle}
        className="group absolute bottom-4 right-4 ml-auto bg-background p-2 rounded-md shadow-md hover:bg-deep-water transition-colors text-2xl"
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
