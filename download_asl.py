import kagglehub
import os

print("Downloading ayuraj/asl-dataset...")
path = kagglehub.dataset_download("ayuraj/asl-dataset")
print(f"DONE! Dataset downloaded to: {path}")

# Write the path to a temp file so the next script can find it
with open("dataset_path.txt", "w") as f:
    f.write(path)
