import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.tsx'

const root = document.getElementById('root')!

const tree = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// The built pages arrive with their markup already rendered by
// scripts/prerender.mjs, so React attaches to what is there instead of
// discarding it and rendering again. `vite dev` serves an empty container and
// has to mount normally, and the emptiness is what distinguishes the two:
// checking for prerendered children is more honest than checking import.meta
// env, since what matters is whether there is anything to hydrate.
if (root.hasChildNodes()) {
  hydrateRoot(root, tree)
} else {
  createRoot(root).render(tree)
}
