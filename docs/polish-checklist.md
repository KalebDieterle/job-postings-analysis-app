# Week 10 Polish Checklist

## Baseline Capture
Capture screenshots for desktop + mobile on each route in these states:
- default
- filtered
- empty
- loading

Routes:
- `/`
- `/roles`
- `/roles/[slug]`
- `/skills`
- `/skills/[slug]`
- `/companies`
- `/companies/[slug]`
- `/locations`
- `/locations/[slug]`
- `/trends`

## Chart Consistency Checks
- Axis labels truncate cleanly on small screens.
- Tick formatting uses compact number/currency patterns.
- Tooltip values are human-readable and not clipped.
- Chart containers keep minimum height and avoid overlap.
- Empty datasets show fallback states.

## Filter and Pagination Consistency
- Filter reset behavior returns URL state to defaults.
- Active filters are visible and removable.
- Pagination labels are semantically correct for known/unknown totals.
- Next/prev navigation preserves query state.

## Mobile Behavior
- Sticky filter rows do not overlap header.
- Bottom nav does not clip CTAs or content.
- Interactive controls remain reachable at small breakpoints.

## Accessibility Pass
- Focus visible rings on keyboard navigation.
- All filter controls have meaningful labels.
- Chart sections include readable context/fallback copy.
- Trend badges and status colors maintain contrast.

## Exit Criteria
- No chart overlap/clipping at common breakpoints.
- Listing pages have consistent filtering + pagination UX.
- Mobile layouts verified for all top-level routes.
- `npm run lint` and `npm run build` both pass.

