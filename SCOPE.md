# Scope: Design system rollout for legacy sites

## Purpose

Bring the legacy websites into line with the new NTG design system without
rebuilding them. The look and feel is updated through CSS only, so existing
pages, markup and behaviour keep working.

## Approach

1. **Existing styles left in place.** Bootstrap (`bootstrap.min.css`) and the
   sites' existing stylesheets are not removed or rewritten. They load in the
   same order as before.
2. **Design tokens override the old values.** Colours, typography, borders
   and focus styles now come from the design-system token file
   (`tokens.css`). Tokens are published from the
   [web-design-system-tokens](https://github.com/ntgovernment/web-design-system-tokens)
   repo and pulled in at build time. Not every existing colour has an exact
   token yet, so where there is no exact match the existing colour has been
   replaced with the closest matching token.
3. **Bootstrap overridden with tokens where required.** A single stylesheet,
   `bootstrap-overrides.css`, loads last and re-styles Bootstrap's own classes
   using the tokens:
   - **Square corners:** border-radius removed from form controls, selects,
     buttons, cards, tabs, breadcrumbs, badges, dropdowns, alerts and popovers.
   - **Form inputs:** `.form-control` matches the new input spec (52px height,
     token padding, border, background and text colours, placeholder colour,
     and valid/invalid states).
   - **Focus:** Bootstrap's blue focus glow is replaced with the design-system
     focus outline on inputs, selects and buttons.

## In scope

- CSS token overrides for colour, type, borders and focus.
- Targeted Bootstrap overrides listed above.
- Versioned, compiled output (`dist/dev/ntg/<version>/index.css` and
  `tokens.css`) so sites can opt in to a specific version.

## Out of scope

- Changes to HTML markup, JavaScript or images.
- Removing or upgrading Bootstrap.
- Button padding and adoption of the spacing scale across components
  (held back from this pass).
- Redesigning page layouts or components.

## Known limitations

Not all tokens have been added yet. Colours without an exact token use the
closest matching token, so some colours may shift slightly from the original
until the full token set is available.

Token version 0.0.2 renames the variables (for example `--clr-text-*` becomes
`--colors-text-*`). The stylesheets still use the 0.0.1 names, so they need
updating before 0.0.2 can fully replace 0.0.1.
