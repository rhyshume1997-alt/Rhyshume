# Fancy Components (vendored source)

Source files from [danielpetho/fancy](https://github.com/danielpetho/fancy), commit `f9f62c6`, MIT licence (see `LICENSE`). Docs for each component: https://fancycomponents.dev/docs/introduction

These are React components. Nothing on the site uses them yet: the site is plain HTML and this folder is excluded from the Vercel deploy (`.vercelignore`).

- `components/`: the components, grouped as upstream (`text`, `background`, `blocks`, `carousel`, `filter`, `image`, `physics`)
- `hooks/`, `utils/`, `lib/utils.ts`: the helpers the components import

## Using one in a React project

1. Copy the component file, plus any `hooks/` or `utils/` file it imports, into the project.
2. The imports use the `@/` alias: `@/lib/utils`, `@/hooks/...`, `@/utils/...`. Point `@` at the folder you copied into, or rewrite the paths.
3. Install what the file imports. Across the whole set that is `react`, `motion`, `clsx`, `tailwind-merge`, `lodash`, `matter-js` (physics components) and `uuid`. Styling assumes Tailwind CSS.
