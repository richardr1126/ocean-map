# Ocean Plastic Tracker

A simulation tool for tracking plastic debris movement in ocean currents, incorporating real ocean currents, wind data, and eddy effects while avoiding land masses.

## Features

- Real ocean current data from NOAA's OSCAR dataset
- Real wind data from ECMWF's ERA5 reanalysis
- Simulated eddy currents using Gaussian random fields
- Robust land avoidance system
- Interactive visualization of particle trajectories

## Requirements

- Python 3.8+
- Required packages listed in `requirements.txt`

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/plastic-tracker.git
cd plastic-tracker
```

2. Create and activate a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
```

3. Install required packages:
```bash
pip install -r requirements.txt
```

## ERA5 Wind Data Setup

To use real wind data from ERA5, you need to:

1. Create a free account on the [Copernicus Climate Data Store](https://cds.climate.copernicus.eu/)
2. Accept the Terms of Use for the ERA5 dataset
3. Get your API key from your CDS account page
4. Create a file named `.cdsapirc` in your home directory with the following content:
```
url: https://cds.climate.copernicus.eu/api/v2
key: {API_KEY}
```
Replace `{API_KEY}` with your CDS API key.

On Unix systems (Linux/Mac):
```bash
echo 'url: https://cds.climate.copernicus.eu/api/v2' >> ~/.cdsapirc
echo 'key: {API_KEY}' >> ~/.cdsapirc
chmod 600 ~/.cdsapirc
```

On Windows, create the file at `%USERPROFILE%\.cdsapirc`

## Usage

1. Run the simulation:
```bash
python plastic_dispersion.py
```

2. Configuration options in `plastic_dispersion.py`:
   - `start_pos`: Starting position (longitude, latitude)
   - `dt`: Time step in days
   - `num_steps`: Number of simulation steps
   - `use_real_currents`: Whether to use real NOAA current data

## Data Sources

### Ocean Currents
- NOAA's OSCAR (Ocean Surface Current Analysis Real-time)
- 1/3 degree resolution
- 5-day average currents

### Wind Data
- ECMWF's ERA5 reanalysis
- 0.25 degree resolution
- Hourly data averaged to daily means
- 10m wind components (u, v)

### Land Boundaries
- Natural Earth Dataset
- 1:50m resolution coastlines

## Model Components

1. **Ocean Currents**
   - Real data from OSCAR dataset
   - Interpolated to particle position

2. **Wind Effects**
   - Real data from ERA5
   - 2% of wind speed affects surface particles
   - Bilinear interpolation for position

3. **Eddy Currents**
   - Simulated using Gaussian random fields
   - Spatial correlation through Gaussian filtering
   - Adds realistic turbulent motion

4. **Land Avoidance**
   - Multi-radius coastal detection
   - Repulsion forces from coastlines
   - Forward trajectory checking
   - Safe velocity adjustment

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
