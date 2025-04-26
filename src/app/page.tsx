"use client";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
// import rehypeRaw from "rehype-raw";
// import remarkMath from "remark-math";
// import rehypeKatex from "rehype-katex";
// import remarkEmoji from 'remark-emoji';
// import remarkBreaks from 'remark-breaks';

// import rehypeHighlight from "rehype-highlight";
// Import footnotes as a default import to avoid type issues
// import remarkFootnotes from "remark-footnotes";
// import rehypeSlug from "rehype-slug";
// import rehypeAutolinkHeadings from "rehype-autolink-headings";
// import rehypeExternalLinks from "rehype-external-links";
// import DOMPurify from "dompurify";
// import prettier from "prettier/standalone";
// import parserBabel from "prettier/parser-babel";
// import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
// import Image from "next/image";

// Import KaTeX CSS for math rendering
import 'katex/dist/katex.min.css';
import { Video, Clipboard, BookOpenText } from "@phosphor-icons/react";
// import { useChat } from "ai/react";
import { useChat } from '@ai-sdk/react'
import {
  Copy,
  Check,
  Globe,
 // Play,
  // Share2,
  ArrowUp,

  Info,
  //RotateCw,


  // MessageCircleX,
  // FileText,
  // Sparkle,
  // Sparkles,
  // Square,
  Paintbrush,
  // Mic,
  // MicOff,
  X,
  Trash,
  ArrowLeftRight,
  FileText,
  Plus,
  Paperclip,
  ChevronDown,
 // Edit3, // Add Edit icon
  //Save, // Add Save icon
  Mic,
  MicOff,
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

// Add VoiceMode import near the top with other imports
import VoiceMode from '@/components/VoiceMode';
import { Button } from "@/components/ui/Button";

// Add this import near the top with other imports
// import GrammarRenderer from "../components/GrammarRenderer";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import TopNav from '../components/TopNav';
import { MODEL_OPTIONS } from '@/components/modeloption';
import { ModelSelector } from '../components/ModelSelector';

// Add new import for the timeline
import Timeline from "../components/Timeline";

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
// interface MarkdownRendererProps {
//   content: string;
// }

// Add a new helper function to safely parse and format markdown with code blocks preserved
// const parseAndFormatContent = (content: string): string => {
//   // Regular expression to match grammar notation blocks
//   const grammarBlockRegex = /```grammar\n([\s\S]*?)```/g;

//   // Regular expression to match code blocks (with optional language)
//   const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

//   // First check for grammar blocks and mark them for special handling
//   content = content.replace(grammarBlockRegex, (match, grammar) => {
//     return `\n\n<grammar-block>${grammar}</grammar-block>\n\n`;
//   });

//   let segments: string[] = [];
//   let lastIndex = 0;
//   let match;

//   // Iterate over code blocks and split text into non-code and code segments
//   while ((match = codeBlockRegex.exec(content)) !== null) {
//     // Sanitize text before the current code block
//     const nonCodeSegment = content.substring(lastIndex, match.index);
//     const sanitizedNonCode = DOMPurify.sanitize(nonCodeSegment, {
//       USE_PROFILES: { html: true },
//       FORBID_TAGS: ['style'],
//     });
//     segments.push(sanitizedNonCode);

//     // Keep the code block intact, but trim the inner code
//     const lang = match[1];
//     const code = match[2].trim();
//     segments.push(`\n\n<pre><code class="language-${lang}">${code}</code></pre>\n\n`);
//     lastIndex = match.index + match[0].length;
//   }
//   // Sanitize any remaining part after the last code block
//   const remaining = content.substr(lastIndex);
//   const sanitizedRemaining = DOMPurify.sanitize(remaining, {
//     USE_PROFILES: { html: true },
//     FORBID_TAGS: ['style'],
//   });
//   segments.push(sanitizedRemaining);

//   // Return the combined content
//   return segments.join("");
// };

// -import const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => { /* full implementation removed */ };
// +import { MarkdownRenderer } from "../components/MarkdownRenderer";
// ...existing code...

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
  const [isStreaming, setIsStreaming] = useState(false); // New state to track token streaming
  // const [isWebSearchLoading, setIsWebSearchLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(
    "google/gemini-2.0-flash-lite-preview-02-05:free"
  );
  const [showModelSelector, setShowModelSelector] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // const [searchLinks, setSearchLinks] = useState<string[]>([]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  // const [whiteboardData, setWhiteboardData] = useState<string | null>(null);
  const whiteboardRef = useRef<HTMLDivElement>(null);
  const tldrawEditor = useRef<Editor | null>(null);
  const [skipAutoScroll, setSkipAutoScroll] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenForMessageId, setRegenForMessageId] = useState<string | null>(null);
  console.log(regenForMessageId)
  // const [showStatusBar, setShowStatusBar] = React.useState<Checked>(true);
  // const [showActivityBar, setShowActivityBar] = React.useState<Checked>(false);
  // const [showPanel, setShowPanel] = React.useState<Checked>(false);
  const [chatId, setChatId] = useState<string | undefined>(undefined);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);

  // New state for chat management
  const [showChatSwitcher, setShowChatSwitcher] = useState(false);
  const [savedChats, setSavedChats] = useState<ChatInfo[]>([]);
  const [showActionButtons, setShowActionButtons] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  console.log(setHideTimeout)

  // Voice mode states
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isFullScreenVoiceMode, setIsFullScreenVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  // const [isPlaying, setIsPlaying] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // const audioChunksRef = useRef<Blob[]>([]);

  console.log(setAudioSrc)
  console.log(setTranscribedText)

  const [showDesktopOnlyModal, setShowDesktopOnlyModal] = useState(false);
  console.log(showDesktopOnlyModal)
  const isMobile = useIsMobile();

  // Add state for timeline hover
  const [timelineHovered, setTimelineHovered] = useState(false);
  console.log(timelineHovered)
  // Track currently selected message in timeline
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

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
      // Remove the code that tries to read the response stream directly
      // This was causing the "ReadableStreamDefaultReader constructor" error

      // Only reset input if NOT using the deepseek model to prevent refresh loop
      console.log(response);
      if (selectedModel !== "deepseek/deepseek-chat:free") {
        resetInputField();
      }
      setError(null);
      setIsStreaming(true); // Start streaming state
      // Don't set isLoading to false here - keep it on during streaming

      if (isRegenerating) {
        setIsRegenerating(false);
        setRegenForMessageId(null);
      }
    },
    onFinish: () => {
      // Only set loading and streaming to false when completely finished
      setIsLoading(false);
      setIsStreaming(false);
    },
    onError: (error) => {
      console.error("Error:", error);
      setIsLoading(false);
      setIsStreaming(false);

      // Check for credit limit errors in the error message
      if (
        error.message?.includes("Rate limit exceeded") ||
        error.message?.includes("credits") ||
        error.message?.includes("429") ||
        error.message?.includes("CREDIT_LIMIT_EXCEEDED") ||
        (error.cause &&
          typeof error.cause === 'object' &&
          'message' in error.cause &&
          typeof (error.cause as { message: string }).message === 'string' &&
          ((error.cause as { message: string }).message.includes("Rate limit exceeded") ||
            (error.cause as { message: string }).message.includes("credits")))
      ) {
        setShowCreditLimitError(true);
        setError("You've reached your free usage limit for AI models today. Please try a different model or try again tomorrow.");
      }
      // Check for stream-related errors
      else if (
        error.message?.includes("ReadableStreamDefaultReader") ||
        error.message?.includes("locked to a reader") ||
        error.message?.includes("stream")
      ) {
        setError("A connection error occurred. Please try again.");
      }
      // Check for connection-related errors
      else if (
        error.message?.includes("Failed to connect") ||
        error.message?.includes("getaddrinfo ENOTFOUND") ||
        error.message?.includes("network") ||
        error.message?.includes("Network Error") ||
        error.message?.includes("Cannot connect") ||
        error.message?.includes("Failed after") ||
        (error.cause && typeof error.cause === 'object' && 'message' in error.cause &&
          typeof (error.cause as { message: string }).message === 'string' &&
          (error.cause as { message: string }).message.includes("fetch failed")) ||
        !navigator.onLine
      ) {
        setError("Internet connection lost. Please check your network and try again.");
      } else {
        // Default fallback for unexpected errors - show high demand message
        setError("we are facing a high demand pls try again");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save current chat messages when they change
  useEffect(() => {
    if (chatId && messages.length > 0) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));

      // Update chat metadata
      updateChatMetadata(chatId, messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, chatId]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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



  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };



  // Submit message and track the response for TTS - simplified to avoid state loops
  const submitMessage = async (messageText: string) => {
    try {
      // First update loading state
      setIsLoading(true);

      // Create a synthetic event
      const syntheticEvent = {
        preventDefault: () => { },
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

  // Add this function to toggle the full screen voice mode
  const toggleFullScreenVoiceMode = () => {
    setIsFullScreenVoiceMode(prev => !prev);
    if (!isVoiceMode) {
      setIsVoiceMode(true);
    }
  };

  // Handle exiting the voice mode
  const exitVoiceMode = () => {
    setIsVoiceMode(false);
    setIsFullScreenVoiceMode(false);
    if (isRecording) {
      stopRecording();
    }
  };

  // Function for handling voice commands
  const handleVoiceCommand = async (text: string) => {
    try {
      // Set the full query in the input field
      await submitMessage(text);

      // Exit voice mode after submitting
      setIsFullScreenVoiceMode(false);
      setIsVoiceMode(false);

      return Promise.resolve();
    } catch (error) {
      console.error('Error processing voice command:', error);
      setError('Failed to process your request. Please try again.');
      return Promise.reject(error);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (chatId && messages.length > 0) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));

      // Update chat metadata
      updateChatMetadata(chatId, messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, chatId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Replace the existing scroll effect with the following:
  useEffect(() => {
    if (!skipAutoScroll && !isStreaming) {
      scrollToBottom();
    }
  }, [messages, isLoading, skipAutoScroll, isStreaming]);

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

  // const extractLinks = (content: string): string[] => {
  //   const linkRegex = /https?:\/\/[^\s]+/g;
  //   return content.match(linkRegex) ?? [];
  // };

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
  const [attachments, setAttachments] = useState<File[]>([]);
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setAttachments(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendPdfAttachment = async () => {
    if (attachments.length === 0) return;
    // read files as base64
    const dataUrls = await Promise.all(attachments.map(file => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    })));
    // send to OpenRouter directly
    const messagesPayload = [
      { type: 'text', text: input },
      ...dataUrls.map((dataUrl, idx) => ({
        type: 'file',
        file: { filename: attachments[idx].name, file_data: dataUrl.split(',')[1] }
      }))
    ];
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: '{{MODEL}}',
        messages: [{ role: 'user', content: messagesPayload }],
        plugins: [{ id: 'file-parser', pdf: { engine: '{{ENGINE}}' } }],
      }),
    });
    const data = await res.json();
    console.log('PDF response:', data);
    // reset file field
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    if (attachments.length > 0) {
      await sendPdfAttachment();
      return;
    }
    setSkipAutoScroll(false);
    setIsLoading(true);
    setIsStreaming(false); // Reset streaming state at beginning
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
      setIsStreaming(false); // Make sure to also reset streaming state on error
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

  // const handleSearchWeb = async () => {
  //   if (!lastQuery.trim()) {
  //     console.error("No query to search");
  //     return;
  //   }
  //   console.log(handleSearchWeb)

  //   setIsWebSearchLoading(true);
  //   try {
  //     const response = await fetch("/api/search", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         messages: [{ role: "user", content: lastQuery }],
  //       }),
  //     });

  //     if (!response.ok) {
  //       throw new Error(`Search failed: HTTP status ${response.status}`);
  //     }

  //     const data = await response.json();
  //     const links = extractLinks(data.results);
  //     setSearchLinks(links);
  //     const cleanedResults = data.results.replace(/https?:\/\/[^\s]+/g, "");
  //     setSearchResults(cleanedResults);
  //   } catch (error) {
  //     console.error("Error during web search:", error);
  //     setSearchResults("Failed to fetch search results. Please try again.");
  //   } finally {
  //     setIsWebSearchLoading(false);
  //   }
  // };

  // Add credit limit error state
  const [showCreditLimitError, setShowCreditLimitError] = useState(false);

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
  // const regenerateQuery = (query: string, messageId: string) => {
  //   setRegenForMessageId(messageId);
  //   setIsRegenerating(true);
  //   setSkipAutoScroll(true);
  //   setIsLoading(true);
  //   setError(null);
  //   setInput(query);


  //   setTimeout(() => {
  //     const syntheticEvent = {
  //       preventDefault: () => { },
  //     } as React.FormEvent;
  //     handleSubmit(syntheticEvent);
  //   }, 10);
  // };



  useEffect(() => {

    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Add this function to render model tags with appropriate styling
  // previousUserMessage

  // Create a reusable error display component function
  const ErrorDisplay = ({ message, icon, actionText, onAction }: {
    message: string;
    icon?: React.ReactNode;
    actionText?: string;
    onAction?: () => void;
  }) => (
    <div className="mt-2 text-center p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
      <div className="flex items-center justify-center gap-2">
        {icon || (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )}
        <span className="text-base text-red-600 dark:text-red-400 font-medium">
          {message}
        </span>
      </div>

      {actionText && onAction && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          <button
            onClick={onAction}
            className="underline hover:text-red-700 dark:hover:text-red-300"
          >
            {actionText}
          </button>
        </div>
      )}
    </div>
  );

  // Add state for filtering chats
  const [searchQuery] = useState("");

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) {
      return savedChats;
    }

    const query = searchQuery.toLowerCase();
    return savedChats.filter(
      (chat) =>
        chat.title.toLowerCase().includes(query) ||
        (chat.firstMessage && chat.firstMessage.toLowerCase().includes(query))
    );
  }, [savedChats, searchQuery]);

  // Add a ref to store message elements by their ID
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Function to scroll to a specific message
  const scrollToMessage = useCallback((messageId: string) => {
    if (messageRefs.current[messageId]) {
      messageRefs.current[messageId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      setCurrentMessageId(messageId);
    }
  }, [setCurrentMessageId]);

  // Add QuestionMessage component for user questions
  function QuestionMessage({ content }: { content: string }) {
    const lines = content.split('\n');
    const isLong = lines.length > 3;
    const [expanded, setExpanded] = useState(false);
    const displayed = isLong && !expanded ? lines.slice(0, 3).join('\n') : content;
    
    return (
      <div className={`inline-block max-w-[95vw] bg-[#1d1c1c] sm:max-w-[85vw] rounded-t-3xl rounded-br-3xl dark:text-[#c8c861] text-[#0c0c0c] overflow-hidden md:max-w-3xl ${expanded ? 'text-2xl' : 'text-5xl md:text-5xl'} tracking-tight p-3 md:p-4 font-mono`}>
        <MarkdownRenderer content={displayed} />
        {isLong && !expanded && (
          <span 
            onClick={() => setExpanded(true)} 
            className="cursor-pointer text-blue-500 ml-2 text-base"
          >
            more..
          </span>
        )}
      </div>
    );
  }

  return (
    <main className={`${showWhiteboard ? "pr-[33.333%]" : ""} transition-all duration-300 text-base`}>
      {/* Optimized Top Navigation Bar with Mobile Dropdown */}
      <TopNav
        createNewChat={createNewChat}
        openChatSwitcher={() => setShowChatSwitcher(true)}
        clearHistory={handleClearHistory}
        exportPDF={() => createPDF(messages)}
        toggleWhiteboard={toggleWhiteboard}
        toggleDesignMode={toggleDesignMode}
        isDesignMode={isDesignMode}
        saveEdits={saveEditedMessages}
        showNav={showNav}
        isMobile={isMobile}
        showMobileMenu={showMobileMenu}
        toggleMobileMenu={toggleMobileMenu}
        onMenuAction={handleMenuAction}
        selectedModel={selectedModel}
        showModelSelector={showModelSelector}
        onModelChange={handleModelChange}
        modelOptions={MODEL_OPTIONS}
      />

      {/* Add Timeline component */}
      {messages.length > 0 && (
        <Timeline
          messages={messages}
          onHoverChange={setTimelineHovered}
          isMobile={isMobile}
          onMessageClick={scrollToMessage}
          currentMessageId={currentMessageId}
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
              <ArrowLeftRight className="w-4 h-4" />
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
      <audio ref={audioRef} src={audioSrc || undefined} className="hidden" />

      {messages.length === 0 ? (
        <div className="flex flex-col  items-center justify-center h-[calc(100vh-56px)] px-4">
          <h1 className="text-[2.5em] sm:text-[3.5em] dark:text-[#f7eee3ca] text-[#1a1a1a] mb-4 font-['Instrument_Serif'] text-center leading-tight">What do you want to learn?</h1>




          <div className="w-full max-w-2xl px-4">
            <form onSubmit={onSubmit} className="w-full">
              <div className="group flex-col  w-full items-center   rounded-2xl dark:bg-[#ffffff] bg-[#f0f0f0] p-1  shadow-md transition-all duration-300">
                <div className="flex   relative flex-1  items-center overflow-hidden dark:bg-[#bebdbdde] bg-[#ffffff] rounded-xl py-3 sm:py-5 transition-all duration-300">
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
                      className="max-h-[120px] min-h-[60px] flex-1 resize-none bg-transparent font-serif px-4 py-2 text-base md:text-lg dark:text-[#0c0c0c] text-[#0c0c0c] outline-none transition-all duration-200 dark:placeholder:text-[#0c0c0c] placeholder:text-[#606060] "
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





                    {/* Submit button */}
                    {!isVoiceMode && (

                      <div className="flex items-center justify-center p-1 bg-[#E0E0E0] rounded-full box-shadow: 76px 2px 58px -95px rgba(224,224,224,1) inset;">
                        <button
                          type="submit"
                          className="p-3 rounded-full bg-[#0D0C0C] hover:bg-[#323232] text-[#f7eee3] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed drop-shadow-xl-[#888787] box-shadow: 76px 2px 58px -95px rgba(136, 135, 135, 1) inset"
                        // disabled={isLoading || isWebSearchLoading}
                        >
                          {(isLoading || isStreaming ) ? (
                            <div className="relative h-5 w-5 flex items-center justify-center">
                              {/* Agentic workflow animation */}
                              <svg width="20" height="20" viewBox="0 0 50 50" className="animate-spin-slow">
                                {/* Base circular path */}
                                <circle cx="25" cy="25" r="20" stroke="#f7eee3" strokeWidth="1" fill="none" opacity="0.3" />

                                {/* Nodes representing processing steps */}
                                <circle cx="25" cy="5" r="3" fill="#f7eee3" className="animate-pulse-node" style={{ animationDelay: "0ms" }} />
                                <circle cx="41" cy="15" r="3" fill="#f7eee3" className="animate-pulse-node" style={{ animationDelay: "300ms" }} />
                                <circle cx="41" cy="35" r="3" fill="#f7eee3" className="animate-pulse-node" style={{ animationDelay: "600ms" }} />
                                <circle cx="25" cy="45" r="3" fill="#f7eee3" className="animate-pulse-node" style={{ animationDelay: "900ms" }} />
                                <circle cx="9" cy="35" r="3" fill="#f7eee3" className="animate-pulse-node" style={{ animationDelay: "1200ms" }} />
                                <circle cx="9" cy="15" r="3" fill="#f7eee3" className="animate-pulse-node" style={{ animationDelay: "1500ms" }} />

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
                <div className="flex gap-1 items-center  ">


                  <div className="relative m-1">
                    <button
                      type="button"
                      onClick={() => setShowModelSelector(!showModelSelector)}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-base sm:px-4 sm:py-2 sm:text-lg rounded-lg dark:bg-[#252525] bg-[#e2e2e2] dark:text-[#f7eee3] text-[#0c0c0c] transition-colors dark:hover:bg-[#323232] hover:bg-[#d0d0d0]">
                      <div className="flex items-center gap-2">
                        {MODEL_OPTIONS.find(model => model.id === selectedModel)?.icon}
                        <span className="max-w-[100px] sm:max-w-none truncate">{getModelDisplayName(selectedModel)}</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {showModelSelector && (
                      <ModelSelector
                        modelOptions={MODEL_OPTIONS}
                        selectedModel={selectedModel}
                        showModelSelector={showModelSelector}
                        onModelChange={handleModelChange}
                      />
                    )}
                  </div>
                  <button type="button" className="flex m-1 dark:bg-[#252525] bg-[#e2e2e2] dark:hover:bg-[#323232] hover:bg-[#d0d0d0] dark:text-[#f7eee3] text-[#0c0c0c] p-2 rounded-lg transition-colors duration-200" onClick={toggleWhiteboard}>
                    <Paintbrush className="h-6 w-6" />
                  </button>
                  <input
                    type="file"
                    accept="application/pdf"
                    id="pdf-upload-bottom"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="pdf-upload-bottom"
                    className="flex m-1 dark:bg-[#252525] bg-[#e2e2e2] dark:hover:bg-[#323232] hover:bg-[#d0d0d0] dark:text-[#f7eee3] text-[#0c0c0c] p-2 rounded-lg transition-colors duration-200 cursor-pointer"
                  >
                    <Paperclip className="h-6 w-6" />
                  </label>
                  <button type="button" className="flex m-1 dark:bg-[#252525] bg-[#e2e2e2] dark:hover:bg-[#323232] hover:bg-[#d0d0d0] dark:text-[#f7eee3] text-[#0c0c0c] p-2 rounded-lg transition-colors duration-200" title="sphere Voice Assistant" aria-label={isVoiceMode ? "Exit Voice Mode" : "Activate sphere Voice Assistant"} onClick={toggleFullScreenVoiceMode} >
                    {isRecording ? (
                      <MicOff className="h-6 w-6" />
                    ) : (
                      <Mic className="h-6 w-6" />
                    )}
                  </button>


                </div>

              </div>
              {input.length > 0 && !isVoiceMode && (
                <div className="mt-1.5 flex items-center justify-between px-1 text-xs dark:text-[#f7eee380] text-[#555555]">
                  <span>Press Enter to send, Shift + Enter for new line</span>
                  <span>{input.length}</span>
                </div>
              )}
              {error && (
                <ErrorDisplay
                  message={error}
                  icon={error.includes("Internet connection") ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a 1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  ) : undefined}
                  actionText={error.includes("Internet connection") ? "Reload page" : undefined}
                  onAction={error.includes("Internet connection") ? () => window.location.reload() : undefined}
                />
              )}
            </form>
          </div>
        </div>
      ) : (
        <div className={`relative mx-auto flex h-[calc(100vh-56px)] w-full p-2  flex-col ${showWhiteboard ? "md:w-full" : "md:w-2/3 w-full"} transition-all duration-300`}>

          <div className="flex-1 space-y-4 overflow-y-auto  px-3 sm:px-3 py-4 pb-24 md:space-y-6 md:px-0 md:py-6">
            {messages.map((m, index) => {
              const previousUserMessage =
                m.role === "assistant" &&
                  index > 0 &&
                  messages[index - 1]?.role === "user"
                  ? messages[index - 1]?.content ?? ""
                  : "";
                  console.log(previousUserMessage)
              return m.role === "user" ? (
                <div
                  key={m.id}
                  ref={(el) => { messageRefs.current[m.id] = el; }} // Fix ref callback to not return a value
                  className="animate-slide-in group relative p-2 mx-2 flex flex-col md:mx-0"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {isDesignMode ? (
                    <div className="max-w-[100vw] sm:max-w-[85vw] overflow-hidden md:max-w-xl rounded-t-3xl rounded-br-3xl dark:bg-[#1F2937] bg-[#e0e6f0] dark:text-[#E8E8E6] text-[#0c0c0c] p-4">
                      <textarea
                        value={editedMessages[m.id] || m.content}
                        onChange={(e) => handleMessageEdit(m.id, e.target.value)}
                        placeholder="Edit message..."
                        className="w-full min-h-[60px] bg-transparent resize-vertical p-2 focus:outline-none text-[1.4em] sm:text-[1.6em] md:text-[2.2em]"
                      />
                    </div>
                  ) : ( //user question
                    <div className="flex justify-start ">
                      <QuestionMessage content={m.content} />
                    </div>
                  )}
                  <div className="mt-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => copyMessage(m.content, m.id)} className="p-1 rounded-full dark:text-white text-[#0c0c0c] hover:bg-[#646464] hover:text-[#48AAFF]">
                      {copiedMessageId === m.id ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={m.id}
                  className="animate-slide-in group relative flex flex-col md:mx-0"
                >
                  {isDesignMode ? (
                    <div className="relative max-w-[95vw] sm:max-w-[90vw] overflow-hidden md:max-w-2xl rounded-xl p-4 dark:bg-[#1a1a1a] bg-[#f8f8f8]">
                      <textarea
                        value={editedMessages[m.id] || m.content}
                        onChange={(e) => handleMessageEdit(m.id, e.target.value)}
                        placeholder="Edit response..."
                        className="w-full min-h-[120px] bg-transparent resize-vertical p-2 focus:outline-none text-[1.1rem] sm:text-[1.2rem] md:text-[1.4rem]"
                      />
                    </div>
                  ) : (
                    // Regular message display (non-design mode)
                    // the actual area in whivh the response is displayed
                    <div className="relative max-w-[95vw] sm:max-w-[90vw] overflow-x-hidden rounded-xl p-1 text-[1.1rem] sm:text-[1.2rem] tracking-tight dark:text-[#E8E8E6] text-[#0c0c0c] md:max-w-2xl md:p-2 md:text-[1.4rem] ">

                      
                      <div className="flex-col w-full gap-4 justify-start cursor-pointer ">
                         
                        

                        <div className="flex w-full gap-4 border-t-[1px] border-[#484848] justify-start cursor-pointer " >
                        <div className="flex items-center     sm:p-3 dark:text-white text-[#0c0c0c] transition-colors   ">
                          <button className="flex gap-2 text-base md:text-lg">
                            <BookOpenText className="h-8 w-8" />
                            <p>Response</p>
                          </button>

                        </div>
                        <div className="flex  gap-2  items-center     sm:p-3 dark:text-[#6d6c6c] text-[#0c0c0c] transition-colors  dark:hover:text-[#e0e0e0] " onClick={() => handleSearchYouTube(lastQuery)}>
                          <button  className="text-base md:text-lg">
                            <Video className="h-8 w-8" />
                          </button>
                          <p>Video</p>
                        </div>
                        </div>




                      </div>

                      <div className="w-full h-3/2 bg-[#a5a4a4]"></div>



                      <div className="flex animate-fade-in transition-opacity duration-500">
                        <MarkdownRenderer content={m.content} />
                      </div>

                      {/* Message action buttons... */}
                      <div className="mb-14 flex flex-wrap gap-1 sm:gap-2">
                        {/* <div className="flex items-center justify-center rounded-full  p-2 sm:p-3 dark:text-white text-[#0c0c0c] transition-colors dark:hover:bg-[#294A6D] hover:bg-[#e0e0e0] dark:hover:text-[#48AAFF] hover:text-[#48AAFF]">
                          <button onClick={handleSearchWeb} className="text-base md:text-lg">
                            <Globe className="h-5 w-5" />
                          </button>
                        </div> */}
                        {/* <div className="flex items-center justify-center rounded-full  p-2 sm:p-3 dark:text-white text-[#0c0c0c] transition-colors dark:hover:bg-[#294A6D] hover:bg-[#e0e0e0] dark:hover:text-[#48AAFF] hover:text-[#48AAFF]">
                          <button onClick={() => handleSearchYouTube(lastQuery)} className="text-base md:text-lg">
                            <Play className="h-5 w-5" />
                          </button>
                        </div> */}
                        {/* {previousUserMessage && (
                          <div className="flex items-center justify-center rounded-full  p-2 sm:p-3 dark:text-white text-[#0c0c0c] transition-colors dark:hover:bg-[#294A6D] hover:bg-[#e0e0e0] dark:hover:text-[#48AAFF] hover:text-[#48AAFF]">
                            <button
                              onClick={() => regenerateQuery(previousUserMessage, m.id)}
                              className="text-base md:text-lg"
                            // disabled={regenForMessageId === m.id || isLoading}
                            >
                              {regenForMessageId === m.id ? " " : <RotateCw className="h-5 w-5" />}
                            </button>
                          </div>
                        )} */}
                        <div className="flex items-center justify-center rounded-full   p-2 sm:p-3 dark:text-white text-[#0c0c0c] transition-colors dark:hover:bg-[#294A6D] hover:bg-[#e0e0e0] dark:hover:text-[#48AAFF] hover:text-[#48AAFF]">
                          <button onClick={() => copyMessage(m.content, m.id)} className="text-base md:text-lg">
                            {copiedMessageId === m.id ? (
                              <Check className="h-5 w-5 text-[#48AAFF]" />
                            ) : (
                              <Clipboard className="h-5 w-5 dark:text-[#f7eee3] text-[#0c0c0c] hover:text-[#48AAFF]" />
                            )}
                          </button>
                        </div>
                        <div className="w-full h-[1px] bg-[#484848]"></div>

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
                    {/* <div className="absolute right-0 z-10 mt-2 hidden w-max max-w-[300px] rounded-lg border border-[#f7eee332] dark:bg-[#1a1a1a] bg-[#ffffff] p-2 shadow-xl group-hover:block">
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
                    </div> */}
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
        className={`flex sticky bottom-0 z-10 flex-row  gap-3 items-center justify-center ${showWhiteboard ? "right-[33.333%]" : "right-0"} left-0
          bg-gradient-to-b from-[var(--background)] via-[var(--background)/80] to-transparent
          p-2 sm:p-4 transition-all duration-300`}
      >
            {isDesignMode ? (
              // floating Toolbar for design mode
              <div className={`mx-auto w-auto ${showWhiteboard ? "max-w-full px-2 sm:px-4" : "max-w-2xl px-2 sm:px-3 md:px-0"}`}>

              </div>
            ) : (
              // ...existing input field form...
              <form
                onSubmit={onSubmit}
                className={`mx-auto w-full ${showWhiteboard ? "max-w-full px-2 sm:px-4" : "max-w-2xl px-2 sm:px-3 md:px-0"}`}
              >
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow flex items-center space-x-2">
                        <Paperclip className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        <span className="truncate text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                        <button type="button" onClick={() => removeAttachment(idx)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">X</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="group flex-col  w-full items-center   border border-[#383838] rounded-2xl dark:bg-[#ffffff] bg-[#f0f0f0] p-1  shadow-md transition-all duration-300">
                  <div className="flex relative flex-1   items-center overflow-hidden dark:bg-[#bebdbdde] bg-[#ffffff] rounded-xl py-3 sm:py-5 transition-all duration-300">
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
                        className="max-h-[120px] min-h-[60px] flex-1 resize-none bg-transparent px-4 py-2 text-base md:text-lg dark:text-[#0c0c0c] text-[#0c0c0c] outline-none transition-all duration-200 dark:placeholder:text-[#0c0c0c] placeholder:text-[#606060] font-serif"
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



                      {/* Canvas button */}


                      {/* Submit button */}
                      {!isVoiceMode && (

                        <div className="flex items-center justify-center p-1 bg-[#E0E0E0] rounded-full box-shadow: 76px 2px 58px -95px rgba(224,224,224,1) inset;">
                          <button
                            type="submit"
                            className="p-3 rounded-full bg-[#0D0C0C] hover:bg-[#323232] text-[#f7eee3] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed drop-shadow-xl-[#888787] box-shadow: 76px 2px 58px -95px rgba(136, 135, 135, 1) inset"
                          // disabled={isLoading || isWebSearchLoading}
                          >
                            {(isLoading || isStreaming ) ? (
                              <div className="relative h-6 w-6 flex items-center justify-center">
                                {/* Agentic workflow animation */}
                                <svg width="24" height="24" viewBox="0 0 50 50" className="animate-spin-slow">
                                  {/* Base circular path with gradient */}
                                  <defs>
                                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" style={{ stopColor: "#f7eee3", stopOpacity: 0.2 }} />
                                      <stop offset="100%" style={{ stopColor: "#f7eee3", stopOpacity: 0.8 }} />
                                    </linearGradient>
                                  </defs>
                                  <circle cx="25" cy="25" r="22" stroke="url(#grad)" strokeWidth="1.5" fill="none" />

                                  {/* Enhanced nodes with subtle glow */}
                                  <g className="nodes">
                                    <circle cx="25" cy="5" r="3.5" fill="#f7eee3" className="animate-pulse-node" style={{ animationDelay: "0ms", filter: "drop-shadow(0 0 2px #f7eee3)" }} />
                                    <circle cx="41" cy="15" r="3.5" fill="#f7eee3" className="animate-pulse-node" style={{ animationDelay: "300ms", filter: "drop-shadow(0 0 2px #f7eee3)" }} />
                                    <circle cx="41" cy="35" r="3.5" fill="#f7eee3" className="animate-pulse-node" style={{ animationDelay: "600ms", filter: "drop-shadow(0 0 2px #f7eee3)" }} />
                                    <circle cx="25" cy="45" r="3.5" fill="#f7eee3" className="animate-pulse-node" style={{ animationDelay: "900ms", filter: "drop-shadow(0 0 2px #f7eee3)" }} />
                                    <circle cx="9" cy="35" r="3.5" fill="#f7eee3" className="animate-pulse-node" style={{ animationDelay: "1200ms", filter: "drop-shadow(0 0 2px #f7eee3)" }} />
                                    <circle cx="9" cy="15" r="3.5" fill="#f7eee3" className="animate-pulse-node" style={{ animationDelay: "1500ms", filter: "drop-shadow(0 0 2px #f7eee3)" }} />
                                  </g>

                                  {/* Smoother flowing path with gradient */}
                                  <path
                                    d="M25,5 L41,15 L41,35 L25,45 L9,35 L9,15 Z"
                                    stroke="url(#grad)"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeDasharray="120"
                                    strokeDashoffset="120"
                                    className="animate-dash-flow"
                                  />

                                  {/* Enhanced center node with subtle rotation */}
                                  <circle cx="25" cy="25" r="5" fill="#48AAFF" className="animate-pulse-agent" style={{ filter: "drop-shadow(0 0 4px #48AAFF)" }}>
                                    <animateTransform
                                      attributeName="transform"
                                      type="rotate"
                                      from="0 25 25"
                                      to="360 25 25"
                                      dur="4s"
                                      repeatCount="indefinite"
                                    />
                                  </circle>
                                </svg>

                                {/* Enhanced center dot with gradient */}
                                <div className="absolute w-1.5 h-1.5 bg-gradient-to-r from-white to-[#48AAFF] rounded-full animate-ping-slow"></div>
                              </div>
                            ) : <ArrowUp className="h-4 w-4" />}
                          </button>
                        </div>

                      )}
                    </div>

                  </div>
                  <div className="flex gap-1 items-center ">


                    <div className="relative m-1">
                      <button
                        type="button"
                        onClick={() => setShowModelSelector(!showModelSelector)}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 text-base sm:px-4 sm:py-2 sm:text-lg rounded-lg  dark:bg-[#252525] bg-[#e2e2e2] dark:text-[#f7eee3] text-[#0c0c0c] transition-colors dark:hover:bg-[#323232] hover:bg-[#d0d0d0] border border-transparent hover:border-gray-300 dark:hover:border-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {MODEL_OPTIONS.find(m => m.id === selectedModel)?.icon || "✨"}
                          </span>
                          <span className="max-w-[100px] sm:max-w-none truncate">{getModelDisplayName(selectedModel)}</span>
                        </div>
                        <div className="flex gap-1 ml-1">
                          {/* {renderModelTags(MODEL_OPTIONS.find(m => m.id === selectedModel)?.tags || [])} */}
                        </div>
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </button>
                      {showModelSelector && (
                        <ModelSelector
                          modelOptions={MODEL_OPTIONS}
                          selectedModel={selectedModel}
                          showModelSelector={showModelSelector}
                          onModelChange={handleModelChange}
                        />
                      )}
                    </div>
                    <button type="button" className="flex m-1 dark:bg-[#252525] bg-[#e2e2e2] dark:hover:bg-[#323232] hover:bg-[#d0d0d0] dark:text-[#f7eee3] text-[#0c0c0c] p-2 rounded-lg transition-colors duration-200" onClick={toggleWhiteboard}>
                      <Paintbrush className="h-6 w-6" />
                    </button>
                    <input
                      type="file"
                      accept="application/pdf"
                      id="pdf-upload-bottom"
                      multiple
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="pdf-upload-bottom"
                      className="flex m-1 dark:bg-[#252525] bg-[#e2e2e2] dark:hover:bg-[#323232] hover:bg-[#d0d0d0] dark:text-[#f7eee3] text-[#0c0c0c] p-2 rounded-lg transition-colors duration-200 cursor-pointer"
                    >
                      <Paperclip className="h-6 w-6" />
                    </label>
                    <button type="button" className="flex m-1 dark:bg-[#252525] bg-[#e2e2e2] dark:hover:bg-[#323232] hover:bg-[#d0d0d0] dark:text-[#f7eee3] text-[#0c0c0c] p-2 rounded-lg transition-colors duration-200" title="sphere Voice Assistant" aria-label={isVoiceMode ? "Exit Voice Mode" : "Activate sphere Voice Assistant"} onClick={toggleFullScreenVoiceMode} >
                      {isRecording ? (
                        <MicOff className="h-6 w-6" />
                      ) : (
                        <Mic className="h-6 w-6" />
                      )}
                    </button>
                  </div>

                </div>

                {input.length > 0 && !isVoiceMode && (
                  <div className="mt-1.5 flex items-center justify-between px-1 text-xs dark:text-[#f7eee380] text-[#555555]">
                    <span>Press Enter to send, Shift + Enter for new line</span>
                    <span>{input.length}</span>
                  </div>
                )}

                {error && (
                  <ErrorDisplay
                    message={error}
                    icon={error.includes("Internet connection") ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a 1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    ) : undefined}
                    actionText={error.includes("Internet connection") ? "Reload page" : undefined}
                    onAction={error.includes("Internet connection") ? () => window.location.reload() : undefined}
                  />
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
          <div className="relative w-full max-w-lg rounded-3xl bg-[#E9E9E9] p-0 shadow-xl dark:bg-[#E9E9E9]">
            {/* Close button */}
            <button
              onClick={() => setShowChatSwitcher(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-gray-600 hover:bg-black/20 transition-all"
              aria-label="Close chat switcher"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Today section */}
            <div className="p-6">
              <h2 className="mb-6 text-xl font-semibold text-gray-500">Today</h2>

              <div className="space-y-4 max-h-60 overflow-y-auto">
                {filteredChats
                  .filter(chat => {
                    const chatDate = new Date(chat.updatedAt);
                    const today = new Date();
                    return chatDate.toDateString() === today.toDateString();
                  })
                  .map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        switchToChat(chat.id);
                        setShowChatSwitcher(false);
                      }}
                      className={`w-full flex items-start text-left py-2 px-3 rounded-xl transition-colors 
                        ${chatId === chat.id
                          ? 'bg-white dark:bg-white shadow-sm'
                          : 'hover:bg-white/50 dark:hover:bg-white/50'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-black truncate">{chat.title}</h3>
                        {chat.firstMessage && (
                          <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                            {chat.firstMessage}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}

                {filteredChats.filter(chat => {
                  const chatDate = new Date(chat.updatedAt);
                  const today = new Date();
                  return chatDate.toDateString() === today.toDateString();
                }).length === 0 && (
                    <div className="py-6 text-center text-gray-500">
                      No chats from today
                    </div>
                  )}
              </div>
            </div>

            {/* History section */}
            <div className="border-t border-gray-300 p-6 relative">
              <h2 className="text-xl font-medium text-black mb-6">History</h2>

              <div className="space-y-4 max-h-60 overflow-y-auto">
                {filteredChats
                  .filter(chat => {
                    const chatDate = new Date(chat.updatedAt);
                    const today = new Date();
                    return chatDate.toDateString() !== today.toDateString();
                  })
                  .sort((a, b) => b.updatedAt - a.updatedAt) // Sort by increasing date (oldest to newest)
                  .map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        switchToChat(chat.id);
                        setShowChatSwitcher(false);
                      }}
                      className={`w-full flex items-start text-left py-2 px-3 rounded-xl transition-colors 
                        ${chatId === chat.id
                          ? 'bg-white dark:bg-white shadow-sm'
                          : 'hover:bg-white/50 dark:hover:bg-white/50'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-black truncate">{chat.title}</h3>
                        {chat.firstMessage && (
                          <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                            {chat.firstMessage}
                          </p>
                        )}
                        <div className="mt-1 text-xs text-gray-400">
                          {new Date(chat.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))}

                {filteredChats.filter(chat => {
                  const chatDate = new Date(chat.updatedAt);
                  const today = new Date();
                  return chatDate.toDateString() !== today.toDateString();
                }).length === 0 && (
                    <div className="py-6 text-center text-gray-500">
                      No older chats
                    </div>
                  )}
              </div>

              {/* Enhanced New chat button with inner shadows and dynamic effects */}
              <Button
                onClick={() => {
                  createNewChat();
                  setShowChatSwitcher(false);
                }}
                variant="primary"
                size="icon"
                isRounded={true}
                className="absolute bottom-6 right-6 h-14 w-14"
                aria-label="New Chat"
                leftIcon={<Plus className="h-6 w-6 stroke-[2.5px]" />}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Jarvis Voice Mode UI */}
      {isFullScreenVoiceMode && (
        <VoiceMode
          onSubmit={handleVoiceCommand}
          onExit={exitVoiceMode}
          lastResponse={messages.length > 0 ?
            messages[messages.length - 1].role === 'assistant' ?
              messages[messages.length - 1].content :
              undefined
            : undefined}
        />
      )}

      {/* Add this right after the existing error notification */}
      {showCreditLimitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-lg bg-white dark:bg-[#1a1a1a] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white text-black">Credit Limit Reached</h2>
              <button
                onClick={() => setShowCreditLimitError(false)}
                className="rounded-full p-1 dark:text-gray-400 text-gray-500 hover:dark:bg-gray-800 hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6 text-gray-800 dark:text-gray-200">
              <p className="mb-3">You&apos;ve reached your free usage limit for the selected AI model today.</p>
              <p>Please try one of these options:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Switch to a different AI model</li>
                <li>Try again tomorrow when your limits reset</li>
              </ul>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setShowCreditLimitError(false);
                  setShowModelSelector(true);
                }}
                className="flex items-center justify-center w-full gap-2 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                Switch Model
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

