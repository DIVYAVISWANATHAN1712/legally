import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/translations';
import { Globe } from 'lucide-react';

export const LanguageToggle = () => {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'ta', label: 'த', flag: '🇮🇳' },
    { code: 'hi', label: 'हि', flag: '🇮🇳' },
  ];

  return (
    <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 backdrop-blur-sm border border-border/50">
      <Globe className="w-4 h-4 text-muted-foreground ml-2" />
      {languages.map((lang) => (
        <motion.button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`relative px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            language === lang.code
              ? 'text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          whileTap={{ scale: 0.95 }}
        >
          {language === lang.code && (
            <motion.div
              layoutId="activeLanguage"
              className="absolute inset-0 gradient-gold rounded-full"
              initial={false}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative z-10">{lang.label}</span>
        </motion.button>
      ))}
    </div>
  );
};
