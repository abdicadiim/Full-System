# Full System Run Commands

This repo has one backend and three separate frontend apps:

- Auth: `Frontend/Auth` on port `5172`
- Billing: `Frontend/Billing` on port `5173`
- Invoice: `Frontend/Invoice` on port `5174`

## Start Each App In Its Own Terminal

Open a terminal in each app folder and run its own dev command.

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

Run the backend in a separate terminal from the repo root:

```bash
npm run dev:backend
```

## Disabled Commands

These root-level combined launch commands now stop with an error on purpose:

- `npm run dev`
- `npm run dev:all`

