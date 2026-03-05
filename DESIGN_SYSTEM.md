# Postagen Mobile — Design System

> Single source of truth for every visual token, component pattern, and motion rule used in the app.

---

## 1. Color Tokens

### Core Palette (CSS Variables)

| Token              | Value     | Usage                  |
|--------------------|-----------|------------------------|
| `--primary`        | `#8B5CF6` | Brand purple, CTAs     |
| `--primary-dark`   | `#7C3AED` | Hover / active states  |
| `--primary-light`  | `#A78BFA` | Highlights, accents    |
| `--background`     | `#ffffff` | Page background        |
| `--foreground`     | `#1a1a1a` | Body text              |
| `--gray-light`     | `#F3F4F6` | Card/section bg        |
| `--gray-medium`    | `#9CA3AF` | Secondary text         |
| `--gray-dark`      | `#4B5563` | Strong secondary text  |

### Extended Tailwind Colors

| Purpose         | Classes                                      |
|-----------------|----------------------------------------------|
| Purple scale    | `purple-50` → `purple-700`                   |
| Gray scale      | `gray-50` → `gray-900`                       |
| Success         | `green-100`, `green-600`, `#4ADE80`          |
| Error           | `red-50`, `red-100`, `red-500`, `red-600`    |
| Info            | `blue-100`, `blue-600`                       |
| Warning         | `amber-50`, `amber-600`, `orange-400`        |
| Accent          | `pink-500`, `pink-600`, `violet-500`         |

### Opacity Layers

| Layer          | Values                                         |
|----------------|------------------------------------------------|
| Dark overlays  | `bg-black/20`, `/30`, `/40`, `/50`, `/95`      |
| Light overlays | `bg-white/40`, `/60`, `/80`, `/90`, `/95`      |

### Mood Gradients (Page Backgrounds)

| Class                  | Description                                      |
|------------------------|--------------------------------------------------|
| `.bg-mood-onboarding`  | Pink top-right + blue bottom-left on white       |
| `.bg-mood-upload`      | Blue top-left + orange bottom-right on white     |
| `.bg-mood-processing`  | Centered purple radial on white                  |
| `.bg-mood-plan`        | Violet top-left + pink bottom-right on `#fafafa` |
| `.bg-mood-detail`      | Violet top radial on white                       |

---

## 2. Typography

### Font Families

| Token             | Family            | Usage                    |
|-------------------|-------------------|--------------------------|
| `--font-inter`    | Inter             | Primary sans-serif       |
| `--font-playfair` | Playfair Display  | Decorative serif headers |
| Fallback          | system-ui stack   | -apple-system, Roboto…   |

### Scale

| Class         | Size   | Usage                         |
|---------------|--------|-------------------------------|
| `text-[10px]` | 10 px  | Micro labels, badge captions  |
| `text-xs`     | 12 px  | Captions, timestamps          |
| `text-sm`     | 14 px  | Body small, secondary text    |
| `text-base`   | 16 px  | Body default                  |
| `text-lg`     | 18 px  | Subheadings                   |
| `text-xl`     | 20 px  | Section headings              |
| `text-2xl`    | 24 px  | Page titles                   |
| `text-4xl`    | 36 px  | Hero / splash text            |

### Weights

| Class           | Weight | Usage                    |
|-----------------|--------|--------------------------|
| `font-normal`   | 400    | Body text                |
| `font-medium`   | 500    | Labels, nav items        |
| `font-semibold` | 600    | Buttons, card titles     |
| `font-bold`     | 700    | Headings, emphasis       |
| `font-black`    | 900    | Hero text                |

### Letter Spacing

| Class                | Usage                           |
|----------------------|---------------------------------|
| `tracking-wide`      | Subtle spacing                  |
| `tracking-widest`    | Uppercase labels, status text   |
| `tracking-[0.15em]`  | Custom wide                     |
| `tracking-[0.2em]`   | Extra wide caps                 |

---

## 3. Border Radius Scale

