"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, Loader2 } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ChatInterface() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Extract text from message parts
  const getMessageText = (
    parts: Array<{ type: string; text?: string }>
  ): string => {
    return parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-6 pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Chat with Mo</h3>
              <p className="mb-6 max-w-md text-sm text-muted-foreground">
                I&apos;m your AI CMO. Ask me to create content, plan campaigns,
                analyze performance, or brainstorm marketing ideas.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "Write a TikTok script about meal prep for UF students",
                  "Plan a back-to-school campaign for August",
                  "Create an Instagram caption for our weekly meal deal",
                  "What content should we post this week?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    className="rounded-lg border bg-card p-3 text-left text-sm transition-colors hover:bg-accent"
                    onClick={() => {
                      setInput(suggestion);
                      setTimeout(() => textareaRef.current?.focus(), 0);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" && "flex-row-reverse"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className={cn(
                    message.role === "assistant"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "assistant" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "flex max-w-[80%] flex-col gap-1",
                  message.role === "user" && "items-end"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {message.role === "assistant" ? "Mo" : "You"}
                  </span>
                  {message.role === "assistant" && (
                    <Badge variant="secondary" className="text-[10px]">
                      CMO
                    </Badge>
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-lg px-4 py-3 text-sm",
                    message.role === "assistant"
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  <div className="whitespace-pre-wrap">
                    {getMessageText(
                      message.parts as Array<{ type: string; text?: string }>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Mo is thinking...
                </span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t pt-4">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Mo anything about marketing..."
            className="min-h-[60px] max-h-[200px] resize-none"
            rows={2}
          />
          <Button
            type="button"
            size="icon"
            disabled={isLoading || !input.trim()}
            onClick={handleSend}
            className="h-[60px] w-[60px] shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Mo uses Claude Sonnet for content, Opus for strategy. Press Enter to
          send, Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
}
