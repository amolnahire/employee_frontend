# React + Vite

## Configure the API

The frontend defaults to `http://localhost:8082` and appends API routes such as
`/api/employees`. To change the backend host, copy `.env.example` to `.env.local`
and update `VITE_API_URL`, then restart the development server or rebuild the
app. You can also change the API base URL in the app's top bar; that value is
saved in this browser.

The Vite development proxy uses the same `VITE_API_URL` target. If needed, it
can be overridden separately with `VITE_API_PROXY_TARGET`.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
