import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';

interface ScanDropzoneProps {
  maxSizeMb: number;
  onFile: (file: File | undefined) => void;
}

export default function ScanDropzone({ maxSizeMb, onFile }: ScanDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    onFile(event.dataTransfer.files?.[0]);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFile(event.target.files?.[0]);
    event.target.value = ''; // allow re-selecting the same file
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragActive(false);
      }}
    >
      <button type="button" className="ats-drop" data-active={dragActive} onClick={() => inputRef.current?.click()}>
        <UploadCloud aria-hidden="true" className="size-6" />
        <span className="ats-drop__title">Drag and drop your resume here</span>
        <span>or browse &middot; PDF only, up to {maxSizeMb} MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        aria-label="Choose a PDF resume"
        onChange={handleChange}
      />
    </div>
  );
}
