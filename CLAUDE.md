# CLAUDE.md

## Project Overview
Open Lovable is a Next.js 15 application that enables users to chat with AI to build React apps instantly. It uses E2B sandboxes for code execution and supports multiple AI providers (Anthropic, OpenAI, Gemini, Groq).

## Development Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test:all` - Run all tests (integration, API, code execution)

## Architecture
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **Code Execution**: E2B sandboxes
- **AI Providers**: Anthropic, OpenAI, Gemini, Groq via AI SDK
- **UI Components**: Radix UI primitives with custom styling

## Key Directories
```
app/
├── api/                    # API routes for sandbox management, AI code generation
├── components/            # App-specific components (theme, UI)
└── page.tsx              # Main chat interface

components/               # Reusable UI components
├── ui/                   # Base UI components (button, input, etc.)
├── CodeApplicationProgress.tsx
├── SandboxPreview.tsx
└── HMRErrorDetector.tsx

lib/                      # Utilities and helpers
├── context-selector.ts
├── edit-intent-analyzer.ts
├── file-parser.ts
├── file-search-executor.ts
└── utils.ts
```

## Environment Variables Required
```env
E2B_API_KEY=               # Required for sandboxes
FIRECRAWL_API_KEY=         # Required for web scraping
ANTHROPIC_API_KEY=         # Optional AI provider
OPENAI_API_KEY=            # Optional AI provider  
GEMINI_API_KEY=            # Optional AI provider
GROQ_API_KEY=              # Optional AI provider
```

## Key Features
- Real-time AI chat interface for code generation
- Live React app preview in E2B sandboxes
- Multi-provider AI support with streaming responses
- File tree navigation and code editing
- Package detection and installation
- Error monitoring and hot reload support

## Testing
- Integration tests for E2B sandbox functionality
- API endpoint testing
- Code execution validation tests

## Development Notes
- Uses Turbopack for faster development builds
- TypeScript enabled with strict configuration
- ESLint configured for Next.js best practices
- Framer Motion for animations
- Dark/light theme support via next-themes