# Guage

![Nuxt](https://img.shields.io/badge/Nuxt%204-%23000000?style=for-the-badge&logo=nuxt)
![Vue](https://img.shields.io/badge/Vue%203-%23191A22?style=for-the-badge&logo=vuedotjs)
![Tailwind](https://img.shields.io/badge/Tailwind%20v4-%231a202c?style=for-the-badge&logo=tailwind-css)
![SQLite](https://img.shields.io/badge/SQLite-%231a202c?style=for-the-badge&logo=sqlite)
![Drizzle](https://img.shields.io/badge/Drizzle%20ORM-%231a202c?style=for-the-badge&logo=drizzle)

A clean and simple front-end for large-language models.

## Notable Features

- Nuxt 4 / Vue 3
- Drizzle ORM
- SQLite backend by default, Postgres optional
- TypeScript
- Tailwind CSS
- Multiple LLM provider support (local and remote)
  - Ollama
  - LM Studio (localhost only atm)
  - OpenAI
  - Gemini
  - Anthropic
  - Cerebras
- Themes and fun things

## Usage

### Docker (recommended)

#### Easiest

Easiest way with minimal setup, but the least secure or capable.

```bash
docker run -p 3000:3000 -v guage:/app/data ghcr.io/lancewilhelm/guage:stable
```

This will run the app on port 3000 and create a persistent volume called "guage" to store the SQLite database. You can access the app at `http://localhost:3000`.

#### With LLM Provider API Key

To use a remote provider api for llm inference, you can set an environmental variable at runtime with your key. Given that we are using Nuxt, we must prepend NUXT\_ to the key (I know...I hate it). Below are the currently supported keys:

- `NUXT_OPENAI_API_KEY` for OpenAI
- `NUXT_GEMINI_API_KEY` for Gemini
- `NUXT_ANTHROPIC_API_KEY` for Anthropic
- `NUXT_CEREBRAS_API_KEY` for Cerebras

##### Example

If you want to use OpenAI's API, you can set the `NUXT_OPENAI_API_KEY` environment variable. This is required for the app to work with OpenAI.

```bash
docker run -p 3000:3000 -e NUXT_OPENAI_API_KEY=sk-xxx -v guage:/app/data ghcr.io/lancewilhelm/guage:stable
```

#### NODE_ENV=production

If you want to run the app in production mode, you can set the `NODE_ENV` environment variable to `production`. This currently only affects the logging level and auth. You will need to generate a secret key for the app to work in production mode. You can do this by running the following command:

```bash
openssl rand -base64 32
```

Replace `xxx` with the generated key.

```bash
docker run -p 3000:3000 -e NODE_ENV=production -e AUTH_SECRET=xxx -v guage:/app/data ghcr.io/lancewilhelm/guage:stable
```

#### Customizing the volume

If you want to use a local directory for the volume data (so that you can more easily access the SQLite database), you can do so by changing "guage" in the volume to the path you want to use. Example:

```bash
docker run -p 3000:3000 -v /path/to/local/dir:/app/data ghcr.io/lancewilhelm/guage:stable
```

You can mix and match these options as you like.

### Manual (for development)

1. Clone the repo

```bash
git clone https://github.com/lancewilhelm/guage.git
cd guage
```

2. Run setup script. This will install the dependencies with pnpm and create the SQLite database. If you would like to use a different package manager, please manually do so. npm should work.

```bash
./init.sh
```

3. (Optional) Add your API keys for supported providers to the `.env` file:

```bash
# .env
AUTH_SECRET=
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
CEREBRAS_API_KEY=
```

4. Run the app

```bash
pnpm dev
```
