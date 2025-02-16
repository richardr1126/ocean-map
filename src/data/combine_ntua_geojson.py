import os
import json
import glob

def combine_geojson_files():
    # Get all geojson files in the label_geojson directory
    geojson_files = glob.glob("label_geojson/*.geojson")
    
    # Combined features list
    all_features = []
    crs = None
    
    # Read each geojson file and combine their features
    for file_path in geojson_files:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                # Store CRS from first file if available
                if crs is None and 'crs' in data:
                    crs = data['crs']
                if 'features' in data:
                    all_features.extend(data['features'])
                else:
                    print(f"Warning: No features found in {file_path}")
        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}")
    
    # Create the combined GeoJSON structure
    combined_geojson = {
        "type": "FeatureCollection",
        "features": all_features
    }
    
    # Add CRS if it was found
    if crs:
        combined_geojson["crs"] = crs
    
    # Save the combined data
    output_path = "combined_ntua_data.json"
    with open(output_path, 'w') as f:
        json.dump(combined_geojson, f, indent=2)
    
    print(f"Combined {len(geojson_files)} files with {len(all_features)} total features")
    print(f"Output saved to {output_path}")

if __name__ == "__main__":
    combine_geojson_files()