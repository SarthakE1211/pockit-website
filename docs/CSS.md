# CSS & theming

This document describes how styling works in this project: **Tailwind CSS**, **PostCSS**, and the **CSS variable** theme system defined in `src/app/globals.css`.

## Stack

| Piece | Role |
|--------|------|
| **Tailwind CSS 3** | Utility-first classes; `content` scans `src/app` and `src/components`. |
| **PostCSS** | Runs the Tailwind plugin (`postcss.config.mjs`). |
| **`globals.css`** | `@tailwind` layers, four theme blocks, scrollbar utilities, `body` / `html` base rules. |
| **`tailwind.config.ts`** | Maps design tokens to Tailwind `theme.extend.colors` so components use `bg-theme-bg`, `text-theme-text`, etc. |

Fonts are loaded in `src/app/layout.tsx` via `next/font/google` (**Plus Jakarta Sans**), exposed as `var(--font-jakarta)` for `font-sans`.

---

## How themes work

Themes are **pure CSS**. No React context is required for colors after the active theme is set on `<html>`.

1. **Selector:** each theme is a set of custom properties under  
   `[data-theme="<name>"]` on the root (typically `<html>`).
2. **Default:** `:root` and `[data-theme="dark-gradient"]` share the same values so the first paint matches before any JS runs.
3. **Persistence:** the user’s choice is stored in `localStorage` under **`pockit-theme`**. A small inline script in `layout.tsx` runs before hydration to apply `data-theme` and avoid a wrong flash. **`ThemeSync`** (`src/components/landing/ThemeSync.tsx`) reapplies the saved theme on routes that need it (e.g. legal pages).

Valid `data-theme` values:

| Value | Description |
|--------|-------------|
| `dark-gradient` | Default dark UI, navy gradient feel. |
| `dark-flat` | Dark UI, flatter navy surfaces. |
| `light-corporate` | White / light gray, corporate contrast. |
| `light-soft` | Soft lavender-tinted light background. |

The header theme toggle switches between the dark pair and the light pair; implementation lives in `Header.tsx` / `Footer.tsx`.

---

## Design tokens (CSS variables)

Variables live in `globals.css` inside each `[data-theme="..."]` block.

### Convention: RGB triplets

Most color tokens use **space-separated RGB components** (no `rgb()` wrapper), for example:

```css
--text-primary: 255 255 255;
```

Usage in CSS/Tailwind:

- Raw: `rgb(var(--text-primary))`
- With alpha: `rgb(var(--text-primary) / 0.5)`  
  Tailwind arbitrary values and the extended theme colors use the same pattern with `<alpha-value>` where needed.

### Core semantic tokens

| Variable | Typical use |
|----------|-------------|
| `--bg-primary`, `--bg-secondary` | Page / section backgrounds |
| `--text-primary`, `--text-muted` | Body and secondary text |
| `--accent-primary`, `--accent-primary-end`, `--accent-secondary` | Brand orange, gradients |
| `--card-bg`, `--card-border` | Cards and bordered surfaces |
| `--surface-glass` | Glass-style overlays |
| `--logo-filter` | SVG/logo treatment (e.g. invert on dark) |
| `--scrollbar-track`, `--scrollbar-thumb` | Scrollbar colors |
| `--nav-bg` | Header / nav strip |

### Feature-specific tokens

| Prefix / name | Purpose |
|---------------|---------|
| `--deck-card-*` | PockIT Promise swipe cards (background, border, divider) |
| `--phone-*` | Hero phone mockup (shell, screen, cards, text) |

Add new tokens in **every** theme block when introducing a variable, so all four themes stay in sync.

---

## Tailwind bridge (`tailwind.config.ts`)

Extended colors map to the same variables so you can write:

- `bg-theme-bg`, `bg-theme-bg2`
- `text-theme-text`, `text-theme-muted`
- `text-theme-accent`, `from-theme-accent`, `to-theme-accent-end`
- `bg-theme-card`, `border-theme-border`
- `text-theme-glass` (and opacity modifiers, e.g. `/80`)

These resolve to `rgb(var(--*) / <alpha-value>)` as defined in the config.

---

## Global layout & polish

- **`html`:** `scroll-behavior: smooth`.
- **`body`:** `color` and `background` from `--text-primary` and `--bg-primary`.
- **Desktop (≥768px):** subtle **dot grid** on `body` via `background-image` + `background-size` (see `globals.css`).

---

## Scrollable regions (`.app-scrollbar`)

The main scroll container uses the utility class **`app-scrollbar`** (see `AppShell.tsx`).  
`globals.css` defines:

- WebKit scrollbar width, track, thumb
- `scrollbar-width` / `scrollbar-color` for Firefox

Thumb and track colors come from `--scrollbar-thumb` and `--scrollbar-track` (with fallbacks in the utility layer).

---

## Adding or changing a theme

1. Duplicate one full `[data-theme="..."]` block in `globals.css`.
2. Assign a new `data-theme` value (kebab-case).
3. Redefine every token the UI uses (at minimum the core list above; include `--phone-*` / `--deck-*` if those surfaces appear).
4. Wire the theme key into any toggle or persistence logic (`pockit-theme` in `localStorage`) and document the new option in UI copy if needed.

---

## Files to edit

| Task | File |
|------|------|
| Colors / themes | `src/app/globals.css` |
| Tailwind color names | `tailwind.config.ts` |
| Font | `src/app/layout.tsx` |
| First-paint theme | inline `<script>` in `layout.tsx` |
| Legal / isolated routes | `ThemeSync` usage in page layouts |

---

## Related

- Main project overview: [README.md](../README.md)
