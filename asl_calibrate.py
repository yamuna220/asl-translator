import cv2
import mediapipe as mp
import numpy as np
import os
import json
import math

# Load the dataset path
with open("dataset_path.txt", "r") as f:
    DATASET_ROOT = f.read().strip()

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5)

def dist(p1, p2):
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)

def vec_sub(p1, p2):
    return np.array([p1.x - p2.x, p1.y - p2.y, p1.z - p2.z])

def angle_between(v1, v2):
    v1_u = v1 / np.linalg.norm(v1)
    v2_u = v2 / np.linalg.norm(v2)
    return np.arccos(np.clip(np.dot(v1_u, v2_u), -1.0, 1.0))

def clamp01(n):
    return max(0, min(1, n))

def get_extension_score(mcp, pip, tip, wrist):
    # Angle score
    v1 = vec_sub(mcp, pip)
    v2 = vec_sub(tip, pip)
    ang = angle_between(v1, v2)
    ang_norm = ang / math.PI
    angle_score = clamp01((ang_norm - 0.35) / 0.5)
    
    # Distance score
    d_tip = dist(wrist, tip)
    d_pip = dist(wrist, pip)
    dist_score = clamp01((d_tip / max(1e-6, d_pip) - 1) / 0.8)
    
    return clamp01(dist_score * 0.45 + angle_score * 0.55)

def extract_features(landmarks):
    lm = landmarks.landmark
    w = lm[0]
    
    # Thumb: dist(4, 17) / dist(2, 17) - 0.7
    thumb_ext = clamp01((dist(lm[4], lm[17]) / max(1e-6, dist(lm[2], lm[17]))) - 0.7)
    
    # Fingers
    index_ext = get_extension_score(lm[5], lm[7], lm[8], w)
    middle_ext = get_extension_score(lm[9], lm[11], lm[12], w)
    ring_ext = get_extension_score(lm[13], lm[15], lm[16], w)
    pinky_ext = get_extension_score(lm[17], lm[19], lm[20], w)
    
    # Thumb Tuck: 1 - min(dist(4, 5), dist(4, 9)) / 0.15
    thumb_tuck = clamp01(1 - (min(dist(lm[4], lm[5]), dist(lm[4], lm[9])) / 0.15))
    
    # Spread UV: dist(8, 12) / 0.2 - 0.2
    spread_uv = clamp01((dist(lm[8], lm[12]) / 0.2) - 0.2)
    
    return [thumb_ext, index_ext, middle_ext, ring_ext, pinky_ext, thumb_tuck, spread_uv]

results = {} # { label: [sum_vectors, count] }

print(f"Scanning images in {DATASET_ROOT}...")

# The dataset is usually structured as dataset/asl_dataset/A, dataset/asl_dataset/B, etc.
search_path = os.path.join(DATASET_ROOT, "asl_dataset")
if not os.path.exists(search_path):
    search_path = DATASET_ROOT # fallback

for label in sorted(os.listdir(search_path)):
    label_path = os.path.join(search_path, label)
    if not os.path.isdir(label_path): continue
    
    print(f"Processing label: {label}")
    count = 0
    vector_sum = np.zeros(7)
    
    for img_name in os.listdir(label_path)[:30]: # Sample 30 images per label for speed
        img_path = os.path.join(label_path, img_name)
        image = cv2.imread(img_path)
        if image is None: continue
        
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        res = hands.process(image_rgb)
        
        if res.multi_hand_landmarks:
            features = extract_features(res.multi_hand_landmarks[0])
            vector_sum += np.array(features)
            count += 1
            
    if count > 0:
        results[label] = (vector_sum / count).tolist()

# Print as TS array
print("\n--- FINAL CALIBRATION DATA (ASL_VOCABULARY) ---\n")
json_output = []
for label, vec in results.items():
    # Format the vector for TS
    formatted_vec = [round(x, 3) for x in vec]
    json_output.append({"word": label, "pattern": formatted_vec})

print(json.dumps(json_output, indent=2))
