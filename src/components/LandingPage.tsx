import React, { useRef, useState } from 'react';
import {
  FileCode,
  Upload,
  Loader2,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { Button } from './ui/button';

interface LandingPageProps {
  onUpload: (text: string, fileName?: string) => void;
  error?: string | null;
  hasExistingData?: boolean;
  onReturnToDashboard?: () => void;
}

export function LandingPage({ onUpload, error, hasExistingData, onReturnToDashboard }: LandingPageProps) {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('Processing attendance data...');

  const processFile = (file: File) => {
    setIsUploading(true);
    setUploadMessage(`Reading ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setTimeout(() => {
        try {
          onUpload(text, file.name);
        } catch {
          setIsUploading(false);
        }
      }, 350);
    };
    reader.onerror = () => {
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (e.target) e.target.value = '';
  };

  // Reset uploading spinner if error occurs
  React.useEffect(() => {
    if (error) {
      setIsUploading(false);
    }
  }, [error]);

  return (
    <div className="flex-1 w-full h-full bg-[var(--color-bg-app)] flex flex-col items-center justify-center p-4">
      <input
        type="file"
        ref={jsonInputRef}
        accept=".json,application/json"
        className="hidden"
        onChange={handleJsonChange}
      />

      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-[12px] font-bold text-foreground">Upload Attendance Data</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Select a JSON file to calculate overtime</p>
          </div>
          {hasExistingData && onReturnToDashboard && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReturnToDashboard}
              className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ChevronLeft size={13} />
              <span>Back</span>
            </Button>
          )}
        </div>

        {isUploading ? (
          <div className="py-10 text-center space-y-3">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto" />
            <div>
              <p className="text-[12px] font-semibold text-foreground">{uploadMessage}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Calculating policies and overtime hours...</p>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-[11px] flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileCode size={14} />
                </div>
                <span className="text-[12px] font-semibold text-foreground">JSON File</span>
              </div>
              <Button
                onClick={() => jsonInputRef.current?.click()}
                className="w-full text-[12px] h-8 flex items-center justify-center gap-1.5"
              >
                <Upload size={13} />
                <span>Choose .json file</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
