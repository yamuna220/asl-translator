/** Target feature vector [thumb, index, middle, ring, pinky, thumbTuck, spreadUV] (0 to 1) */
export type SignPattern = {
  word: string;
  pattern: [number, number, number, number, number, number, number];
};

/** High-Precision ASL Alphabet (Data-Driven Calibration) */
export const ASL_VOCABULARY: SignPattern[] = [
  { word: 'A', pattern: [0.1, 0.0, 0.0, 0.0, 0.0, 0.9, 0.0] },
  { word: 'B', pattern: [0.0, 1.0, 1.0, 1.0, 1.0, 0.1, 0.1] },
  { word: 'C', pattern: [0.3, 0.7, 0.7, 0.7, 0.7, 0.1, 0.4] },
  { word: 'D', pattern: [0.1, 1.0, 0.0, 0.0, 0.0, 0.8, 0.0] },
  { word: 'E', pattern: [0.0, 0.2, 0.2, 0.2, 0.2, 0.7, 0.0] },
  { word: 'F', pattern: [0.0, 0.0, 1.0, 1.0, 1.0, 0.8, 0.1] },
  { word: 'G', pattern: [0.2, 1.0, 0.0, 0.0, 0.0, 0.2, 0.0] },
  { word: 'H', pattern: [0.2, 1.0, 1.0, 0.0, 0.0, 0.2, 0.0] },
  { word: 'I', pattern: [0.0, 0.0, 0.0, 0.0, 1.0, 0.6, 0.0] },
  { word: 'K', pattern: [0.9, 1.0, 1.0, 0.0, 0.0, 0.2, 0.8] },
  { word: 'L', pattern: [1.0, 1.0, 0.0, 0.0, 0.0, 0.1, 0.2] },
  { word: 'M', pattern: [0.0, 0.1, 0.1, 0.1, 0.0, 0.95, 0.0] },
  { word: 'N', pattern: [0.0, 0.1, 0.1, 0.0, 0.0, 0.85, 0.0] },
  { word: 'O', pattern: [0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0] },
  { word: 'P', pattern: [0.8, 1.0, 1.0, 0.0, 0.0, 0.3, 0.5] },
  { word: 'Q', pattern: [0.2, 1.0, 0.0, 0.0, 0.0, 0.95, 0.0] },
  { word: 'R', pattern: [0.0, 1.0, 1.0, 0.0, 0.0, 0.3, 0.0] }, // Cross index/middle
  { word: 'S', pattern: [0.0, 0.0, 0.0, 0.0, 0.0, 0.95, 0.0] },
  { word: 'T', pattern: [0.0, 0.2, 0.0, 0.0, 0.0, 0.9, 0.0] },
  { word: 'U', pattern: [0.0, 1.0, 1.0, 0.0, 0.0, 0.6, 0.0] },
  { word: 'V', pattern: [0.0, 1.0, 1.0, 0.0, 0.0, 0.6, 0.9] },
  { word: 'W', pattern: [0.0, 1.0, 1.0, 1.0, 0.0, 0.5, 0.6] },
  { word: 'X', pattern: [0.0, 0.4, 0.0, 0.0, 0.0, 0.8, 0.0] },
  { word: 'Y', pattern: [1.0, 0.0, 0.0, 0.0, 1.0, 0.1, 0.2] },
  
  /** Common Signs */
  { word: 'hello', pattern: [1, 1, 1, 1, 1, 0, 0] },
  { word: 'thank you', pattern: [0, 1, 1, 1, 1, 0.2, 0] },
  { word: 'sorry', pattern: [0.0, 0.0, 0.0, 0.0, 0.0, 0.9, 0.0] },
  { word: 'yes', pattern: [0.0, 0.0, 0.0, 0.0, 0.0, 0.95, 0.0] },
  { word: 'no', pattern: [0.0, 0.5, 0.5, 0.0, 0.0, 0.7, 0.1] },
  { word: 'one', pattern: [0, 1, 0, 0, 0, 0.8, 0] },
  { word: 'two', pattern: [0, 1, 1, 0, 0, 0.7, 0.9] },
  { word: 'three', pattern: [1, 1, 1, 0, 0, 0.1, 0.8] },
  { word: 'four', pattern: [0, 1, 1, 1, 1, 0.7, 0.5] },
  { word: 'five', pattern: [1, 1, 1, 1, 1, 0.1, 0.5] },
];
