// EXIF Stripper types for the tools.bylouis.io app

export type StrippingStatus = 'pending' | 'processing' | 'done' | 'error';

export interface MetadataSummary {
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  cameraModel?: string;
  cameraMake?: string;
  dateTaken?: string;
  software?: string;
  exposureTime?: string;
  iso?: number;
  fNumber?: number;
  focalLength?: string;
  privacyScore: number; // 0-100, higher is worse for privacy
}

export interface ImageFile {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  strippedSize?: number;
  strippedBlob?: Blob;
  status: StrippingStatus;
  metadata?: MetadataSummary;
  error?: string;
}

// Worker message types
export interface StrippingRequest {
  id: string;
  imageData: ArrayBuffer;
  fileName: string;
  mimeType: string;
}

export interface StrippingResponse {
  id: string;
  status: 'success' | 'error';
  strippedData?: ArrayBuffer;
  metadata?: MetadataSummary;
  originalSize: number;
  strippedSize?: number;
  error?: string;
}

export type WorkerMessage =
  | { type: 'strip'; payload: StrippingRequest }
  | { type: 'init' };

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; payload: StrippingResponse };
