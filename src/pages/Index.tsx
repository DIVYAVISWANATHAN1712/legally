import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { HeroSection } from '@/components/HeroSection';
import { ChatInterface } from '@/components/ChatInterface';
import { AuthPage } from '@/components/AuthPage';

type View = 'hero' | 'auth' | 'chat';

const IndexContent = () => {
  const [view, setView] = useState<View>('hero');
  const { user, loading } = useAuth();

  const handleStartChat = () => {
    if (user) {
      setView('chat');
    } else {
      setView('auth');
    }
  };

  const handleAuthSuccess = () => {
    setView('chat');
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {view === 'hero' && (
        <motion.div
          key="hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <HeroSection onStartChat={handleStartChat} />
        </motion.div>
      )}
      {view === 'auth' && (
        <motion.div
          key="auth"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AuthPage onBack={() => setView('hero')} onSuccess={handleAuthSuccess} />
        </motion.div>
      )}
      {view === 'chat' && (
        <motion.div
          key="chat"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChatInterface onBack={() => setView('hero')} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <IndexContent />
      </LanguageProvider>
    </AuthProvider>
  );
};

export default Index;
