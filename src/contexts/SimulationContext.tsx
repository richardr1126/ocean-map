import { createContext, useContext, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface OceanCurrent {
  u: number; // East-West velocity component (m/s)
  v: number; // North-South velocity component (m/s)
}

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
  private dateDisplayId: string;
  private lastCurrentUpdate: number = 0;
  private currentUpdateInterval: number = 300000;
  private currentOceanCurrent: OceanCurrent = { u: 0.01, v: 0 };
  private lastValidPosition: [number, number];
  private currentDate: Date;

  constructor(map: mapboxgl.Map, startPos: [number, number]) {
    this.map = map;
    this.currentPos = startPos;
    this.lastValidPosition = startPos;
    this.path = [startPos];
    this.sourceId = 'simulation-path';
    this.layerId = 'simulation-path-layer';
    this.dateDisplayId = 'simulation-date-display';
    this.currentDate = new Date(); // Start from current date
    this.setupLayer();
    this.setupDateDisplay();
    this.updateOceanCurrents();
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

  private setupDateDisplay() {
    const container = this.map.getContainer();
    let dateDisplay = document.getElementById(this.dateDisplayId);
    
    if (!dateDisplay) {
      dateDisplay = document.createElement('div');
      dateDisplay.id = this.dateDisplayId;
      dateDisplay.style.position = 'absolute';
      dateDisplay.style.bottom = '20px';
      dateDisplay.style.right = '20px';
      dateDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      dateDisplay.style.color = 'white';
      dateDisplay.style.padding = '8px';
      dateDisplay.style.borderRadius = '4px';
      dateDisplay.style.fontFamily = 'monospace';
      dateDisplay.style.zIndex = '1';
      container.appendChild(dateDisplay);
    }
  }

  private updateDateDisplay() {
    const dateDisplay = document.getElementById(this.dateDisplayId);
    if (dateDisplay) {
      // Format: MM/DD/YYYY HH:mm
      const date = this.currentDate.toLocaleDateString();
      const time = this.currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      dateDisplay.textContent = `${date} ${time}`;
    }
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

  private async updateOceanCurrents() {
    const [lon, lat] = this.currentPos;
    this.currentOceanCurrent = await this.fetchOceanCurrents(lon, lat);
    this.lastCurrentUpdate = Date.now();
  }

  private isOverWater(position: [number, number]): boolean {
    try {
      const point = this.map.project(new mapboxgl.LngLat(position[0], position[1]));
      const features = this.map.queryRenderedFeatures(point, {
        layers: ['water'] // Mapbox's built-in water layer
      });
      
      // If we find water features, the position is over water
      return features.length > 0;
    } catch (error) {
      console.error('Error checking water:', error);
      // In case of error, assume it's over water to continue simulation
      return true;
    }
  }

  private isPathOverWater(start: [number, number], end: [number, number]): boolean {
    // Check several points along the path
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      const lat = start[1] + (end[1] - start[1]) * fraction;
      const lon = start[0] + (end[0] - start[0]) * fraction;
      
      if (!this.isOverWater([lon, lat])) {
        return false;
      }
    }
    return true;
  }

  private async calculateNextPosition(): Promise<[number, number]> {
    // Advance time by one minute
    this.currentDate.setMinutes(this.currentDate.getMinutes() + 1);
    
    // Update currents if needed
    if (Date.now() - this.lastCurrentUpdate > this.currentUpdateInterval) {
      await this.updateOceanCurrents();
    }

    const SECONDS_PER_MINUTE = 60;
    const dt = SECONDS_PER_MINUTE; // Use one minute as delta time

    const randomFactor = 0.001;
    const dx = (Math.random() - 0.5) * randomFactor;
    const dy = (Math.random() - 0.5) * randomFactor;
    
    let [lon, lat] = this.currentPos;
    
    // Calculate new position using one minute time step
    const currentFactor = 0.00001;
    const newLon = ((lon + (dx + this.currentOceanCurrent.u * currentFactor) * dt + 180) % 360) - 180;
    const newLat = Math.max(-85, Math.min(85, lat + (dy + this.currentOceanCurrent.v * currentFactor) * dt));
    
    // Check if new position is over water and the path to it is over water
    const newPosition: [number, number] = [newLon, newLat];
    if (this.isOverWater(newPosition) && this.isPathOverWater(this.currentPos, newPosition)) {
      this.lastValidPosition = newPosition;
      return newPosition;
    }
    
    // If not valid, return last valid position with a slight random offset and reversed current
    const bounceRandomFactor = 0.0001;
    // Reverse the current direction to simulate "bouncing" off land
    this.currentOceanCurrent = {
      u: -this.currentOceanCurrent.u * 0.5,
      v: -this.currentOceanCurrent.v * 0.5
    };
    return [
      this.lastValidPosition[0] + (Math.random() - 0.5) * bounceRandomFactor,
      this.lastValidPosition[1] + (Math.random() - 0.5) * bounceRandomFactor
    ];
  }

  private async fetchOceanCurrents(lon: number, lat: number): Promise<OceanCurrent> {
    try {
      // Using NOAA Operational Forecast System API with the current simulation date
      const dateStr = this.currentDate.toISOString().split('T')[0];
      const response = await fetch(
        `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?` +
        `date=${dateStr}&station=Current&lat=${lat}&lon=${lon}&product=currents&units=metric&time_zone=gmt&format=json`
      );
      const data = await response.json();
      
      if (!data.current || !data.current.length) {
        return {
          u: 0.01,
          v: 0
        };
      }

      return {
        u: data.current[0].u || 0.01,
        v: data.current[0].v || 0
      };
    } catch (error) {
      console.error('Error fetching ocean currents:', error);
      return {
        u: 0.01,
        v: 0
      };
    }
  }

  private simulate = async () => {
    this.currentPos = await this.calculateNextPosition();
    this.path.push(this.currentPos);
    this.updatePath();
    this.updateDateDisplay();
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
    const dateDisplay = document.getElementById(this.dateDisplayId);
    if (dateDisplay) {
      dateDisplay.remove();
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