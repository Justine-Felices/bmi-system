import { Download, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './Button';

interface PdfPreviewModalProps {
  previewUrl: string;
  fileName: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export function PdfPreviewModal({
  previewUrl,
  fileName,
  title,
  subtitle,
  onClose,
}: PdfPreviewModalProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] relative z-10 overflow-hidden border border-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface/40">
          <div>
            <h3 className="text-lg font-bold text-text tracking-tight">{title}</h3>
            {subtitle ? (
              <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
            ) : null}
          </div>
          <Button variant="ghost" onClick={onClose} className="p-1 h-8 w-8 rounded-lg">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <iframe
          src={previewUrl}
          title={title}
          className="flex-1 w-full min-h-0 bg-white"
        />

        <div className="px-5 py-4 border-t border-border flex justify-end gap-2 shrink-0 bg-surface/40">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1.5" />
            Download PDF
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
