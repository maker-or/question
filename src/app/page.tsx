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
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
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

const components: TLUiComponents = {};

// -------------------------------------------------------------------------
// MarkdownRenderer Component
// -------------------------------------------------------------------------
interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Sanitize and format markdown code blocks before rendering.
  let sanitizedContent = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });

  // Ensure proper spacing for lists and headings
  sanitizedContent = sanitizedContent

    .replace(/\n(#{1,6}\s)/g, "\n\n$1")
    .replace(/\n([*-]\s)/g, "\n\n$1")
    .replace(/\n(\d+\.\s)/g, "\n\n$1")
    .replace(/(\n\s*\n)/g, "$1\n");


  sanitizedContent = sanitizedContent.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const codeContent = code.trim();
    let formatted = codeContent;
    try {
      if (lang === "js" || lang === "javascript" || lang === "jsx" || lang === "ts" || lang === "typescript" || lang === "tsx") {
        formatted = prettier.format(codeContent, {
          parser: "babel",
          plugins: [parserBabel],
          printWidth: 80
        });
      }
    } catch (error) {
      console.error("Error formatting code block:", error);
    }
    return "```" + lang + "\n" + formatted.trim() + "\n```";
  });

  // Better handling for math expressions - preserve LaTeX syntax
  sanitizedContent = sanitizedContent
    // Convert display math to a form that won't be affected by other replacements
    .replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      // Preserve newlines in display math
      return `\n\n$$${math}$$\n\n`;
    })
   
    .replace(/\\\(/g, "$") 
    .replace(/\\\)/g, "$")
    .replace(/\\vec\{([^}]*)\}/g, "\\vec{$1}")
    .replace(/\\sum_\{([^}]*)\}\^\{([^}]*)\}/g, "\\sum_{$1}^{$2}")
    .replace(/\$([^$\n]+?)\$/g, (match) => {
      return match.replace(/\s+/g, ' ');
    });

  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm, 
          [remarkMath, { 
            singleDollarTextMath: true,   
            doubleBacktickMathDisplay: false  
          }],
          // [remarkFootnotes, { inlineNotes: true }]
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
          code({node, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            
            const { ref, ...restProps } = props as any;
            return   match ? (
              <SyntaxHighlighter
                style={vscDarkPlus as any}
                language={match[1]}
                PreTag="div"
                {...restProps}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          img({src, alt, ...props}) {
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
          table({children}) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="border-collapse w-full border border-gray-700">
                  {children}
                </table>
              </div>
            );
          },
          th({children}) {
            return <th className="border border-gray-700 bg-gray-800 px-4 py-2 text-left">{children}</th>;
          },
          td({children}) {
            return <td className="border border-gray-700 px-4 py-2">{children}</td>;
          },
          blockquote({children}) {
            return <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4">{children}</blockquote>;
          },
          h1({children}) {
            return <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>;
          },
          h2({children}) {
            return <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>;
          },
          h3({children}) {
            return <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>;
          },
          ul({children}) {
            return <ul className="list-disc list-inside pl-4 my-4 space-y-2">{children}</ul>;
          },
          ol({children}) {
            return <ol className="list-decimal list-inside pl-4 my-4 space-y-2">{children}</ol>;
          }
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
};


interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string; 
}

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
  { id: "google/gemini-2.0-pro-exp-02-05:free", name: "Gemini 2.0 Pro" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
  { id: "deepseek/deepseek-chat:free", name: "DeepSeek v3" }
];


