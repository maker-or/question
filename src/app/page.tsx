"use client";
import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
// Import footnotes as a default import to avoid type issues
import remarkFootnotes from "remark-footnotes";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import DOMPurify from "dompurify";
import prettier from "prettier/standalone";
import parserBabel from "prettier/parser-babel";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus,twilight , coldarkDark} from "react-syntax-highlighter/dist/cjs/styles/prism";
import Image from "next/image";

// Import KaTeX CSS for math rendering
import 'katex/dist/katex.min.css';

// import { useChat } from "ai/react";
import { useChat } from '@ai-sdk/react'
import {
  Copy,
  Check,
  Globe,
  Play,
  Share2,
  ArrowUp,
  Info,
  RotateCw,
  MessageCircleX,
  FileText,
  Sparkle,
  Sparkles,
  Square,
  Paintbrush,
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  ChevronDown,
} from "lucide-react";

import { DropdownMenuCheckboxItemProps } from "@radix-ui/react-dropdown-menu";
import { Editor, Tldraw, TLUiComponents } from "tldraw";
import "tldraw/tldraw.css";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

import styles from "~/app/chat.module.css";
import { Attachment } from "ai";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { createPDF } from "../utils/createPDF"; // <-- Added import for PDF conversion

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
    <div className="prose prose-invert max-w-none">
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
            return match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                className="rounded-md"
                {...props as any}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
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
                {alt && <span className="block text-center text-sm text-gray-500 mt-1">{alt}</span>}
              </span>
            ) : null;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="border-collapse w-full border border-gray-700">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return <th className="border border-gray-700 bg-gray-800 px-4 py-2 text-left">{children}</th>;
          },
          td({ children }) {
            return <td className="border border-gray-700 px-4 py-2">{children}</td>;
          },
          blockquote({ children }) {
            return <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4">{children}</blockquote>;
          },
          h1({ children }) {
            return <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside pl-4 my-4 space-y-2">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside pl-4 my-4 space-y-2">{children}</ol>;
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

type Checked = DropdownMenuCheckboxItemProps["checked"];

// Model options
const MODEL_OPTIONS = [
  { id: "google/gemini-2.0-flash-lite-preview-02-05:free", name: "Gemini flash 2.0" },
  // { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
  // { id: "deepseek/deepseek-chat:free", name: "DeepSeek v3" },
   { id: "google/gemma-3-27b-it:free", name: "Gemma 3" },
   { id: "qwen/qwq-32b:free", name: "Qwen 32B" }

];


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
  const [whiteboardData, setWhiteboardData] = useState<string | null>(null);
  const whiteboardRef = useRef<HTMLDivElement>(null);
  const tldrawEditor = useRef<Editor | null>(null);

  const [skipAutoScroll, setSkipAutoScroll] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenForMessageId, setRegenForMessageId] = useState<string | null>(null);

  const [showStatusBar, setShowStatusBar] = React.useState<Checked>(true);
  const [showActivityBar, setShowActivityBar] = React.useState<Checked>(false);
  const [showPanel, setShowPanel] = React.useState<Checked>(false);

  const [chatId, setChatId] = useState<string | undefined>(undefined);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  
  // New state for chat management
  const [showChatSwitcher, setShowChatSwitcher] = useState(false);
  const [savedChats, setSavedChats] = useState<ChatInfo[]>([]);
  const router = useRouter();

  const [showActionButtons, setShowActionButtons] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  // Voice mode states
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleMouseEnter = () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    setShowActionButtons(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowActionButtons(false);
    }, 1000); // 1000ms delay to give enough time to reach the buttons
    setHideTimeout(timeout);
  };

  // Get the chat hook first before any code uses 'messages'
  const { messages, input, handleInputChange, handleSubmit, setInput } = useChat({
    api: "/api/chat",
    body: { model: selectedModel },
    id: chatId,
    initialMessages: initialMessages,
    onResponse: (response) => {
      setIsLoading(false);
      // Only reset input if NOT using the deepseek model to prevent refresh loop
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
      setError("An error occurred. Please try again.");
    },
  });

  // Now we can use useEffect hooks that reference 'messages'
  useEffect(() => {
    const storedChatId = localStorage.getItem("currentChatId");
    if (storedChatId) {
      setChatId(storedChatId);
      const chatMessages = localStorage.getItem(`chat_${storedChatId}`);
      if (chatMessages) {
        try {
          setInitialMessages(JSON.parse(chatMessages));
        } catch (err) {
          console.error("Failed to parse stored messages", err);
        }
      }
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
    // Save current messages if needed
    if (messages.length > 0 && chatId) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));
    }
    
    // Generate new chat ID
    const newChatId = uuidv4();
    
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
    setChatId(newChatId);
    
    // Clear messages and refresh page to start a new chat
    localStorage.removeItem("chatMessages"); // Clear the default storage
    window.location.href = window.location.pathname; // Refresh the page
  };

  // Function to switch to a different chat
  const switchToChat = (selectedChatId: string) => {
    // Save current messages
    if (messages.length > 0 && chatId) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));
    }
    
    // Set selected chat as current
    localStorage.setItem("currentChatId", selectedChatId);
    setChatId(selectedChatId);
    setShowChatSwitcher(false);
    
    // Refresh the page to load the selected chat
    window.location.href = window.location.pathname;
  };

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

  const toggleVoiceMode = () => {
    setIsVoiceMode(prev => !prev);
    // Reset any ongoing recording if turning off voice mode
    if (isVoiceMode && isRecording) {
      stopRecording();
    }
  };

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

  // Move the keyboard shortcuts effect after the chat hook to access messages
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
  }, []); // Remove messages from dependency array since it's not used in the effect

  // Save current chat messages when they change
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
      setTimeout(() => setCopiedMessageId(null), 2000);
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

  const regenerateQuery = (query: string, messageId: string) => {
    setRegenForMessageId(messageId);
    setIsRegenerating(true);
    setSkipAutoScroll(true);
    setIsLoading(true);
    setError(null);
    setInput(query);
    
    // Break the cycle with setTimeout
    setTimeout(() => {
      const syntheticEvent = {
        preventDefault: () => {},
      } as React.FormEvent;
      handleSubmit(syntheticEvent);
    }, 10);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Remove the mouse move event listener as it's causing conflicts
  useEffect(() => {
    // Remove the previous mouse move listener
    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [hideTimeout]);

  // Toggle action buttons with persistence
  const toggleActionButtons = () => {
    setShowActionButtons(prev => !prev);
  };

  // -----------------------------------------------------------------------
  // Get model display name
  // -----------------------------------------------------------------------
  const getModelDisplayName = (modelId: string): string => {
    const model = MODEL_OPTIONS.find(m => m.id === modelId);
    return model ? model.name : "Choose a model";
  };

  return (
    <main className={`${showWhiteboard ? "pr-[33.333%]" : ""} transition-all duration-300`}>
      {/* Chat switcher modal */}
      {showChatSwitcher && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-[#151515] rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Chats</h2>
              <button 
                onClick={() => setShowChatSwitcher(false)}
                className="text-gray-400 hover:text-white"
              >
                  <X className="h-4 w-4"/>
              </button>
            </div>
            
            <div className="p-2 flex-1 overflow-y-auto">
              {savedChats.length > 0 ? (
                <div className="space-y-2">
                  {savedChats
                    .sort((a, b) => b.updatedAt - a.updatedAt) // Sort by most recent
                    .map(chat => (
                      <button
                        key={chat.id}
                        onClick={() => switchToChat(chat.id)}
                        className={`w-full text-left p-3 rounded-lg hover:bg-[#252525] transition-colors ${
                          chat.id === chatId ? 'bg-[#323232] border border-[#48AAFF]' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-white truncate">{chat.title}</h3>
                          <span className="text-xs text-gray-400">
                            {new Date(chat.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {/* {chat.firstMessage && (
                          <p className="text-sm text-gray-300 mt-1 truncate">{chat.firstMessage}</p>
                        )} */}
                        <div className="text-xs text-gray-500 mt-1">
                          {chat.messageCount} message{chat.messageCount !== 1 ? 's' : ''}
                        </div>
                      </button>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No saved chats. Create a new one with Cmd+N
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={createNewChat}
                className="w-full py-2 bg-[#48AAFF] hover:bg-[#3a88cc] text-white rounded-lg transition-colors"
              >
                New Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rest of your existing components */}
      {/* ...existing code... */}
      
      {/* Update your action buttons panel to include a "New Chat" button */}
      {showActionButtons && (
        <div
          className="fixed bottom-16 right-1 z-20 p-3 backdrop-blur-md rounded-lg shadow-lg border border-[#f7eee332]"
        >
          <div className="flex flex-col gap-1">
            <button
              onClick={createNewChat}
              className="flex items-start justify-start gap-2 rounded-xl p-3 text-white hover:bg-[#575757] w-full"
            >
              New Chat
            </button>
            <button
              onClick={() => setShowChatSwitcher(true)}
              className="flex items-start justify-start gap-2 rounded-xl p-3 text-white hover:bg-[#575757] w-full"
            >
              Switch Chat
            </button>
            <button
              onClick={handleClearHistory}
              className="flex items-start justify-start gap-2 rounded-xl p-3 text-white hover:bg-[#575757] w-full"
            >
              Delete Chat
            </button>
            <button
              onClick={() => createPDF(messages)}
              className="flex items-start justify-start gap-2 rounded-xl p-3 text-white hover:bg-[#575757] w-full"
            >
              Export to PDF
            </button>
            <button
              onClick={() => setShowActionButtons(false)}
              className="flex items-start justify-start gap-2 rounded-xl p-3 text-white hover:bg-[#575757] w-full mt-2"
            >
              Close Menu
            </button>
          </div>
        </div>
      )}

      {/* ...existing code... */}
      {/* Audio element for TTS playback */}
      <div className="fixed bottom-1 right-1 z-10">
        <button
          onClick={toggleActionButtons}
          className={`flex items-center justify-center gap-2 rounded-full ${showActionButtons ? 'bg-[#48AAFF]' : 'bg-[#151515]'} p-3 text-white hover:bg-[#48AAFF] transition-all duration-300`}
        >
          {/* <Sparkle className={showActionButtons ? 'text-white' : ''} /> */}
          <Sparkles className={showActionButtons ? 'text-white' : ''} />
        </button>
      </div>

      <audio ref={audioRef} src={audioSrc || undefined} className="hidden" />

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-[3em]  text-[#f7eee3ca] mb-4 font-serif">What do you want to learn? </h1>




          <div className="w-full max-w-2xl px-4">
            <form onSubmit={onSubmit} className="w-full">
              <div className="group flex-col  w-full items-center  border border-[#383838] rounded-2xl bg-[#ffffff] p-1  shadow-md transition-all duration-300">
                <div className="flex relative flex-1  items-center overflow-hidden bg-[#bebdbdde] rounded-xl py-5 transition-all duration-300">
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
                      className="max-h-[120px] min-h-[60px] flex-1 resize-none bg-transparent font-serif px-4 py-2 text-sm text-[#0c0c0c] outline-none transition-all duration-200 placeholder:text-[#0c0c0c] md:text-base"
                      rows={1}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center px-4">
                      <div className={`flex flex-col items-center ${isRecording ? 'animate-pulse' : ''}`}>
                        <div className="text-center mb-2">
                          {isRecording ? (
                            <span className="text-red-500 text-sm">Recording...</span>
                          ) : (
                            <span className="text-[#f7eee380] text-sm">Ready to record</span>
                          )}
                        </div>
                        {transcribedText && (
                          <div className="max-w-full overflow-x-auto text-[#f7eee3] text-sm py-2">
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
                          {isLoading || isWebSearchLoading ? <Square className="h-5 w-5" fill="#f7eee3" /> : <ArrowUp className="h-4 w-4" />}
                        </button>
                      </div>

                    )}
                  </div>

                </div>
                <div className="flex gap-1 items-center">


                  <div className="relative m-1">
                    <button
                      type="button"
                      onClick={() => setShowModelSelector(!showModelSelector)}
                      className="flex items-center justify-between gap-2 px-4 py-2 rounded-lg bg-[#252525] text-[#f7eee3] transition-colors hover:bg-[#323232]">
                      <span>{getModelDisplayName(selectedModel)}</span>
                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {showModelSelector && (
                      <div className="absolute mt-1 z-10 rounded-md bg-[#1a1a1a] shadow-lg border border-[#383838]">
                        <ul className="py-1">
                          {MODEL_OPTIONS.map((model) => (
                            <li key={model.id}>
                              <button
                                type="button"
                                className={`w-full text-left px-4 py-2 hover:bg-[#252525] ${selectedModel === model.id ? 'bg-[#323232] text-[#f7eee3]' : 'text-[#f7eee380]'}`}
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
                  <button type="button" className="flex m-1 bg-[#252525] hover:bg-[#323232] text-[#f7eee3] p-3 rounded-lg transition-colors duration-200" onClick={() => setShowWhiteboard(true)}>
                    <Paintbrush className="h-4 w-4" />
                  </button>



                  {/* <button
                    type="button"
                    onClick={toggleVoiceMode}
                    className={`flex m-1 p-3 rounded-lg ${isVoiceMode ? 'bg-[#48AAFF] text-white' : 'bg-[#2a2a2a] text-[#f7eee3]'} hover:bg-[#48AAFF] hover:text-white transition-colors duration-200`}
                  >
                    {isVoiceMode ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button> */}
                </div>

              </div>
              {input.length > 0 && !isVoiceMode && (
                <div className="mt-1.5 flex items-center justify-between px-1 text-xs text-[#f7eee380]">
                  <span>Press Enter to send, Shift + Enter for new line</span>
                  <span>{input.length}/2000</span>
                </div>
              )}
              {error && <div className="mt-2 text-center text-sm text-red-500">{error}</div>}
            </form>
          </div>
        </div>
      ) : (
        <div className={`relative mx-auto flex h-full w-full flex-col ${showWhiteboard ? "md:w-full" : "md:w-2/3"}`}>
          <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4 pb-24 md:space-y-6 md:px-0 md:py-6">
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
                  className="animate-slide-in group relative mx-2 flex flex-col md:mx-0"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="max-w-[85vw] text-[1.4em] tracking-tight font-serif rounded-t-3xl rounded-br-3xl bg-[#1F2937] text-[#E8E8E6] overflow-hidden md:max-w-xl md:p-4 md:text-[2em] line-clamp-3">
                    <MarkdownRenderer content={m.content} />
                  </div>
                </div>
              ) : (
                <div key={m.id} className="animate-slide-in group relative flex flex-col md:mx-0">
                  <div className="relative max-w-[90vw] overflow-x-hidden rounded-xl p-1 text-[0.95rem] tracking-tight text-[#E8E8E6] md:max-w-2xl md:p-2 md:text-[1.2rem]">
                    <div className="animate-fade-in transition-opacity duration-500">
                      <MarkdownRenderer content={m.content} />

                      {/* Model attribution */}
                      <div className="mt-4 text-xs text-[#f7eee380] italic">
                        Generated by {getModelDisplayName(selectedModel)}
                      </div>
                    </div>
                    <div className="mb-14 flex flex-wrap -gap-3 ">
                      <div className="flex items-center justify-center rounded-full  p-3 text-white transition-colors hover:bg-[#294A6D] hover:text-[#48AAFF]">
                        <button onClick={handleSearchWeb} className="text-sm md:text-base">
                          <Globe className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-center rounded-full  p-3 text-white transition-colors hover:bg-[#294A6D] hover:text-[#48AAFF]">
                        <button onClick={() => handleSearchYouTube(lastQuery)} className="text-sm md:text-base">
                          <Play className="h-4 w-4" />
                        </button>
                      </div>
                      {previousUserMessage && (
                        <div className="flex items-center justify-center rounded-full  p-3 text-white transition-colors hover:bg-[#294A6D] hover:text-[#48AAFF]">
                          <button
                            onClick={() => regenerateQuery(previousUserMessage, m.id)}
                            className="text-sm md:text-base"
                            // disabled={regenForMessageId === m.id || isLoading}
                          >
                            {regenForMessageId === m.id ? " " : <RotateCw className="h-4 w-4" />}
                          </button>
                        </div>
                      )}
                      <div className="flex items-center justify-center rounded-full  p-3 text-white transition-colors hover:bg-[#294A6D] hover:text-[#48AAFF]">
                        <button onClick={() => copyMessage(m.content, m.id)} className="text-sm md:text-base">
                          {copiedMessageId === m.id ? (
                            <Check className="h-4 w-4 text-[#48AAFF]" />
                          ) : (
                            <Copy className="h-4 w-4 text-[#f7eee3] hover:text-[#48AAFF]" />
                          )}
                        </button>
                      </div>

                      {/* TTS playback button for assistant messages */}
                      {isVoiceMode && (
                        <div className="flex items-center justify-center rounded-full p-3 text-white transition-colors hover:bg-[#294A6D] hover:text-[#48AAFF]">
                          <button
                            onClick={() => playResponseAudio(m.content)}
                            className="text-sm md:text-base"
                            disabled={isPlaying}
                          >
                            {isPlaying ? (
                              <VolumeX className="h-4 w-4 text-[#48AAFF] animate-pulse" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {searchResults && (
              <div className="mx-3 overflow-x-hidden rounded-xl border border-[#f7eee332] bg-gradient-to-r from-[#1a1a1a] to-[#252525] p-4 shadow-lg md:mx-0">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 flex-shrink-0 text-[#FF5E00]" />
                    <h3 className="truncate text-base font-medium text-[#E8E8E6] md:text-lg">
                      Web Search Results
                    </h3>
                  </div>
                  <div className="group relative">
                    <button className="flex items-center gap-2 rounded-full bg-[#4544449d] px-3 py-1.5 text-white transition-colors duration-200 hover:bg-[#FF5E00]">
                      <span className="text-sm">Sources</span>
                      <Info className="h-4 w-4" />
                    </button>
                    <div className="absolute right-0 z-10 mt-2 hidden w-max max-w-[300px] rounded-lg border border-[#f7eee332] bg-[#1a1a1a] p-2 shadow-xl group-hover:block">
                      {searchLinks.map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate rounded-lg px-3 py-2 text-sm text-[#E8E8E6] hover:bg-[#252525]"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="prose prose-sm md:prose-base prose-invert max-w-none">
                  <MarkdownRenderer content={searchResults} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div
            className={`flex sticky bottom-0 z-10 flex-row gap-3 items-center justify-center ${showWhiteboard ? "right-[33.333%]" : "right-0"
              } left-0 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c80] to-transparent p-4 transition-all duration-300`}
          >
            {/* Model selector in the bottom bar */}


            <form
              onSubmit={onSubmit}
              className={`mx-auto w-full ${showWhiteboard ? "max-w-full px-4" : "max-w-2xl px-3 md:px-0"}`}
            >
               <div className="group flex-col  w-full items-center  border border-[#383838] rounded-2xl bg-[#ffffff] p-1  shadow-md transition-all duration-300">
                <div className="flex relative flex-1  items-center overflow-hidden bg-[#bebdbdde] rounded-xl py-5 transition-all duration-300">
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
                      className="max-h-[120px] min-h-[60px] flex-1 resize-none bg-transparent font-serif px-4 py-2 text-sm text-[#0c0c0c] outline-none transition-all duration-200 placeholder:text-[#0c0c0c] md:text-base"
                      rows={1}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center px-4">
                      <div className={`flex flex-col items-center ${isRecording ? 'animate-pulse' : ''}`}>
                        <div className="text-center mb-2">
                          {isRecording ? (
                            <span className="text-red-500 text-sm">Recording...</span>
                          ) : (
                            <span className="text-[#f7eee380] text-sm">Ready to record</span>
                          )}
                        </div>
                        {transcribedText && (
                          <div className="max-w-full overflow-x-auto text-[#f7eee3] text-sm py-2">
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
                          {isLoading || isWebSearchLoading ? <Square className="h-5 w-5" fill="#f7eee3" /> : <ArrowUp className="h-4 w-4" />}
                        </button>
                      </div>

                    )}
                  </div>

                </div>
                <div className="flex gap-1 items-center">


                  <div className="relative m-1">
                    <button
                      type="button"
                      onClick={() => setShowModelSelector(!showModelSelector)}
                      className="flex items-center justify-between gap-2 px-4 py-2 rounded-lg bg-[#252525] text-[#f7eee3] transition-colors hover:bg-[#323232]">
                      <span>{getModelDisplayName(selectedModel)}</span>
                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {showModelSelector && (
                      <div className="absolute mt-1 z-10 rounded-md bg-[#1a1a1a] shadow-lg border border-[#383838]">
                        <ul className="py-1">
                          {MODEL_OPTIONS.map((model) => (
                            <li key={model.id}>
                              <button
                                type="button"
                                className={`w-full text-left px-4 py-2 hover:bg-[#252525] ${selectedModel === model.id ? 'bg-[#323232] text-[#f7eee3]' : 'text-[#f7eee380]'}`}
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
                  <button type="button" className="flex m-1 bg-[#252525] hover:bg-[#323232] text-[#f7eee3] p-2 rounded-lg transition-colors duration-200" onClick={() => setShowWhiteboard(true)}>
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
                <div className="mt-1.5 flex items-center justify-between px-1 text-xs text-[#f7eee380]">
                  <span>Press Enter to send, Shift + Enter for new line</span>
                  <span>{input.length}/2000</span>
                </div>
              )}

              {error && <div className="mt-2 text-center text-sm text-red-500">{error}</div>}
            </form>
          </div>
        </div>
      )}

      {showWhiteboard && (
        <div
          ref={whiteboardRef}
          className="fixed right-0 top-0 z-20 h-[100svh] w-full border-l border-[#f7eee332] md:w-1/3 bg-[#1a1a1a]"
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
            className="absolute top-0 right-0 z-30 flex items-center justify-center gap-2 rounded-bl-xl bg-[#1A1A1C] p-3 text-sm text-[#f7eee3] hover:bg-[#575757]"
          >
            Close
          </button>
        </div>
      )}
    </main>
  );
}



