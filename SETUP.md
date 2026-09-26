# Rogue Analytics site: setup

These files drop into your existing Vite + React project folder.

1. Copy everything in this zip into the project folder, replacing `index.html`,
   `vite.config.js`, and the whole `src/` folder. Keep your own `package.json`
   and `package-lock.json`.
2. `npm install react-router-dom`
3. `npm run dev` and open the printed localhost address. Dev mode turns the
   members area on; preview Projections states with `?preview=live`,
   `?preview=pending`, or `?preview=off`.
4. `npm run build` then `npm run preview` to see exactly what will ship
   (members area off).
5. Commit and push to `main`. The workflow in `.github/workflows/deploy.yml`
   builds and publishes to GitHub Pages.

Settings live in `.env.production` (members switch, contact email, Formspree ID).
Copy and wording live in `src/pages/*.jsx`; prices, package lists, drop times,
and projection columns live in `src/config.js`.
