import os
import numpy as np
from netCDF4 import Dataset
from scipy.interpolate import RegularGridInterpolator

class OceanCurrentData:
    """Class to handle ocean current data from NOAA's OSCAR dataset."""
    
    def __init__(self, use_real_data=False):
        self.u_currents = None  # Zonal velocity (East-West)
        self.v_currents = None  # Meridional velocity (North-South)
        self.lat = None
        self.lon = None
        self.u_interpolator = None
        self.v_interpolator = None
        self.dt = None  # Time step in hours
        self.use_real_data = use_real_data
        
        if use_real_data:
            self.load_oscar_data('oscar_currents_interim_20200101.nc')
            
    def load_oscar_data(self, file_path):
        """
        Load OSCAR ocean current data from a local NetCDF file.
        
        Parameters:
        -----------
        file_path : str
            Path to the OSCAR NetCDF file
        """
        try:
            print("Loading ocean current data...")
            
            # Read the NetCDF file
            with Dataset(file_path, 'r') as nc:
                # Extract the data for the first (and only) time step
                self.u_currents = nc.variables['u'][0]  # Shape: (longitude, latitude)
                self.v_currents = nc.variables['v'][0]
                self.lat = nc.variables['lat'][:]
                self.lon = nc.variables['lon'][:]
                
                # Create interpolators for u and v velocities
                self.u_interpolator = RegularGridInterpolator(
                    (self.lat, self.lon),  # Note: lat first, then lon
                    self.u_currents.T,  # Transpose to match coordinate order
                    method='linear',
                    bounds_error=False,
                    fill_value=0.0
                )
                
                self.v_interpolator = RegularGridInterpolator(
                    (self.lat, self.lon),  # Note: lat first, then lon
                    self.v_currents.T,
                    method='linear',
                    bounds_error=False,
                    fill_value=0.0
                )
            
            print("Ocean current data loaded successfully!")
            return True
            
        except Exception as e:
            print(f"Error loading ocean current data: {str(e)}")
            return False
    
    def get_current_velocity(self, position, domain_size):
        """
        Get interpolated current velocity at a given position.
        
        Parameters:
        -----------
        position : tuple
            (longitude, latitude) position
        domain_size : tuple
            Size of the domain in (longitude_range, latitude_range)
            
        Returns:
        --------
        numpy.ndarray
            [u, v] current velocities as a numpy array in m/s
        """
        if self.u_interpolator is None or self.v_interpolator is None:
            return np.zeros(2)
        
        lon, lat = position
        
        # Handle periodic boundary conditions for longitude
        lon = np.mod(lon, 360)
        
        # Clip latitude to valid range
        lat = np.clip(lat, -89.75, 89.75)
        
        # Get interpolated velocities
        try:
            u = float(self.u_interpolator((lat, lon)))  # Note: lat first, then lon
            v = float(self.v_interpolator((lat, lon)))  # Note: lat first, then lon
            
            # Scale factor to convert m/s to degrees/timestep
            # At the equator, 1 degree longitude ≈ 111 km
            # So 1 m/s ≈ 0.0324 degrees/hour
            scale_factor = 0.0324 * self.dt * 3600  # Convert to degrees per timestep
            
            # Adjust latitude scaling for meridional velocity
            # As we move away from the equator, longitude degrees get smaller
            lat_factor = np.cos(np.radians(lat))
            u = u * scale_factor / lat_factor  # Adjust zonal velocity for latitude
            v = v * scale_factor  # Meridional velocity doesn't need adjustment
            
            return np.array([u, v])
        except:
            return np.zeros(2)  # Return zero velocity if interpolation fails
