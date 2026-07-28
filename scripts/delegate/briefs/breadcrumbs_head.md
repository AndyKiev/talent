```json
{
  "max_iterations": 4,
  "allow_paths": ["frontend/src/components/"],
  "validate": [
    "cd frontend && npx tsc -b"
  ]
}
```

# Objective

Every page repeats the same MUI `<Breadcrumbs>` trail by hand. A shared
`PageBreadcrumbs` component now exists. Rewrite each listed file to use it.

Only the breadcrumb block changes. Everything else in the file — the component
name, its props, hooks, queries, the rest of the JSX — must stay untouched.

# Context — the shared component

`frontend/src/components/ui/PageBreadcrumbs.tsx` (named export):

```tsx
export interface Crumb {
    /** Where the crumb links to. The last (current) crumb omits it. */
    to?: LinkProps['to'];
    /** Route params for `to`, when it has dynamic segments. */
    params?: LinkProps['params'];
    label: ReactNode;
}

interface Props {
    items: Crumb[];
    /** Merged over the default `mb: 3`. */
    sx?: SxProps<Theme>;
}

export function PageBreadcrumbs({ items, sx }: Props) { ... }
```

It renders exactly what the hand-written blocks rendered: a
`<Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>`,
each linked crumb as `<Link to={...} style={{ textDecoration:'none', color:'inherit' }}>`
wrapping `<Typography variant="body2" color="text.secondary">`, and the final
crumb as `<Typography variant="body2" color="text.primary" fontWeight={600}>`.

## Canonical before → after (already applied, copy its shape)

BEFORE — `src/components/admin/job_groups/JobGroupsPage.tsx`:

```tsx
import { Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';

export function JobGroupsPage() {
  const getString = useString({ str });
  return (
    <AppShell>
      <PageContainer>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
          <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="body2" color="text.secondary">
              {cfl(getString('admin'))}
            </Typography>
          </Link>
          <Typography variant="body2" color="text.primary" fontWeight={600}>
            {cfl(getString('jobGroups'))}
          </Typography>
        </Breadcrumbs>
        <JobGroupCrud />
      </PageContainer>
    </AppShell>
  );
}
```

AFTER:

```tsx
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';

export function JobGroupsPage() {
  const getString = useString();
  return (
    <AppShell>
      <PageContainer>
        <PageBreadcrumbs
          items={[
            { to: '/admin', label: cfl(getString('admin')) },
            { label: cfl(getString('jobGroups')) },
          ]}
        />
        <JobGroupCrud />
      </PageContainer>
    </AppShell>
  );
}
```

# Constraints

- **Preserve every label expression byte-for-byte.** `cfl(getString('x'))`,
  `getString('x') || 'English'`, a plain variable, a template string — copy the
  expression into `label:` unchanged. Never rename a translation key, never
  invent one, never drop an English fallback.
- **Preserve the order and the link targets.** A `<Link to="/admin">` crumb
  becomes `{ to: '/admin', label: ... }`. A `<Link to="/x/$id" params={{ id }}>`
  becomes `{ to: '/x/$id', params: { id }, label: ... }`. The LAST crumb (the
  bold `text.primary` one) becomes `{ label: ... }` with **no** `to`.
- **Fix the import list.** Remove `Breadcrumbs` from the `@mui/material` import
  (keep `Typography` and the others only if still used elsewhere in the file),
  remove the now-unused `NavigateNextIcon` import, and remove the
  `@tanstack/react-router` `Link` import **only if no other `<Link>` remains in
  the file**. Add `import { PageBreadcrumbs } from '<correct relative path>/ui/PageBreadcrumbs';`
  — count the `../` hops from the file's own directory.
- **`import str from '.../strings/str'` plus `useString({ str })` must be
  DELETED** wherever you touch a file — that form is login-page-only legacy.
  Replace with plain `useString()`. Remove the now-unused `str` import.
- If the block carries an `sx` other than `{ mb: 3 }`, pass it as `sx={{...}}`.
- Keep the file's existing indentation width (2 or 4 spaces) and its leading
  `// src/...` path comment.
- No `any`. No emoji. No hardcoded non-English text.

## Refuse a file (return it unchanged, and say why) when

- a crumb is not a `<Link>`-or-plain-`<Typography>` pair — e.g. it renders a
  `<Chip>`, a button, an icon, or a `<Link>` with an `onClick`;
- the breadcrumb block is built inside a `.map()` over dynamic data;
- more than one `<Breadcrumbs>` element exists in the file;
- you cannot work out the correct relative import path with certainty.

Refusing is a correct outcome. Do NOT change `PageBreadcrumbs` itself — it is
out of scope.

# Definition of done

`npx tsc -b` exits 0 and every converted file renders `<PageBreadcrumbs>`.

# Files to convert

