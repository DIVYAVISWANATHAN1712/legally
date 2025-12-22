import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { HeroSection } from '@/components/HeroSection';
import { ChatInterface } from '@/components/ChatInterface';

const Index = () => {
  const [showChat, setShowChat] = useState(false);

  return (
    <LanguageProvider>
      <AnimatePresence mode="wait">
        {!showChat ? (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <HeroSection onStartChat={() => setShowChat(true)} />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChatInterface onBack={() => setShowChat(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </LanguageProvider>
  );
};

export default Index;
