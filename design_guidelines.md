# Cub Scout Pinewood Derby Portal - Design Guidelines

## Design Approach
**System-Based Approach**: Material Design principles adapted for a family-friendly, community-focused Cub Scout portal. The design prioritizes usability for parents and event organizers while maintaining an approachable, energetic feel that resonates with scouting values.

## Brand Colors (Official Cub Scouts)
- **Primary Blue**: #003F87 (HSL: 212 100% 26%) - Used for primary buttons, sidebar, headers
- **Scout Gold**: #FCD116 (HSL: 49 97% 54%) - Used for decorative icons, visual accents, icon backgrounds
- **Warm Neutrals**: Cream-tinted backgrounds (45° hue) for a warmer, welcoming feel
- The color palette uses gold tastefully on icons/visual elements, keeping buttons professional in blue
- Tailwind utility: `text-scout-gold` and `bg-scout-gold` for the official gold color

## Typography System
- **Primary Font**: Inter (Google Fonts) - clean, highly legible for forms and data
- **Display Font**: Poppins Bold - friendly, rounded headers for event titles and CTAs
- **Hierarchy**:
  - Hero/Page Titles: Poppins Bold, 3xl/4xl
  - Section Headers: Poppins SemiBold, 2xl
  - Card Titles: Inter SemiBold, lg/xl
  - Body Text: Inter Regular, base
  - Form Labels: Inter Medium, sm
  - Helper Text: Inter Regular, xs

## Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Form field spacing: gap-4
- Card padding: p-6
- Section padding: py-12 to py-20
- Container max-width: max-w-7xl
- Form max-width: max-w-2xl

## Core Component Library

### Navigation
- **Top Navigation Bar**: Sticky header with Derby Event name prominently displayed, main navigation links (Home, Register, Rules, Gallery, Band Updates), event organizer login/profile in top-right
- **Mobile**: Hamburger menu with slide-out drawer

### Hero Section
- **Event Dashboard Hero**: Full-width banner featuring event name, dates, registration status badge, countdown timer to registration deadline
- **Image**: Wide hero image showing energetic pinewood derby action shot (cars racing down track, excited scouts cheering)
- **CTA**: Prominent "Register Your Racer" button with blurred background when over image

### Registration Form
- **Multi-Step Form Pattern**:
  - Step 1: Participant Info (name, photo upload, den/category dropdown)
  - Step 2: Car Details (name, photo upload, voting category multi-select)
  - Step 3: Review & Submit
- **Step Indicator**: Material stepper with filled circles for completed steps
- **Image Upload**: Drag-drop zone with preview thumbnail, "Change Photo" option
- **Field Layout**: Single column for mobile, maintains single column on desktop for clarity
- **Validation**: Inline error messages below fields, success checkmarks for completed fields

### Event Management (Admin)
- **Dashboard Cards**: Grid layout (2 columns on desktop) showing:
  - Registration Stats card with count/progress bar
  - Event Settings card with quick edit access
  - Den/Category Configuration card
  - Band.us Integration Status card
- **Event Selector**: Dropdown in admin header to switch between Derby Events

### Gallery/Participant Display
- **Card Grid**: 3-column grid (desktop), 2-column (tablet), 1-column (mobile)
- **Participant Cards**: 
  - Square aspect ratio for participant photo
  - Overlay gradient at bottom with name/den
  - Car photo thumbnail below
  - Car name and voting categories as tags
- **Filtering**: Horizontal tab navigation by den/category

### Band.us Integration Section
- **Dual Column Layout** (desktop):
  - Left: Recent Posts feed (card-based with timestamp, excerpt)
  - Right: Upcoming Calendar Events (list view with date badges)
- **Posts Cards**: Image thumbnail, title, timestamp, "View on Band" link
- **Calendar Items**: Date badge (day/month), event title, time details

### Forms & Inputs
- **Text Inputs**: Material floating labels, border-bottom focus state, helper text below
- **Dropdowns**: Custom select with chevron icon, options list with hover states
- **Image Upload**: Dashed border drop zone, camera icon placeholder, 4:3 aspect ratio preview
- **Checkboxes/Radio**: Rounded checkboxes for multi-select, radio for single-select, with label click targets
- **Buttons**: 
  - Primary: Rounded corners (rounded-lg), medium height (h-12), bold text
  - Secondary: Outlined variant
  - Text: No background, underline on hover

### Data Display
- **Status Badges**: Small rounded pills for registration status (Open/Closed), event active state
- **Progress Indicators**: Linear progress bars for registration capacity
- **Empty States**: Illustrated placeholder with descriptive text for no registrations, no events

### Overlays & Modals
- **Modal Dialogs**: Centered, max-w-lg, backdrop blur, close icon top-right
- **Confirmation Dialogs**: Icon + headline + description + action buttons
- **Toast Notifications**: Bottom-right positioning, slide-in animation, auto-dismiss

## Images
- **Hero Image**: Wide format (16:9) showing pinewood derby race action - wooden track with colorful cars racing, scouts cheering in background. Bright, energetic, community atmosphere.
- **Empty State Illustrations**: Simple line drawings of derby cars, trophies for empty registration lists
- **Placeholder Images**: Generic scout/car silhouettes for missing uploads

## Accessibility
- Minimum touch target: 44x44px
- Form labels always visible
- Focus indicators: 2px offset ring in accent color
- Sufficient contrast ratios maintained
- Alt text required for all uploaded images

## Animations
- **Minimal Use**: Subtle transitions only
- Page transitions: 150ms ease
- Button hover: Scale 1.02 transform
- Modal entrance: 200ms fade + slide
- Form field focus: Border color transition 150ms