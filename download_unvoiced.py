import kagglehub

# Download the massive Unvoiced dataset (87,000 images)
print("Initializing Download: grassknoted/asl-alphabet...")
path = kagglehub.dataset_download("grassknoted/asl-alphabet")

print("Download Complete!")
print(f"Path to dataset files: {path}")

# Update dataset_path_unvoiced.txt
with open("dataset_path_unvoiced.txt", "w") as f:
    f.write(path)
