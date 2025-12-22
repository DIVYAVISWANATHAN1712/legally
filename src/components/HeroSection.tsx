import { motion } from 'framer-motion';
import { Scale, MessageCircle, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';

interface HeroSectionProps {
  onStartChat: () => void;
}

export const HeroSection = ({ onStartChat }: HeroSectionProps) => {
  const { t } = useLanguage();

  const features = [
    {
      icon: MessageCircle,
      title: 'Legal Guidance',
      description: 'Get answers to your legal questions',
    },
    {
      icon: FileText,
      title: 'Document Analysis',
      description: 'Upload and understand legal documents',
    },
    {
      icon: Shield,
      title: 'Know Your Rights',
      description: 'Learn about your constitutional rights',
    },
  ];

  return (
    <div className="min-h-screen gradient-hero relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 pattern-legal opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-3xl" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold"
          >
            <Scale className="w-5 h-5 text-accent-foreground" />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display font-bold text-xl text-primary-foreground"
          >
            {t.appName}
          </motion.span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <LanguageToggle />
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-12 pb-24 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          {/* Logo Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 150, delay: 0.3 }}
            className="mb-8 inline-block"
          >
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl gradient-gold shadow-gold flex items-center justify-center mx-auto animate-float">
              <Scale className="w-12 h-12 md:w-16 md:h-16 text-navy-dark" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4"
          >
            {t.appName}
            <Scale className="inline-block w-10 h-10 md:w-14 md:h-14 ml-3 text-gold" />
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-xl md:text-2xl text-primary-foreground/80 font-display mb-4"
          >
            {t.tagline}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-base md:text-lg text-primary-foreground/60 font-body mb-10"
          >
            {t.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, type: 'spring' }}
          >
            <Button
              variant="gold"
              size="xl"
              onClick={onStartChat}
              className="animate-pulse-gold"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              {t.startChat}
            </Button>
          </motion.div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 max-w-4xl mx-auto px-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + index * 0.1 }}
              className="bg-primary-foreground/5 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/10 hover:border-gold/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center mb-4 group-hover:bg-gold/30 transition-colors">
                <feature.icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="font-display font-semibold text-lg text-primary-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-primary-foreground/60 font-body">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-sm text-primary-foreground/40 font-body"
        >
          {t.poweredBy}
        </motion.p>
      </footer>
    </div>
  );
};
