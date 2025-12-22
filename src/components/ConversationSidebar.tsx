import { motion } from 'framer-motion';
import { MessageSquare, Plus, Trash2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Conversation } from '@/lib/conversationApi';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onSignOut: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ConversationSidebar = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onSignOut,
  isOpen,
  onClose,
}: ConversationSidebarProps) => {
  const { t } = useLanguage();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'fixed left-0 top-0 h-full w-[280px] gradient-navy z-50',
          'flex flex-col border-r border-primary-foreground/10',
          'md:relative md:translate-x-0',
          !isOpen && 'md:hidden'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-primary-foreground/10">
          <Button
            variant="gold"
            size="lg"
            onClick={() => {
              onNewConversation();
              onClose();
            }}
            className="w-full justify-start gap-2"
          >
            <Plus className="w-5 h-5" />
            New Conversation
          </Button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-primary-foreground/40">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="group relative"
              >
                <button
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onClose();
                  }}
                  className={cn(
                    'w-full text-left px-3 py-3 rounded-lg transition-all',
                    'text-sm text-primary-foreground/80 hover:bg-primary-foreground/10',
                    currentConversationId === conv.id &&
                      'bg-primary-foreground/15 text-primary-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 flex-shrink-0 text-gold/70" />
                    <span className="truncate">{conv.title}</span>
                  </div>
                  <span className="text-xs text-primary-foreground/40 mt-1 block">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-destructive transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-primary-foreground/10">
          <Button
            variant="ghost"
            onClick={onSignOut}
            className="w-full justify-start gap-2 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </motion.aside>
    </>
  );
};
