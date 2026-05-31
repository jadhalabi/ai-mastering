"use client"

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X } from 'lucide-react';

interface UploadedFile { id: string; file: File; name: string; }

interface DropZoneProps {
  label: string;
  uploadedFile: UploadedFile | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  isDragging: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
}

function WaveformVisualization() {
  return (
    <div className="w-full h-32 flex items-center justify-center gap-1 px-4">
      {Array.from({ length: 50 }).map((_, idx) => (
        <motion.div
          key={idx}
          className="flex-1 bg-purple-500 rounded-full"
          style={{ maxWidth: '4px', minWidth: '2px' }}
          animate={{ height: [`${8 + Math.random() * 40}px`, `${8 + Math.random() * 60}px`, `${8 + Math.random() * 40}px`] }}
          transition={{ repeat: Infinity, duration: 0.8 + Math.random() * 0.4, ease: 'easeInOut', delay: idx * 0.02 }}
        />
      ))}
    </div>
  );
}

function DropZone({ label, uploadedFile, onFileSelect, onFileRemove, isDragging, onDragEnter, onDragLeave }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragLeave();
    const file = Array.from(e.dataTransfer.files).find(f =>
      ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac'].includes(f.type) ||
      ['.wav', '.mp3', '.flac'].some(ext => f.name.endsWith(ext))
    );
    if (file) onFileSelect(file);
  };

  return (
    <div className="flex-1 min-w-0">
      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.flac"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = ''; }}
        className="hidden"
      />
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        style={{ animation: isDragging ? 'pulse-border 1.5s ease-in-out infinite' : 'none' }}
        className={`relative h-full min-h-[300px] rounded-xl border-2 cursor-pointer transition-all duration-300 overflow-hidden
          ${isDragging ? 'border-purple-500 bg-purple-500/10' : uploadedFile ? 'border-purple-600/50 bg-[#0a0a12]' : 'border-purple-600/30 bg-[#0a0a12] hover:border-purple-500/50'}`}
      >
        {!uploadedFile ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <Upload className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">{label}</h3>
            <p className="text-sm text-gray-400 text-center">Drop your file here or click to browse</p>
            <p className="text-xs text-gray-500 mt-2">WAV · MP3 · FLAC</p>
          </div>
        ) : (
          <div className="flex flex-col h-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-purple-400 mb-1">{label}</h3>
                <p className="text-sm text-white truncate">{uploadedFile.name}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onFileRemove(); }}
                className="ml-3 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <WaveformVisualization />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DualFileUpload({
  onYourTrack,
  onReferenceTrack,
}: {
  onYourTrack?: (f: File) => void;
  onReferenceTrack?: (f: File) => void;
}) {
  const [yourTrack, setYourTrack] = useState<UploadedFile | null>(null);
  const [referenceTrack, setReferenceTrack] = useState<UploadedFile | null>(null);
  const [isDraggingYour, setIsDraggingYour] = useState(false);
  const [isDraggingRef, setIsDraggingRef] = useState(false);

  const makeUpload = (file: File): UploadedFile => ({ id: Math.random().toString(36).slice(2), file, name: file.name });

  return (
    <>
      <style>{`@keyframes pulse-border { 0%,100%{border-color:rgb(168 85 247/.5);box-shadow:0 0 0 0 rgb(168 85 247/.4)} 50%{border-color:rgb(168 85 247/.8);box-shadow:0 0 20px 5px rgb(168 85 247/.3)} }`}</style>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DropZone
          label="Your Track"
          uploadedFile={yourTrack}
          onFileSelect={f => { setYourTrack(makeUpload(f)); onYourTrack?.(f); }}
          onFileRemove={() => setYourTrack(null)}
          isDragging={isDraggingYour}
          onDragEnter={() => setIsDraggingYour(true)}
          onDragLeave={() => setIsDraggingYour(false)}
        />
        <DropZone
          label="Reference Track"
          uploadedFile={referenceTrack}
          onFileSelect={f => { setReferenceTrack(makeUpload(f)); onReferenceTrack?.(f); }}
          onFileRemove={() => setReferenceTrack(null)}
          isDragging={isDraggingRef}
          onDragEnter={() => setIsDraggingRef(true)}
          onDragLeave={() => setIsDraggingRef(false)}
        />
      </div>
    </>
  );
}
