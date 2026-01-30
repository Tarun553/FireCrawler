# Firecrawl AI Chatbot MVP

An AI-powered chatbot platform that crawls websites, stores content in vector databases, and provides an embeddable chat widget for customer support.

## Features

- 🕷️ **Website Crawling**: Automated crawling using Firecrawl API
- 🤖 **AI-Powered Chatbot**: Gemini-powered responses based on your website content
- 📊 **Vector Storage**: Efficient semantic search using Pinecone
- 🎨 **Embeddable Widget**: Ready-to-use chat widget for any website
- 🔐 **Authentication**: Clerk integration for user management
- 📦 **Job Queue**: BullMQ for reliable background processing

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis with BullMQ
- **AI/ML**: 
  - Google Gemini (embeddings + chat)
  - Pinecone (vector database)
- **Crawling**: Firecrawl API
- **Auth**: Clerk

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL & Redis)
- API Keys:
  - Clerk (auth)
  - Firecrawl (crawling)
  - Pinecone (vector storage)
  - Google Gemini (AI)

## Getting Started

### 1. Clone and Install

```bash
git clone <your-repo>
cd firecrawl
npm install
```

### 2. Environment Variables

Create a `.env` file with:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/firecrawl?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# API Keys
FIRE_CRAWL_APIKEY=fc-...
PINECONE_DB=pcsk_...
PINECONE_INDEX_NAME=firecrawl
GEMINI_API_KEY=AIza...
```

### 3. Start Services

Start PostgreSQL and Redis:

```bash
docker-compose up -d
```

### 4. Database Setup

Run migrations:

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Create Pinecone Index

Before running the app, create a Pinecone index:

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Create a new index named `firecrawl` (or match your `PINECONE_INDEX_NAME`)
3. Set dimensions to `768` (for Gemini text-embedding-004)
4. Choose a metric (e.g., `cosine`)

### 6. Run the Application

Start the Next.js dev server:

```bash
npm run dev
```

Start the BullMQ worker (in a separate terminal):

```bash
npm run worker
```

The app will be available at `http://localhost:3000`

## Usage

### API Workflow

1. **Create a Project**

```bash
POST /api/projects
{
  "name": "My Website",
  "websiteUrl": "https://example.com"
}

Response:
{
  "id": "...",
  "publicKey": "pk_...",
  "pineconeNamespace": "project_...",
  "status": "CREATING",
  ...
}
```

2. **Start a Crawl**

```bash
POST /api/crawl
{
  "projectId": "<project-id>"
}

Response:
{
  "id": "<crawl-id>",
  "status": "PENDING",
  ...
}
```

3. **Check Crawl Status**

```bash
GET /api/crawl/<crawl-id>

Response:
{
  "id": "<crawl-id>",
  "status": "COMPLETED",
  "pagesCount": 42,
  ...
}
```

4. **Embed the Widget**

Add to your website:

```html
<script 
  src="https://yourdomain.com/chatbot-widget.js" 
  data-public-key="pk_..."
></script>
```

Visit `/widget-demo` for integration instructions.

## Architecture

### Components

```
┌─────────────┐
│  Next.js    │
│  Frontend   │
└──────┬──────┘
       │
┌──────▼──────┐     ┌─────────┐
│   API       │────▶│  Clerk  │
│   Routes    │     │  Auth   │
└──────┬──────┘     └─────────┘
       │
       ├─────────────┬─────────────┐
       │             │             │
┌──────▼──────┐ ┌───▼────┐  ┌─────▼─────┐
│  PostgreSQL │ │ Redis  │  │  BullMQ   │
│   (Prisma)  │ │        │  │   Queue   │
└─────────────┘ └────────┘  └─────┬─────┘
                                   │
                            ┌──────▼───────┐
                            │   Worker     │
                            │  (crawl-     │
                            │   worker.ts) │
                            └──────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              ┌─────▼─────┐  ┌────▼────┐  ┌──────▼──────┐
              │ Firecrawl │  │ Gemini  │  │  Pinecone   │
              │    API    │  │   API   │  │   Vectors   │
              └───────────┘  └─────────┘  └─────────────┘
```

### Data Flow

1. User creates project → Stored in PostgreSQL
2. User triggers crawl → Job added to BullMQ
3. Worker picks up job → Calls Firecrawl API
4. Content chunked → Embedded with Gemini
5. Vectors stored → Pinecone with namespace
6. Project status → Updated to READY
7. User embeds widget → Chat queries Pinecone + Gemini

## Project Structure

```
firecrawl/
├── app/
│   ├── api/
│   │   ├── projects/route.ts      # Create/list projects
│   │   ├── crawl/route.ts         # Start crawl job
│   │   ├── crawl/[crawlId]/       # Get crawl status
│   │   └── chat/route.ts          # Chatbot endpoint
│   └── widget-demo/page.tsx       # Widget integration guide
├── lib/
│   ├── prisma.ts                  # Prisma client
│   ├── redis.ts                   # Redis client
│   ├── queue.ts                   # BullMQ queue
│   ├── firecrawl.ts              # Firecrawl client
│   ├── pinecone.ts               # Pinecone client
│   ├── gemini.ts                 # Gemini client
│   └── syncUser.ts               # Clerk user sync
├── workers/
│   └── crawl-worker.ts           # BullMQ worker
├── public/
│   └── chatbot-widget.js         # Embeddable widget
├── prisma/
│   └── schema.prisma             # Database schema
└── docker-compose.yaml           # PostgreSQL + Redis
```

## Database Schema

```prisma
User
├── id, clerkId, email, name
└── projects[]

Project
├── id, userId, name, websiteUrl
├── publicKey, pineconeNamespace
├── status (CREATING, READY, FAILED)
└── crawls[]

Crawl
├── id, projectId
├── status (PENDING, PROCESSING, COMPLETED, FAILED)
└── pagesCount, error, timestamps
```

## Scripts

- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run worker` - Start BullMQ worker
- `npm run lint` - Run ESLint

## Development Tips

1. **Check Worker Logs**: Monitor the worker terminal to see crawl progress
2. **Prisma Studio**: Run `npx prisma studio` to browse the database
3. **Redis CLI**: Use `docker exec -it <container> redis-cli` to inspect queue
4. **Widget Testing**: Visit `/widget-demo` for integration instructions

## Troubleshooting

### Worker not processing jobs

- Check Redis is running: `docker ps`
- Check worker logs for errors
- Verify `REDIS_URL` in `.env`

### Crawl fails

- Verify `FIRE_CRAWL_APIKEY` is valid
- Check Firecrawl API limits
- Review worker logs for error details

### Chat not working

- Ensure project status is `READY`
- Verify Pinecone index exists and has correct dimensions (768)
- Check `GEMINI_API_KEY` is valid
- Verify `publicKey` in widget matches project

### Database errors

- Run `npx prisma migrate reset` (WARNING: deletes data)
- Ensure PostgreSQL is running
- Check `DATABASE_URL` connection string

## Production Deployment

1. **Environment**: Set all env vars in your hosting platform
2. **Database**: Use managed PostgreSQL (e.g., Supabase, Neon)
3. **Redis**: Use managed Redis (e.g., Upstash, Redis Cloud)
4. **Worker**: Deploy as a separate service/process
5. **Domain**: Update widget script URL in production

## License

MIT

## Support

For issues or questions, please open a GitHub issue.
