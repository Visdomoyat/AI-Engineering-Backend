import { createApp } from './app';


// Load .env for local development (safe no-op in prod if env vars are already set)
import 'dotenv/config';

const PORT = process.env.PORT || 3000;

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});

