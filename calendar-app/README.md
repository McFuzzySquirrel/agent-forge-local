# Calendar Management App

A single-page web application for managing personal schedules. Built with React 19, TypeScript, and Vite. All data is stored locally in your browser — no backend, no accounts, no server.

## Requirements

- **Node.js 20+** (Node 22 LTS recommended — Vite 6 requires `^20.19.0 || >=22.12.0`)
- **npm 10+**

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

## Testing

```bash
# Run tests once
npm test -- --run

# Watch mode
npm test

# Interactive UI (requires @vitest/ui)
npm run test:ui
```

## Tech Stack

| Tool | Version |
|------|---------|
| React | ^19.1.0 |
| TypeScript | ^5.8.0 |
| Vite | ^6.3.2 |
| Vitest | ^3.1.2 |
| date-fns | ^4.1.0 |
| uuid | ^11.1.0 |
| React Testing Library | ^16.3.0 |

## Persistence

All event data is stored in **browser `localStorage`** only. There is no server, no cloud sync, and no cross-device data sharing. Clearing browser storage will remove all events.

## Project Structure

```
calendar-app/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx          # App entrypoint
    ├── App.tsx           # Root component (created by react-calendar-engineer)
    ├── types/            # Shared TypeScript interfaces
    ├── store/            # State management and persistence
    ├── components/       # Calendar UI components
    ├── utils/            # Date helpers, storage, category colors
    └── styles/           # CSS Modules
```
