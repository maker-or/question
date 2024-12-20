'use client';

import React, { useState, useRef, useEffect } from 'react';
import { type Message, useChat } from 'ai/react';
import {  Copy, Check } from 'lucide-react';

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
  const [activeBlock, setActiveBlock] = useState<'question' | 'response'>('question');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const { messages, input, handleInputChange, setMessages } = useChat({
    api: '/api/chat',
    onFinish: () => {
      setIsLoading(false);
    },
  }) as ChatHelpers;

  const [submitted, setSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    setSubmitted(true);
    setIsLoading(true);
    setActiveBlock('response');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { id: Date.now().toString(), role: 'user', content: input }],
        }),
      });

      const data = await response.json();

      if (data.content) {
        setMessages([
          ...messages,
          { id: Date.now().toString(), role: 'user', content: input },
          { id: (Date.now() + 1).toString(), role: 'assistant', content: data.content },
        ]);
      }
    } catch (error) {
      console.error('Error submitting message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[100svh] w-[100svw] overflow-hidden bg-gradient-to-br from-[#0c0c0c] to-[#1a1a1a] gap-1 p-2">
      <div 
        className={`question relative bg-[#1a1a1a] w-2/5 flex-col justify-around items-center m-2 h-full rounded-2xl overflow-auto 
        ${activeBlock === 'question' 
          ? 'border-2 border-white/80 shadow-2xl' 
          : 'border-2 border-[#f7eee37a]'} 
        transition-all duration-300 ease-in-out`}
        onClick={() => setActiveBlock('question')}
      >
        <div className="sticky top-0 bg-[#1a1a1a] z-10 p-4 flex items-center justify-between w-full">
          <h1 className="text-3xl  text-[#f7eee3] flex items-center gap-2 font-serif italic">
             Ask Anything
          </h1>
           
        </div>
        <form onSubmit={onSubmit} className="mt-4 w-full px-4 pb-4">
          <div className="relative flex-row items-center w-full">
            <textarea
              ref={textareaRef}
              placeholder="Type your message..."
              value={input}
              onChange={(e) => {
                handleInputChange(e);
                adjustTextareaHeight();
              }}
              onInput={adjustTextareaHeight}
              className="flex-grow m-1  w-full outline-none rounded-lg bg-[#f7eee3]  py-8 px-6 text-[#0c0c0c] resize-none overflow-hidden 
              "
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className=" p-3 rounded-lg bg-[#ab6532] text-[#f7eee3] w-full
              hover:bg-[#e7762b] transition-colors 
              flex items-center justify-center"
            >
              Create
            </button>
          </div>
        </form>
      </div>
      <div 
        className={`response relative bg-[#1a1a1a] w-full h-full overflow-auto m-2 rounded-2xl 
        ${activeBlock === 'response' 
          ? 'border-2 border-white/80 shadow-2xl' 
          : 'border-2 border-[#f7eee3]'} 
        transition-all duration-300 ease-in-out`}
        onClick={() => setActiveBlock('response')}
      >
        <div className="sticky top-0 bg-[#1a1a1a] z-10 p-4 flex items-center justify-between w-full">
          <h1 className="text-2xl font-bold text-[#f7eee3] flex items-center gap-2">
            Responses
          </h1>
        </div>
        <div
          className={`flex-1 overflow-y-hidden px-4 pt-16 ${
            submitted ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-500`}
        >
          {messages.map((m, index) => (
            <div
              key={m.id}
              className={`flex flex-col gap-4 mb-4 animate-slide-in group relative ${
                m.role === 'user' ? 'items-start' : 'items-start w-full'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {m.role === 'user' ? (
                <div className="flex items-start gap-4 w-full">
                  <div className="max-w-xl text-[1.8rem] text-[#f7eee386] font-serif italic tracking-tight rounded-xl p-4 
                    w-full">
                    <h1 className="whitespace-pre-wrap w-full">{m.content}</h1>
                    
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-2 w-full">
                  <div className="max-w-screen-lg tracking-tight text-[#f7eee3fd] text-[1.4rem] 
                  rounded-xl p-4 bg-[#2a2a2a] shadow-md w-full relative">
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    
                    <button 
                      onClick={() => copyMessage(m.content, m.id)}
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 
                      transition-opacity duration-300 text-[#f7eee3] hover:text-white"
                    >
                      {copiedMessageId === m.id ? (
                        <Check className="h-5 w-5 text-green-400" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-center items-center text-white py-4">
              <div className="animate-pulse">Creating questions...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>  
    </div>
  );
}