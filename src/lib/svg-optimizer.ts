import { 
    SVGOptimizerSettings, 
    SVGOptimizerRequest, 
    SVGOptimizerResponse,
    SVGOptimizerWorkerMessage,
    SVGOptimizerWorkerResponse
} from '@/types/svg-optimizer';

let worker: Worker | null = null;
const pendingRequests = new Map<string, (response: SVGOptimizerResponse) => void>();

export function initSVGOptimizerWorker() {
    if (typeof window === 'undefined') return;
    if (worker) return;

    worker = new Worker('/workers/svg-optimizer.worker.js', { type: 'module' });

    worker.onmessage = (event: MessageEvent<SVGOptimizerWorkerResponse>) => {
        const message = event.data;
        if (message.type === 'result') {
            const resolve = pendingRequests.get(message.payload.id);
            if (resolve) {
                resolve(message.payload);
                pendingRequests.delete(message.payload.id);
            }
        }
    };

    worker.postMessage({ type: 'init' } as SVGOptimizerWorkerMessage);
}

export async function optimizeSvg(
    svgString: string, 
    settings: SVGOptimizerSettings
): Promise<SVGOptimizerResponse> {
    if (!worker) {
        initSVGOptimizerWorker();
    }

    if (!worker) {
        throw new Error('Failed to initialize SVG Optimizer worker');
    }

    const id = Math.random().toString(36).substring(7);
    const request: SVGOptimizerRequest = { id, svgString, settings };

    return new Promise((resolve) => {
        pendingRequests.set(id, resolve);
        worker!.postMessage({ type: 'optimize', payload: request } as SVGOptimizerWorkerMessage);
    });
}

/**
 * STRICT SVGO v3 PLUGIN REGISTRY
 * Based on verified mapping from official SVGO v3 documentation and source.
 */
export const defaultSettings: SVGOptimizerSettings = {
    removeViewBox: false,
    cleanupIds: true,
    removeDimensions: true,
    removeDoctype: true,
    removeXMLProcInst: true,
    removeComments: true,
    removeMetadata: true,
    removeEditorsNSData: true,
    cleanupAttrs: true,
    inlineStyles: true,
    minifyStyles: true,
    cleanupEnableBackground: true,
    removeUselessDefs: true,
    cleanupNumericValues: true,
    convertColors: true,
    removeNonInheritableGroupAttrs: true,
    removeUselessStrokeAndFill: true,
    removeUnusedNS: true,
    moveElemsAttrsToGroup: true,
    moveGroupAttrsToElems: true,
    collapseGroups: true,
    removeRasterImages: true,
    mergePaths: true,
    convertShapeToPath: true,
    convertEllipseToCircle: true,
    sortAttrs: true,
    removeEmptyAttrs: true,
    removeEmptyContainers: true,
    removeEmptyText: true,
    removeHiddenElems: true,
    convertPathData: true,
    convertTransform: true,
    removeStyleElement: false,
    removeScripts: true,
    cleanupListOfValues: true,
    removeUnknownsAndDefaults: true,
};
