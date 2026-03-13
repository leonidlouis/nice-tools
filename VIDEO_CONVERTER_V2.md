# Video Converter V2 - Progressive Enhancement with WebCodecs

## Overview

This document outlines the architectural improvements for the Video Converter tool, introducing WebCodecs API as a performance optimization while maintaining backward compatibility with ffmpeg.wasm.

---

## 1. What

### Current Implementation (V1)
- **Technology**: ffmpeg.wasm (`@ffmpeg/ffmpeg` v0.12.10)
- **Execution**: Runs in Web Worker to avoid blocking UI
- **Threading**: Optional multi-threading toggle (requires COOP/COEP headers)
- **Performance**: 10-30x slower than native FFmpeg
- **Bundle Size**: ~25-30MB download required

### New Implementation (V2)
- **Primary Technology**: WebCodecs API (hardware-accelerated video encoding/decoding)
- **Fallback Technology**: ffmpeg.wasm (for browsers without WebCodecs support - labeled as "Legacy Mode")
- **Architecture**: Progressive enhancement - automatically uses best available option
- **Performance**: 5-20x faster on supported browsers (hardware-accelerated)
- **Bundle Size**: Near-zero additional overhead (uses browser's built-in codecs)

### Supported Output Formats by Technology

| Format | WebCodecs (Default) | ffmpeg.wasm (Legacy) |
|--------|---------------------|---------------------|
| WebM (VP8) | ✅ Supported | ✅ Supported |
| WebM (VP9) | ✅ Supported | ✅ Supported |
| H.264/MP4 | ✅ Supported | ❌ Not in current build |
| GIF | ❌ Not supported | ✅ Supported |

---

## 2. Why

### Problems with Current Implementation

1. **Slow Performance**
   - ffmpeg.wasm is 10-30x slower than native FFmpeg
   - Even with multi-threading, processing large videos is time-consuming
   - Users on slower devices experience significant delays

2. **Large Bundle Size**
   - Users must download ~25-30MB of WASM files
   - First-time use has long load times
   - Impacts perceived performance of the app

3. **Limited Browser Support for Multi-threading**
   - Multi-threading requires COOP/COEP headers
   - Many hosting platforms don't support these headers
   - Falls back to single-threaded (slowest option)

4. **Poor User Experience**
   - No visibility into why conversion is slow
   - Users on modern hardware don't benefit from their capabilities

### Benefits of WebCodecs Integration

1. **Hardware Acceleration**
   - Uses browser's built-in video codecs (same as native video playback)
   - Leverages GPU for encoding/decoding
   - 5-20x performance improvement over ffmpeg.wasm

2. **Zero Bundle Overhead**
   - No additional downloads required
   - Uses codecs already present in the browser
   - Instant availability on supported browsers

3. **Better Battery Life**
   - Hardware acceleration is more power-efficient
   - Reduces CPU usage on laptops and mobile devices

4. **Future-Proof**
   - WebCodecs is a W3C standard
   - Browser support is growing (95%+ of users)
   - Aligns with web platform evolution

### Why Keep ffmpeg.wasm as Fallback

1. **Browser Compatibility**
   - WebCodecs not supported in older browsers (Safari <16.4, older Firefox)
   - Some browsers lack encoding support for certain codecs
   - ~5% of users may not have full WebCodecs support

2. **Format Support**
   - ffmpeg.wasm supports more formats and codecs
   - GIF generation requires ffmpeg.wasm
   - Future format expansions can use ffmpeg.wasm

3. **Reliability**
   - ffmpeg.wasm is mature and well-tested
   - Works regardless of browser capabilities
   - Provides consistent output

---

## 3. How

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Video Converter V2                        │
├─────────────────────────────────────────────────────────────┤
│  User Upload                                                 │
│      │                                                       │
│      ▼                                                       │
│  ┌─────────────────────┐                                     │
│  │ Capability Detection │                                    │
│  │ - WebCodecs support  │                                    │
│  │ - Codec availability │                                    │
│  └─────────────────────┘                                     │
│      │                                                       │
│      ▼                                                       │
│  ┌───────────┐  OR  ┌─────────────┐                         │
│  │ WebCodecs │      │ ffmpeg.wasm │                         │
│  │ (Default) │      │ (Legacy)    │                         │
│  └───────────┘      └─────────────┘                         │
│      │                   │                                   │
│      └─────────┬─────────┘                                   │
│                ▼                                             │
│         Output File                                          │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Details

#### Step 1: Capability Detection

```typescript
// src/lib/video-conversion.ts

interface BrowserCapabilities {
  webCodecsSupported: boolean;
  supportedVideoEncoders: VideoEncoderSupport[];
  supportedVideoDecoders: VideoDecoderSupport[];
  webCodecsVP9Supported: boolean;
  webCodecsAV1Supported: boolean;
  webCodecsH264Supported: boolean;
}

async function detectCapabilities(): Promise<BrowserCapabilities> {
  const capabilities: BrowserCapabilities = {
    webCodecsSupported: false,
    supportedVideoEncoders: [],
    supportedVideoDecoders: [],
    webCodecsVP9Supported: false,
    webCodecsAV1Supported: false,
    webCodecsH264Supported: false,
  };

  // Check WebCodecs support
  if (!('VideoEncoder' in window)) {
    return capabilities;
  }

  capabilities.webCodecsSupported = true;

  // Query supported codecs
  const encoderSupport = await VideoEncoder.isConfigSupported({
    codec: 'vp09.00.10.08', // VP9
    width: 1920,
    height: 1080,
    bitrate: 2_000_000,
    framerate: 30,
  });
  
  capabilities.supportedVideoDecoders = await VideoDecoder.getSupport();

  return capabilities;
}
```

#### Step 2: Route to Appropriate Engine

```typescript
// src/lib/video-conversion.ts

async function convertVideo(
  input: VideoFile,
  settings: VideoConversionSettings,
  capabilities: BrowserCapabilities
): Promise<Blob> {
  // Check if WebCodecs can handle this conversion
  if (canUseWebCodecs(settings, capabilities)) {
    console.log('[VideoConversion] Using WebCodecs');
    return convertWithWebCodecs(input, settings);
  }

  console.log('[VideoConversion] Using ffmpeg.wasm (legacy mode)');
  return convertWithFFmpeg(input, settings);
}

function canUseWebCodecs(
  settings: VideoConversionSettings,
  capabilities: BrowserCapabilities
): boolean {
  // Must have WebCodecs support
  if (!capabilities.webCodecsSupported) {
    return false;
  }

  // WebCodecs only supports certain output formats
  if (settings.outputFormat === 'gif') {
    return false; // GIF requires ffmpeg.wasm
  }

  if (settings.outputFormat === 'webm') {
    // WebM (VP8/VP9) - WebCodecs can handle this
    return capabilities.webCodecsVP9Supported || 
           capabilities.webCodecsH264Supported;
  }

  // Other formats fall back to ffmpeg.wasm
  return false;
}
```

#### Step 3: WebCodecs Implementation

```typescript
// src/lib/webcodecs-encoder.ts

import { WebMMuxer } from 'mediabunny';

export async function convertWithWebCodecs(
  input: VideoFile,
  settings: VideoConversionSettings
): Promise<Blob> {
  // 1. Decode input video to get frames
  const frames = await decodeVideoToFrames(input.file);
  
  // 2. Configure encoder for output format
  const encoderConfig = getEncoderConfig(settings);
  const encoder = new VideoEncoder(encoderConfig);
  
  // 3. Encode frames
  const chunks: EncodedVideoChunk[] = [];
  encoder.onchunkavailable = (chunk) => chunks.push(chunk);
  
  for (const frame of frames) {
    await encoder.encode(frame, { keyFrame: true });
    frame.close(); // Important: prevent memory leaks
  }
  
  await encoder.flush();
  encoder.close();
  
  // 4. Mux into WebM container using mediabunny
  const muxer = new WebMMuxer({
    target: new Blob([], { type: 'video/webm' }),
  });
  
  for (const chunk of chunks) {
    muxer.addChunk(chunk);
  }
  
  const webmBlob = muxer.finalize();
  
  return webmBlob;
}
```

#### Step 4: User Notification System

```typescript
// src/components/video/video-settings-panel.tsx

interface ProcessingModeBannerProps {
  mode: 'standard' | 'legacy';
  browserCapabilities: BrowserCapabilities;
}

export function ProcessingModeBanner({ 
  mode, 
  browserCapabilities 
}: ProcessingModeBannerProps) {
  // Modern browsers don't need to be told they're fast - that's expected
  // Only show a banner when using legacy mode (ffmpeg.wasm fallback)
  if (mode === 'standard') {
    return null; // No banner - normal experience
  }

  return (
    <Banner type="info">
      <Icon name="info" />
      <div>
        <strong>Legacy Mode</strong>
        <p>
          Your browser uses standard processing. 
          Conversion may take longer. 
          For faster results, use Chrome 94+, Firefox 130+, or Safari 16.4+.
        </p>
      </div>
    </Banner>
  );
}
```

### Container Muxing Libraries

WebCodecs requires external libraries for container formats:

| Library | Purpose | NPM Package | Status |
|---------|---------|-------------|--------|
| mediabunny | WebM container creation | `mediabunny` | ✅ **Recommended** (active) |
| mp4box | MP4 demuxing/muxing | `mp4box` | ✅ Recommended |
| webm-muxer | WebM container | `webm-muxer` | ⚠️ Deprecated (use mediabunny) |
| jswebm | WebM parsing | `jswebm` | ⚠️ Abandoned (6 years old) |

```bash
npm install mediabunny mp4box
```

### File Structure Updates

```
src/
├── lib/
│   ├── video-conversion.ts          # Main orchestration (updated)
│   ├── webcodecs-encoder.ts         # NEW: WebCodecs implementation
│   ├── mediabunny-muxer.ts          # NEW: WebM container handling
│   └── ffmpeg-encoder.ts            # NEW: Isolated ffmpeg logic
├── workers/
│   ├── video-converter.worker.ts    # Updated: route to engines
│   └── ffmpeg.worker.ts             # Existing (kept for fallback)
└── components/video/
    ├── video-settings-panel.tsx     # Updated: mode banner
    └── video-converter-banner.tsx   # NEW: Capability banner
```

### User Experience Flow

1. **Page Load**
   - Detect browser capabilities in background
   - Store capability state in React context

2. **Settings Panel**
   - Modern browsers: no banner shown (expected behavior)
   - Older browsers: informational banner about legacy mode

3. **During Conversion**
   - Log which engine is being used (for debugging)
   - Progress UI remains the same (works with both engines)

4. **After Conversion**
   - No visible difference in output
   - User benefits from faster processing if supported

---

## 4. Browser Support

### WebCodecs API Support (as of March 2026)

| Browser | Version | Support |
|---------|---------|---------|
| Chrome/Edge | 94+ | Full |
| Firefox | 130+ | Full |
| Safari | 16.4+ (partial), 26+ (full) | Partial to Full |
| Opera | 80+ | Full |
| Samsung Internet | 17.0+ | Full |

**Global Coverage**: ~95% of users

### Fallback Strategy

| Scenario | Action |
|----------|--------|
| WebCodecs not available | Use ffmpeg.wasm (legacy mode) |
| WebCodecs VP9 encoding not supported | Use ffmpeg.wasm (legacy mode) |
| GIF output requested | Use ffmpeg.wasm (legacy mode) |
| Error in WebCodecs path | Graceful fallback to ffmpeg.wasm (legacy mode) |

---

## 5. Migration Plan

### Phase 1: Core Infrastructure
- [ ] Add capability detection utility
- [ ] Create WebCodecs encoder module
- [ ] Integrate mediabunny for WebM container handling
- [ ] Add mp4box for input demuxing (if needed)
- [ ] Update video-conversion.ts routing logic

### Phase 2: User Experience
- [ ] Add processing mode banner component (legacy mode only)
- [ ] Implement banner visibility logic
- [ ] Update settings panel

### Phase 3: Testing & Polish
- [ ] Test WebCodecs path on supported browsers
- [ ] Test fallback path on unsupported browsers
- [ ] Verify output quality matches ffmpeg.wasm
- [ ] Performance benchmarking

---

## 6. Known Limitations

### WebCodecs Limitations

1. **No GIF Support**
   - WebCodecs cannot generate GIFs
   - Must fall back to ffmpeg.wasm for GIF output

2. **Container Muxing**
   - WebCodecs doesn't include muxing
   - Requires mediabunny library for WebM output (webm-muxer is deprecated)

3. **Codec Availability Varies**
   - Not all browsers support all codecs
   - Must check `VideoEncoder.isConfigSupported()` before use

4. **Key Frame Requirements**
   - Decoders need key frames to start
   - Must manage key frame insertion during encoding

5. **Input Decoding**
   - WebCodecs can decode, but needs help for various container formats
   - May need mp4box or other demuxers for input parsing

### Fallback Limitations

1. **Same as V1**
   - Performance remains slow on unsupported browsers
   - Bundle size unchanged for fallback users

---

## 7. Future Enhancements

### Potential Additions

1. **H.264/MP4 Output**
   - Use webm-muxer → convert to MP4, or
   - Use MP4Box.js for MP4 muxing
   - Requires additional library integration

2. **AV1 Support**
   - Growing browser support for AV1 encoding
   - Could provide better compression than VP9

3. **WebGPU Integration**
   - For frame processing/effects
   - When WebGPU adoption increases

4. **Progress Improvements**
   - More granular progress with WebCodecs
   - Real-time frame-by-frame progress

---

## Summary

Video Converter V2 introduces progressive enhancement:

- **Default**: WebCodecs API for 5-20x faster conversion on modern browsers (no UI indication - expected)
- **Legacy Mode**: ffmpeg.wasm fallback with explicit banner for older browsers
- **User Awareness**: Banner only shown when using legacy mode - modern browsers don't need to be told they're fast
- **Zero Cost**: No additional bundle for WebCodecs users
- **Future-Ready**: Aligns with web platform standards

This approach provides the best possible experience for each user based on their browser capabilities while maintaining full backward compatibility.
