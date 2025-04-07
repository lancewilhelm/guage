# Guage

A clean and simple front-end for large-language models.

## Notable Features

- Nuxt 3 / Vue 3
- Drizzle ORM
- SQLite backend by default, Postgres optional
- TypeScript
- Tailwind CSS
- Multiple LLM providers (OpenAI, Ollama, more coming)
- Themes

## Usage

### Docker (recommended)

Run with docker

```bash
docker run -p 3000:3000 -e NUXT_OPENAI_API_KEY=sk-xxx -v guage:/app/data ghcr.io/lancewilhelm/guage:latest
```

If you want to use a different local directory for the volume data (so that you can more easily access the SQLite database), you can do so by changing "guage" in the volume to the path you want to use.

### Manual (for development)

1. Clone the repo

```bash
git clone https://github.com/lancewilhelm/guage.git
cd guage
```

2. Install dependencies

```bash
pnpm install
```

3. Create a `.env` file in the root directory and add your OpenAI API key, and a secret for the auth middleware. This is typically a random string of 32 characters. You can use openSSL to generate a random string:

```bash
openssl rand -base64 32
```

```bash
# .env
BETTER_AUTH_SECRET=
OPENAI_API_KEY=
```

4. Run the app

```bash
pnpm run dev
```
