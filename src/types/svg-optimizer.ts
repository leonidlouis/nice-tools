export interface SVGOptimizerSettings {
  removeViewBox: boolean;
  cleanupIds: boolean;
  removeDimensions: boolean;
  removeDoctype: boolean;
  removeXMLProcInst: boolean;
  removeComments: boolean;
  removeMetadata: boolean;
  removeEditorsNSData: boolean;
  cleanupAttrs: boolean;
  inlineStyles: boolean;
  minifyStyles: boolean;
  cleanupEnableBackground: boolean;
  removeUselessDefs: boolean;
  cleanupNumericValues: boolean;
  convertColors: boolean;
  removeNonInheritableGroupAttrs: boolean;
  removeUselessStrokeAndFill: boolean;
  removeUnusedNS: boolean;
  moveElemsAttrsToGroup: boolean;
  moveGroupAttrsToElems: boolean;
  collapseGroups: boolean;
  removeRasterImages: boolean;
  mergePaths: boolean;
  convertShapeToPath: boolean;
  convertEllipseToCircle: boolean;
  sortAttrs: boolean;
  removeEmptyAttrs: boolean;
  removeEmptyContainers: boolean;
  removeEmptyText: boolean;
  removeHiddenElems: boolean;
  convertPathData: boolean;
  convertTransform: boolean;
  removeStyleElement: boolean;
  removeScripts: boolean;
  cleanupListOfValues: boolean;
  removeUnknownsAndDefaults: boolean;
}

export interface SVGOptimizerRequest {
  id: string;
  svgString: string;
  settings: SVGOptimizerSettings;
}

export interface SVGOptimizerResponse {
  id: string;
  status: 'success' | 'error';
  optimizedSvgString?: string;
  originalSize: number;
  optimizedSize?: number;
  error?: string;
}

export type SVGOptimizerWorkerMessage = 
  | { type: 'optimize'; payload: SVGOptimizerRequest }
  | { type: 'init' };

export type SVGOptimizerWorkerResponse = 
  | { type: 'ready' }
  | { type: 'result'; payload: SVGOptimizerResponse };
