import { useCallback } from "react";

interface Props {
  onFileLoad: (arrayBuffer: ArrayBuffer, fileName: string) => void;
}

export function FileLoader({ onFileLoad }: Props) {
  const handleFile = useCallback(
    async (file: File) => {
      const buffer = await file.arrayBuffer();
      onFileLoad(buffer, file.name);
    },
    [onFileLoad]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".mid") || file.name.endsWith(".midi"))) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="flex flex-col items-center justify-center h-full gap-6 text-slate-300"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Piano Trainer</h1>
        <p className="text-slate-400">Drop a MIDI file here to start learning</p>
      </div>

      <div className="border-2 border-dashed border-slate-600 rounded-xl p-12 hover:border-cyan-500 transition-colors cursor-pointer">
        <label className="cursor-pointer flex flex-col items-center gap-3">
          <svg
            className="w-12 h-12 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-sm">Click to browse or drag & drop</span>
          <span className="text-xs text-slate-500">.mid / .midi files</span>
          <input
            type="file"
            accept=".mid,.midi"
            onChange={handleInputChange}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
