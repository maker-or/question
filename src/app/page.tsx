"use client";
import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
// Import footnotes as a default import to avoid type issues
// import remarkFootnotes from "remark-footnotes";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import DOMPurify from "dompurify";
// import prettier from "prettier/standalone";
// import parserBabel from "prettier/parser-babel";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus} from "react-syntax-highlighter/dist/cjs/styles/prism";
// import Image from "next/image";

// Import KaTeX CSS for math rendering
import 'katex/dist/katex.min.css';

// import { useChat } from "ai/react";
import { useChat } from '@ai-sdk/react'
import {
  Copy,
  Check,
  Globe,
  Play,
  // Share2,
  ArrowUp,
  Info,
  RotateCw,
  Code,
  List,
  Italic,
  
  // MessageCircleX,
  // FileText,
  // Sparkle,
  // Sparkles,
  Square,
  Paintbrush,
  Mic,
  // MicOff,
  X,
  Trash,
ArrowLeftRight,
FileText,
  Plus,
  Volume2,
  VolumeX,
  ChevronDown,
  Edit3, // Add Edit icon
  Save, // Add Save icon
} from "lucide-react";

// import { DropdownMenuCheckboxItemProps } from "@radix-ui/react-dropdown-menu";
import { Editor, Tldraw, TLUiComponents } from "tldraw";
import "tldraw/tldraw.css";

// import { jsPDF } from "jspdf";
// import html2canvas from "html2canvas";

// import styles from "~/app/chat.module.css";
// import { Attachment } from "ai";
// import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { createPDF } from "../utils/createPDF"; // <-- Added import for PDF conversion

// Add this import near the top with other imports
// import { useTheme } from "next-themes";
import { ThemeToggle } from "../components/theme-toggle";
import TiptapEditor from "../components/TiptapEditor";

// Add new ChatInfo interface
interface ChatInfo {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  firstMessage?: string;
}

// Update the Message interface to be compatible with UIMessage
interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "data"; // Added "system" | "data"
  content: string;
  model?: string; 
}

const components: TLUiComponents = {};

// -------------------------------------------------------------------------
// MarkdownRenderer Component
// -------------------------------------------------------------------------
interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Sanitize and format markdown code blocks before rendering.
  let sanitizedContent = content; // Start with the original content

  // Improved regex for code blocks
  sanitizedContent = sanitizedContent.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (match, lang, code) => {
      const trimmedCode = code.trim();
      return `<pre><code class="language-${lang}">${trimmedCode}</code></pre>`;
    }
  );

  // Sanitize the content *excluding* code blocks
  sanitizedContent = DOMPurify.sanitize(sanitizedContent, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style'], // Remove style tags
  });

  // Ensure proper spacing for lists and headings
  sanitizedContent = sanitizedContent
    .replace(/\n(#{1,6}\s)/g, "\n\n$1")
    .replace(/\n([*-]\s)/g, "\n\n$1")
    .replace(/\n(\d+\.\s)/g, "\n\n$1")
    .replace(/(\n\s*\n)/g, "$1\n");

  // Better handling for math expressions - preserve LaTeX syntax
  sanitizedContent = sanitizedContent
    // Convert display math to a form that won't be affected by other replacements
    .replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => `\n\n$$${math.trim()}$$\n\n`)
    // Normalize inline math delimiters \( ... \) → $ ... $
    .replace(/\\\(/g, "$").replace(/\\\)/g, "$")
    // Preserve inline math while removing unnecessary spaces
    .replace(/\$([^$\n]+?)\$/g, (match, math) => `$${math.trim().replace(/\s+/g, ' ')}$`)
    // Handle LaTeX vector notation
    .replace(/\\vec\{([^}]*)\}/g, "\\vec{$1}")
    // Handle summation notation \sum_{a}^{b}
    .replace(/\\sum_\{([^}]*)\}\^\{([^}]*)\}/g, "\\sum_{$1}^{$2}")    // Handle fractions \frac{a}{b}
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "\\frac{$1}{$2}")
        // Handle integrals \int_{a}^{b}
    .replace(/\\int_\{([^}]*)\}\^\{([^}]*)\}/g, "\\int_{$1}^{$2}")
        // Handle derivatives \frac{d}{dx} notation
    .replace(/\\frac\{d\}\{d([a-zA-Z])\}/g, "\\frac{d}{d$1}")
        // Handle partial derivatives \frac{\partial}{\partial x}
    .replace(/\\frac\{\\partial\}\{\\partial ([a-zA-Z])\}/g, "\\frac{\\partial}{\\partial $1}")
    // Handle functions f(x), g(x), sin(x), cos(x), etc.
    .replace(/\\(sin|cos|tan|log|ln|exp|sec|csc|cot|arcsin|arccos|arctan)\{([^}]*)\}/g, "\\$1($2)")
    // Handle general functions f(x), g(x), h(x)
    .replace(/([a-zA-Z])\s*\(\s*([a-zA-Z0-9+\-*/^_]+)\s*\)/g, "$1($2)")
    // Handle matrix notation \begin{matrix} ... \end{matrix}
    .replace(/\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}/g, "\\begin{matrix}$1\\end{matrix}")
    // Normalize Greek letters
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\delta/g, "δ")
    .replace(/\\theta/g, "θ")
    .replace(/\\lambda/g, "λ")
    .replace(/\\pi/g, "π")
    .replace(/\\sigma/g, "σ")
    .replace(/\\omega/g, "ω");

  return (
    <div className="prose max-w-none dark:prose-invert prose-lg">
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          [remarkMath, {
            singleDollarTextMath: true,
            doubleBacktickMathDisplay: false
          }],
        ]}
        rehypePlugins={[
          [rehypeKatex, {
            strict: false,
            trust: true,
            macros: {
              "\\vec": "\\overrightarrow{#1}"
            }
          }],
          rehypeRaw,
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
          [rehypeExternalLinks, { target: '_blank', rel: ['nofollow', 'noopener', 'noreferrer'] }]
        ]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            console.log(node)
            return match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                className="rounded-md text-base md:text-lg"
                {...props as unknown as object}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={`${className} text-base md:text-lg`} {...props}>
                {children}
              </code>
            );
          },
          img({ src, alt, ...props }) {
            return src ? (
              <span className="relative block w-full max-w-full my-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt || ""}
                  className="rounded-lg max-w-full max-h-[500px] object-contain mx-auto"
                  loading="lazy"
                  {...props}
                />
                {alt && <span className="block text-center text-sm md:text-base text-gray-500 mt-1">{alt}</span>}
              </span>
            ) : null;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="border-collapse w-full border border-gray-700 text-base md:text-lg">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return <th className="border border-gray-700 bg-gray-800 px-4 py-2 text-left text-base md:text-lg">{children}</th>;
          },
          td({ children }) {
            return <td className="border border-gray-700 px-4 py-2 text-base md:text-lg">{children}</td>;
          },
          blockquote({ children }) {
            return <blockquote className="border-l-4 pl-4 italic my-4 text-lg md:text-xl">{children}</blockquote>;
          },
          h1({ children }) {
            return <h1 className="text-3xl font-bold mt-6 mb-4">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-2xl font-bold mt-5 mb-3">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-xl font-semibold mt-4 mb-2">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside pl-4 my-4 space-y-2 text-base md:text-lg">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside pl-4 my-4 space-y-2 text-base md:text-lg">{children}</ol>;
          },
          p({ children }) {
            return <p className="text-base md:text-lg my-3">{children}</p>;
          }
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
};


interface VisionText {
  text: {
    text: string;
    toolCalls: string[];
    toolResults: string[];
    finishReason: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    warnings: string[];
    request: {
      body: string;
    };
  };
}

// type Checked = DropdownMenuCheckboxItemProps["checked"];

