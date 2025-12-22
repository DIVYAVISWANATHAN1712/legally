import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Menu, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage, Message } from '@/components/ChatMessage';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { DocumentUpload } from '@/components/DocumentUpload';
import { cn } from '@/lib/utils';
import { streamChat, ChatMessage as ApiMessage } from '@/lib/chatApi';
import { useToast } from '@/hooks/use-toast';
import { getRAGContext } from '@/lib/ragService';
import {
  Conversation,
  createConversation,
  getConversations,
  getMessages,
  addMessage,
  deleteConversation,
  updateConversationTitle,
  generateConversationTitle,
} from '@/lib/conversationApi';

interface ChatInterfaceProps {
  onBack: () => void;
}

export const ChatInterface = ({ onBack }: ChatInterfaceProps) => {
  const { t, language } = useLanguage();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [currentDocumentName, setCurrentDocumentName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    const convs = await getConversations(user.id);
    setConversations(convs);
  };

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  const loadMessages = async (conversationId: string) => {
    const msgs = await getMessages(conversationId);
    setMessages(
      msgs.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
      }))
    );
  };

  const handleNewConversation = async () => {
    setCurrentConversationId(null);
    setCurrentDocumentId(null);
    setCurrentDocumentName(null);
    setMessages([]);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = async (id: string) => {
    const success = await deleteConversation(id);
    if (success) {
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      await loadConversations();
      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been removed.',
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onBack();
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping || !user) return;

    const userContent = input.trim();
    setInput('');
    setIsTyping(true);

    let conversationId = currentConversationId;

    // Create new conversation if needed
    if (!conversationId) {
      const newConv = await createConversation(user.id, 'New Conversation', language);
      if (!newConv) {
        toast({
          title: 'Error',
          description: 'Failed to create conversation',
          variant: 'destructive',
        });
        setIsTyping(false);
        return;
      }
      conversationId = newConv.id;
      setCurrentConversationId(conversationId);
    }

    // Add user message to state
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Save user message to database
    await addMessage(conversationId, 'user', userContent);

    // Update conversation title if first message
    if (messages.length === 0) {
      const title = generateConversationTitle(userContent);
      await updateConversationTitle(conversationId, title);
      await loadConversations();
    }

    // Prepare API messages
    const apiMessages: ApiMessage[] = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Get RAG context if we have a document
    let ragContext = '';
    if (currentDocumentId && user) {
      try {
        ragContext = await getRAGContext(userContent, user.id, currentDocumentId, 5);
        console.log('RAG context retrieved:', ragContext ? 'yes' : 'no');
      } catch (error) {
        console.warn('Failed to get RAG context:', error);
      }
    }

    let assistantContent = '';
    const assistantId = (Date.now() + 1).toString();

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
      ragContext: ragContext || undefined,
      documentName: currentDocumentName || undefined,
      onDelta: (delta) => {
        assistantContent += delta;
        updateAssistantMessage(assistantContent);
      },
      onDone: async () => {
        setIsTyping(false);
        // Save assistant message to database
        if (assistantContent && conversationId) {
          await addMessage(conversationId, 'assistant', assistantContent);
        }
      },
      onError: (error) => {
        setIsTyping(false);
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
      },
    });
  };

  const handleDocumentAnalysis = async (analysis: string, fileName: string, documentId?: string) => {
    if (!user) return;

    let conversationId = currentConversationId;

    // Create new conversation for document
    if (!conversationId) {
      const newConv = await createConversation(user.id, `Document: ${fileName}`, language);
      if (!newConv) return;
      conversationId = newConv.id;
      setCurrentConversationId(conversationId);
      await loadConversations();
    }

    // Set document context for RAG
    if (documentId) {
      setCurrentDocumentId(documentId);
      setCurrentDocumentName(fileName);
    }

    // Add analysis as assistant message
    const analysisMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: analysis,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, analysisMessage]);
    await addMessage(conversationId, 'assistant', analysis);
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

  const showWelcome = messages.length === 0 && !currentConversationId;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onSignOut={handleSignOut}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground hover:text-foreground md:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground hidden md:flex"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full gradient-navy flex items-center justify-center">
                <Scale className="w-4 h-4 text-gold" />
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
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-2xl gradient-gold shadow-gold flex items-center justify-center mx-auto mb-4">
                <Scale className="w-8 h-8 text-navy-dark" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                {t.welcomeMessage}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Ask me anything about Indian law, or upload a legal document for analysis.
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                {t.suggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full border border-border/50 transition-all hover:border-gold/30 hover:shadow-soft"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

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
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50 bg-card/50 backdrop-blur-md">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <DocumentUpload
              onAnalysisComplete={handleDocumentAnalysis}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.placeholder}
                rows={1}
                disabled={isTyping || isUploading}
                className={cn(
                  'w-full resize-none rounded-2xl border border-border bg-background px-4 py-3',
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
              disabled={!input.trim() || isTyping || isUploading}
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
    </div>
  );
};
