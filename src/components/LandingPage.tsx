import React, { useRef, useState } from 'react';
import { Upload, Loader2, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Notice } from './ui/notice';

interface LandingPageProps {
  onUpload: (text: string, fileName?: string) => void;
  error?: string | null;
  hasExistingData?: boolean;
  onReturnToDashboard?: () => void;
}

export function LandingPage({ onUpload, error, hasExistingData, onReturnToDashboard }: LandingPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('Processing attendance data…');

  const processFile = (file: File) => {
    setIsUploading(true);
    setUploadMessage(`Reading ${file.name}…`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      requestAnimationFrame(() => {
        try {
          onUpload(text, file.name);
        } catch {
          setIsUploading(false);
        }
      });
    };
    reader.onerror = () => {
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (e.target) e.target.value = '';
  };

  React.useEffect(() => {
    if (error) {
      setIsUploading(false);
    }
  }, [error]);

  return (
    <div className="flex-1 w-full h-full bg-background flex flex-col items-center justify-center safe-pad">
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json,.csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-title text-foreground">Upload attendance</h2>
            <p className="text-caption text-muted-foreground mt-0.5">
              JSON daily records or CSV (erp, name, designation, dates)
            </p>
          </div>
          {hasExistingData && onReturnToDashboard && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReturnToDashboard}
              className="text-caption h-8 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              <span>Back</span>
            </Button>
          )}
        </div>

        {isUploading ? (
          <div className="py-10 text-center space-y-3">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto" />
            <div>
              <p className="text-label text-foreground">{uploadMessage}</p>
              <p className="text-caption text-muted-foreground mt-0.5">
                Calculating policies and overtime hours…
              </p>
            </div>
          </div>
        ) : (
          <>
            {error && <Notice tone="error">{error}</Notice>}

            {hasExistingData && (
              <p className="text-caption text-muted-foreground">
                This replaces the data that is loaded now, including any records added from a CSV.
              </p>
            )}

            <div className="grid gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-label h-9 flex items-center justify-center gap-1.5"
              >
                <Upload size={14} />
                <span>Choose file</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
