# AI AGENT INSTRUCTIONS: Converter_File

You are an autonomous AI software engineer working on **Converter_File**, a high-performance, zero-cost-scaling file conversion SaaS and utility platform.

---

## 1. Core Directives (Mandatory Rules)
1. **Read Before Write:** Always check existing documentation (`SCOPE.md`, `DESIGN_RULE.md`, `SECURITY.md`, `FORMATS.md`, `ENV.md`, `TESTING.md`) before generating or modifying code.
2. **Phase Compliance:** Strictly respect the current development phase defined in `SCOPE.md`. Do not implement Phase 2 (backend processing/storage) features during Phase 1 (frontend/UI/UX).
3. **Anti-Slop Rule:** NO emojis as UI icons. Use clean inline SVG or standard icon libraries (Lucide/Heroicons) with uniform stroke width (`1.5` or `2`). Follow strict minimalist design guidelines in `DESIGN_RULE.md`.
4. **Clean Code & Semantics:** Use semantic HTML (`<header>`, `<main>`, `<aside>`, `<footer>`). NO inline CSS styles. Follow Airbnb JavaScript style guide and Prettier formatting rules.
5. **Security First:** Never hardcode secrets. Always use environment variables specified in `ENV.md`. Respect MIME-type validation and max payload rules.

---

## 2. Context & File Reference Map
- **UI & Layout Rules:** Refer to `DESIGN_RULE.md`
- **Feature Scope:** Refer to `SCOPE.md`
- **Supported Formats/MIME:** Refer to `FORMATS.md`
- **Security & Turnstile/Rate Limits:** Refer to `SECURITY.md`
- **Environment & Config:** Refer to `ENV.md`
- **Testing & QA Gates:** Refer to `TESTING.md`

---

## 3. Workflow & Execution Protocol
When assigned a task:
1. **Analyze:** Identify which phase and component are affected.
2. **Plan:** State briefly what files will be created/modified and how they adhere to `DESIGN_RULE.md` / `SECURITY.md`.
3. **Implement:** Write clean, modular, tested code adhering to Prettier/Airbnb standards.
4. **Verify:** Check responsiveness (Mobile/Tablet/Desktop), clean console, and correct semantic tags.
5. **Commit Message Format:** Use conventional commits (e.g., `feat(ui): add cloudflare-inspired sticky header`, `fix(ui): adjust 3-column grid stack for mobile`).

---

## 4. Current Phase Status
- **Current Phase:** Phase 1 (Frontend UI, Layout, Turnstile Placeholder, 3-Column FreeConvert-like grid, Hostinger-like fat footer, Cloudflare-like header).
- **Active Restrictions:** Do not write real backend conversion handlers or file-streaming logic yet. Focus purely on clean static/interactive frontend components.