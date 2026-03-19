# Expansion Orchestrator Prompt

Copy and paste the following prompt into a fresh Gemini CLI session to begin the implementation of the 6 new tools. This prompt is designed for a **Strategic Orchestrator** who will delegate the implementation of each tool to specialized sub-agents to ensure context efficiency and high-quality code.

---

## The Orchestrator Prompt

```markdown
ULTRATHINK
Act as a Strategic Orchestrator to implement the 6 new tools defined in `REQUIREMENTS.md`.

### Your Mission
You are responsible for high-level architecture, routing, and sidebar integration. You MUST delegate the implementation of each individual tool to a specialized `generalist` sub-agent to maintain context efficiency and code quality.

### Orchestration Strategy
1. **Tool Setup:** For each tool in `REQUIREMENTS.md` (JWT, Cron, SVG, Color, EXIF, Unit):
   - **Delegate Implementation:** Spawn a `generalist` sub-agent with the specific section of `REQUIREMENTS.md`.
   - **Instruction to Sub-agent:** "Implement the [Tool Name] according to REQUIREMENTS.md. Use existing shadcn/ui components. Ensure 100% local processing. Create the page.tsx and any necessary layout.tsx or workers."
   - **Instruction to Sub-agent:** "Add the new tool to the `src/components/app-sidebar.tsx` and the homepage grid in `src/app/(app)/page.tsx`."
   
2. **Quality Control:** After each sub-agent finishes, you must:
   - **Validate:** Run `npm run build` and `npm run lint` to ensure no regressions.
   - **Review:** Verify the UI matches the `max-w-5xl mx-auto` and left-aligned typography patterns.

3. **Finalization:** Once all 6 tools are implemented and verified, perform a final `npm run build` and update the `sitemap.ts`.

### Immediate First Step
Read `REQUIREMENTS.md` and start by delegating the **JWT Debugger & Visualizer** to your first sub-agent.
```
