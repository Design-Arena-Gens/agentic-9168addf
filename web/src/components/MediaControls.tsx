import { FormEvent, useMemo, useState } from "react";
import { AudioSourceMeta } from "@/hooks/useAudioEngine";

type MediaControlsProps = {
  audioLevel: number;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  onTogglePlay: () => Promise<void> | void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onUploadAudio: (file: File) => Promise<void> | void;
  onUploadVideo: (file: File) => Promise<void> | void;
  onGenerateSpeech: (text: string) => Promise<void>;
  sourceMeta: AudioSourceMeta | null;
  error: string | null;
  onDismissError: () => void;
  onRelease: () => void;
};

const tabs = [
  { id: "tts", label: "Text to Speech" },
  { id: "audio", label: "Audio Upload" },
  { id: "video", label: "Video Lip Sync" },
] as const;

export function MediaControls({
  audioLevel,
  isPlaying,
  duration,
  currentTime,
  onTogglePlay,
  onStop,
  onSeek,
  onUploadAudio,
  onUploadVideo,
  onGenerateSpeech,
  sourceMeta,
  error,
  onDismissError,
  onRelease,
}: MediaControlsProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("tts");
  const [text, setText] = useState(
    "Hey there! Welcome to our lip sync studio. Try changing my emotions, avatar, and backdrop, then press play.",
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  const handleGenerate = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setIsGenerating(true);
    try {
      await onGenerateSpeech(text);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 rounded-3xl border border-white/5 bg-zinc-950/80 p-6 backdrop-blur-xl">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Performance Controls
          </h2>
          {sourceMeta ? (
            <span className="text-xs text-zinc-500">
              Source: <span className="text-zinc-200">{sourceMeta.label}</span>
            </span>
          ) : (
            <span className="text-xs text-zinc-500">No audio source</span>
          )}
        </div>
        <div className="h-2 rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <nav className="flex gap-3">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] transition ${
                active
                  ? "bg-indigo-500/20 text-indigo-200"
                  : "bg-white/5 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "tts" && (
        <form className="flex flex-col gap-3" onSubmit={handleGenerate}>
          <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Prompt the voice
          </label>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="h-32 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/40"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isGenerating}
              className="flex flex-1 items-center justify-center rounded-2xl border border-indigo-400/40 bg-indigo-500/20 px-4 py-3 text-sm font-medium text-indigo-100 transition hover:border-indigo-300/60 hover:bg-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? "Generating..." : "Generate Synthetic Voice"}
            </button>
            {sourceMeta && (
              <button
                type="button"
                onClick={onRelease}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-zinc-200 transition hover:border-white/20 hover:bg-white/20"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            Uses an in-browser procedural synthesiser for latency-free TTS. Ideal for quick prototyping
            without external APIs.
          </p>
        </form>
      )}

      {activeTab === "audio" && (
        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Upload narration
          </label>
          <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-zinc-400 hover:border-white/20 hover:text-zinc-200">
            Drop audio or click to browse
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUploadAudio(file);
              }}
            />
            <span className="text-xs text-zinc-500">MP3, WAV, OGG up to 30 MB.</span>
          </label>
        </div>
      )}

      {activeTab === "video" && (
        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Sync to existing video
          </label>
          <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-zinc-400 hover:border-white/20 hover:text-zinc-200">
            Upload video with voice track
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUploadVideo(file);
              }}
            />
            <span className="text-xs text-zinc-500">MP4, MOV, WebM up to 100 MB.</span>
          </label>
        </div>
      )}

      <footer className="flex flex-col gap-3">
        <LevelMeter level={audioLevel} />
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={currentTime}
          onChange={(event) => onSeek(Number(event.target.value))}
          className="h-1 w-full appearance-none rounded-full bg-zinc-800 accent-indigo-400"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onTogglePlay()}
            className="flex flex-1 items-center justify-center rounded-2xl border border-indigo-400/40 bg-indigo-500/20 px-4 py-3 text-sm font-medium text-indigo-100 transition hover:border-indigo-300/60 hover:bg-indigo-400/30"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={onStop}
            className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-zinc-200 transition hover:border-white/20 hover:bg-white/20"
          >
            Stop
          </button>
        </div>
      </footer>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={onDismissError}
              className="rounded-full border border-red-500/30 px-3 py-1 text-xs uppercase tracking-[0.2em]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LevelMeter({ level }: { level: number }) {
  return (
    <div className="relative h-4 w-full overflow-hidden rounded-full bg-white/5">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400/70 via-amber-300/70 to-rose-400/70 transition-[width]"
        style={{ width: `${Math.min(100, level * 120)}%` }}
      />
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}