| Class              | Px   | Usage                        |
|--------------------|------|------------------------------|
| `rounded-lg`       | 8    | Small elements               |
| `rounded-xl`       | 12   | Badges, small cards          |
| `rounded-2xl`      | 16   | Buttons, inputs              |
| `rounded-3xl`      | 24   | Info cards                   |
| `rounded-[32px]`   | 32   | Post/plan cards              |
| `rounded-[36px]`   | 36   | Media cards                  |
| `rounded-[40px]`   | 40   | Large feature cards          |
| `rounded-[48px]`   | 48   | Special containers           |
| `rounded-[60px]`   | 60   | Dropzone                     |
| `rounded-full`     | 50%  | Circles, pills, icon buttons |

---

## 4. Shadows

| Class                          | Usage                        |
|--------------------------------|------------------------------|
| `shadow-sm`                    | Cards at rest                |
| `shadow-lg`                    | Elevated cards, FAB          |
| `shadow-xl`                    | Primary CTAs                 |
| `shadow-2xl`                   | Modals, hero media           |

### Colored Shadows

| Class                          | Usage                        |
|--------------------------------|------------------------------|
| `shadow-purple-100` → `400`    | Primary buttons & cards      |
| `shadow-gray-100` → `200`     | Dark/tertiary buttons        |
| `shadow-orange-100/50`         | Media cards                  |
| `shadow-red-100`               | Destructive actions          |

---

## 5. Spacing

### Standard Padding

| Pattern         | Usage                           |
|-----------------|---------------------------------|
| `px-6`          | Page horizontal padding         |
| `py-8`          | Section vertical padding        |
| `p-4` / `p-5` / `p-6` | Card inner padding       |
| `pb-24` / `pb-28` | Bottom nav clearance         |

### Common Gaps

| Class   | Usage                            |
|---------|----------------------------------|
| `gap-1` | Tight inline groups              |
| `gap-2` | Icon + label, badge groups       |
| `gap-3` | Card lists, form fields          |
| `gap-4` | Section children                 |
| `gap-6` | Major section separation         |

---

## 6. Buttons

### Primary

```
bg-[#8B5CF6]  or  bg-linear-to-r from-purple-500 to-purple-600
text-white font-semibold
px-6 py-3  |  px-8 py-4 (large)
rounded-2xl
shadow-xl shadow-purple-200
hover:bg-purple-600 hover:shadow-2xl hover:-translate-y-0.5
active:scale-[0.98]
disabled:opacity-50
```

### Secondary (Outline)

```
bg-white  border-2 border-purple-200
text-purple-700 font-semibold
px-6 py-3
rounded-2xl
hover:bg-purple-50 hover:border-purple-300
```

### Secondary (Dashed)

```
bg-white  border-2 border-dashed border-purple-300
text-purple-600 font-semibold
px-6 py-3
rounded-2xl
hover:bg-purple-50 hover:border-purple-400
```

### Dark / Tertiary

```
bg-gray-900  |  bg-black
text-white font-bold
px-6 py-4
rounded-2xl
shadow-xl shadow-gray-200
hover:bg-gray-900 hover:shadow-2xl hover:-translate-y-0.5
active:scale-[0.98]
```

### Icon Button

```
h-10 w-10  |  h-12 w-12
rounded-full
bg-white  |  bg-purple-50  |  bg-red-50
shadow-sm
```

### Button States

| State      | Style                                       |
|------------|---------------------------------------------|
| Hover      | `hover:-translate-y-0.5`, shadow increase   |
| Active     | `active:scale-[0.98]`                       |
| Disabled   | `disabled:opacity-50`                       |
| Loading    | `animate-spin` spinner icon, disabled state |

---

## 7. Cards

### Post / Plan Card

```
bg-white
rounded-[32px]  |  rounded-[40px]
border border-gray-50
shadow-sm
p-5  |  p-6
hover:shadow-lg hover:-translate-y-1
transition-all
```

### Info Card

```
bg-white  |  bg-white/40 backdrop-blur-sm
rounded-3xl  |  rounded-[32px]
border border-gray-50  |  border-white
shadow-sm
p-5  |  p-6
```

### Media Card

