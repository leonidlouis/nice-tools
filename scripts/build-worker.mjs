#!/usr/bin/env node
/**
 * Build script for workers
 * 
 * Compiles TypeScript workers with esbuild, bundling all dependencies
 * into single ESM files that can be loaded from /public/workers/.
 * 
 * Usage:
 *   node scripts/build-worker.mjs          # One-time build
 *   node scripts/build-worker.mjs --watch  # Watch mode for development
 */

import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const isWatch = process.argv.includes('--watch');

const workers = [
    {
        name: 'Compression',
        entry: resolve(projectRoot, 'src/workers/compression.worker.ts'),
        output: resolve(projectRoot, 'public/workers/compression.worker.js'),
    },
    {
        name: 'Video Converter',
        entry: resolve(projectRoot, 'src/workers/video-converter.worker.ts'),
        output: resolve(projectRoot, 'public/workers/video-converter.worker.js'),
    },
];

async function buildWorker(worker) {
    /** @type {import('esbuild').BuildOptions} */
    const buildOptions = {
        entryPoints: [worker.entry],
        outfile: worker.output,
        bundle: true,
        format: 'esm',
        platform: 'browser',
        target: ['chrome90', 'firefox90', 'safari15'],
        minify: !isWatch, // Only minify for production
        sourcemap: isWatch ? 'inline' : false,

        // Important: Define any Node.js globals that might leak through
        define: {
            'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
        },

        // Don't externalize anything - we want a complete bundle
        external: [],

        // Log level
        logLevel: 'info',
    };

    try {
        if (isWatch) {
            const ctx = await esbuild.context(buildOptions);
            await ctx.watch();
            console.log(`✅ ${worker.name} worker built. Watching for changes...`);
        } else {
            const result = await esbuild.build(buildOptions);
            console.log(`✅ ${worker.name} worker built successfully!`);

            if (result.metafile) {
                const outputs = Object.keys(result.metafile.outputs);
                console.log('   Output:', outputs.join(', '));
            }
        }
    } catch (error) {
        console.error(`❌ ${worker.name} worker build failed:`, error);
        throw error;
    }
}

async function build() {
    try {
        if (isWatch) {
            console.log('👀 Watching for worker changes...');
            await Promise.all(workers.map(buildWorker));
            console.log('✅ All workers built. Watching for changes...');
        } else {
            console.log('🔨 Building workers...');
            await Promise.all(workers.map(buildWorker));
            console.log('✅ All workers built successfully!');
        }
    } catch (error) {
        console.error('❌ Worker build failed:', error);
        process.exit(1);
    }
}

build();
