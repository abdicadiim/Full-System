# Full System Run Commands

This repo has one backend and three separate frontend apps:

- Auth: `Frontend/Auth` on port `5172`
- Billing: `Frontend/Billing` on port `5173`
- Invoice: `Frontend/Invoice` on port `5174`

## Start Each App In Its Own Terminal

Open a terminal in each frontend app folder and run its own dev command. Run the backend from the repo root.

```bash
cd Frontend/Auth
npm run dev
```

```bash
cd Frontend/Billing
npm run dev
```

```bash
cd Frontend/Invoice
npm run dev
```

Run the backend from the repo root:

```bash
npm run dev
```

For a production-style start, use:

```bash
npm start
```

## Disabled Commands

These root-level combined launch commands are still disabled on purpose:

- `npm run dev:all`