export default function Page() {
  const [isLoading, setIsLoading] = useState(false);
  const [isWebSearchLoading, setIsWebSearchLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(
    "google/gemini-2.0-pro-exp-02-05:free"
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


  useEffect(() => {
    const storedChatId = localStorage.getItem("chatId");
    if (storedChatId) {
      setChatId(storedChatId);
    }
    const storedMessages = localStorage.getItem("chatMessages");
    if (storedMessages) {
      try {
        setInitialMessages(JSON.parse(storedMessages));
      } catch (err) {
        console.error("Failed to parse stored messages", err);
      }
    }
  }, []);

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
        console.log("5 4 3 2 1")
        console.log("formData", formData)

        try {
          // Send to our transcription API
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          console.log("sent to transcribe")
          if (!response.ok) {
            throw new Error(`Transcription failed: ${response.statusText}`);
          }

          const data = await response.json();
          setTranscribedText(data.text);
          setInput(data.text);

          // Automatically submit the transcribed text
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
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error playing audio response:', error);
      setError('Failed to play audio response.');
    }
  };

  // Handle voice submission with transcribed text
  const handleSubmitVoice = async (transcribedText: string) => {
    if (!transcribedText.trim()) return;

    setIsLoading(true);
    setSearchResults(null);
    setLastQuery(transcribedText);
    setError(null);

    // Add the transcribed text to the chat
    const latestMessages = await submitMessage(transcribedText);
  };

  // Submit message and track the response for TTS
  const submitMessage = async (messageText: string) => {
    // Use a custom implementation to track the last response for TTS
    const formData = {
      messages: [...messages, { role: 'user', content: messageText, id: Date.now().toString() }],
      model: selectedModel,
      voiceMode: isVoiceMode
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chat API');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body reader is null');
      }

      let responseText = '';
      const decoder = new TextDecoder();

      let firstChunk = true;
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        responseText += chunk;

        // Update the UI with the response text
        // Here we're simulating a streaming response in the UI
        if (firstChunk) {
          const newMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant' as const,
            content: responseText
          };
          // Add this message to your UI state
          // (In a real implementation, you'd use your chat state management)
          firstChunk = false;
        } else {
          // Update the last message with the new content
          // (In a real implementation, you'd update your chat state)
        }

        fullResponse = responseText;
      }

      // After getting the full response, convert it to speech if in voice mode
      if (isVoiceMode) {
        await playResponseAudio(fullResponse);
      }

      setIsLoading(false);

      // Return the updated messages
      return [...messages,
      { role: 'user', content: messageText, id: `user-${Date.now()}` },
      { role: 'assistant', content: fullResponse, id: `assistant-${Date.now()}` }
      ];

    } catch (error) {
      console.error('Error submitting message:', error);
      setIsLoading(false);
      setError('Failed to get a response. Please try again.');
      return messages;
    }
  };

  // -----------------------------------------------------------------------
  // PDF Export Function
  // -----------------------------------------------------------------------
  const createPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const lineHeight = 18;
    let y = margin;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(12);

    doc.text("SphereAI", margin, y);
    y += lineHeight * 1.5;

    const stripMarkdown = (text: string) => {
      return text
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .replace(/[#>*_`~-]/g, "")
        .replace(/\n{2,}/g, "\n")
        .trim();
    };

    messages.forEach((message) => {
      const plainText = stripMarkdown(message.content);
      const lines = doc.splitTextToSize(plainText, pageWidth - margin * 2);
      lines.forEach((line: string) => {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });
      y += lineHeight;
    });

    doc.save("chat.pdf");
  };

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
  const { messages, input, handleInputChange, handleSubmit, setInput } = useChat({
    api: "/api/chat",
    body: { model: selectedModel },
    id: chatId,
    initialMessages: initialMessages,
    onResponse: (response) => {
      setIsLoading(false);
      resetInputField();
      setError(null);
      if (isRegenerating) {
        setIsRegenerating(false);
        setRegenForMessageId(null);
      }

      // Store the model information with the response
      const lastMessageIndex = messages.length;
      if (lastMessageIndex > 0 && messages[lastMessageIndex - 1]?.role === "assistant") {
        // Since 'model' property does not exist on 'UIMessage' type, we cannot directly update the 'messages' array.
        // Instead, we can use this logic to update the attribution display logic as intended.
      }
    },
    onError: (error) => {
      console.error("Error:", error);
      setIsLoading(false);
      setError("An error occurred. Please try again.");
    },
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
  }, [messages]);

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

  const handleClearHistory = () => {
    localStorage.removeItem("chatMessages");
    localStorage.removeItem("chatId");
    window.location.reload();
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
    setTimeout(() => {
      handleSubmit({ preventDefault: () => { } } as React.FormEvent);
    }, 0);
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
      {/* Action buttons panel - now as a floating panel that stays visible */}
      {showActionButtons && (
        <div
          className="fixed bottom-16 right-1 z-20 p-3  backdrop-blur-md rounded-lg shadow-lg border border-[#f7eee332]"
        >
          <div className="flex flex-col gap-1">
            <button
              onClick={handleClearHistory}
              className="flex items-start justify-start gap-2 rounded-xl  p-3 text-white hover:bg-[#575757] w-full"
            >
              Delete Chat
            </button>
            <button
              onClick={createPDF}
              className="flex items-start justify-start gap-2 rounded-xl  p-3 text-white hover:bg-[#575757] w-full"
            >
              Export to PDF
            </button>
            <button
              onClick={() => setShowActionButtons(false)}
              className="flex items-start justify-start gap-2 rounded-xl  p-3 text-white hover:bg-[#575757] w-full mt-2"
            >
              Close Menu
            </button>
          </div>
        </div>
      )}

      {/* Toggle button - always visible */}
      <div className="fixed bottom-1 right-1 z-10">
        <button
          onClick={toggleActionButtons}
          className={`flex items-center justify-center gap-2 rounded-full ${showActionButtons ? 'bg-[#48AAFF]' : 'bg-[#151515]'} p-3 text-white hover:bg-[#48AAFF] transition-all duration-300`}
        >
          {/* <Sparkle className={showActionButtons ? 'text-white' : ''} /> */}
          <Sparkles className={showActionButtons ? 'text-white' : ''} />
        </button>
      </div>

      {/* Audio element for TTS playback */}
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
                  <div className="max-w-[85vw] text-[1.4em] tracking-tight font-serif rounded-2xl bg-[#f7eee33b] text-[#E8E8E6] overflow-hidden md:max-w-xl md:p-4 md:text-[2em] line-clamp-3">
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



