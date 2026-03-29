import cv2
import mediapipe as mp
import numpy as np
import os
import tensorflow as tf
from tensorflow.keras import layers, models
import tensorflowjs as tfjs
import json
import time

# ----------------- CONFIG (v3: STATIC FOCUS) -----------------
# We only train on the 24 static letters shown in the image (A-Y)
STATIC_CLASSES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"]
MAX_IMAGES_PER_CLASS = 450 
BATCH_SIZE = 32
EPOCHS = 50
LANDMARKS_FILE = "asl_landmarks_static.npy"
LABELS_FILE = "asl_labels_static.npy"
META_FILE = "asl_meta_static.json"
# ------------------------------------------

# Load the dataset path
with open("dataset_path_unvoiced.txt", "r") as f:
    DATASET_ROOT = f.read().strip()

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5)

def normalize_landmarks(landmarks):
    lm = landmarks.landmark
    coords = np.array([[l.x, l.y, l.z] for l in lm])
    wrist = coords[0]
    coords -= wrist
    max_dist = np.max(np.linalg.norm(coords, axis=1))
    if max_dist > 0:
        coords /= max_dist
    return coords.flatten().tolist()

X = []
y = []
class_names = []

# Search for the training directory
train_dir = os.path.join(DATASET_ROOT, "asl_alphabet_train", "asl_alphabet_train")
if not os.path.exists(train_dir):
    train_dir = os.path.join(DATASET_ROOT, "asl_alphabet_train")

print(f"Opening Dataset: {train_dir}")
label_folders = sorted(os.listdir(train_dir))

# Extraction Loop
for idx, label in enumerate(label_folders):
    # FILTER: ONLY TRAIN ON THE USER'S STATIC REFERENCE
    if label.upper() not in STATIC_CLASSES:
        print(f"⏩ Skipping: {label} (Not in static focus)")
        continue
    
    label_path = os.path.join(train_dir, label)
    if not os.path.isdir(label_path): continue
    
    current_idx = STATIC_CLASSES.index(label.upper())
    print(f"➡ Extracting Landmarks: {label} (Focus Class {current_idx+1}/{len(STATIC_CLASSES)})")
    if label not in class_names:
        class_names.append(label)
    
    img_list = os.listdir(label_path)
    # Shuffle or just slice
    current_count = 0
    for img_name in img_list[:MAX_IMAGES_PER_CLASS]:
        img_path = os.path.join(label_path, img_name)
        image = cv2.imread(img_path)
        if image is None: continue
        
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        res = hands.process(image_rgb)
        
        if res.multi_hand_landmarks:
            X.append(normalize_landmarks(res.multi_hand_landmarks[0]))
            y.append(idx)
            current_count += 1
            
    print(f"   [OK] {current_count} features saved for {label}")

# Save Raw Features for Resuming
X = np.array(X)
y = np.array(y)
np.save(LANDMARKS_FILE, X)
np.save(LABELS_FILE, y)
with open(META_FILE, "w") as f:
    json.dump({"classes": class_names}, f)

print(f"\n✅ Total Training Samples: {len(X)}")

# 🚀 Residual Dense Model
def create_model(num_classes):
    inp = layers.Input(shape=(63,))
    
    # Block 1
    x = layers.Dense(256, activation='relu')(inp)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.2)(x)
    
    # Block 2 (Residual)
    res = x
    x = layers.Dense(256, activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.Add()([x, res])
    
    # Block 3
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.3)(x)
    
    out = layers.Dense(num_classes, activation='softmax')(x)
    return models.Model(inputs=inp, outputs=out)

model = create_model(len(class_names))
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

print("\n🏋️ Starting Neural Training...")
model.fit(X, y, epochs=EPOCHS, batch_size=BATCH_SIZE, validation_split=0.2, 
          callbacks=[tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)])

# 🏁 Export to Web Model
export_dir = "client_model"
os.makedirs(export_dir, exist_ok=True)
model.save("asl_model_final.h5")
tfjs.converters.save_keras_model(model, export_dir)

# Deployment Metadata
with open(os.path.join(export_dir, "metadata.json"), "w") as f:
    json.dump({"labels": class_names}, f)

print(f"\n🏆 VICTORY! Neural Engine deployed to {export_dir}")
