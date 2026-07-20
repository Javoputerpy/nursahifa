# NurSahifa — iOS 18 Redesign + Live Camera Scan

Two parallel workstreams. I'll ship them in the order below so the app stays usable after each phase.

## Phase 1 — Design system foundation (src/styles.css)

- New token layer in `@theme` + `:root` / `.dark`:
  - Backgrounds: `--bg`, `--bg-elevated`, `--bg-grouped`, `--surface`, `--surface-2` (iOS "systemBackground" / "secondarySystemGroupedBackground" feel).
  - Text: `--text`, `--text-secondary`, `--text-tertiary`.
  - Separator: `--separator` (hairline, low-opacity).
  - Brand: keep NurSahifa gold `#D4AF37` + deep night `#0A1128` as identity; add `--accent`, `--accent-2`, `--gradient-brand`, `--glow`.
  - Semantic: `--success`, `--warning`, `--danger` (iOS system green/orange/red tuned to brand).
  - Radii: `--r-sm 12`, `--r-md 16`, `--r-lg 20`, `--r-xl 28`.
  - Shadows: `--shadow-card`, `--shadow-float`, `--shadow-glow` (soft, layered).
- Typography: load SF Pro-alike stack via `<link>` in `__root.tsx` (Inter Tight + system-ui fallback chain that resolves to real SF on Apple devices). Type scale: `text-largeTitle`, `text-title1/2/3`, `text-headline`, `text-body`, `text-callout`, `text-footnote`, `text-caption`.
- Reusable utilities: `.ios-card`, `.ios-list`, `.ios-list-row`, `.ios-glass`, `.ios-pressable` (spring-like press), `.hairline`.
- 8pt spacing enforced via Tailwind defaults (already 4pt-based → use multiples of 2).

## Phase 2 — Shared components

- `BottomNav`: iOS tab bar — blurred glass (`backdrop-blur-2xl` + translucent bg), hairline top border, SF Symbols-style Lucide icons, active pill, safe-area padding.
- `PageHeader`: large title that shrinks on scroll (CSS scroll-driven or IntersectionObserver).
- `IosButton`, `IosListRow`, `IosSwitch`, `IosSheet` (bottom sheet w/ handle), `IosDialog`, `IosSearchField`, `Skeleton`, `Toast` (sonner theming).
- Motion: framer-motion springs (`stiffness: 400, damping: 32`) for press/flip/page transitions; `AnimatePresence` on route outlet.

## Phase 3 — Screen redesigns

- `/` landing: hero with brand mark, tagline, CTA.
- `/auth`: glass card, large title, elegant fields.
- `/_authenticated/feed`: keep TikTok snap; add page-level progress bar, glassy top bar showing "Bugungi: X / Y", refined rating buttons (Again/Hard/Good/Easy) as pill row with color semantics; card flip w/ spring.
- `/_authenticated/add`: hero title, two big action cards (Camera / Upload), textarea styled as iOS text field, primary gradient button.
- `/_authenticated/text`, `/quiz`, `/favorites`, `/learn`: apply grouped-list + large-title pattern.
- `/_authenticated/profile`: Apple Settings layout — avatar header card, grouped rows (Stats, Preferences, Account), sticky logout button at bottom with safe-area.

## Phase 4 — Real-time Camera Scan

New component `src/components/CameraScanner.tsx`:
- Opens as full-screen sheet from Add page ("Kamera bilan skanlash" button next to "Rasm yuklash").
- Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`; requests permission with a friendly pre-prompt screen.
- Live `<video>` preview with iOS-style overlay: dimmed edges, rounded viewfinder frame, top close button, bottom capture shutter (large ring), flip-camera button, torch toggle (where supported).
- Capture → draw video frame to `<canvas>` → auto-crop to viewfinder rect → downscale to max 1600px long edge → JPEG quality 0.85 → data URL.
- Shutter animation: white flash + haptic-like scale.
- Loading state: existing `OcrProgressOverlay` reused; success toast "N ta so'z topildi".
- Desktop / no camera: detect via `getUserMedia` rejection or `enumerateDevices`; fall back to file input with clear message.
- Reuses existing `extractWordsFromImageOCR` and `generateFromWordList` server functions — no backend change needed. Both already handle OCR.Space + Gemini errors; I'll audit error messages to match the requested friendly Uzbek strings.

## Phase 5 — Error handling audit

- Global online/offline listener → toast "Internet aloqasi yo'q. Ulanishni tekshiring."
- Unify OCR failure copy: "Rasmni o'qib bo'lmadi. Qayta urinib ko'ring."
- Unify Gemini failure copy: "Tarjima qilib bo'lmadi. Birozdan keyin urinib ko'ring."
- Duplicate word prevention: already in `ocr.functions.ts` (verify) — if missing, add a `SELECT word` filter before insert.

## Out of scope for this pass

- Native haptics (web has no reliable API; using visual feedback only).
- Real SF Pro font (licensing); using Inter Tight + system font stack that resolves to SF on Apple devices.
- Rewriting server/DB logic — only UI + one new component + minor error-copy tweaks.

## Deliverable order

1. Phase 1 + Phase 2 (foundation) — one batch.
2. Phase 3 (screens) — one batch.
3. Phase 4 (Camera Scanner) — one batch.
4. Phase 5 (error copy audit) — small batch.

Estimated ~10–14 files touched, 1 new component, 0 DB migrations.

**Confirm and I'll start with Phase 1+2.** If you want a different order (e.g. Camera Scanner first), say so.
