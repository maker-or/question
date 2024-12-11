'use client';

import React, { useState, useRef, useEffect } from 'react';
import { type Message, useChat } from 'ai/react';
import { ArrowUpRight } from 'lucide-react';

interface ChatHelpers {
  messages: Message[];
  input: string;
  handleSubmit: (event: React.FormEvent) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isLoading: boolean;
  setMessages: (messages: Message[]) => void;
}

export default function Page() {
  const [isLoading, setIsLoading] = useState(false);
  const { messages, input, handleInputChange, setMessages } = useChat({
    api: '/api/chat', // Ensure this matches your API route
    onFinish: () => {
      setIsLoading(false);
    }
  }) as ChatHelpers;

  const [submitted, setSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    
    setSubmitted(true);
    setIsLoading(true);

    // Manually handle submission to customize API call
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [...messages, { id: Date.now().toString(), role: 'user', content: input }] 
        }),
      });

      const data = await response.json();

      if (data.content) {
        setMessages([
          ...messages, 
          { id: Date.now().toString(), role: 'user', content: input },
          { id: (Date.now() + 1).toString(), role: 'assistant', content: data.content }
        ]);
      }
    } catch (error) {
      console.error('Error submitting message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 -z-10 h-full w-full flex flex-col items-center px-5 py-12 bg-gradient-to-b from-[#180B03] to-[#000]">
      {!submitted && (
        <div className="flex flex-col items-center gap-4 mb-8">
          <h1 className="text-5xl md:text-6xl font-serif text-white animate-fade-in">
            Ask Anything
          </h1>
        </div>
      )}

      <div className="flex flex-col w-full max-w-2xl mx-auto h-full">
        <div className={`flex-1 overflow-y-auto px-4 ${submitted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
          {messages.map((m, index) => (
            <div
              key={m.id}
              className={`flex flex-col gap-4 mb-4 animate-slide-in ${m.role === 'user' ? 'items-start' : 'items-start'}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {m.role === 'user' ? (
                <div className="flex items-start gap-4 font-serif">
                  <div className="max-w-xl text-[3rem] text-[#ff5e00b3] tracking-tight rounded-xl p-4">
                    <h1 className="whitespace-pre-wrap">{m.content}</h1>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-2">
                  <div className="max-w-screen-lg tracking-tight text-[#f7eee3a7] text-[1.4rem] rounded-xl p-4">
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="text-white text-center py-4">Loading...</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={onSubmit} className="mt-4">
          <div className={`relative flex items-center border-2 border-[#f7eee3]/10 rounded-full transition-all duration-500 ${submitted ? 'mb-6' : 'mt-4'}`}>
            <input
              type="text"
              placeholder="Ask me anything..."
              value={input}
              onChange={handleInputChange}
              className="w-full pl-8 pr-16 py-4 bg-[#2C2C2C] text-[#f7eee3] ring-orange-300/30 rounded-full font-serif placeholder-gray-400 outline-none focus:ring-2 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-1 p-3 rounded-full bg-[#0a0a0a] text-[#f7eee3] hover:bg-white/10 hover:text-orange-600 transition-colors disabled:opacity-50"
            >
              <ArrowUpRight className="h-6 w-6 text-[#f7eee3] hover:text-orange-600" />
            </button>
          </div>
        </form>
      </div>
      {/* ... rest of your existing code ... */}
    </div>
  );
}