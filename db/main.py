import kagglehub
import pandas as pd
import os

# Download the dataset
path = kagglehub.dataset_download("vupeenthapamagar/nepal-earthquakes-datasets-1990-2026")

print("Path to dataset files:", path)

# List available files
print("\nAvailable files:")
for file in os.listdir(path):
    print(f"  - {file}")

# Load the CSV file
csv_file = os.path.join(path, "nepal_seismicity_master.csv")  # Adjust filename if needed
df = pd.read_csv(csv_file)

print(f"\nDataset loaded successfully with {len(df)} rows and {len(df.columns)} columns")