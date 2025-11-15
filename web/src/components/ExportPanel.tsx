import { useCallback, useRef, useState } from "react";

type ExportPanelProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  captureAudioStream: () => MediaStream | null;
};

type ExportStatus = "idle" | "recording" | "processing" | "complete" | "error";

export function ExportPanel({ canvasRef, captureAudioStream }: ExportPanelProps) {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [downloadReady, setDownloadReady] = useState(false);
  const [downloadSize, setDownloadSize] = useState<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const exportChunksRef = useRef<Blob[]>([]);
  const downloadUrlRef = useRef<string | null>(null);
  const lastMimeRef = useRef<string>("video/webm");

  const startRecording = useCallback(
    async (mimeType: string) => {
      if (!canvasRef.current) {
        setStatus("error");
        setMessage("Preview canvas not ready. Try again once the avatar is visible.");
        return;
      }
      if (recorderRef.current) {
        setStatus("error");
        setMessage("Recording already in progress.");
        return;
      }
      setDownloadReady(false);
      setDownloadSize(null);
      const canvasStream = canvasRef.current.captureStream(60);
      const audioStream = captureAudioStream();

      let combinedStream: MediaStream | null = null;
      if (audioStream) {
        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ]);
      } else {
        combinedStream = canvasStream;
      }
      const supportedMime = MediaRecorder.isTypeSupported(mimeType) ? mimeType : "video/webm";
      if (!MediaRecorder.isTypeSupported(supportedMime)) {
        setStatus("error");
        setMessage(`MediaRecorder does not support ${mimeType} on this browser.`);
        return;
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: supportedMime,
        videoBitsPerSecond: 5_000_000,
      });
      lastMimeRef.current = supportedMime;
      exportChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          exportChunksRef.current.push(event.data);
        }
      };
      recorder.onerror = (event) => {
        setStatus("error");
        setMessage(`Recording error: ${event.error.name}`);
        recorderRef.current?.stop();
        recorderRef.current = null;
      };
      recorder.onstop = () => {
        setStatus("processing");
        const blob = new Blob(exportChunksRef.current, { type: lastMimeRef.current });
        if (downloadUrlRef.current) {
          URL.revokeObjectURL(downloadUrlRef.current);
        }
        downloadUrlRef.current = URL.createObjectURL(blob);
        setDownloadSize(blob.size);
        setDownloadReady(true);
        setStatus("complete");
        setMessage("Rendering complete. Download ready!");
      };

      recorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
      setMessage("Recording in progress... interact with controls or audio playback.");
    },
    [canvasRef, captureAudioStream],
  );

  const stopRecording = useCallback(() => {
    if (!recorderRef.current) {
      setMessage("No active recording.");
      return;
    }
    recorderRef.current.stop();
    recorderRef.current = null;
  }, []);

  const download = useCallback(() => {
    if (!downloadUrlRef.current) {
      setMessage("No recording available yet.");
      return;
    }
    const link = document.createElement("a");
    link.href = downloadUrlRef.current;
    const extension = lastMimeRef.current.includes("mp4") ? "mp4" : "webm";
    link.download = `avatar-export-${Date.now()}.${extension}`;
    link.click();
  }, []);

  return (
    <div className="flex w-full flex-col gap-4 rounded-3xl border border-white/5 bg-zinc-950/80 p-6 backdrop-blur-xl">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Export Studio
        </h2>
        <span className="text-xs text-zinc-500">1080p ready</span>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={() => startRecording("video/webm;codecs=vp9,opus")}
          className="rounded-2xl border border-indigo-400/40 bg-indigo-500/20 px-4 py-3 text-sm font-medium text-indigo-100 transition hover:border-indigo-300/60 hover:bg-indigo-400/30"
        >
          Record WebM
        </button>
        <button
          type="button"
          onClick={() => startRecording("video/mp4;codecs=h264,aac")}
          className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-zinc-200 transition hover:border-white/20 hover:bg-white/20"
        >
          Record MP4 (experimental)
        </button>
        <button
          type="button"
          onClick={stopRecording}
          className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 transition hover:border-rose-400/60 hover:bg-rose-400/20"
        >
          Stop
        </button>
      </div>
      {downloadReady && (
        <button
          type="button"
          onClick={download}
          className="rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-400/30"
        >
          Download
        </button>
      )}
      <StatusBadge status={status} message={message} size={downloadSize} />
    </div>
  );
}

function StatusBadge({
  status,
  message,
  size,
}: {
  status: ExportStatus;
  message: string | null;
  size: number | null;
}) {
  const styles: Record<ExportStatus, string> = {
    idle: "text-zinc-400",
    recording: "text-amber-300",
    processing: "text-sky-300",
    complete: "text-emerald-300",
    error: "text-rose-300",
  };
  const labels: Record<ExportStatus, string> = {
    idle: "Idle",
    recording: "Recording",
    processing: "Encoding",
    complete: "Ready",
    error: "Error",
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
      <div className={`text-xs uppercase tracking-[0.3em] ${styles[status]}`}>{labels[status]}</div>
      {message && <p className="mt-2 text-sm text-zinc-300">{message}</p>}
      {size != null && (
        <p className="mt-2 text-xs text-zinc-500">
          Estimated size: {(size / (1024 * 1024)).toFixed(2)} MB
        </p>
      )}
    </div>
  );
}
