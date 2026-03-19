# Implementation Plan: UUID & Password Generators

## Objective
Implement two new comprehensive tools: a UUID Generator and a Password Generator, integrated into the existing Next.js App Router architecture.

## Deep Reasoning & Architectural Breakdown (ULTRATHINK)

### 1. Password Generator
*   **Design & UX:** The tool will feature a real-time reactive interface. Any change to the length slider (using Radix UI `@radix-ui/react-slider`) or character type toggles (lowercase, uppercase, numbers, symbols) will immediately trigger a new password generation. 
*   **Security:** We **must not** use `Math.random()` due to its lack of cryptographic security. We will utilize `window.crypto.getRandomValues()` to generate high-entropy, cryptographically secure random characters.
*   **Edge Case Prevention:** 
    *   *Zero Toggles Active:* If a user attempts to disable all character types, the UI will forcefully retain at least one (e.g., lowercase) or revert the last action, preventing a broken generation state.
    *   *Slider Bounds:* The length will be hard-capped between 6 and 128 characters to maintain practical usability and UI integrity.
*   **Dependencies:** No new external dependencies required; native Web Crypto API suffices.

### 2. UUID Generator
*   **Design & UX:** A comprehensive generator must support multiple UUID versions. We will focus on `v4` (random) and `v7` (time-based, sortable), which are the most relevant in modern engineering. It will support bulk generation (e.g., generating 100 UUIDs at once), formatting options (hyphens vs. no-hyphens), and single-click copy functionality.
*   **Edge Case Prevention:**
    *   *Bulk Generation Freeze:* We will cap the maximum bulk generation limit to 10,000 to prevent main-thread blocking and browser freezing.
    *   *Performance:* Generation of multiple UUIDs will be batched or rendered efficiently using virtualized lists if necessary (though for 1,000 items, standard mapping is usually fine).
*   **Dependencies:** We will install the `uuid` package (`npm install uuid`) and its types (`npm install -D @types/uuid`) to handle robust, standard-compliant generation across versions.

### 3. Navigation & Routing
*   **Routes:** Create `src/app/(app)/password-generator/page.tsx` and `src/app/(app)/uuid-generator/page.tsx`.
*   **Sidebar (`src/components/app-sidebar.tsx`):** Add entries to the `tools` array using `lucide-react` icons (e.g., `KeyRound` for Password, `Fingerprint` for UUID).
*   **Homepage (`src/app/(app)/page.tsx`):** Add corresponding cards to the `tools` grid.

## Implementation Steps

1.  **Dependencies:** 
    *   Run `npm install uuid` and `npm install -D @types/uuid`.
2.  **Password Generator Page (`src/app/(app)/password-generator/page.tsx`):**
    *   Implement "use client" component.
    *   Use `Slider` from `@/components/ui/slider`.
    *   Create secure `generatePassword(length, options)` function.
    *   Bind `useEffect` to trigger regeneration on state changes.
3.  **UUID Generator Page (`src/app/(app)/uuid-generator/page.tsx`):**
    *   Implement "use client" component.
    *   Add controls for Version (v4, v7), Quantity, and Format (Hyphens).
    *   Implement bulk generation logic with a hard limit of 10,000.
4.  **Navigation Integration:**
    *   Update `src/components/app-sidebar.tsx` with the new tools.
    *   Update `src/app/(app)/page.tsx` with the new tools.
5.  **Validation & Subagents:**
    *   During implementation, I will leverage the `generalist` or `codebase_investigator` subagent if any UI component usage is ambiguous, ensuring strict adherence to the existing Shadcn UI patterns.

## Verification & Testing
*   **Manual UI Testing:** I will simulate interactions using Chrome DevTools MCP or instructions, verifying that toggling a password setting instantly updates the output without requiring a "Generate" button click.
*   **Security Check:** Inspect the random generation code to guarantee `window.crypto` is used.
*   **Routing Check:** Ensure the sidebar highlights correctly and the homepage routes correctly.
