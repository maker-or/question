# SphereAI - Advanced Educational AI Assistant

SphereAI is an AI-powered chat application designed specifically for students, providing intelligent responses to educational queries using advanced language models and retrieval techniques. The application combines cutting-edge AI technologies to deliver accurate, contextual answers while offering a rich, interactive user experience.

## 🚀 Technologies Used

### Frontend
- **Next.js 15**: App router-based structure with TurboPack for improved performance
- **React 19**: Component-based UI with hooks for state management
- **TypeScript**: Type-safe JavaScript for better developer experience and fewer runtime errors
- **Tailwind CSS**: Utility-first CSS framework for responsive design with custom animations
- **Markdown Processing**:
  - ReactMarkdown with plugins (remark-gfm, rehype-raw, remark-math, rehype-katex)
  - Math formula rendering with KaTeX
  - Syntax highlighting via react-syntax-highlighter
- **TipTap Editor**: Rich text editing capabilities with a customizable toolbar
- **Theme System**: Light/dark mode with next-themes for preference persistence

### Backend
- **Next.js API Routes**: Server-side functionality via API endpoints
- **AI Integration**:
  - OpenRouter: Gateway to multiple AI models with a unified API
  - Multiple AI Model Support: Gemini, LLaMA, DeepSeek, Claude, GPT models
  - AI SDK: Structured interaction with various AI providers
- **RAG (Retrieval Augmented Generation)**:
  - Pinecone: Vector database for storing and querying embeddings
  - LangChain: Framework for building context-aware AI applications
  - Google Generative AI Embeddings: Creating vector representations of text
- **Web Search**:
  - DuckDuckGo Search: Real-time web information retrieval
  - Custom search result formatting with citations
- **Multimodal Capabilities**:
  - Vision AI: Image analysis and description
  - Speech Services:
    - Transcription: Converting speech to text
    - Text-to-Speech: Converting responses to audio

### Export Functionality
- **PDF Generation**: 
  - jsPDF: Library for creating PDF documents
  - Custom document styling and formatting
  - Support for code highlighting, math expressions, tables, and other markdown elements

### Analytics and Monitoring
- **PostHog**: User behavior analytics
- **Google Analytics**: Web traffic analysis

## 📋 Core Features

### Intelligent Chat Interface
- Real-time AI responses with streaming
- Support for various AI models with different capabilities
- Contextual memory of conversation history
- Chat history persistence and management

### Advanced RAG Implementation
- Automatic detection of query types requiring retrieval
- Subject classification for specialized handling
- Document retrieval from vector database
- Web search integration for up-to-date information

### Rich Content Support
- Markdown rendering with syntax highlighting
- Mathematical equation display (inline and block)
- Table rendering
- Image embedding and display
- Blockquote styling

### Multimodal Interaction
- Image upload and analysis
- Voice input via microphone
- Text-to-speech output

### Export and Sharing
- PDF export with professional formatting
- Document styling with headers, footers, and pagination
- Preservation of rich content in exports

### UI Enhancements
- Chat message editing
- Responsive design for all device sizes
- Copy-to-clipboard functionality
- Loading states and animations
- Light and dark theme support

## 🔧 Architecture and Methodologies

### Chat Processing Pipeline
1. **User Input**: Text, voice, or image input is captured
2. **Query Analysis**:
   - Decision between RAG or general knowledge using LLM classification
   - Subject categorization (Compiler Design, Data Analysis, Networking, etc.)
3. **Context Retrieval**:
   - For RAG queries: Vector search in Pinecone for relevant documents
   - Web search for supplementary information
4. **Response Generation**:
   - Selected AI model generates response with provided context
   - Streaming implementation for real-time feedback
5. **Response Rendering**:
   - Markdown parsing and rendering
   - Special handling for code, math, tables

### PDF Generation Process
1. **Content Extraction**: Parse conversation messages
2. **Element Processing**:
   - Identify and extract code blocks, tables, math expressions
   - Process inline styling (bold, italic, strikethrough)
3. **Document Creation**:
   - Configure document properties and styling
   - Render header with logo and metadata
4. **Content Rendering**:
   - Custom rendering for different element types:
     - Headings with proper hierarchy
     - Lists (bulleted and numbered)
     - Code blocks with syntax highlighting
     - Math expressions with proper formatting
     - Tables with aligned columns
     - Blockquotes with styled borders
5. **Finalization**:
   - Add pagination and footer
   - Generate timestamped PDF file

### Vision Processing Pipeline
1. **Image Upload**: Base64 encoding and transmission
2. **Temporary Storage**: Server-side storage for processing
3. **AI Analysis**: Processing via vision-capable models
4. **Result Integration**: Incorporating vision results into the chat

### Voice Processing Pipeline
1. **Audio Capture**: Browser API for microphone access
2. **Audio Transmission**: Sending recorded audio to the server
3. **Transcription**: Converting audio to text via Whisper API
4. **Response**: Optional text-to-speech conversion

## 🧠 AI Intelligence Features

### Smart Routing
- Dynamic selection of information sources based on query type
- Automatic classification of educational vs. general queries

### Subject Specialization
- Recognition of specific subject domains
- Tailored response formatting for different subjects

### Context Preservation
- Conversation history maintained for contextual responses
- Cross-reference between earlier and current queries

### Citation and Sources
- Attribution of information to source documents
- Web search result integration with citations

## 💻 Development Practices

### Type Safety
- TypeScript interfaces for consistent data structures
- Proper typing of API responses and requests

### Component Architecture
- Modular React components with clear responsibilities
- Shared utilities for common functionality

### State Management
- React hooks for local state
- localStorage for persistence
- Structured message handling

### API Organization
- Route-based API endpoints
- Consistent error handling and response formatting
- Environment variable management for API keys

## 🔄 Deployment Model

The application is configured for deployment on Vercel, with environmental variables controlling API access and feature availability.

## 📚 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- API keys for AI services (OpenRouter, Google Generative AI, etc.)
- Pinecone account for vector database

### Installation
```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

### Environment Variables
- `OPENROUTE_API_KEY`: For accessing multiple AI models
- `GROQ_API_KEY`: For Groq models
- `GEMINI_API_KEY`: For Google's Gemini models
- `PINECONE_API_KEY`: For vector database operations
- `NEXT_PUBLIC_POSTHOG_KEY`: For analytics (optional)

## 📱 Supported Platforms
- Modern web browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for desktop, tablet, and mobile

## 🔗 Related Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [LangChain Documentation](https://js.langchain.com/docs)
- [Pinecone Documentation](https://docs.pinecone.io)
