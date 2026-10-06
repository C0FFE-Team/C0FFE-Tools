# Pixel Perfect Implementation Standards

When implementing designs from Figma, achieve exact visual fidelity.

## Required Matches
- **Colors**: Exact hex/rgba values from style guide tokens. Never approximate.
- **Typography**: Exact font family, size (px), weight, line-height, letter-spacing.
- **Spacing**: Exact padding, margin, gap values from the design.
- **Sizing**: Exact width, height, min/max constraints.
- **Border radius**: Exact values per component.
- **Shadows**: Exact shadow definitions (offset, blur, spread, color).
- **Layout**: Exact flexbox/grid configuration matching Figma auto-layout.

## Interactive States
Every interactive element MUST have:
- `cursor: pointer` on clickable elements
- Visible focus outline (accessibility)
- Hover state
- Active/pressed state
- Disabled state (if applicable)
- Selected state (if applicable)
- Empty state (for data displays)

## Assets
- Download ALL images from Figma — never reference Figma CDN URLs
- Use appropriate formats (SVG for icons, WebP/PNG for photos)
- Include proper `alt` text on all images
- Use lazy loading for below-fold images

## Static Illustrations — NEVER Reproduce with Code
- **Illustrations, decorative graphics, complex shapes, and non-dynamic visual elements MUST be exported as images from Figma** — NEVER attempt to reproduce them with CSS, SVG paths, or HTML
- If an element is NOT interactive, NOT data-driven, and NOT dynamically changing, it is a static asset — download it
- Export at the highest quality available (SVG if vector, PNG @2x/3x if raster)
- This includes: hero illustrations, decorative backgrounds, complex icons with gradients, mascots, badges, patterns, abstract shapes, onboarding graphics
- The ONLY exception is simple geometric shapes that are clearly part of the layout system (solid-color dividers, simple borders, basic circles/rectangles used as containers)
- When in doubt, export the image — do NOT waste time trying to replicate visual art with code

## Responsive
- Follow breakpoints from the style guide
- Test at all breakpoints (mobile, tablet, desktop)
- Use relative units where appropriate (rem for typography, percentages for layout)
- Fixed pixel values only when the design specifies exact sizes

## Verification
- Compare implementation screenshot against Figma reference
- Check at all breakpoints
- Verify all interactive states work
