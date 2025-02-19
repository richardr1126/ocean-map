import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
import scipy.stats as stats
from scipy.ndimage import gaussian_filter
import cartopy.crs as ccrs
import cartopy.feature as cfeature
from shapely.geometry import Point
from ocean_data import OceanCurrentData
from wind_data import WindData
from datetime import datetime

class PlasticPathTracker:
    def __init__(self, start_pos=(242, 34), dt=1, use_real_currents=False):
        """
        Initialize the plastic path tracker.
        
        Parameters
        ----------
        start_pos : tuple
            Starting position (longitude, latitude)
        dt : float
            Time step for simulation (in days)
        use_real_currents : bool
            Whether to use real NOAA current data
        """
        self.dt = dt
        self.elapsed_time = 0  # Track elapsed time in days
        
        # Initialize current position and path history with explicit float64 type
        self.current_pos = np.array(start_pos, dtype=np.float64)
        self.path_history = [self.current_pos.copy()]
        
        # Diffusion coefficient (random motion)
        self.D = 0.05  # Reduced for more realistic movement
        
        # Initialize ocean current data
        self.ocean_data = OceanCurrentData(use_real_data=use_real_currents)
        
        # Initialize wind data (using known available date)
        self.wind_data = WindData()
        self.wind_data.download_era5_data(2025, 2, 12)  # Using known available date
        
        # Get land geometry for masking
        self.land = cfeature.NaturalEarthFeature('physical', 'land', '50m')
        self.land_geom = list(self.land.geometries())[0]
        
        # Move starting position away from land if needed
        if self.is_on_land(self.current_pos):
            # Move the starting position slightly offshore (about 50km)
            self.current_pos[0] += 0.5  # Move ~50km west
            self.path_history = [self.current_pos.copy()]
        
        # Initialize eddy fields
        self.setup_eddies()
        
    def setup_eddies(self):
        """Setup eddy current fields."""
        # Create grid for eddy fields
        lon = np.linspace(0, 360, 360)
        lat = np.linspace(-90, 90, 180)
        self.lon_grid, self.lat_grid = np.meshgrid(lon, lat)
        
        # Create eddy field using Gaussian random field
        random_field = np.random.normal(0, 1, self.lon_grid.shape)
        self.eddy_field_u = gaussian_filter(random_field, sigma=5) * 0.1  # Reduced from 0.2
        random_field = np.random.normal(0, 1, self.lon_grid.shape)
        self.eddy_field_v = gaussian_filter(random_field, sigma=5) * 0.1
        
    def get_wind_velocity(self, position):
        """Calculate wind velocity using ERA5 data."""
        return self.wind_data.get_wind_velocity(position)
    
    def get_eddy_velocity(self, position):
        """Get eddy velocity at a given position using bilinear interpolation."""
        lon, lat = position
        
        # Convert position to grid indices
        lon_idx = int(lon) % 360
        lat_idx = int(lat + 90)  # Shift from -90:90 to 0:180
        
        # Ensure indices are within bounds
        lat_idx = np.clip(lat_idx, 0, 179)
        
        # Get eddy velocities through simple lookup (could be improved with interpolation)
        u = self.eddy_field_u[lat_idx, lon_idx]
        v = self.eddy_field_v[lat_idx, lon_idx]
        
        return np.array([u, v])

    def is_on_land(self, position):
        """Check if a position is on land."""
        point = Point(position[0], position[1])
        return self.land_geom.contains(point)

    def get_coastal_repulsion(self, position):
        """
        Calculate a repulsion vector away from coastlines.
        Uses multiple radii for more accurate repulsion.
        """
        repulsion = np.zeros(2)
        
        # Check multiple radii for better coverage
        for check_radius in [0.5, 1.0, 2.0, 4.0]:
            for angle in np.linspace(0, 2*np.pi, 32):  # Increased number of check points
                test_point = position + check_radius * np.array([np.cos(angle), np.sin(angle)])
                test_point[0] = np.mod(test_point[0], 360)
                test_point[1] = np.clip(test_point[1], -89.75, 89.75)
                
                if self.is_on_land(test_point):
                    # Stronger repulsion for closer points
                    strength = 2.0 / check_radius  # Stronger repulsion for closer land
                    repulsion -= strength * check_radius * np.array([np.cos(angle), np.sin(angle)])
        
        # Normalize and scale repulsion (much stronger now)
        if np.any(repulsion):
            repulsion = repulsion / np.linalg.norm(repulsion) * 1.0
        
        return repulsion

    def is_approaching_land(self, position, velocity, time_steps=10):
        """Check if the particle is heading towards land with multiple checks."""
        # Check more future positions with decreasing time steps
        for steps in range(1, time_steps + 1):
            check_distance = steps * self.dt
            test_pos = position + velocity * check_distance
            test_pos[0] = np.mod(test_pos[0], 360)
            test_pos[1] = np.clip(test_pos[1], -89.75, 89.75)
            
            # Check if this future position is on land
            if self.is_on_land(test_pos):
                return True, steps
            
            # Also check points between current and future position
            for fraction in [0.25, 0.5, 0.75]:
                intermediate_pos = position + velocity * check_distance * fraction
                intermediate_pos[0] = np.mod(intermediate_pos[0], 360)
                intermediate_pos[1] = np.clip(intermediate_pos[1], -89.75, 89.75)
                if self.is_on_land(intermediate_pos):
                    return True, steps
        
        return False, 0

    def find_safe_velocity(self, position, velocity):
        """Find a safe velocity that doesn't lead to land."""
        original_speed = np.linalg.norm(velocity)
        if original_speed == 0:
            return velocity
        
        # First try reducing speed
        for speed_factor in [0.75, 0.5, 0.25, 0.1]:
            test_velocity = velocity * speed_factor
            approaching, _ = self.is_approaching_land(position, test_velocity)
            if not approaching:
                return test_velocity
        
        # If reducing speed doesn't work, try different angles
        normalized_velocity = velocity / original_speed
        for angle in np.linspace(0, 2*np.pi, 16):
            rotation_matrix = np.array([
                [np.cos(angle), -np.sin(angle)],
                [np.sin(angle), np.cos(angle)]
            ])
            test_velocity = original_speed * 0.1 * (rotation_matrix @ normalized_velocity)
            approaching, _ = self.is_approaching_land(position, test_velocity)
            if not approaching:
                return test_velocity
        
        # If all else fails, return zero velocity
        return np.zeros(2)

    def update(self):
        """Update particle position for one time step."""
        # Get ocean current velocity
        current = self.ocean_data.get_current_velocity(self.current_pos, np.array([360, 180]))
        
        # Get wind velocity (affect surface particles)
        wind = self.get_wind_velocity(self.current_pos)
        
        # Get eddy velocity
        eddy = self.get_eddy_velocity(self.current_pos)
        
        # Get coastal repulsion
        repulsion = self.get_coastal_repulsion(self.current_pos)
        
        # Add random diffusion
        diffusion = np.random.normal(0, np.sqrt(2 * self.D * self.dt), 2)
        
        # Combine all velocities
        total_velocity = current + 0.02 * wind + eddy + repulsion + diffusion
        
        # Check if approaching land
        approaching, steps = self.is_approaching_land(self.current_pos, total_velocity)
        if approaching:
            # Find a safe velocity
            total_velocity = self.find_safe_velocity(self.current_pos, total_velocity)
            # Add extra repulsion
            total_velocity += repulsion * (2.0 / steps if steps > 0 else 2.0)
        
        # Calculate proposed new position
        proposed_pos = self.current_pos + total_velocity * self.dt
        
        # Final safety check - if still on land, don't move
        if self.is_on_land(proposed_pos):
            return
        
        # Update position only if it's safe
        self.current_pos = proposed_pos
        
        # Enforce periodic boundary conditions for longitude
        self.current_pos[0] = np.mod(self.current_pos[0], 360)
        
        # Clip latitude to valid range
        self.current_pos[1] = np.clip(self.current_pos[1], -89.75, 89.75)
        
        # Store position in path history
        self.path_history.append(self.current_pos.copy())
        
        # Update elapsed time
        self.elapsed_time += self.dt

    def plot_path(self):
        """Plot the path of the particle."""
        # Set up the figure with a map projection
        fig = plt.figure(figsize=(15, 10))
        
        # Use PlateCarree projection centered on the Pacific
        proj = ccrs.PlateCarree(central_longitude=180)
        ax = fig.add_subplot(1, 1, 1, projection=proj)
        
        # Set map extent to focus on the Pacific Ocean
        ax.set_extent([100, 260, -60, 60], crs=ccrs.PlateCarree())
        
        # Add map features
        ax.add_feature(cfeature.LAND, facecolor='lightgray', edgecolor='black')
        ax.add_feature(cfeature.OCEAN, facecolor='lightblue', alpha=0.5)
        ax.add_feature(cfeature.COASTLINE, edgecolor='black', linewidth=0.5)
        ax.add_feature(cfeature.BORDERS, linestyle=':', edgecolor='black', linewidth=0.5)
        
        # Add gridlines
        gl = ax.gridlines(draw_labels=True, linewidth=0.5, color='gray', alpha=0.5, linestyle='--')
        gl.top_labels = False
        gl.right_labels = False
        
        # Plot path
        path = np.array(self.path_history)
        ax.plot(path[:, 0], path[:, 1], 'b-', alpha=0.5, linewidth=1, transform=ccrs.PlateCarree())
        
        # Add title
        title = "Single Plastic Particle Path Tracker\n"
        title += "Using real NOAA current data" if self.ocean_data.use_real_data else "Using simplified currents"
        title += f"\nStarting Position: {self.path_history[0][0]:.1f}°E, {self.path_history[0][1]:.1f}°N"
        ax.set_title(title)
        
        plt.show()

    def run_simulation(self, num_steps, animate=True):
        """Run the simulation and optionally animate it."""
        # Set up the figure with a map projection
        fig = plt.figure(figsize=(15, 10))
        
        # Create map with Natural Earth features
        ax = plt.axes(projection=ccrs.PlateCarree(central_longitude=180))
        ax.add_feature(cfeature.LAND, facecolor='lightgray', edgecolor='black')
        ax.add_feature(cfeature.COASTLINE)
        ax.add_feature(cfeature.OCEAN, facecolor='lightblue')
        
        # Set map extent to show Pacific Ocean
        ax.set_extent([120, 300, -10, 60], crs=ccrs.PlateCarree())
        
        # Add gridlines
        gl = ax.gridlines(draw_labels=True)
        gl.top_labels = False
        gl.right_labels = False
        
        if animate:
            # Initialize path line and current position marker
            path_line, = ax.plot([], [], 'b-', alpha=0.5, linewidth=1, transform=ccrs.PlateCarree(),
                               label='Particle Path')
            current_pos_marker, = ax.plot([], [], 'ro', markersize=8, transform=ccrs.PlateCarree(),
                                        label='Current Position')
            
            # Add legend
            ax.legend(loc='upper right')
            
            # Add time counter text
            time_text = ax.text(0.02, 0.98, '', transform=ax.transAxes,
                              fontsize=10, color='black',
                              bbox=dict(facecolor='white', alpha=0.7, edgecolor='none'),
                              verticalalignment='top')
            
            # Set title
            title = "Single Plastic Particle Path Tracker\n"
            title += "Using real NOAA current data" if self.ocean_data.use_real_data else "Using simplified currents"
            title += f"\nStarting Position: {self.path_history[0][0]:.1f}°E, {self.path_history[0][1]:.1f}°N"
            ax.set_title(title)
            
            step_count = 0
            
            def update_frame(frame):
                nonlocal step_count
                if step_count < num_steps:
                    self.update()
                    step_count += 1
                
                # Convert path history to arrays for plotting
                path = np.array(self.path_history)
                
                # Update path line and current position marker
                path_line.set_data(path[:, 0], path[:, 1])
                current_pos_marker.set_data([self.current_pos[0]], [self.current_pos[1]])
                
                # Update time counter
                time_text.set_text(f'Day: {step_count} of {num_steps}\n'
                                 f'Current Position: {self.current_pos[0]:.1f}°E, {self.current_pos[1]:.1f}°N')
                
                return [path_line, current_pos_marker, time_text]
            
            anim = FuncAnimation(fig, update_frame, frames=num_steps,
                               interval=50, blit=True, repeat=False)
            plt.show()
        else:
            # Non-animated version
            step_count = 0
            while step_count < num_steps:
                self.update()
                step_count += 1
            
            # Plot final path
            path = np.array(self.path_history)
            ax.plot(path[:, 0], path[:, 1], 'b-', alpha=0.5, linewidth=1, transform=ccrs.PlateCarree(),
                   label='Particle Path')
            ax.plot([self.current_pos[0]], [self.current_pos[1]], 'ro', markersize=8,
                   transform=ccrs.PlateCarree(), label='Final Position')
            
            # Add legend
            ax.legend(loc='upper right')
            
            # Set title
            title = "Single Plastic Particle Path Tracker\n"
            title += "Using real NOAA current data" if self.ocean_data.use_real_data else "Using simplified currents"
            title += f"\nStarting Position: {self.path_history[0][0]:.1f}°E, {self.path_history[0][1]:.1f}°N"
            ax.set_title(title)
            
            plt.show()

if __name__ == "__main__":
    # Create and run the model with dt in days
    # Starting off the northern coast of Hawaii (156°W, 22°N)
    # Note: Converting 156°W to 204°E for our 0-360° system
    tracker = PlasticPathTracker(start_pos=(204, 22), dt=1, use_real_currents=True)  # dt = 1 day
    tracker.run_simulation(num_steps=500, animate=True)  # Will simulate 500 days total (1.37 years)
