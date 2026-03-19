// Web Worker for EXIF and metadata stripping
// Processes images locally to ensure privacy
import ExifReader from 'exifreader';
import * as piexif from 'piexifjs';
import type { 
    WorkerMessage, 
    WorkerResponse, 
    StrippingRequest, 
    StrippingResponse,
    MetadataSummary
} from '../types/exif-stripper';

async function processImage(request: StrippingRequest): Promise<StrippingResponse> {
    try {
        const { id, imageData, mimeType } = request;
        
        // 1. Extract metadata first
        let metadata: MetadataSummary = { privacyScore: 0 };
        try {
            const tags = ExifReader.load(imageData);
            metadata = extractSummary(tags);
        } catch (e) {
            console.warn('[Worker] Failed to extract metadata:', e);
        }

        // 2. Strip metadata
        let strippedData: ArrayBuffer;
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            strippedData = stripJpeg(imageData);
        } else if (mimeType === 'image/png') {
            strippedData = stripPng(imageData);
        } else if (mimeType === 'image/webp') {
            strippedData = stripWebp(imageData);
        } else {
            throw new Error(`Unsupported mime type: ${mimeType}`);
        }

        return {
            id,
            status: 'success',
            strippedData,
            metadata,
            originalSize: imageData.byteLength,
            strippedSize: strippedData.byteLength,
        };
    } catch (error) {
        console.error('[Worker] Stripping failed:', error);
        return {
            id: request.id,
            status: 'error',
            originalSize: request.imageData.byteLength,
            error: error instanceof Error ? error.message : 'Unknown stripping error',
        };
    }
}

function extractSummary(tags: any): MetadataSummary {
    const summary: MetadataSummary = {
        privacyScore: 0
    };

    // Latitude/Longitude
    if (tags.GPSLatitude && tags.GPSLongitude) {
        const lat = parseFloat(tags.GPSLatitude.description);
        const lon = parseFloat(tags.GPSLongitude.description);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            summary.gps = {
                latitude: lat,
                longitude: lon,
            };
            
            if (tags.GPSAltitude) {
                const alt = parseFloat(tags.GPSAltitude.description);
                if (!isNaN(alt)) {
                    summary.gps.altitude = alt;
                }
            }
            summary.privacyScore += 50;
        }
    }

    // Camera Info
    if (tags.Model) {
        summary.cameraModel = tags.Model.description;
        summary.privacyScore += 10;
    }
    
    if (tags.Make) {
        summary.cameraMake = tags.Make.description;
    }

    // Date/Time
    if (tags.DateTimeOriginal) {
        summary.dateTaken = tags.DateTimeOriginal.description;
        summary.privacyScore += 10;
    } else if (tags.DateTime) {
        summary.dateTaken = tags.DateTime.description;
        summary.privacyScore += 5;
    }

    // Software
    if (tags.Software) {
        summary.software = tags.Software.description;
        summary.privacyScore += 5;
    }

    // Technical details (less privacy impact but good to show)
    if (tags.ExposureTime) {
        summary.exposureTime = tags.ExposureTime.description;
    }

    if (tags.ISOSpeedRatings) {
        summary.iso = parseInt(tags.ISOSpeedRatings.description);
    }

    if (tags.FNumber) {
        summary.fNumber = parseFloat(tags.FNumber.description);
    }

    if (tags.FocalLength) {
        summary.focalLength = tags.FocalLength.description;
    }

    // Check for user comments or other text fields
    if (tags.UserComment || tags.ImageDescription) {
        summary.privacyScore += 10;
    }

    // Cap privacy score at 100
    summary.privacyScore = Math.min(summary.privacyScore, 100);

    return summary;
}

function stripJpeg(data: ArrayBuffer): ArrayBuffer {
    try {
        const binary = arrayBufferToBinaryString(data);
        const stripped = piexif.remove(binary);
        return binaryStringToArrayBuffer(stripped);
    } catch (e) {
        // piexif.remove might throw if there's no EXIF marker
        return data;
    }
}

// Helpers for piexifjs
function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return binary;
}

function binaryStringToArrayBuffer(binary: string): ArrayBuffer {
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function stripPng(data: ArrayBuffer): ArrayBuffer {
    const view = new DataView(data);
    const result: Uint8Array[] = [];
    let offset = 8; // Skip PNG signature

    result.push(new Uint8Array(data.slice(0, 8)));

    while (offset < data.byteLength) {
        if (offset + 8 > data.byteLength) break;
        
        const length = view.getUint32(offset);
        const type = String.fromCharCode(
            view.getUint8(offset + 4),
            view.getUint8(offset + 5),
            view.getUint8(offset + 6),
            view.getUint8(offset + 7)
        );

        // Chunks to remove for privacy
        // We keep critical chunks: IHDR, PLTE, IDAT, IEND
        // We keep color-related chunks: gAMA, cHRM, sRGB, iCCP (optional but better for rendering)
        const sensitiveChunks = ['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME', 'pHYs', 'dSIG'];
        
        if (!sensitiveChunks.includes(type)) {
            const chunkEnd = offset + 12 + length;
            if (chunkEnd <= data.byteLength) {
                result.push(new Uint8Array(data.slice(offset, chunkEnd)));
            }
        }

        offset += 12 + length;
    }

    return combineUint8Arrays(result).buffer as ArrayBuffer;
}

function stripWebp(data: ArrayBuffer): ArrayBuffer {
    const view = new DataView(data);
    const result: Uint8Array[] = [];
    
    // WebP signature: 'RIFF' .... 'WEBP'
    if (data.byteLength < 12 || view.getUint32(0) !== 0x52494646 || view.getUint32(8) !== 0x57454250) {
        return data; // Not a valid WebP
    }

    result.push(new Uint8Array(data.slice(0, 12)));
    let offset = 12;

    while (offset < data.byteLength) {
        if (offset + 8 > data.byteLength) break;

        const type = String.fromCharCode(
            view.getUint8(offset),
            view.getUint8(offset + 1),
            view.getUint8(offset + 2),
            view.getUint8(offset + 3)
        );
        const length = view.getUint32(offset + 4, true);
        const paddedLength = length % 2 === 1 ? length + 1 : length;

        // Chunks to remove for privacy
        const sensitiveChunks = ['EXIF', 'XMP '];
        
        if (!sensitiveChunks.includes(type)) {
            const chunkEnd = offset + 8 + paddedLength;
            if (chunkEnd <= data.byteLength) {
                result.push(new Uint8Array(data.slice(offset, chunkEnd)));
            }
        }

        offset += 8 + paddedLength;
    }

    const combined = combineUint8Arrays(result);
    
    // Update RIFF size
    if (combined.byteLength >= 8) {
        const combinedView = new DataView(combined.buffer);
        combinedView.setUint32(4, combined.byteLength - 8, true);
    }
    
    return combined.buffer as ArrayBuffer;
}

function combineUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
    const combined = new Uint8Array(totalLength);
    let currentOffset = 0;
    for (const arr of arrays) {
        combined.set(arr, currentOffset);
        currentOffset += arr.length;
    }
    return combined;
}

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;

    if (message.type === 'init') {
        self.postMessage({ type: 'ready' } as WorkerResponse);
        return;
    }

    if (message.type === 'strip') {
        const result = await processImage(message.payload);
        const response: WorkerResponse = { type: 'result', payload: result };

        if (result.strippedData) {
            self.postMessage(response, { transfer: [result.strippedData] });
        } else {
            self.postMessage(response);
        }
    }
};

console.log('[Worker] EXIF Stripper worker loaded');
