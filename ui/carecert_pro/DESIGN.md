---
name: CareCert Pro
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e2'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fc'
  surface-container: '#ededf6'
  surface-container-high: '#e8e7f0'
  surface-container-highest: '#e2e2eb'
  on-surface: '#1a1b22'
  on-surface-variant: '#434653'
  inverse-surface: '#2f3037'
  inverse-on-surface: '#f0f0f9'
  outline: '#747684'
  outline-variant: '#c3c6d5'
  surface-tint: '#2b58bd'
  primary: '#003fa3'
  on-primary: '#ffffff'
  primary-container: '#2b58bd'
  on-primary-container: '#ccd7ff'
  inverse-primary: '#b3c5ff'
  secondary: '#5b5f61'
  on-secondary: '#ffffff'
  secondary-container: '#e0e3e6'
  on-secondary-container: '#626567'
  tertiary: '#773200'
  on-tertiary: '#ffffff'
  tertiary-container: '#9c4400'
  on-tertiary-container: '#ffceb5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#e0e3e6'
  secondary-fixed-dim: '#c4c7ca'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#44474a'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb68f'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#773200'
  background: '#faf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e2e2eb'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 16px
  stack-gap: 12px
  section-padding: 20px
  item-padding: 16px
---

## Brand & Style

The design system is engineered for the **Long-term Care Professional (长护师)**, an audience that requires a balance of medical authority and accessible learning. The brand personality is **Professional, Rigorous, and Reliable**. 

The design style follows a **Modern Corporate** approach with a focus on functional clarity. It avoids unnecessary decoration to minimize cognitive load during exam preparation. The interface should evoke a sense of "Clinical Precision"—using structured layouts, ample whitespace, and a high-contrast color palette to ensure that educational content is the primary focus.

## Colors

This design system utilizes a high-trust palette rooted in medical tradition. 

- **Primary (Medical Blue):** Used for primary actions, active navigation states, and brand reinforcement. It represents expertise and calm.
- **Background (Soft Grey):** The global background uses a light grey to reduce screen glare during long study sessions, while pure white is reserved for content cards and interactive surfaces.
- **Semantic Colors:** Green and Red are strictly reserved for feedback loops—marking correct/incorrect answers and passing/failing scores. These are saturated enough to be unmistakable.
- **Neutral Scale:** Darker tones are used for high-legibility typography, while lighter strokes define structural boundaries without adding visual noise.

## Typography

This design system employs a neutral, sans-serif stack to ensure maximum legibility across mobile devices. 

- **Hierarchy:** Headlines are bold and concise to aid in scanning question titles. Body text uses a generous line height (1.5x) to prevent eye fatigue during reading-heavy tasks.
- **Emphasis:** Important keywords in medical questions (e.g., "NOT", "ALWAYS") should be rendered in `title-lg` with the primary color or a semi-bold weight.
- **Adaptability:** On smaller screens, the `display-lg` scale is capped at 24px to ensure question stems remain visible without excessive scrolling.

## Layout & Spacing

The design system follows a **Fixed Grid** approach tailored for WeChat Mini-Programs and mobile viewports. 

- **Margins:** A standard 16px margin is maintained on the left and right of the screen to prevent content from touching the edges.
- **Rhythm:** An 8px-based spacing scale is used. Question options are separated by 12px gaps to create distinct touch targets.
- **Vertical Flow:** Content is grouped into logical modules (e.g., Question Area, Option List, Explanation Card) with 20px spacing between sections to define a clear reading order.

## Elevation & Depth

To maintain a "clean and professional" look, this design system uses **Ambient Shadows** and **Tonal Layering** instead of heavy borders.

- **Surface Strategy:** The base level is the light grey background (#F5F7FA). Active content, such as exam questions and list items, sits on white cards (#FFFFFF).
- **Shadow Profile:** List items use a very soft, diffused shadow (`0px 2px 8px rgba(43, 88, 189, 0.05)`) to create a subtle lift that distinguishes interactive items from the static background.
- **Interaction:** Upon selection, a card may transition from a shadow-based lift to a 1px solid border in the Primary Blue color to indicate the "Selected" state.

## Shapes

The shape language balances modern aesthetics with medical approachability.

- **Cards & Inputs:** A consistent 8px (0.5rem) radius is applied to all container elements and list items, providing a structured yet soft appearance.
- **Buttons:** Primary action buttons (e.g., "Submit Answer," "Next Question") utilize **Full Rounding (Pill-shaped)** to clearly differentiate them from informational cards and to maximize the tap area's visual appeal.
- **Icons:** Use linear icons with slightly rounded terminals to match the typography's character.

## Components

### Buttons
- **Primary:** Full-width, pill-shaped, background in Primary Blue, text in White. High emphasis.
- **Secondary/Ghost:** Pill-shaped, Primary Blue border (1px), transparent background. Used for "View Explanation" or "Previous."

### Question Items (Cards)
- Rectangular white background with 8px rounded corners.
- Subtle 5% blue-tinted shadow.
- 16px internal padding.

### Answer Options
- Default: White card, 8px radius, grey border.
- Correct State: Light green background tint, 1px solid Green border, Green check icon.
- Incorrect State: Light red background tint, 1px solid Red border, Red cross icon.

### Progress Indicators
- A slim horizontal progress bar at the top of the exam interface.
- Secondary Blue track with a Primary Blue fill indicator.

### Chips/Tags
- Used for category labels (e.g., "Level 1," "Ethics").
- Small 4px radius, subtle grey background, and `label-sm` typography.

### Modals
- Centralized with a heavy backdrop blur (Glassmorphism inspired) to focus attention on result summaries or "Time's Up" warnings.