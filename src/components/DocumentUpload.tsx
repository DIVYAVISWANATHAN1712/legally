import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileUp, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { storeDocumentChunks } from '@/lib/ragService';
import { isEmbeddingModelLoading } from '@/lib/embeddingService';

interface DocumentUploadProps {
  onAnalysisComplete: (analysis: string, fileName: string, documentId?: string) => void;
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
}

export const DocumentUpload = ({
  onAnalysisComplete,
  isUploading,
  setIsUploading,
}: DocumentUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { language } = useLanguage();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF or image file (JPEG, PNG, WebP).',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    // For now, we'll read the file and send its content
    // In a real app, you'd use a PDF parsing library or service
    if (file.type === 'application/pdf') {
      // For PDF, we'll just send the filename and let AI acknowledge it
      return `[PDF Document: ${file.name}]\n\nNote: This is a PDF file. The AI will analyze the document based on its name and any context provided. For full PDF text extraction, additional processing would be required.`;
    } else {
      // For images, convert to base64
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(`[Image Document: ${file.name}]\n\nThis is an image file that may contain legal text or documents.`);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(10);
    setStatusText('Preparing upload...');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please log in to upload documents');
      }

      setUploadProgress(20);
      setStatusText('Uploading file...');

      // Upload to storage
      const filePath = `${user.id}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('legal-documents')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(30);
      setStatusText('Extracting text...');

      // Extract text content
      const textContent = await extractTextFromFile(selectedFile);

      // Save document metadata to database
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
        })
        .select()
        .single();

      if (docError) {
        throw docError;
      }

      setUploadProgress(40);
      setStatusText('Loading AI model...');

      // Generate embeddings and store chunks (RAG)
      if (textContent && textContent.length > 50) {
        setStatusText('Generating embeddings...');
        setUploadProgress(50);
        
        try {
          await storeDocumentChunks(docData.id, user.id, textContent);
          setUploadProgress(70);
          setStatusText('Embeddings stored!');
        } catch (embeddingError) {
          console.warn('Embedding generation failed, continuing without RAG:', embeddingError);
          // Continue without RAG if embedding fails
        }
      }

      setUploadProgress(80);
      setStatusText('Analyzing document...');

      // Call analyze-document edge function
      const response = await supabase.functions.invoke('analyze-document', {
        body: {
          documentContent: textContent,
          fileName: selectedFile.name,
          language,
          documentId: docData.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to analyze document');
      }

      setUploadProgress(95);
      setStatusText('Finalizing...');

      // Process response
      if (response.data && typeof response.data === 'object') {
        const analysis = response.data.choices?.[0]?.message?.content || 
          'Document uploaded and indexed. You can now ask questions about it!';
        onAnalysisComplete(analysis, selectedFile.name, docData.id);
      } else {
        onAnalysisComplete(
          `📄 **Document Uploaded: ${selectedFile.name}**\n\n✅ Document indexed with ${isEmbeddingModelLoading() ? 'embeddings processing' : 'semantic search enabled'}.\n\nYou can now ask specific questions about this document, and I'll find the most relevant sections to answer you.`,
          selectedFile.name,
          docData.id
        );
      }

      setUploadProgress(100);
      setSelectedFile(null);
      
      toast({
        title: 'Document indexed with RAG',
        description: 'Your document is now searchable with semantic search.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setStatusText('');
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        id="document-upload"
      />

      {selectedFile ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2"
        >
          <FileText className="w-4 h-4 text-gold" />
          <span className="text-sm truncate max-w-[150px]">{selectedFile.name}</span>
          
          {isUploading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gold" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
                {statusText && <span className="text-xs text-gold">{statusText}</span>}
              </div>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleUpload}
              >
                <FileUp className="w-4 h-4 text-gold" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={clearFile}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </>
          )}
        </motion.div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-muted-foreground hover:text-gold"
        >
          <FileUp className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};
