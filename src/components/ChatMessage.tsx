import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Scale, User } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  index: number;
}

export const ChatMessage = ({ message, index }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={cn(
        'flex gap-3 max-w-[85%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-secondary'
            : 'gradient-navy shadow-soft'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Scale className="w-4 h-4 text-gold" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          'rounded-2xl px-4 py-3 shadow-soft',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-card border border-border/50 rounded-tl-sm'
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap font-body">
          {message.content}
        </p>
        <span
          className={cn(
            'text-xs mt-2 block',
            isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </motion.div>
  );
};
