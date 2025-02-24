import cdsapi
import xarray as xr
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta

class WindData:
    def __init__(self):
        self.client = None
        self.wind_u = None  # Zonal wind component (West-East)
        self.wind_v = None  # Meridional wind component (South-North)
        self.lons = None
        self.lats = None

    def download_era5_data(self, year=None, month=None, day=None):
        """
        Download ERA5 wind data for a specific date.
        If no date provided or if requested date is unavailable, use a fallback date.
        """
        if year is None or month is None or day is None:
            # Use a known good date as fallback
            year, month, day = 2025, 2, 12
        
        try:
            self.client = cdsapi.Client()
            
            output_file = f'wind_data_{year}{month:02d}{day:02d}.nc'
            if not Path(output_file).exists():
                print(f"Downloading wind data for {year}-{month:02d}-{day:02d}...")
                self.client.retrieve(
                    'reanalysis-era5-single-levels',
                    {
                        'product_type': 'reanalysis',
                        'variable': [
                            '10m_u_component_of_wind',
                            '10m_v_component_of_wind',
                        ],
                        'year': str(year),
                        'month': f"{month:02d}",
                        'day': f"{day:02d}",
                        'time': [f"{hour:02d}:00" for hour in range(24)],
                        'format': 'netcdf',
                    },
                    output_file
                )
            
            # Load the NetCDF file
            ds = xr.open_dataset(output_file)
            
            # Store wind components (daily mean)
            self.wind_u = ds['u10'].mean(dim='time').values
            self.wind_v = ds['v10'].mean(dim='time').values
            self.lons = ds['longitude'].values
            self.lats = ds['latitude'].values
            
            ds.close()
            print(f"Successfully loaded wind data for {year}-{month:02d}-{day:02d}")
            
        except Exception as e:
            print(f"Error loading wind data: {str(e)}")
            print("Using fallback date: 2025-02-12")
            # Try again with fallback date if we haven't already
            if (year, month, day) != (2025, 2, 12):
                self.download_era5_data(2025, 2, 12)
            else:
                # If even fallback fails, initialize with zeros
                print("Warning: Using zero wind field as fallback")
                self.wind_u = np.zeros((181, 360))  # -90 to 90 lat, 0 to 359 lon
                self.wind_v = np.zeros((181, 360))
                self.lons = np.arange(0, 360)
                self.lats = np.linspace(-90, 90, 181)

    def get_wind_velocity(self, position):
        """
        Get interpolated wind velocity at a given position.
        Args:
            position: tuple (longitude, latitude)
        Returns:
            tuple (u_wind, v_wind) in m/s
        """
        if self.wind_u is None or self.wind_v is None:
            return np.array([0., 0.])

        lon, lat = position
        
        # Convert longitude to 0-360 range if needed
        lon = lon % 360
        
        # Find indices for interpolation
        lon_idx = np.searchsorted(self.lons, lon)
        lat_idx = np.searchsorted(self.lats, lat)
        
        # Bilinear interpolation
        lon_prev = self.lons[lon_idx - 1]
        lon_next = self.lons[lon_idx]
        lat_prev = self.lats[lat_idx - 1]
        lat_next = self.lats[lat_idx]
        
        # Calculate weights
        w_lon = (lon - lon_prev) / (lon_next - lon_prev)
        w_lat = (lat - lat_prev) / (lat_next - lat_prev)
        
        # Get wind components at surrounding points
        u00 = self.wind_u[lat_idx-1, lon_idx-1]
        u01 = self.wind_u[lat_idx-1, lon_idx]
        u10 = self.wind_u[lat_idx, lon_idx-1]
        u11 = self.wind_u[lat_idx, lon_idx]
        
        v00 = self.wind_v[lat_idx-1, lon_idx-1]
        v01 = self.wind_v[lat_idx-1, lon_idx]
        v10 = self.wind_v[lat_idx, lon_idx-1]
        v11 = self.wind_v[lat_idx, lon_idx]
        
        # Interpolate
        u_wind = (1 - w_lon) * (1 - w_lat) * u00 + \
                 w_lon * (1 - w_lat) * u01 + \
                 (1 - w_lon) * w_lat * u10 + \
                 w_lon * w_lat * u11
        
        v_wind = (1 - w_lon) * (1 - w_lat) * v00 + \
                 w_lon * (1 - w_lat) * v01 + \
                 (1 - w_lon) * w_lat * v10 + \
                 w_lon * w_lat * v11
        
        return np.array([u_wind, v_wind])
