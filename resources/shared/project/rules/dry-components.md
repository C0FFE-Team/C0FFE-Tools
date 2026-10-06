# DRY Components

Before creating any new component, ALWAYS check if an existing component can be used or extended.

## Before Creating a New Component

1. **Search existing components**: Check `src/components/`, `components/`, and any component library
2. **Check the style guide**: See if `.harness/styleguide.md` documents this component type
3. **Check UI library**: If the project uses a UI library (shadcn, MUI, Chakra, etc.), check if it provides the component
4. **Consider composition**: Can existing components be composed to achieve the design?
5. **Consider extension**: Can an existing component be extended with new variants/props?

## When to Create New Components
- No existing component matches the design intent
- The existing component would need fundamental changes (not just a new variant)
- The component serves a genuinely different purpose

## Component Guidelines
- Shared components go in `src/components/ui/` or `src/components/shared/`
- Feature-specific components go in `src/components/<feature>/` or co-located with the feature
- Always accept `className` prop for style overrides
- Use style guide tokens, never hardcode colors/spacing/typography
- Export from a barrel file if the project uses them
