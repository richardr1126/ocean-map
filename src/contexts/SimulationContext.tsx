import { createContext, useContext, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface SimulationContextType {
  startSimulation: (map: mapboxgl.Map, position: [number, number]) => void;
  stopSimulation: () => void;
  cleanupSimulation: () => void;
  isSimulating: boolean;
}

export class ParticleSimulation {
  private currentPos: [number, number];
  private path: [number, number][];
  private animationFrameId: number | null = null;
  private map: mapboxgl.Map;
  private sourceId: string;
  private layerId: string;

  constructor(map: mapboxgl.Map, startPos: [number, number]) {
    this.map = map;
    this.currentPos = startPos;
    this.path = [startPos];
    this.sourceId = 'simulation-path';
    this.layerId = 'simulation-path-layer';
    this.setupLayer();
  }

  private setupLayer() {
    if (this.map.getSource(this.sourceId)) {
      this.map.removeLayer(this.layerId);
      this.map.removeSource(this.sourceId);
    }

    this.map.addSource(this.sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: this.path
        }
      }
    });

    this.map.addLayer({
      id: this.layerId,
      type: 'line',
      source: this.sourceId,
      paint: {
        'line-color': '#FF9800',
        'line-width': 2,
        'line-opacity': 0.8
      }
    });
  }

  private updatePath() {
    if (!this.map.getSource(this.sourceId)) return;

    (this.map.getSource(this.sourceId) as mapboxgl.GeoJSONSource).setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: this.path
      }
    });
  }

  private calculateNextPosition(): [number, number] {
    const dt = 0.1;
    const randomFactor = 0.02;
    const dx = (Math.random() - 0.5) * randomFactor;
    const dy = (Math.random() - 0.5) * randomFactor;
    const eastwardDrift = 0.01;
    
    let [lon, lat] = this.currentPos;
    lon += (dx + eastwardDrift) * dt;
    lat += dy * dt;
    
    lon = ((lon + 180) % 360) - 180;
    lat = Math.max(-85, Math.min(85, lat));
    
    return [lon, lat];
  }

  private simulate = () => {
    this.currentPos = this.calculateNextPosition();
    this.path.push(this.currentPos);
    this.updatePath();
    this.animationFrameId = requestAnimationFrame(this.simulate);
  }

  public start() {
    if (!this.animationFrameId) {
      this.simulate();
    }
  }

  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public cleanup() {
    this.stop();
    if (this.map.getLayer(this.layerId)) {
      this.map.removeLayer(this.layerId);
    }
    if (this.map.getSource(this.sourceId)) {
      this.map.removeSource(this.sourceId);
    }
  }
}

const SimulationContext = createContext<SimulationContextType | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const simulationRef = useRef<ParticleSimulation | null>(null);
  const isSimulatingRef = useRef(false);

  const startSimulation = (map: mapboxgl.Map, position: [number, number]) => {
    if (simulationRef.current) {
      simulationRef.current.cleanup();
    }
    simulationRef.current = new ParticleSimulation(map, position);
    simulationRef.current.start();
    isSimulatingRef.current = true;
  };

  const stopSimulation = () => {
    simulationRef.current?.stop();
    isSimulatingRef.current = false;
  };

  const cleanupSimulation = () => {
    simulationRef.current?.cleanup();
    simulationRef.current = null;
    isSimulatingRef.current = false;
  };

  useEffect(() => {
    return () => {
      cleanupSimulation();
    };
  }, []);

  return (
    <SimulationContext.Provider value={{
      startSimulation,
      stopSimulation,
      cleanupSimulation,
      isSimulating: isSimulatingRef.current
    }}>
      {children}
    </SimulationContext.Provider>
  );
}

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};