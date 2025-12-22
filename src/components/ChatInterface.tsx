import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChatMessage, Message } from '@/components/ChatMessage';
import { LanguageToggle } from '@/components/LanguageToggle';
import { cn } from '@/lib/utils';
import { streamChat, ChatMessage as ApiMessage } from '@/lib/chatApi';
import { useToast } from '@/hooks/use-toast';

interface ChatInterfaceProps {
  onBack: () => void;
}

export const ChatInterface = ({ onBack }: ChatInterfaceProps) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: t.welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update welcome message when language changes
  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: t.welcomeMessage,
        timestamp: new Date(),
      },
    ]);
  }, [t.welcomeMessage]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    let assistantContent = '';
    const assistantId = (Date.now() + 1).toString();

    // Convert to API format (exclude the welcome message for context)
    const apiMessages: ApiMessage[] = newMessages
      .slice(1) // Skip welcome message
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const updateAssistantMessage = (content: string) => {
      assistantContent = content;
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === 'assistant' && lastMsg.id === assistantId) {
          return prev.map((m) =>
            m.id === assistantId ? { ...m, content: assistantContent } : m
          );
        }
        return [
          ...prev,
          {
            id: assistantId,
            role: 'assistant' as const,
            content: assistantContent,
            timestamp: new Date(),
          },
        ];
      });
    };

    await streamChat({
      messages: apiMessages,
      language,
      onDelta: (delta) => {
        assistantContent += delta;
        updateAssistantMessage(assistantContent);
      },
      onDone: () => {
        setIsTyping(false);
      },
      onError: (error) => {
        setIsTyping(false);
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
        // Add error message to chat
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: 'assistant',
            content: language === 'ta' 
              ? 'மன்னிக்கவும், ஒரு பிழை ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.'
              : language === 'hi'
              ? 'क्षमा करें, एक त्रुटि हुई। कृपया पुनः प्रयास करें।'
              : 'I apologize, but an error occurred. Please try again.',
            timestamp: new Date(),
          },
        ]);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-navy flex items-center justify-center">
              <span className="text-gold font-bold text-sm">⚖️</span>
            </div>
            <div>
              <h1 className="font-display font-semibold text-foreground">
                {t.appName}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isTyping ? 'Typing...' : 'Online'}
              </p>
            </div>
          </div>
        </div>
        <LanguageToggle />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin pattern-legal">
        <AnimatePresence>
          {messages.map((message, index) => (
            <ChatMessage key={message.id} message={message} index={index} />
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <div className="w-9 h-9 rounded-full gradient-navy flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gold animate-pulse" />
            </div>
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </motion.div>
        )}

        {/* Suggestions (show only if no user messages) */}
        {messages.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <p className="text-sm text-muted-foreground mb-3">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {t.suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full border border-border/50 transition-all hover:border-gold/30 hover:shadow-soft"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border/50 bg-card/50 backdrop-blur-md">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-gold flex-shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              rows={1}
              disabled={isTyping}
              className={cn(
                'w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 pr-12',
                'text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50',
                'max-h-32 scrollbar-thin font-body',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              style={{ minHeight: '48px' }}
            />
          </div>

          <Button
            variant="gold"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="flex-shrink-0 rounded-full h-12 w-12"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3 max-w-md mx-auto">
          {t.disclaimer}
        </p>
      </div>
    </div>
  );
};
