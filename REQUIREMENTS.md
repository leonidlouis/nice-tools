# Nice-Tools: Expansion Requirements

This document outlines the architectural and functional requirements for 6 new browser-based tools to be added to the `nice-tools` suite. All tools must adhere to the core philosophy: **Privacy-first, local-only, zero-upload, and delightful UX.**

## Table of Contents
1. [JWT Debugger & Visualizer](#1-jwt-debugger--visualizer)
2. [Cron Expression Visualizer & Generator](#2-cron-expression-visualizer--generator)
3. [SVG Nano-Optimizer](#3-svg-nano-optimizer)
4. [Web-Safe Color Palette Generator](#4-web-safe-color-palette-generator)
5. [EXIF & Metadata Stripper](#5-exif--metadata-stripper)
6. [Unit Converter - Developer Focused](#6-unit-converter---developer-focused)

---

## Design Language Reference
- **Layout:** `SidebarInset` wrapper with a main container using `max-w-5xl mx-auto px-4 py-6`.
- **Typography:** Left-aligned text, Inter/System font stack.
- **Components:** shadcn/ui (Radix UI) primitives.
- **Icons:** Lucide React (size-5 for headers, size-4 for UI elements).
- **Feedback:** Use `Card` for primary containers and `Alert` for technical explanations (the "why" factor).

---

## 1. JWT Debugger & Visualizer
A tool to decode, inspect, and visualize JSON Web Tokens locally.

### The "Nice" Factor
- **Live Decoding:** As you paste, the Header, Payload, and Signature sections update instantly.
- **Time Visualization:** JWT `exp`, `iat`, and `nbf` claims are automatically converted to human-readable relative time (e.g., "Expires in 2 hours") with a real-time countdown.
- **Validation Status:** A clear visual indicator showing if the token is currently expired or not yet valid.

### Technical Implementation
- **Decoding:** Standard Base64URL decoding for the three segments.
- **Library:** `jose` (modern, browser-native) for JWT handling and signature verification.
- **Crypto:** Use `SubtleCrypto` (Web Crypto API) via `jose` for local signature verification if the user provides a Public Key or Secret.
- **UI:** `shiki` or `prism-react-renderer` for syntax highlighting of the JSON payload.

### Requirement for Agents
- **Input:** Single textarea for the JWT string.
- **Output:** Three distinct `Card` components for Header, Payload, and Signature.
- **Safety:** **CRITICAL:** Include a prominent "Security Note" explaining that while processing is local, users should NEVER paste production secrets into any browser-based tool.
- **Validation:** Must check for common vulnerabilities like `alg: "none"` or expired tokens.

---

## 2. Cron Expression Visualizer & Generator
An interactive builder for Crontab expressions.

### The "Nice" Factor
- **Human Readable:** Converts `0 0 * * *` to "At 12:00 AM every day" using natural language.
- **Next Occurrences:** Shows the next 5 execution dates based on the current browser time.
- **Interactive Toggles:** Instead of just typing, users can toggle days of the week or hours on a grid.

### Technical Implementation
- **Parsing:** `cronstrue` for human-readable translation.
- **Execution Projection:** `cron-parser` to calculate the next execution times.
- **UI:** A grid-based selection system for Minutes, Hours, Days, and Months.

### Requirement for Agents
- **Bidirectional Sync:** Editing the cron string updates the UI toggles, and clicking toggles updates the cron string.
- **Presets:** Provide a dropdown for "Every Minute", "Daily at Midnight", "Weekly", etc.
- **Timezone:** Default to Local Browser Time with a toggle to view in UTC.

---

## 3. SVG Nano-Optimizer
Aggressive, browser-based SVG minification.

### The "Nice" Factor
- **Visual Diff:** A side-by-side "Original vs. Optimized" view with a slider to compare visual quality.
- **Size Savings:** Real-time percentage counter showing bytes saved.
- **Drag & Drop:** Instant processing on file drop.

### Technical Implementation
- **Engine:** `svgo` (browser-optimized build) or a lightweight implementation of `@svgo/optimize`.
- **Worker:** **MUST** run the optimization in a `Web Worker` to prevent UI freezing on complex SVGs.
- **Comparison:** Use a `<canvas>` or `<img>` comparison overlay.

### Requirement for Agents
- **Configuration:** Expose common SVGO plugins via `Switch` components (e.g., `removeViewBox`, `cleanupIDs`).
- **Download:** A `Download` button that triggers a browser-side blob download.
- **Limit:** Handle SVGs up to 5MB; provide a "Processing..." state during worker execution.

---

## 4. Web-Safe Color Palette Generator
An accessibility-first palette generator.

### The "Nice" Factor
- **Contrast Checkers:** Every generated color shows its contrast ratio against black and white text instantly.
- **Compliance Badges:** "Pass" badges for WCAG AA and AAA standards.
- **Copy Formats:** One-click copy for Hex, RGB, HSL, and Tailwind CSS configuration objects.

### Technical Implementation
- **Color Logic:** `chroma-js` for perceptually uniform color space manipulations (LCH/Lab).
- **Accessibility:** Standard WCAG 2.1 contrast formula implementation.
- **Generator:** Seed-based generation (Monochromatic, Analogous, Triadic).

### Requirement for Agents
- **Seed Input:** Allow users to input a starting Hex/RGB code.
- **Visuals:** Display the palette as large, clickable cards that copy to clipboard.
- **Export:** Provide a "Download Tailwind Config" option.

---

## 5. EXIF & Metadata Stripper
Privacy-focused tool to scrub sensitive data from images.

### The "Nice" Factor
- **Privacy Score:** High-level summary of what was found (GPS, Camera Model, Date Taken).
- **Map Preview:** If GPS coordinates exist, show a non-interactive static map (local only) of where the photo was taken before stripping.
- **Bulk Strip:** Process multiple images at once locally.

### Technical Implementation
- **Parsing:** `exifreader` to identify existing tags.
- **Stripping:** **SURGICAL REMOVAL ONLY.** Do not use `<canvas>` re-encoding (which can introduce fingerprinting artifacts). Use a library like `piexifjs` or `exif-be-gone` to manipulate the file buffer directly.
- **Privacy:** Absolutely no external network calls for map previews (use text-based coordinates or a local-only map tile).

### Requirement for Agents
- **File Support:** Support JPEG, PNG, and WebP.
- **Verification:** After stripping, re-scan the new blob to confirm all sensitive tags are removed.
- **Performance:** Use `Worker` threads for bulk processing to keep the UI responsive.

---

## 6. Unit Converter - Developer Focused
A fast, multi-directional converter for dev-specific units.

### The "Nice" Factor
- **Typing Sync:** Type in `px`, and `rem`, `em`, and `vw` update instantly based on a configurable base size.
- **Color Space Sync:** Change `hex`, and `rgb`/`hsl` update.
- **Data Sizes:** Seamlessly convert between Bits, Bytes, KiB, MiB, and GiB.

### Technical Implementation
- **Typography:** Math based on a `baseFontSize` state (default 16px).
- **Colors:** Use a single "Source of Truth" color state (e.g., `hex`) and derive others in a single `useEffect` or via a central change handler to prevent infinite update loops.
- **Data:** Use `bytes` as the base state; all other units (KB, MB, GB) are derived from this single value for bi-directional consistency.

### Requirement for Agents
- **Layout:** Three distinct sections: "Typography", "Colors", "Data Sizes".
- **Precision:** Configurable decimal precision (default 3 for rem/vw).
- **Validation:** Sanitize inputs (numbers only) and prevent negative values for data sizes/typography.

---

## Technical Guardrails for All Agents
1. **Zero External Assets:** Do not link to external CSS or JS libraries (use local `node_modules`).
2. **Web Workers:** For any heavy lifting (SVG optimization, image stripping), use `src/workers/`.
3. **Accessibility:** All interactive elements must have proper `aria-labels` and keyboard support.
4. **Performance:** Memoize expensive calculations using `useMemo` and `useCallback`.