// Model options
const MODEL_OPTIONS = [
  { id: "google/gemini-2.0-flash-lite-preview-02-05:free", name: "Gemini flash 2.0" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
  { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek v3 0324" },
   { id: "google/gemma-3-27b-it:free", name: "Gemma 3" },
  //  { id: "qwen/qwq-32b:free", name: "Qwen 32B" }
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", name: "Mistral 3.1 24b" },
  { id: "microsoft/phi-3-medium-128k-instruct:free", name: "Phi-3" },


];

// Add isMobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
};

export default function Page() {
  const [isLoading, setIsLoading] = useState(false);
  const [isWebSearchLoading, setIsWebSearchLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(
    "google/gemini-2.0-flash-lite-preview-02-05:free"
  );
  const [showModelSelector, setShowModelSelector] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchLinks, setSearchLinks] = useState<string[]>([]);

  const [showWhiteboard, setShowWhiteboard] = useState(false);
  // const [whiteboardData, setWhiteboardData] = useState<string | null>(null);
  const whiteboardRef = useRef<HTMLDivElement>(null);
  const tldrawEditor = useRef<Editor | null>(null);

  const [skipAutoScroll, setSkipAutoScroll] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenForMessageId, setRegenForMessageId] = useState<string | null>(null);

  // const [showStatusBar, setShowStatusBar] = React.useState<Checked>(true);
  // const [showActivityBar, setShowActivityBar] = React.useState<Checked>(false);
  // const [showPanel, setShowPanel] = React.useState<Checked>(false);

  const [chatId, setChatId] = useState<string | undefined>(undefined);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  
  // New state for chat management
  const [showChatSwitcher, setShowChatSwitcher] = useState(false);
  console.log(showChatSwitcher)
  const [savedChats, setSavedChats] = useState<ChatInfo[]>([]);
  // const router = useRouter();

  const [showActionButtons, setShowActionButtons] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  console.log(setHideTimeout)

  // Voice mode states
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  console.log(setIsVoiceMode)
  const [isRecording, setIsRecording] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [showDesktopOnlyModal, setShowDesktopOnlyModal] = useState(false);
  console.log(showDesktopOnlyModal)
  const isMobile = useIsMobile();

  // Get theme from next-themes instead
  // const { theme } = useTheme();

  // const handleMouseEnter = () => {
  //   if (hideTimeout) clearTimeout(hideTimeout);
  //   setShowActionButtons(true);
  // };


  // const handleMouseLeave = () => {
  //   const timeout = setTimeout(() => {
  //     setShowActionButtons(false);
  //   }, 1000); // 1000ms delay to give enough time to reach the buttons
  //   setHideTimeout(timeout);
  // };

  // Get the chat hook first before any code uses 'messages'
  const { messages, input, handleInputChange, handleSubmit, setInput } = useChat({
    api: "/api/chat",
    body: { model: selectedModel },
    id: chatId,
    initialMessages: initialMessages,
    onResponse: (response) => {
      setIsLoading(false);
      // Only reset input if NOT using the deepseek model to prevent refresh loop
      console.log(response)
      if (selectedModel !== "deepseek/deepseek-chat:free") {
        resetInputField();
      }
      setError(null);
      if (isRegenerating) {
        setIsRegenerating(false);
        setRegenForMessageId(null);
      }
    },
    onError: (error) => {
      console.error("Error:", error);
      setIsLoading(false);
      
      // Check for connection-related errors
      if (
        error.message?.includes("Failed to connect") || 
        error.message?.includes("getaddrinfo ENOTFOUND") ||
        error.message?.includes("network") ||
        error.message?.includes("Network Error") ||
        error.message?.includes("Cannot connect") ||
        error.message?.includes("Failed after") ||
        (error.cause && typeof error.cause === 'object' && 'message' in error.cause && 
          typeof (error.cause as {message: string}).message === 'string' && 
          (error.cause as {message: string}).message.includes("fetch failed")) ||
        !navigator.onLine
      ) {
        setError("Internet connection lost. Please check your network and try again.");
      } else {
        setError("An error occurred. Please try again.");
      }
    },
  });

  // Add a network status monitor
  useEffect(() => {
    const handleOnline = () => {
      setError(null);
    };
  
    const handleOffline = () => {
      setError("Internet connection lost. Please check your network and try again.");
    };
  
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Now we can use useEffect hooks that reference 'messages'
  useEffect(() => {
    const storedChatId = localStorage.getItem("currentChatId");
    
    if (storedChatId) {
      setChatId(storedChatId);
      
      try {
        // Explicitly get the messages for this chat ID
        const chatMessagesJson = localStorage.getItem(`chat_${storedChatId}`);
        
        // Only set messages if they exist as a proper array
        if (chatMessagesJson) {
          const parsedMessages = JSON.parse(chatMessagesJson);
          
          // Check if it's actually an array of messages
          if (Array.isArray(parsedMessages)) {
            setInitialMessages(parsedMessages);
          } else {
            console.warn("Stored messages are not an array, setting empty messages");
            setInitialMessages([]);
            // Fix the storage
            localStorage.setItem(`chat_${storedChatId}`, JSON.stringify([]));
          }
        } else {
          // No messages found for this chat ID, set empty array
          setInitialMessages([]);
          // Create the empty array in storage
          localStorage.setItem(`chat_${storedChatId}`, JSON.stringify([]));
        }
      } catch (err) {
        console.error("Failed to parse stored messages", err);
        setInitialMessages([]);
        // Reset to empty on error
        localStorage.setItem(`chat_${storedChatId}`, JSON.stringify([]));
      }
    } else {
      // No current chat ID, so create a new one
      const newChatId = uuidv4();
      localStorage.setItem("currentChatId", newChatId);
      localStorage.setItem(`chat_${newChatId}`, JSON.stringify([]));
      setChatId(newChatId);
      setInitialMessages([]);
      
      // Also create a new chat entry
      const newChat: ChatInfo = {
        id: newChatId,
        title: "New Chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0
      };
      
      const updatedChats = [...savedChats, newChat];
      setSavedChats(updatedChats);
      localStorage.setItem("savedChats", JSON.stringify(updatedChats));
    }

    // Load saved chat list
    const storedChats = localStorage.getItem("savedChats");
    if (storedChats) {
      try {
        setSavedChats(JSON.parse(storedChats));
      } catch (err) {
        console.error("Failed to parse saved chats", err);
      }
    }
  }, []); // Keep this dependency array empty - only run once on mount

  // Save current chat messages when they change
  useEffect(() => {
    if (chatId && messages.length > 0) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));
      
      // Update chat metadata
      updateChatMetadata(chatId, messages);
    }
  }, [messages, chatId]); // This is fine - we need to respond to message changes

  // Handle keyboard shortcuts for chat management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+N or Ctrl+N for new chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createNewChat();
      }
      
      // Command+K or Ctrl+K to open chat switcher
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowChatSwitcher(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, []); // Fixed: return function was adding event listener again, now properly removes it

  // Function to create a new chat
  const createNewChat = () => {
    // Generate new chat ID
    const newChatId = uuidv4();
    
    // IMPORTANT: Create empty message list FIRST before anything else
    localStorage.setItem(`chat_${newChatId}`, JSON.stringify([]));
    
    // Save current messages if needed (do this after setting the empty array)
    if (messages.length > 0 && chatId) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));
    }
    
    // Add new chat to saved chats
    const newChat: ChatInfo = {
      id: newChatId,
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0
    };
    
    const updatedChats = [...savedChats, newChat];
    setSavedChats(updatedChats);
    localStorage.setItem("savedChats", JSON.stringify(updatedChats));
    
    // Set as current chat
    localStorage.setItem("currentChatId", newChatId);
    
    // Completely reset the application state by using replace instead of reload
    // This ensures a clean slate with no history
    window.location.replace(window.location.pathname);
  };

  // Function to switch to a different chat
  const switchToChat = (selectedChatId: string) => {
    // Save current messages first
    if (messages.length > 0 && chatId) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));
    }
    
    // Set selected chat as current
    localStorage.setItem("currentChatId", selectedChatId);
    
    // Completely reset the application state using replace
    window.location.replace(window.location.pathname);
  };
  console.log(switchToChat)

  // Update chat metadata when messages change
  const updateChatMetadata = (id: string, chatMessages: typeof messages) => {
    // Find existing chat in saved chats
    const chatIndex = savedChats.findIndex(chat => chat.id === id);
    
    if (chatIndex >= 0) {
      const updatedChats = [...savedChats];
      
      // Get title from first user message or keep existing title
      const firstUserMessage = chatMessages.find(msg => msg.role === "user");
      const title = firstUserMessage 
        ? firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? "..." : "")
        : updatedChats[chatIndex].title;
      
      updatedChats[chatIndex] = {
        ...updatedChats[chatIndex],
        title,
        updatedAt: Date.now(),
        messageCount: chatMessages.length,
        firstMessage: firstUserMessage?.content || ""
      };
      
      setSavedChats(updatedChats);
      localStorage.setItem("savedChats", JSON.stringify(updatedChats));
    }
  };

  // Clear current chat with specific handling for local storage
  const handleClearHistory = () => {
    if (chatId) {
      // Remove current chat from localStorage
      localStorage.removeItem(`chat_${chatId}`);
      // Update saved chats list
      const updatedChats = savedChats.filter(chat => chat.id !== chatId);
      localStorage.setItem("savedChats", JSON.stringify(updatedChats));
      // Update current chat; if none, clear currentChatId
      if (updatedChats.length > 0) {
        const newCurrent = updatedChats.reduce((prev, cur) =>
          cur.updatedAt > prev.updatedAt ? cur : prev
        );
        localStorage.setItem("currentChatId", newCurrent.id);
      } else {
        localStorage.removeItem("currentChatId");
      }
      // Reload the page to reflect changes
      window.location.reload();
    } else {
      localStorage.removeItem("chatMessages");
      localStorage.removeItem("chatId");
      window.location.reload();
    }
  };

  // const handleClearHistory = () => {
  //   localStorage.removeItem("chatMessages");
  //   localStorage.removeItem("chatId");
  //   window.location.reload();
  // };

  // -----------------------------------------------------------------------
  // Voice Mode Functions
  // -----------------------------------------------------------------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Create a File from the collected audio chunks
        const audioFile = new File(audioChunksRef.current, 'recording.wav', { type: 'audio/wav' });

        setTranscribedText("Transcribing...");

        // Create form data to send to the server
        const formData = new FormData();
        formData.append('audio', audioFile, 'recording.wav');

        try {
          // Send to our transcription API
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error(`Transcription failed: ${response.statusText}`);
          }

          const data = await response.json();
          setTranscribedText(data.text);
          
          // Instead of immediately setting input and submitting,
          // defer the submission to break the potential update cycle
          setTimeout(() => {
            handleSubmitVoice(data.text);
          }, 100);

        } catch (error) {
          console.error('Error transcribing audio:', error);
          setError('Failed to transcribe audio. Please try again.');
          setTranscribedText("");
        }

        // Stop all tracks from the stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // const toggleVoiceMode = () => {
  //   setIsVoiceMode(prev => !prev);
  //   // Reset any ongoing recording if turning off voice mode
  //   if (isVoiceMode && isRecording) {
  //     stopRecording();
  //   }
  // };

  const playResponseAudio = async (text: string) => {
    // Don't try to play if already playing
    if (isPlaying) return;
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioSrc(audioUrl);

      if (audioRef.current) {
        audioRef.current.onplay = () => setIsPlaying(true);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onpause = () => setIsPlaying(false);
        audioRef.current.play().catch(err => {
          console.error("Error playing audio:", err);
          setIsPlaying(false);
        });
      }
    } catch (error) {
      console.error('Error playing audio response:', error);
      setError('Failed to play audio response.');
      setIsPlaying(false);
    }
  };

  // Handle voice submission with transcribed text
  const handleSubmitVoice = async (transcribedText: string) => {
    if (!transcribedText.trim()) return;

    setIsLoading(true);
    setSearchResults(null);
    setLastQuery(transcribedText);
    setError(null);
    
    // Create a synthetic event to pass to handleSubmit
    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent;
    
    // Set the input and then submit in the next tick to avoid circular updates
    setInput(transcribedText);
    
    // Use setTimeout to break the render cycle
    setTimeout(() => {
      handleSubmit(syntheticEvent);
    }, 0);
  };

  // Submit message and track the response for TTS - simplified to avoid state loops
  const submitMessage = async (messageText: string) => {
    try {
      // First update loading state
      setIsLoading(true);
      
      // Create a synthetic event
      const syntheticEvent = {
        preventDefault: () => {},
      } as React.FormEvent;
      
      // Set input and submit in the next tick
      setInput(messageText);
      
      setTimeout(() => {
        handleSubmit(syntheticEvent);
      }, 0);
      
      return true;
    } catch (error) {
      console.error('Error submitting message:', error);
      setIsLoading(false);
      setError('Failed to get a response. Please try again.');
      return false;
    }
  };

  console.log(submitMessage)

  // -----------------------------------------------------------------------
  // PDF Export Function
  // -----------------------------------------------------------------------
  
  // -----------------------------------------------------------------------
  // Handle model change
  // -----------------------------------------------------------------------
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    setShowModelSelector(false);
    // Store the selected model in localStorage
    localStorage.setItem("selectedModel", modelId);
  };

  // Load previously selected model
  useEffect(() => {
    const storedModel = localStorage.getItem("selectedModel");
    if (storedModel && MODEL_OPTIONS.some(model => model.id === storedModel)) {
      setSelectedModel(storedModel);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Chat hook configuration
  // -----------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+N or Ctrl+N for new chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createNewChat();
      }
      

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowChatSwitcher(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, []); 
  useEffect(() => {
    if (chatId && messages.length > 0) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));
      
      // Update chat metadata
      updateChatMetadata(chatId, messages);
    }
  }, [messages, chatId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!skipAutoScroll) {
      scrollToBottom();
    }
  }, [messages, isLoading, skipAutoScroll]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const resetInputField = () => {
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const copyMessage = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 10000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const extractLinks = (content: string): string[] => {
    const linkRegex = /https?:\/\/[^\s]+/g;
    return content.match(linkRegex) ?? [];
  };

  function extractText(data: string): string | null {
    try {
      const parsedData: VisionText = JSON.parse(data);
      return parsedData.text.text;
    } catch (error) {
      console.error("Error extracting text:", error);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Form Submission Handler
  // -----------------------------------------------------------------------
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    setSkipAutoScroll(false);
    setIsLoading(true);
    setSearchResults(null);
    setLastQuery(input);
    setError(null);

    try {
      if (
        input.toLowerCase().includes("@whiteboard") &&
        showWhiteboard &&
        tldrawEditor.current
      ) {
        setInput("analyzing...");
        const shapeIds = tldrawEditor.current.getCurrentPageShapeIds();
        if (shapeIds.size === 0) {
          alert("No shapes on the canvas");
          setIsLoading(false);
          return;
        }

        try {
          const { blob } = await tldrawEditor.current.toImage([...shapeIds], {
            background: true,
            scale: 0.1,
            quality: 0.1,
            format: "webp",
          });

          const file = new File([blob], "canvas.png", { type: "image/png" });
          const reader = new FileReader();

          reader.onloadend = async () => {
            const base64Result = reader.result as string;
            const attachment = {
              name: "canvas.png",
              contentType: "image/png",
              data: base64Result.split(",")[1],
            };

            const visionResponse = await fetch("/api/vision", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: attachment.data }),
            });

            if (!visionResponse.ok) {
              throw new Error("Failed to analyze image");
            }

            const a = visionResponse.body?.getReader();
            if (!a) {
              throw new Error("Failed to read stream from /api/vision");
            }

            const decoder = new TextDecoder();
            let resultText = "";
            let done = false;
            while (!done) {
              const { done: chunkDone, value } = await a.read();
              done = chunkDone;
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              resultText += chunk;
              setInput(`Analyzing... ${resultText}`);
            }

            const extractedVisionText = extractText(resultText);
            if (extractedVisionText) {
              setInput(extractedVisionText);
            } else {
              setInput(resultText);
              console.warn("Failed to extract text, showing raw result.");
            }
            setIsLoading(false);
          };

          reader.readAsDataURL(file);
        } catch (error) {
          console.error("Error exporting canvas image:", error);
          setIsLoading(false);
          setError("An error occurred while exporting the canvas.");
        }
      } else {
        // Use the handleSubmit directly since we're in a submit handler
        handleSubmit(event);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setIsLoading(false);
      setError("An error occurred. Please try again.");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void onSubmit(event);
    } else if (event.key === "Enter" && event.shiftKey) {
      adjustTextareaHeight();
    }
  };

  const handleSearchWeb = async () => {
    if (!lastQuery.trim()) {
      console.error("No query to search");
      return;
    }

    setIsWebSearchLoading(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: lastQuery }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: HTTP status ${response.status}`);
      }

      const data = await response.json();
      const links = extractLinks(data.results);
      setSearchLinks(links);
      const cleanedResults = data.results.replace(/https?:\/\/[^\s]+/g, "");
      setSearchResults(cleanedResults);
    } catch (error) {
      console.error("Error during web search:", error);
      setSearchResults("Failed to fetch search results. Please try again.");
    } finally {
      setIsWebSearchLoading(false);
    }
  };

  const handleSearchYouTube = (query: string) => {
    window.open(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      "_blank"
    );
  };


  const shareChat = async () => {
    try {
      const response = await fetch("/api/shared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages }),
      });
      if (!response.ok) {
        throw new Error("Failed to share chat.");
      }
      const data = await response.json();
      const shareURL = `${window.location.origin}/ai/shared/${data.shareId}`;
      await navigator.clipboard.writeText(shareURL);
      alert(`Chat link copied to clipboard: ${shareURL}`);
    } catch (error) {
      console.error("Error sharing chat:", error);
      alert("Error sharing chat. Please try again later.");
    }
  };
  console.log(shareChat)
  const regenerateQuery = (query: string, messageId: string) => {
    setRegenForMessageId(messageId);
    setIsRegenerating(true);
    setSkipAutoScroll(true);
    setIsLoading(true);
    setError(null);
    setInput(query);
    

    setTimeout(() => {
      const syntheticEvent = {
        preventDefault: () => {},
      } as React.FormEvent;
      handleSubmit(syntheticEvent);
    }, 10);
  };



  useEffect(() => {
  
    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [hideTimeout]);

 
  const toggleActionButtons = () => {
    setShowActionButtons(prev => !prev);
  };
  console.log(toggleActionButtons)

  const toggleWhiteboard = () => {
    if (isMobile) {
      setShowDesktopOnlyModal(true);
    } else {
      setShowWhiteboard(prev => !prev);
    }
  };

  // -----------------------------------------------------------------------
  // Get model display name
  // -----------------------------------------------------------------------
  const getModelDisplayName = (modelId: string): string => {
    const model = MODEL_OPTIONS.find(m => m.id === modelId);
    return model ? model.name : "Choose a model";
  };


  const [showNav, setShowNav] = useState(false);

  useEffect(() => {

    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      const handleMouseMove = (e: MouseEvent) => {

        if (e.clientY < 60) {
          setShowNav(true);
        } else if (e.clientY > 150) {

          setShowNav(false);
        }
      };
      

      window.addEventListener('mousemove', handleMouseMove);
      

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    } else {
  
      setShowNav(true);
    }
  }, []);

  // Add state for mobile dropdown menu
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Toggle mobile menu function
  const toggleMobileMenu = () => {
    setShowMobileMenu(prev => !prev);
  };
  
  // Close the menu when an action is clicked
  const handleMenuAction = (action: () => void) => {
    action();
    setShowMobileMenu(false);
  };

  // Add state for design mode
  const [isDesignMode, setIsDesignMode] = useState(false);
  const [editedMessages, setEditedMessages] = useState<{ [key: string]: string }>({});
  
  // Add function to toggle design mode
  const toggleDesignMode = () => {
    setIsDesignMode(prev => {
      // When exiting design mode, reset edited messages state
      if (prev) {
        setEditedMessages({});
      }
      return !prev;
    });
  };
  
  // Add function to handle updates to edited messages
  const handleMessageEdit = (messageId: string, content: string) => {
    setEditedMessages(prev => ({
      ...prev,
      [messageId]: content
    }));
  };
  
  // Add function to save edited messages
  const saveEditedMessages = () => {
    // Create a new messages array with edited content
    const updatedMessages = messages.map(message => {
      if (editedMessages[message.id]) {
        // Convert HTML back to markdown-like format for storage
        // This is a simplified conversion - a full implementation would need a more robust HTML-to-Markdown converter
        let content = editedMessages[message.id];
        
        // Remove common HTML tags to convert back to plain text or markdown
        content = content
          .replace(/<h1>(.*?)<\/h1>/g, '# $1')
          .replace(/<h2>(.*?)<\/h2>/g, '## $1')
          .replace(/<h3>(.*?)<\/h3>/g, '### $1')
          .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
          .replace(/<em>(.*?)<\/em>/g, '*$1*')
          .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
          .replace(/<ul>([\s\S]*?)<\/ul>/g, '$1')
          .replace(/<ol>([\s\S]*?)<\/ol>/g, '$1')
          .replace(/<li>(.*?)<\/li>/g, '* $1\n')
          .replace(/<p>(.*?)<\/p>/g, '$1\n')
          .replace(/<br\s*\/?>/g, '\n')
          .replace(/<pre><code class="language-(.*?)">([\s\S]*?)<\/code><\/pre>/g, 
                   (_, lang, code) => `\`\`\`${lang}\n${code}\n\`\`\``)
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
          
        return { ...message, content };
      }
      return message;
    });
    
    // If we have a chat ID, save to localStorage
    if (chatId) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(updatedMessages));
      
      // Update chat metadata
      updateChatMetadata(chatId, updatedMessages);
    }
    
    // Exit design mode and reset edited messages
    setIsDesignMode(false);
    setEditedMessages({});
    
    // Force a page reload to reflect the changes
    window.location.reload();
  };

  return (
    <main className={`${showWhiteboard ? "pr-[33.333%]" : ""} transition-all duration-300 text-base`}>
      {/* Optimized Top Navigation Bar with Mobile Dropdown */}
      <nav 
        className={`sticky top-0 z-30 w-full bg-[#f8f8f8] dark:bg-[#0c0c0c] border-b border-gray-200 dark:border-[#f7eee332] backdrop-blur-md shadow-md transition-all duration-300 transform ${
          showNav || isMobile ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between h-14 ">
          <div className="flex items-center space-x-1">
            <span className="text-black dark:text-white text-lg font-semibold">SphereAI</span>
          </div>
          
          {/* Desktop Actions - hidden on mobile */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={createNewChat}
              className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-[#575757] transition-colors text-sm"
              aria-label="New Chat"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
            
            <button
              onClick={() => setShowChatSwitcher(true)}
              className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-[#575757] transition-colors text-sm"
              aria-label="Switch Chat"
            >
              <ArrowLeftRight className="w-4 h-4"/>
              <span>Switch</span>
            </button>
            
            <button
              onClick={handleClearHistory}
              className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-[#575757] transition-colors text-sm"
              aria-label="Delete Chat"
            >
              <Trash className="h-4 w-4" />
              <span>Delete</span>
            </button>
            
            <button
              onClick={() => createPDF(messages)}
              className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-[#575757] transition-colors text-sm"
              aria-label="Export to PDF"
            >
              <FileText className="w-4 h-4" />
              <span>Export</span>
            </button>
            
            <button
              onClick={toggleWhiteboard}
              className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-[#575757] transition-colors text-sm"
              aria-label="Toggle Whiteboard"
            >
              <Paintbrush className="h-4 w-4" />
              <span>Canvas</span>
            </button>
            
            <button
              onClick={toggleDesignMode}
              className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-[#575757] transition-colors text-sm ${
                isDesignMode ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : ''
              }`}
              aria-label="Design Mode"
            >
              <Edit3 className="h-4 w-4" />
              <span>{isDesignMode ? 'Exit Design' : 'Design'}</span>
            </button>
            
            {isDesignMode && (
              <button
                onClick={saveEditedMessages}
                className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
                aria-label="Save Edits"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
            )}
            
            <div className="flex items-center">
              <ThemeToggle />
            </div>
          </div>
          
          {/* Mobile Actions */}
          <div className="flex md:hidden items-center space-x-2">
            {/* Mobile dropdown toggle */}
            <div className="relative">
              <button
                onClick={toggleMobileMenu}
                className="flex items-center justify-center rounded-lg p-2 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-[#575757] transition-colors"
                aria-label="Menu"
                aria-expanded={showMobileMenu}
              >
                <div className="w-5 h-5 flex flex-col justify-between">
                  <span className={`block h-0.5 w-full bg-current transition-all duration-300 ${showMobileMenu ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                  <span className={`block h-0.5 w-full bg-current transition-all duration-300 ${showMobileMenu ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`block h-0.5 w-full bg-current transition-all duration-300 ${showMobileMenu ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                </div>
              </button>
              
              {/* Mobile dropdown menu */}
              {showMobileMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-[#252525] ring-1 ring-black ring-opacity-5 z-50 origin-top-right">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                      onClick={() => handleMenuAction(createNewChat)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#323232] flex items-center gap-2"
                      role="menuitem"
                    >
                      <Plus className="w-4 h-4" />
                      New Chat
                    </button>
                    
                    <button
                      onClick={() => handleMenuAction(() => setShowChatSwitcher(true))}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#323232] flex items-center gap-2"
                      role="menuitem"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      Switch Chat
                    </button>
                    
                    <button
                      onClick={() => handleMenuAction(handleClearHistory)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#323232] flex items-center gap-2"
                      role="menuitem"
                    >
                      <Trash className="h-4 w-4" />
                      Delete Chat
                    </button>
                    
                    <button
                      onClick={() => handleMenuAction(() => createPDF(messages))}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#323232] flex items-center gap-2"
                      role="menuitem"
                    >
                      <FileText className="w-4 h-4" />
                      Export PDF
                    </button>
                    
                    <button
                      onClick={() => handleMenuAction(toggleWhiteboard)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#323232] flex items-center gap-2"
                      role="menuitem"
                    >
                      <Paintbrush className="h-4 w-4" />
                      Canvas
                    </button>
                    
                    <button
                      onClick={() => handleMenuAction(toggleDesignMode)}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        isDesignMode 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#323232]'
                      } flex items-center gap-2`}
                      role="menuitem"
                    >
                      <Edit3 className="h-4 w-4" />
                      {isDesignMode ? 'Exit Design Mode' : 'Design Mode'}
                    </button>
                    
                    {isDesignMode && (
                      <button
                        onClick={() => handleMenuAction(saveEditedMessages)}
                        className="w-full text-left px-4 py-2 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-2"
                        role="menuitem"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </button>
                    )}
                    
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Always keep at least one quick action visible */}
            <button
              onClick={createNewChat}
              className="flex items-center justify-center rounded-lg p-2 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-[#575757] transition-colors"
              aria-label="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Optional - visual indicator for nav accessibility when hidden */}
      <div 
        className={`md:block hidden fixed top-0 left-0 right-0 h-2 z-20 bg-gradient-to-b from-gray-500/20 to-transparent transition-opacity duration-300 ${
          showNav ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Click outside to close mobile menu */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 z-20 bg-transparent"
          onClick={() => setShowMobileMenu(false)}
          aria-hidden="true"
        />
      )}


      
      
      {showActionButtons && (
        <div
          className="fixed bottom-16 right-1 z-20 p-3 backdrop-blur-md rounded-lg shadow-lg border border-[#f7eee332] max-w-[90vw] sm:max-w-xs bg-[#151515] dark:bg-[#1a1a1a] transition-all duration-300"
        >
          <div className="flex flex-col gap-1">
            <button
              onClick={createNewChat}
              className="flex items-start justify-center gap-2 rounded-xl p-3 text-white hover:bg-[#575757] w-full"
            ><Plus className="w-5 h-5" />
              New Chat
            </button>
            <button
              onClick={() => setShowChatSwitcher(true)}
              className="flex items-center justify-center gap-2 rounded-xl p-3 text-white hover:bg-[#575757] w-full"
            >
            <ArrowLeftRight className="w-4 h-4"/>
              Switch Chat
            </button>
            <button
              onClick={handleClearHistory}
              className="flex items-center justify-center gap-2 rounded-xl p-3 text-white hover:bg-[#575757] w-full"
            >
              <Trash className="h-4 w-4" />
              Delete Chat
            </button>
            <button
              onClick={() => createPDF(messages)}
              className="flex items-center justify-center gap-2 rounded-xl p-3 text-white hover:bg-[#575757] w-full"
            >
             <FileText className="w-4 h-4" /> Export to PDF
            </button>
            
            {/* Replace the theme toggle button with the new component */}
            <div className="p-1">
              <ThemeToggle />
            </div>
            
            <button
              onClick={() => setShowActionButtons(false)}
              className="flex items-center justify-center gap-2 rounded-xl p-3 text-white hover:bg-[#575757] w-full mt-2"
            >
              <X className="w-5 h-5" />
              Close Menu
            </button>
          </div>
        </div>
      )}

      {/* ...existing code... */}
      {/* Audio element for TTS playback */}
      <div className="fixed bottom-1 right-1 z-10 sm:hidden">
        <button
          onClick={() => createPDF(messages)}
          className="flex items-center justify-center rounded-full bg-[#151515] dark:bg-[#323232] p-3 text-white hover:bg-[#48AAFF] transition-all duration-300 shadow-lg"
          aria-label="Export to PDF"
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>

      <audio ref={audioRef} src={audioSrc || undefined} className="hidden" />

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] px-4">
          <h1 className="text-[2.5em] sm:text-[3.5em] dark:text-[#f7eee3ca] text-[#1a1a1a] mb-4 font-['Instrument_Serif'] text-center leading-tight">What do you want to learn?</h1>




          <div className="w-full max-w-2xl px-4">
            <form onSubmit={onSubmit} className="w-full">
              <div className="group flex-col  w-full items-center   rounded-2xl dark:bg-[#ffffff] bg-[#f0f0f0] p-1  shadow-md transition-all duration-300">
                <div className="flex relative flex-1  items-center overflow-hidden dark:bg-[#bebdbdde] bg-[#ffffff] rounded-xl py-3 sm:py-5 transition-all duration-300">
                  {!isVoiceMode ? (
                    <textarea
                      ref={textareaRef}
                      placeholder="Ask me anything..."
                      value={input}
                      onChange={(e) => {
                        handleInputChange(e);
                        adjustTextareaHeight();
                      }}
                      onKeyDown={handleKeyDown}
                      className="max-h-[120px] min-h-[60px] flex-1 resize-none bg-transparent font-['Instrument_Serif'] px-4 py-2 text-base md:text-lg dark:text-[#0c0c0c] text-[#0c0c0c] outline-none transition-all duration-200 dark:placeholder:text-[#0c0c0c] placeholder:text-[#606060]"
                      rows={1}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center px-4">
                      <div className={`flex flex-col items-center ${isRecording ? 'animate-pulse' : ''}`}>
                        <div className="text-center mb-2">
                          {isRecording ? (
                            <span className="text-red-500 text-base">Recording...</span>
                          ) : (
                            <span className="dark:text-[#f7eee380] text-[#444444] text-base">Ready to record</span>
                          )}
                        </div>
                        {transcribedText && (
                          <div className="max-w-full overflow-x-auto dark:text-[#f7eee3] text-[#0c0c0c] text-base py-2">
                            {transcribedText}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="absolute right-3 bottom-3 flex gap-3 items-center justify-center">
                    {/* Voice mode toggle button */}
                    {/* <button 
                      type="button"
                      onClick={toggleVoiceMode} 
                      className={`p-2 rounded-full ${isVoiceMode ? 'bg-[#48AAFF] text-white' : 'bg-[#2a2a2a] text-[#f7eee380]'} hover:bg-[#48AAFF] hover:text-white transition-colors duration-200`}
                    >
                      {isVoiceMode ? <Mic /> : <MicOff />}
                    </button>  */}

                    {/* Voice recording button (only when in voice mode) */}
                    {isVoiceMode && (
                      <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-[#252525] hover:bg-[#323232]'} text-[#f7eee3] transition-colors duration-200`}
                      >
                        {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </button>
                    )}

                    {/* Canvas button */}


                    {/* Submit button */}
                    {!isVoiceMode && (

                      <div className="flex items-center justify-center p-1 bg-[#E0E0E0] rounded-full box-shadow: 76px 2px 58px -95px rgba(224,224,224,1) inset;">
                        <button
                          type="submit"
                          className="p-3 rounded-full bg-[#0D0C0C] hover:bg-[#323232] text-[#f7eee3] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed drop-shadow-xl-[#888787] box-shadow: 76px 2px 58px -95px rgba(136, 135, 135, 1) inset"
                          // disabled={isLoading || isWebSearchLoading}
                        >
                          {isLoading || isWebSearchLoading ? (
                            <div className="relative h-5 w-5 flex items-center justify-center">
                              {/* Agentic workflow animation */}
                              <svg width="20" height="20" viewBox="0 0 50 50" className="animate-spin-slow">
                                {/* Base circular path */}
                                <circle cx="25" cy="25" r="20" stroke="#f7eee3" strokeWidth="1" fill="none" opacity="0.3" />
                                
                                {/* Nodes representing processing steps */}
                                <circle cx="25" cy="5" r="3" fill="#f7eee3" className="animate-pulse-node" style={{animationDelay: "0ms"}} />
                                <circle cx="41" cy="15" r="3" fill="#f7eee3" className="animate-pulse-node" style={{animationDelay: "300ms"}} />
                                <circle cx="41" cy="35" r="3" fill="#f7eee3" className="animate-pulse-node" style={{animationDelay: "600ms"}} />
                                <circle cx="25" cy="45" r="3" fill="#f7eee3" className="animate-pulse-node" style={{animationDelay: "900ms"}} />
                                <circle cx="9" cy="35" r="3" fill="#f7eee3" className="animate-pulse-node" style={{animationDelay: "1200ms"}} />
                                <circle cx="9" cy="15" r="3" fill="#f7eee3" className="animate-pulse-node" style={{animationDelay: "1500ms"}} />
                                
                                {/* Flowing path/connection */}
                                <path 
                                  d="M25,5 L41,15 L41,35 L25,45 L9,35 L9,15 Z" 
                                  stroke="#f7eee3" 
                                  strokeWidth="1.5" 
                                  fill="none" 
                                  strokeDasharray="100"
                                  strokeDashoffset="100"
                                  className="animate-dash-flow"
                                />
                                
                                {/* Center node - representing the agent */}
                                <circle cx="25" cy="25" r="4" fill="#48AAFF" className="animate-pulse-agent" />
                              </svg>
                              
                              {/* Small dot in center for focus */}
                              <div className="absolute w-1 h-1 bg-white rounded-full animate-ping-slow"></div>
                            </div>
                          ) : <ArrowUp className="h-4 w-4" />}
                        </button>
                      </div>

                    )}
                  </div>

                </div>
                <div className="flex gap-1 items-center flex-wrap justify-between">


                  <div className="relative m-1">
                    <button
                      type="button"
                      onClick={() => setShowModelSelector(!showModelSelector)}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-base sm:px-4 sm:py-2 sm:text-lg rounded-lg dark:bg-[#252525] bg-[#e2e2e2] dark:text-[#f7eee3] text-[#0c0c0c] transition-colors dark:hover:bg-[#323232] hover:bg-[#d0d0d0]">
                      <span className="max-w-[100px] sm:max-w-none truncate">{getModelDisplayName(selectedModel)}</span>
                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {showModelSelector && (
                      <div className="absolute bottom-full mb-1 z-10 rounded-md dark:bg-[#1a1a1a] bg-[#ffffff] shadow-lg border border-[#383838] w-full">
                        <ul className="py-1">
                          {MODEL_OPTIONS.map((model) => (
                            <li key={model.id}>
                              <button
                                type="button"
                                className={`w-full text-left px-4 py-2 dark:hover:bg-[#252525] hover:bg-[#f0f0f0] ${selectedModel === model.id ? 'dark:bg-[#323232] bg-[#e2e2e2] dark:text-[#f7eee3] text-[#0c0c0c]' : 'dark:text-[#f7eee380] text-[#444444]'}`}
                                onClick={() => handleModelChange(model.id)}
                              >
                                {model.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <button type="button" className="flex m-1 dark:bg-[#252525] bg-[#e2e2e2] dark:hover:bg-[#323232] hover:bg-[#d0d0d0] dark:text-[#f7eee3] text-[#0c0c0c] p-2 rounded-lg transition-colors duration-200" onClick={toggleWhiteboard}>
                    <Paintbrush className="h-4 w-4" />
                  </button>



                  {/* <button
                    type="button"
                    onClick={toggleVoiceMode}
                    className={`flex m-1 p-2 rounded-lg ${isVoiceMode ? 'bg-[#48AAFF] text-white' : 'bg-[#2a2a2a] text-[#f7eee3]'} hover:bg-[#48AAFF] hover:text-white transition-colors duration-200`}
                  >
                    {isVoiceMode ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button> */}
                </div>

              </div>
              {input.length > 0 && !isVoiceMode && (
                <div className="mt-1.5 flex items-center justify-between px-1 text-xs dark:text-[#f7eee380] text-[#555555]">
                  <span>Press Enter to send, Shift + Enter for new line</span>
                  <span>{input.length}/10000</span>
                </div>
              )}
              {error && (
                <div className={`mt-2 text-center p-3 rounded-lg ${
                  error.includes("Internet connection") 
                    ? "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800" 
                    : ""
                }`}>
                  <div className="flex items-center justify-center gap-2">
                    {error.includes("Internet connection") && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                    <span className={`text-base ${error.includes("Internet connection") ? "text-red-600 dark:text-red-400 font-medium" : "text-red-500"}`}>
                      {error}
                    </span>
                  </div>
                  
                  {error.includes("Internet connection") && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      <button 
                        onClick={() => window.location.reload()} 
                        className="underline hover:text-red-700 dark:hover:text-red-300"
                      >
                        Reload page
                      </button> when your connection is restored.
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      ) : (
        <div className={`relative mx-auto flex h-[calc(100vh-56px)] w-full flex-col ${showWhiteboard ? "md:w-full" : "md:w-2/3 w-full"}`}>
         
          <div className="flex-1 space-y-4 overflow-y-auto px-3 sm:px-3 py-4 pb-24 md:space-y-6 md:px-0 md:py-6">
            {messages.map((m, index) => {
              const previousUserMessage =
                m.role === "assistant" &&
                  index > 0 &&
                  messages[index - 1]?.role === "user"
                  ? messages[index - 1]?.content ?? ""
                  : "";
              return m.role === "user" ? (
                <div
                  key={m.id}
                  className="animate-slide-in group relative p-2 mx-2 flex flex-col md:mx-0"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {isDesignMode ? (
                    <div className="max-w-[100vw] sm:max-w-[85vw] overflow-hidden md:max-w-xl rounded-t-3xl rounded-br-3xl dark:bg-[#1F2937] bg-[#e0e6f0] dark:text-[#E8E8E6] text-[#0c0c0c]">
                      <TiptapEditor 
                        content={editedMessages[m.id] || m.content}
                        onUpdate={(html) => handleMessageEdit(m.id, html)}
                        placeholder="Edit message..."
                        className="min-h-[60px] bg-[#FF5E00]"
                        messageId={m.id}
                        
                      />
                    </div>
                  ) : ( //edit lo  user qurey
                    <div className="max-w-[95vw]  sm:max-w-[85vw] text-[1.4em] sm:text-[1.6em] tracking-tight rounded-t-3xl rounded-br-3xl dark:bg-[#FF5E00] bg-[#e0e6f0] dark:text-[#E8E8E6] text-[#0c0c0c] overflow-hidden md:max-w-xl md:p-4 md:text-[2.2em] p-3">
                      <MarkdownRenderer content={m.content} /> 
                    </div>
                  )}
                </div>
              ) : (
                <div key={m.id} className="animate-slide-in group relative flex flex-col md:mx-0">
                  {isDesignMode ? (
                    <div className="relative max-w-[95vw] sm:max-w-[90vw] overflow-hidden md:max-w-2xl rounded-xl">
                      <TiptapEditor 
                        content={editedMessages[m.id] || m.content}
                        onUpdate={(html) => handleMessageEdit(m.id, html)}
                        placeholder="Edit response..."
                        className="min-h-[60px]"
                        messageId={m.id}
                      />
                    </div>
                  ) : (
                    // Regular message display (non-design mode)
                    // the actual area in whivh the response is displayed
                    <div className="relative max-w-[95vw] sm:max-w-[90vw] overflow-x-hidden rounded-xl p-1 text-[1.1rem] sm:text-[1.2rem] tracking-tight dark:text-[#E8E8E6] text-[#0c0c0c] md:max-w-2xl md:p-2 md:text-[1.4rem]"> 
                      <div className="animate-fade-in transition-opacity duration-500">
                        <MarkdownRenderer content={m.content} />
                      </div>
                      
                      {/* Message action buttons... */}
                      <div className="mb-14 flex flex-wrap gap-1 sm:gap-2">
                        <div className="flex items-center justify-center rounded-full  p-2 sm:p-3 dark:text-white text-[#0c0c0c] transition-colors dark:hover:bg-[#294A6D] hover:bg-[#e0e0e0] dark:hover:text-[#48AAFF] hover:text-[#48AAFF]">
                          <button onClick={handleSearchWeb} className="text-base md:text-lg">
                            <Globe className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-center rounded-full  p-2 sm:p-3 dark:text-white text-[#0c0c0c] transition-colors dark:hover:bg-[#294A6D] hover:bg-[#e0e0e0] dark:hover:text-[#48AAFF] hover:text-[#48AAFF]">
                          <button onClick={() => handleSearchYouTube(lastQuery)} className="text-base md:text-lg">
                            <Play className="h-5 w-5" />
                          </button>
                        </div>
                        {previousUserMessage && (
                          <div className="flex items-center justify-center rounded-full  p-2 sm:p-3 dark:text-white text-[#0c0c0c] transition-colors dark:hover:bg-[#294A6D] hover:bg-[#e0e0e0] dark:hover:text-[#48AAFF] hover:text-[#48AAFF]">
                            <button
                              onClick={() => regenerateQuery(previousUserMessage, m.id)}
                              className="text-base md:text-lg"
                              // disabled={regenForMessageId === m.id || isLoading}
                            >
                              {regenForMessageId === m.id ? " " : <RotateCw className="h-5 w-5" />}
                            </button>
                          </div>
                        )}
                        <div className="flex items-center justify-center rounded-full  p-2 sm:p-3 dark:text-white text-[#0c0c0c] transition-colors dark:hover:bg-[#294A6D] hover:bg-[#e0e0e0] dark:hover:text-[#48AAFF] hover:text-[#48AAFF]">
                          <button onClick={() => copyMessage(m.content, m.id)} className="text-base md:text-lg">
                            {copiedMessageId === m.id ? (
                              <Check className="h-5 w-5 text-[#48AAFF]" />
                            ) : (
                              <Copy className="h-5 w-5 dark:text-[#f7eee3] text-[#0c0c0c] hover:text-[#48AAFF]" />
                            )}
                          </button>
                        </div>

                        {/* TTS playback button for assistant messages */}
                        {isVoiceMode && (
                          <div className="flex items-center justify-center rounded-full p-2 sm:p-3 dark:text-white text-[#0c0c0c] transition-colors dark:hover:bg-[#294A6D] hover:bg-[#e0e0e0] dark:hover:text-[#48AAFF] hover:text-[#48AAFF]">
                            <button
                              onClick={() => playResponseAudio(m.content)}
                              className="text-base md:text-lg"
                              disabled={isPlaying}
                            >
                              {isPlaying ? (
                                <VolumeX className="h-5 w-5 text-[#48AAFF] animate-pulse" />
                              ) : (
                                <Volume2 className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {searchResults && (
              <div className="mx-3 overflow-x-hidden rounded-xl border border-[#f7eee332] dark:bg-gradient-to-r dark:from-[#1a1a1a] dark:to-[#252525] bg-gradient-to-r from-[#f0f0f0] to-[#ffffff] p-4 shadow-lg md:mx-0">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-6 w-6 flex-shrink-0 text-[#FF5E00]" />
                    <h3 className="truncate text-lg font-medium dark:text-[#E8E8E6] text-[#0c0c0c] md:text-xl">
                      Web Search Results
                    </h3>
                  </div>
                  <div className="group relative">
                    <button className="flex items-center gap-2 rounded-full bg-[#4544449d] px-3 py-1.5 dark:text-white text-[#0c0c0c] transition-colors duration-200 dark:hover:bg-[#FF5E00] hover:bg-[#FF5E00]">
                      <span className="text-base">Sources</span>
                      <Info className="h-5 w-5" />
                    </button>
                    <div className="absolute right-0 z-10 mt-2 hidden w-max max-w-[300px] rounded-lg border border-[#f7eee332] dark:bg-[#1a1a1a] bg-[#ffffff] p-2 shadow-xl group-hover:block">
                      {searchLinks.map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate rounded-lg px-3 py-2 text-base dark:text-[#E8E8E6] text-[#0c0c0c] dark:hover:bg-[#252525] hover:bg-[#f0f0f0]"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="prose prose-base md:prose-lg dark:prose-invert prose-gray max-w-none">
                  <MarkdownRenderer content={searchResults} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom input or toolbar area */}
          <div
            className={`flex sticky bottom-0 z-10 flex-row gap-3 items-center justify-center ${
              showWhiteboard ? "right-[33.333%]" : "right-0"
            } left-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)/80] to-transparent p-2 sm:p-4 transition-all duration-300`}
          >
            {isDesignMode ? (
              // floating Toolbar for design mode
              <div className={`mx-auto w-auto ${showWhiteboard ? "max-w-full px-2 sm:px-4" : "max-w-2xl px-2 sm:px-3 md:px-0"}`}>
                
                {/* <div className="group w-full items-center  rounded-2xl dark:bg-[#1a1a1a] bg-[#f0f0f0] p-2 shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          // Bold formatting action – implement formatting on the editor for the selected message.
                          // ...existing formatting code...
                        }}
                        className="h-10 w-10 p-2 rounded-lg bg-gray-200 dark:bg-gray-800 dark:text-white text-black hover:bg-gray-300 dark:hover:bg-gray-700" 
                        title="Bold"
                      >
                        <strong>B</strong>
                      </button>
                      <button 
                        onClick={() => {
                        
                        }}
                        className="h-10 w-10 p-2 rounded-lg bg-gray-200 dark:bg-gray-800 dark:text-white text-black hover:bg-gray-300 dark:hover:bg-gray-700" 
                        title="Italic"
                      >
                       <Italic />
                      </button>
                      <button 
                        onClick={() => {
                          const editorRef = useRef<any>(null);
                          // Function to insert code block markup
                          const insertCodeBlock = () => {
                            const currentMessageId = Object.keys(editedMessages)[0]; // Assuming one message is being edited
                            if (!currentMessageId) return;

                            // Get the current content
                            let content = editedMessages[currentMessageId] || '';
                            
                            // Insert code block markup at the cursor position or end of content
                            const codeBlockMarkup = '<pre><code class="language-js">// Your code here\n</code></pre>';
                            
                            // For simplicty, we'll append to the end if we can't access the editor directly
                            setEditedMessages({
                              ...editedMessages,
                              [currentMessageId]: content + codeBlockMarkup
                            });
                            
                            // If we have a ref to the editor (e.g., from Tiptap), we could insert at cursor
                            if (editorRef.current) {
                              // This would depend on the editor implementation
                              // editorRef.current.commands.insertContent(codeBlockMarkup);
                            }
                          }
                          // Code block action
                          // ...existing formatting code...
                        }}
                        className="h-10 w-10 p-2 rounded-lg bg-gray-200 dark:bg-gray-800 dark:text-white text-black hover:bg-gray-300 dark:hover:bg-gray-700" 
                        title="Code Block"
                      >
                        <code>{<Code />}</code>
                      </button>
                      <button 
                        onClick={() => {
                          // Heading action (e.g., level 2)
                          // ...existing formatting code...
                        }}
                        className="h-10 w-10 p-2 rounded-lg bg-gray-200 dark:bg-gray-800 dark:text-white text-black hover:bg-gray-300 dark:hover:bg-gray-700" 
                        title="Heading"
                      >
                        H2
                      </button>
                      <button 
                        onClick={() => {
                          // Bullet list action
                          // ...existing formatting code...
                         
                        }}
                        className="h-10 w-10 p-2 rounded-lg bg-gray-200 dark:bg-gray-800 dark:text-white text-black hover:bg-gray-300 dark:hover:bg-gray-700" 
                        title="Bullet List"
                      >
                        <List />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm dark:text-gray-300 text-gray-600">
                      
                      </span>
                    </div>
                  </div>
                </div> */}
              </div>
            ) : (
              // ...existing input field form...
              <form
                onSubmit={onSubmit}
                className={`mx-auto w-full ${showWhiteboard ? "max-w-full px-2 sm:px-4" : "max-w-2xl px-2 sm:px-3 md:px-0"}`}
              >
                <div className="group flex-col  w-full items-center  border border-[#383838] rounded-2xl dark:bg-[#ffffff] bg-[#f0f0f0] p-1  shadow-md transition-all duration-300">
                  <div className="flex relative flex-1  items-center overflow-hidden dark:bg-[#bebdbdde] bg-[#ffffff] rounded-xl py-3 sm:py-5 transition-all duration-300">
                    {!isVoiceMode ? (
                      <textarea
                        ref={textareaRef}
                        placeholder="Ask me anything..."
                        value={input}
                        onChange={(e) => {
                          handleInputChange(e);
                          adjustTextareaHeight();
                        }}
                        onKeyDown={handleKeyDown}
                        className="max-h-[120px] min-h-[60px] flex-1 resize-none bg-transparent px-4 py-2 text-base md:text-lg dark:text-[#0c0c0c] text-[#0c0c0c] outline-none transition-all duration-200 dark:placeholder:text-[#0c0c0c] placeholder:text-[#606060] font-['Instrument_Serif']"
                        rows={1}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center px-4">
                        <div className={`flex flex-col items-center ${isRecording ? 'animate-pulse' : ''}`}>
                          <div className="text-center mb-2">
                            {isRecording ? (
                              <span className="text-red-500 text-base">Recording...</span>
                            ) : (
                              <span className="dark:text-[#f7eee380] text-[#444444] text-base">Ready to record</span>
                            )}
                          </div>
                          {transcribedText && (
                            <div className="max-w-full overflow-x-auto dark:text-[#f7eee3] text-[#0c0c0c] text-base py-2">
                              {transcribedText}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="absolute right-3 bottom-3 flex gap-3 items-center justify-center">
                      {/* Voice mode toggle button */}
                      {/* <button 
                        type="button"
                        onClick={toggleVoiceMode} 
                        className={`p-2 rounded-full ${isVoiceMode ? 'bg-[#48AAFF] text-white' : 'bg-[#2a2a2a] text-[#f7eee380]'} hover:bg-[#48AAFF] hover:text-white transition-colors duration-200`}
                      >
                        {isVoiceMode ? <Mic /> : <MicOff />}
                      </button>  */}

                      {/* Voice recording button (only when in voice mode) */}
                      {/* {isVoiceMode && (
                        <button
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`p-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-[#252525] hover:bg-[#323232]'} text-[#f7eee3] transition-colors duration-200`}
                        >
                          {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>
                      )} */}

                      {/* Canvas button */}


                      {/* Submit button */}
                      {!isVoiceMode && (

                        <div className="flex items-center justify-center p-1 bg-[#E0E0E0] rounded-full box-shadow: 76px 2px 58px -95px rgba(224,224,224,1) inset;">
                          <button
                            type="submit"
                            className="p-3 rounded-full bg-[#0D0C0C] hover:bg-[#323232] text-[#f7eee3] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed drop-shadow-xl-[#888787] box-shadow: 76px 2px 58px -95px rgba(136, 135, 135, 1) inset"
                            // disabled={isLoading || isWebSearchLoading}
                          >
                            {isLoading || isWebSearchLoading ? (
                              <div className="relative h-5 w-5 flex items-center justify-center">
                                {/* Agentic workflow animation */}
                                <svg width="20" height="20" viewBox="0 0 50 50" className="animate-spin-slow">
                                  {/* Base circular path */}
                                  <circle cx="25" cy="25" r="20" stroke="#f7eee3" strokeWidth="1" fill="none" opacity="0.3" />
                                  
                                  {/* Nodes representing processing steps */}
                                  <circle cx="25" cy="5" r="3" fill="#f7eee3" className="animate-pulse-node" style={{animationDelay: "0ms"}} />
                                  <circle cx="41" cy="15" r="3" fill="#f7eee3" className="animate-pulse-node" style={{animationDelay: "300ms"}} />
                                  <circle cx="41" cy="35" r="3" fill="#f7eee3" className="animate-pulse-node" style={{animationDelay: "600ms"}} />
                                  <circle cx="25" cy="45" r="3" fill="#f7eee3" className="animate-pulse-node" style={{animationDelay: "900ms"}} />
                                  <circle cx="9" cy="35" r="3" fill="#f7eee3" className="animate-pulse-node" style={{animationDelay: "1200ms"}} />
                                  <circle cx="9" cy="15" r="3" fill="#f7eee3" className="animate-pulse-node" style={{animationDelay: "1500ms"}} />
                                  
                                  {/* Flowing path/connection */}
                                  <path 
                                    d="M25,5 L41,15 L41,35 L25,45 L9,35 L9,15 Z" 
                                    stroke="#f7eee3" 
                                    strokeWidth="1.5" 
                                    fill="none" 
                                    strokeDasharray="100"
                                    strokeDashoffset="100"
                                    className="animate-dash-flow"
                                  />
                                  
                                  {/* Center node - representing the agent */}
                                  <circle cx="25" cy="25" r="4" fill="#48AAFF" className="animate-pulse-agent" />
                                </svg>
                                
                                {/* Small dot in center for focus */}
                                <div className="absolute w-1 h-1 bg-white rounded-full animate-ping-slow"></div>
                              </div>
                            ) : <ArrowUp className="h-4 w-4" />}
                          </button>
                        </div>

                      )}
                    </div>

                  </div>
                  <div className="flex gap-1 items-center flex-wrap">


                    <div className="relative m-1">
                      <button
                        type="button"
                        onClick={() => setShowModelSelector(!showModelSelector)}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 text-base sm:px-4 sm:py-2 sm:text-lg rounded-lg dark:bg-[#252525] bg-[#e2e2e2] dark:text-[#f7eee3] text-[#0c0c0c] transition-colors dark:hover:bg-[#323232] hover:bg-[#d0d0d0]">
                        <span className="max-w-[100px] sm:max-w-none truncate">{getModelDisplayName(selectedModel)}</span>
                        <ChevronDown className="h-5 w-5" />
                      </button>

                      {showModelSelector && (
                        <div className="absolute bottom-full mb-1 z-10 rounded-md dark:bg-[#1a1a1a] bg-[#ffffff] shadow-lg border border-[#383838] w-full">
                          <ul className="py-1">
                            {MODEL_OPTIONS.map((model) => (
                              <li key={model.id}>
                                <button
                                  type="button"
                                  className={`w-full text-left px-4 py-2 dark:hover:bg-[#252525] hover:bg-[#f0f0f0] ${selectedModel === model.id ? 'dark:bg-[#323232] bg-[#e2e2e2] dark:text-[#f7eee3] text-[#0c0c0c]' : 'dark:text-[#f7eee380] text-[#444444]'}`}
                                  onClick={() => handleModelChange(model.id)}
                                >
                                  {model.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <button type="button" className="flex m-1 dark:bg-[#252525] bg-[#e2e2e2] dark:hover:bg-[#323232] hover:bg-[#d0d0d0] dark:text-[#f7eee3] text-[#0c0c0c] p-2 rounded-lg transition-colors duration-200" onClick={toggleWhiteboard}>
                      <Paintbrush className="h-5 w-5" />
                    </button>



                    {/* <button
                      type="button"
                      onClick={toggleVoiceMode}
                      className={`flex m-1 p-2 rounded-lg ${isVoiceMode ? 'bg-[#48AAFF] text-white' : 'bg-[#2a2a2a] text-[#f7eee3]'} hover:bg-[#48AAFF] hover:text-white transition-colors duration-200`}
                    >
                      {isVoiceMode ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button> */}
                  </div>

                </div>

                {input.length > 0 && !isVoiceMode && (
                  <div className="mt-1.5 flex items-center justify-between px-1 text-xs dark:text-[#f7eee380] text-[#555555]">
                    <span>Press Enter to send, Shift + Enter for new line</span>
                    <span>{input.length}/10000</span>
                  </div>
                )}

                {error && (
                  <div className={`mt-2 text-center p-3 rounded-lg ${
                    error.includes("Internet connection") 
                      ? "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800" 
                      : ""
                  }`}>
                    <div className="flex items-center justify-center gap-2">
                      {error.includes("Internet connection") && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                      )}
                      <span className={`text-base ${error.includes("Internet connection") ? "text-red-600 dark:text-red-400 font-medium" : "text-red-500"}`}>
                        {error}
                      </span>
                    </div>
                    
                    {error.includes("Internet connection") && (
                      <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                        <button 
                          onClick={() => window.location.reload()} 
                          className="underline hover:text-red-700 dark:hover:text-red-300"
                        >
                          Reload page
                        </button> when your connection is restored.
                      </div>
                    )}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {showWhiteboard && (
        <div
          ref={whiteboardRef}
          className="fixed right-0 top-[56px] z-20 h-[calc(100vh-56px)] w-full border-l border-[#f7eee332] md:w-1/3 dark:bg-[#1a1a1a] bg-[#f0f0f0]"
          style={{ touchAction: "none" }}
        >
          <Tldraw
            inferDarkMode
            components={components}
            persistenceKey="example"
            onMount={(editor: Editor) => {
              editor.setCamera({ x: 0, y: 0, z: 0 });
              tldrawEditor.current = editor;
            }}
          />
          <button
            onClick={() => setShowWhiteboard(false)}
            className="absolute top-0 right-0 z-30 flex items-center justify-center gap-2 rounded-bl-xl dark:bg-[#1A1A1C] bg-[#e2e2e2] p-3 text-sm dark:text-[#f7eee3] text-[#0c0c0c] dark:hover:bg-[#575757] hover:bg-[#d0d0d0]"
          >
            Close
          </button>
        </div>
      )}

      {/* Add Chat Switcher Modal */}
      {showChatSwitcher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-lg bg-white dark:bg-[#1a1a1a] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white text-black">Switch Chat</h2>
              <button 
                onClick={() => setShowChatSwitcher(false)}
                className="rounded-full p-1 dark:text-gray-400 text-gray-500 hover:dark:bg-gray-800 hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* <div className="mb-4">
              <input 
                type="text" 
                placeholder="Search chats..." 
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] p-2 text-black dark:text-white"
              />
            </div> */}
            
            <div className="max-h-[60vh] overflow-y-auto">
              {savedChats.length > 0 ? (
                <div className="space-y-2">
                  {savedChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        switchToChat(chat.id);
                        setShowChatSwitcher(false);
                      }}
                      className={`w-full text-left rounded-md p-3 transition-colors ${
                        chatId === chat.id 
                          ? 'bg-blue-100 dark:bg-blue-900/30' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="font-medium text-black dark:text-white truncate">
                        {chat.title}
                      </div>
                      {chat.firstMessage && (
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                          {chat.firstMessage}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {new Date(chat.updatedAt).toLocaleDateString()} • {chat.messageCount} message{chat.messageCount !== 1 ? 's' : ''}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No chats found
                </div>
              )}
            </div>
            
            <div className="mt-4 flex justify-between">
              <button
                onClick={() => {
                  createNewChat();
                  setShowChatSwitcher(false);
                }}
                className="flex items-center justify-center  w-full gap-2 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </button>
              
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


