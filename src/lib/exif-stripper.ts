// EXIF Stripper orchestration - uses Web Worker for local processing

import type { ImageFile, StrippingRequest, StrippingResponse, MetadataSummary } from '@/types/exif-stripper';

/**
 * Generates a unique ID for file tracking.
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Formats bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Supported file types for stripping
export const SUPPORTED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
];

export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Validate file type
export function isValidImageFile(file: File): boolean {
    const typeValid = SUPPORTED_TYPES.includes(file.type.toLowerCase());
    const extensionValid = SUPPORTED_EXTENSIONS.some(ext =>
        file.name.toLowerCase().endsWith(ext)
    );
    return typeValid || extensionValid;
}

// Simple worker management for EXIF stripping (one worker for now, or multiple if needed)
class ExifStripperWorker {
    private worker: Worker | null = null;
    private pendingTasks: Map<string, (response: StrippingResponse) => void> = new Map();

    async initialize(): Promise<void> {
        if (this.worker) return;

        return new Promise((resolve, reject) => {
            // The worker will be built to /workers/exif-stripper.worker.js
            this.worker = new Worker('/workers/exif-stripper.worker.js', {
                type: 'module'
            });

            const handleInit = (event: MessageEvent) => {
                if (event.data.type === 'ready') {
                    this.worker?.removeEventListener('message', handleInit);
                    this.worker?.addEventListener('message', this.handleMessage.bind(this));
                    resolve();
                }
            };

            this.worker.addEventListener('message', handleInit);
            this.worker.addEventListener('error', (e) => reject(e));
            this.worker.postMessage({ type: 'init' });
        });
    }

    private handleMessage(event: MessageEvent) {
        const { type, payload } = event.data;
        if (type === 'result') {
            const callback = this.pendingTasks.get(payload.id);
            if (callback) {
                callback(payload);
                this.pendingTasks.delete(payload.id);
            }
        }
    }

    async strip(request: StrippingRequest): Promise<StrippingResponse> {
        await this.initialize();
        return new Promise((resolve) => {
            this.pendingTasks.set(request.id, resolve);
            this.worker?.postMessage({ type: 'strip', payload: request }, [request.imageData]);
        });
    }

    terminate() {
        this.worker?.terminate();
        this.worker = null;
        this.pendingTasks.clear();
    }
}

const stripperWorker = new ExifStripperWorker();

export async function stripMetadata(
    imageFile: ImageFile,
    onProgress: (file: ImageFile) => void
): Promise<ImageFile> {
    const processingFile: ImageFile = { ...imageFile, status: 'processing' };
    onProgress(processingFile);

    try {
        const data = await imageFile.file.arrayBuffer();
        const request: StrippingRequest = {
            id: imageFile.id,
            imageData: data,
            fileName: imageFile.name,
            mimeType: imageFile.file.type || 'image/jpeg',
        };

        const response = await stripperWorker.strip(request);

        if (response.status === 'error') {
            throw new Error(response.error || 'Stripping failed');
        }

        const strippedBlob = new Blob([response.strippedData!], {
            type: imageFile.file.type,
        });

        const result: ImageFile = {
            ...imageFile,
            status: 'done',
            strippedSize: response.strippedSize,
            strippedBlob,
            metadata: response.metadata,
        };

        onProgress(result);
        return result;
    } catch (error) {
        console.error('Stripping error:', error);
        const errorFile: ImageFile = {
            ...imageFile,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        onProgress(errorFile);
        return errorFile;
    }
}

export async function stripMultipleFiles(
    files: ImageFile[],
    onProgress: (file: ImageFile) => void
): Promise<ImageFile[]> {
    await stripperWorker.initialize();
    
    // Process sequentially for now to avoid memory spikes, 
    // but could be done in parallel with a pool similar to compression.ts
    const results: ImageFile[] = [];
    for (const file of files) {
        if (file.status === 'done') {
            results.push(file);
            continue;
        }
        const result = await stripMetadata(file, onProgress);
        results.push(result);
    }
    
    // We don't necessarily want to terminate after every batch if the user stays on the page
    // but for now let's keep it simple.
    return results;
}