```
aspect-square  |  aspect-4/3
rounded-[36px]  |  rounded-[32px]
bg-gray-100  |  bg-black
overflow-hidden
shadow-2xl shadow-orange-100/50  |  shadow-lg
```

---

## 8. Inputs

### Text Input / Textarea

```
w-full
border border-gray-100
bg-white/80  backdrop-blur-sm
px-4 py-4
rounded-2xl
text-base
placeholder:text-gray-400
focus:ring-2 focus:ring-purple-500 focus:border-transparent
hover:border-purple-200 hover:shadow-sm
disabled:opacity-50
```

Textarea adds: `resize-none`, `rows={4}` or `rows={6}`

---

## 9. Badges / Tags

### Variants

| Variant  | Background      | Text           |
|----------|-----------------|----------------|
| Default  | `bg-gray-100`   | `text-gray-600`|
| Info     | `bg-blue-100`   | `text-blue-600`|
| Success  | `bg-green-100`  | `text-green-600`|
| Error    | `bg-red-50`     | `text-red-500` |
| Purple   | `bg-purple-50`  | `text-purple-600`|
| Warning  | `bg-amber-50`   | `text-amber-600`|
| Violet   | `bg-violet-50`  | `text-violet-600`|
| Emerald  | `bg-emerald-50` | `text-emerald-600`|

### Structure

```
inline-flex items-center gap-1.5
rounded-full
px-3 py-1.5
text-xs font-bold  |  text-[10px] font-bold uppercase tracking-widest
```

---

## 10. Modals / Bottom Sheets

### Backdrop

```
fixed inset-0 z-[60]
bg-black/50 backdrop-blur-sm
animation: .backdrop-enter (0.2s fade-in)
```

### Modal Content

```
max-w-sm  mx-auto
bg-white
rounded-[32px]  |  rounded-3xl
p-6  |  p-8
shadow-2xl
animation: .slide-up (0.5s)
```

### Bottom Sheet

```
fixed bottom-0 left-0 right-0 z-[60]
bg-white
rounded-t-3xl
animation: .sheet-enter (0.3s slide up)  |  .sheet-exit (0.25s slide down)
```

---

## 11. Navigation

### Bottom Nav Bar

```
fixed bottom-0 left-0 right-0 z-50
bg-white/95 backdrop-blur-md
border-t border-gray-100
safe-area-bottom
```

### Nav Items

| State    | Style                         |
|----------|-------------------------------|
| Inactive | `text-gray-400`               |
| Active   | `text-[#8B5CF6]`              |

### Central FAB

```
-mt-7
h-14 w-14
rounded-full
bg-[#8B5CF6]
shadow-lg shadow-purple-300/50
text-white
```

---

## 12. Icons

- **Source**: All inline SVGs (Heroicons style)
- **Stroke widths**: `1.8`, `2`, `2.5`
- **Fill**: `fill="none"` (outline) or `fill="currentColor"` (solid)
- **Color**: Inherits via `currentColor`

### Size Scale

| Class     | Px  | Usage                   |
|-----------|-----|-------------------------|
| `h-3.5`   | 14  | Micro icons in badges  |
| `h-4 w-4` | 16  | Inline with small text |
| `h-5 w-5` | 20  | Standard UI icons      |
| `h-6 w-6` | 24  | Nav, card actions      |
| `h-8 w-8` | 32  | Feature icons          |
| `h-10`    | 40  | Large decorative       |
| `h-12`    | 48  | Hero / empty state     |

### Icon Inventory

Home, Calendar, Plus, Chart/Growth, User/Profile, Trash, Edit/Pencil, Clock, Star, Link, Search, Check, X/Close, Arrow Left/Right, Settings/Gear, Building, Phone, Info, Warning, Video Play, Swap, Copy, Menu Dots (3-dot)

---

## 13. Layout

### Container

```
max-w-md mx-auto
px-6
```

### Grid Patterns

| Pattern         | Usage             |
|-----------------|-------------------|
| `grid-cols-2`   | 2-column cards    |
| `grid-cols-3`   | 3-column icons    |
| `grid-cols-7`   | Calendar week     |

