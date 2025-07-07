# Travel Assistant Hackathon App (xoxgo)

## Tech Stack
- Next.js (App Router, Frontend & API routes)
- Neo4j Aura (Graph DB)
- GROQ LLaMA API (AI agent)
- SERP API, Tavily (data scraping)
- Twilio (SMS/voice)

## Setup
1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your API keys
3. Install dependencies:
   ```
   npm install
   ```
4. Seed Neo4j database:
   - Open Neo4j Aura browser
   - Paste contents of `lib/neo4jSchema.cypher` and run
5. Run the app:
   ```
npm run dev
   ```

## API
- `/api/suggestions?city=Tokyo&weather=sunny` — Get suggested products from local stores

## Notes
- All user preferences and interactions are stored in Neo4j
- Extend with more routes, AI functions, and e-commerce features as needed
