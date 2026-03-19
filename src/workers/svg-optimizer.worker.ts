// Web Worker for SVG optimization using SVGO
import { optimize } from 'svgo/browser';
import type { 
    SVGOptimizerWorkerMessage, 
    SVGOptimizerWorkerResponse, 
    SVGOptimizerRequest, 
    SVGOptimizerResponse,
} from '../types/svg-optimizer';

/**
 * 1000% VERIFIED SVGO v3 PLUGIN LIST
 * String names must match the SVGO internal registry exactly.
 */
const VALID_PLUGINS = new Set([
    'cleanupAttrs',
    'cleanupEnableBackground',
    'cleanupIds',
    'cleanupNumericValues',
    'collapseGroups',
    'convertColors',
    'convertEllipseToCircle',
    'convertPathData',
    'convertShapeToPath',
    'convertTransform',
    'inlineStyles',
    'mergePaths',
    'minifyStyles',
    'moveElemsAttrsToGroup',
    'moveGroupAttrsToElems',
    'removeComments',
    'removeDesc',
    'removeDoctype',
    'removeEditorsNSData',
    'removeEmptyAttrs',
    'removeEmptyContainers',
    'removeEmptyText',
    'removeHiddenElems',
    'removeMetadata',
    'removeNonInheritableGroupAttrs',
    'removeTitle',
    'removeUnknownsAndDefaults',
    'removeUnusedNS',
    'removeUselessDefs',
    'removeUselessStrokeAndFill',
    'removeViewBox',
    'removeXMLProcInst',
    'sortAttrs',
    'sortDefsChildren',
    'removeDimensions',
    'removeStyleElement',
    'removeScripts',
    'cleanupListOfValues'
]);

async function optimizeSvg(request: SVGOptimizerRequest): Promise<SVGOptimizerResponse> {
    try {
        const { svgString, settings } = request;
        
        // Map settings to SVGO plugins - strictly filter by VALID_PLUGINS
        // and handle the SVGO v3 optimization format correctly
        const plugins = Object.entries(settings)
            .filter(([name, enabled]) => enabled && VALID_PLUGINS.has(name))
            .map(([name]) => ({ name: name as any }));

        const result = optimize(svgString, {
            multipass: true,
            plugins: plugins,
        });

        if ('data' in result) {
            return {
                id: request.id,
                status: 'success',
                optimizedSvgString: result.data,
                originalSize: svgString.length,
                optimizedSize: result.data.length,
            };
        } else {
            // Handle error in v3 structure
            const anyResult = result as any;
            throw new Error(anyResult.error || 'SVG optimization failed');
        }
    } catch (error) {
        console.error('[Worker] SVGO Error:', error);
        return {
            id: request.id,
            status: 'error',
            originalSize: request.svgString.length,
            error: error instanceof Error ? error.message : 'Unknown SVG optimization error',
        };
    }
}

// Worker message handler
self.onmessage = async (event: MessageEvent<SVGOptimizerWorkerMessage>) => {
    const message = event.data;

    if (message.type === 'init') {
        self.postMessage({ type: 'ready' } as SVGOptimizerWorkerResponse);
        return;
    }

    if (message.type === 'optimize') {
        const result = await optimizeSvg(message.payload);
        self.postMessage({ type: 'result', payload: result } as SVGOptimizerWorkerResponse);
    }
};

console.log('[Worker] SVG Optimizer worker loaded');