### Flex Patterns

| Pattern                               | Usage              |
|---------------------------------------|--------------------|
| `flex items-center justify-between`   | Headers, rows      |
| `flex items-center justify-center`    | Centered content   |
| `flex items-center gap-2`             | Icon + label       |
| `flex flex-col gap-4`                 | Vertical stacks    |
| `flex-1`                              | Equal-width items  |

---

## 14. Animations & Motion

### Keyframe Animations

| Name             | Duration | Easing                        | Usage                  |
|------------------|----------|-------------------------------|------------------------|
| `fadeIn`         | 0.4 s    | cubic-bezier(0.4, 0, 0.2, 1) | Page enter             |
| `slideUp`        | 0.5 s    | cubic-bezier(0.4, 0, 0.2, 1) | Modal enter            |
| `sheetSlideUp`   | 0.3 s    | cubic-bezier(0.32, 0.72, 0, 1)| Bottom sheet enter    |
| `sheetSlideDown` | 0.25 s   | cubic-bezier(0.32, 0.72, 0, 1)| Bottom sheet exit     |
| `backdropFadeIn` | 0.2 s    | ease-out                      | Overlay fade           |
| `shimmer`        | 2 s      | ease-in-out, infinite         | Progress bar           |
| `pulse-soft`     | 2 s      | cubic-bezier, infinite        | Loading placeholders   |
| `rotate`         | 3 s      | linear, infinite              | Spinner icons          |
| `gradient-shift` | 3 s      | ease, infinite                | Animated gradient text |

### Utility Classes

| Class              | Effect                                           |
|--------------------|--------------------------------------------------|
| `.fade-in`         | Opacity 0→1 + translateY(10px→0)                 |
| `.slide-up`        | Opacity 0→1 + translateY(20px→0)                 |
| `.pulse-soft`      | Opacity 1→0.6→1 loop                             |
| `.progress-shimmer`| Gradient sweep loop                              |
| `.rotate-slow`     | 360° continuous rotation                         |
| `.gradient-text`   | Animated gradient text fill                      |
| `.hover-lift`      | translateY(-2px) + shadow on hover               |
| `.hover-scale`     | scale(1.02) on hover                             |
| `.hover-glow`      | Purple glow shadow on hover                      |
| `.sheet-enter`     | Slide up from bottom                             |
| `.sheet-exit`      | Slide down to bottom                             |
| `.backdrop-enter`  | Fade in overlay                                  |

### Transition Defaults

- All buttons/links: `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- Cards: `transition-all`

---

## 15. Special Effects

### Glass Morphism

```
backdrop-blur-sm  |  backdrop-blur-md
bg-white/80  |  bg-white/90  |  bg-white/95
```

Used on: inputs, bottom nav, modal backdrops

### Gradient Text

```css
.gradient-text {
  background: linear-gradient(90deg, #8B5CF6, #EC4899, #8B5CF6);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 3s ease infinite;
}
```

---

## 16. State Indicators

| State    | Icon bg          | Text color       | Border              |
|----------|------------------|------------------|----------------------|
| Loading  | —                | `text-purple-600`| —                    |
| Empty    | `bg-purple-50`   | `text-gray-400`  | —                    |
| Error    | `bg-red-50`      | `text-red-500`   | `border-2 border-red-200` |
| Success  | `bg-green-100`   | `text-green-600` | —                    |

### Loading Spinner

```
h-8 w-8  (large)  |  h-4 w-4  (inline)
border-4 border-solid border-purple-600 border-r-transparent
rounded-full
animate-spin
```

---

## 17. Scrollbar

```css
::-webkit-scrollbar        { width: 6px; }
::-webkit-scrollbar-track  { background: transparent; }
::-webkit-scrollbar-thumb  { background: #D1D5DB; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }

.no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
```

---

## 18. iOS Safe Area

```css
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

---

## 19. Responsive

- **Mobile-first**: all layouts target `max-w-md` (448px)
- No breakpoint variants — single mobile layout
- Aspect ratios: `aspect-square` (1:1), `aspect-4/3`
