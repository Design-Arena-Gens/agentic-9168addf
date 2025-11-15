"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AvatarCanvas,
  BackgroundSetting,
  CameraAngle,
  EmotionState,
} from "@/components/AvatarCanvas";
import { ControlPanel } from "@/components/ControlPanel";
import { MediaControls } from "@/components/MediaControls";
import { ExportPanel } from "@/components/ExportPanel";
import { PresetAvatar, presetAvatars } from "@/utils/avatarPresets";
import { useAudioEngine } from "@/hooks/useAudioEngine";

const defaultPreset = presetAvatars[0];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(defaultPreset.id);
  const [avatarSource, setAvatarSource] = useState<string | null>(defaultPreset.src);
  const [background, setBackground] = useState<BackgroundSetting>({
    type: "preset",
    value: defaultPreset.background,
  });
  const [emotions, setEmotions] = useState<EmotionState>({
    happy: 52,
    sad: 12,
    angry: 10,
    surprised: 24,
    neutral: 48,
  });
  const [headNod, setHeadNod] = useState(6);
  const [eyeDirection, setEyeDirection] = useState({ x: 0, y: 0 });
  const [handGesture, setHandGesture] = useState(35);
  const [microMotion, setMicroMotion] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>("front");

  const {
    audioLevel,
    isPlaying,
    duration,
    currentTime,
    error,
    sourceMeta,
    loadAudioFile,
    loadVideoFile,
    generateSpeech,
    togglePlay,
    stop,
    seek,
    captureStream,
    release,
    clearError,
  } = useAudioEngine();

  useEffect(() => {
    let animationFrame: number;
    let lastUpdate = performance.now();
    const animate = (timestamp: number) => {
      const delta = timestamp - lastUpdate;
      if (delta > 32) {
        setMicroMotion((prev) => prev + delta * 0.005);
        lastUpdate = timestamp;
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const dynamicHead = useMemo(() => {
    return headNod + Math.sin(microMotion / 18) * (8 + audioLevel * 12);
  }, [audioLevel, headNod, microMotion]);

  const dynamicHandEnergy = useMemo(() => {
    return handGesture + Math.sin(microMotion / 11) * 20 + audioLevel * 50;
  }, [audioLevel, handGesture, microMotion]);

  const dynamicEyeDirection = useMemo(() => {
    const jitterX = Math.sin(microMotion / 17) * 0.15 * (0.4 + audioLevel);
    const jitterY = Math.cos(microMotion / 21) * 0.12 * (0.4 + audioLevel);
    return {
      x: Math.max(-1, Math.min(1, eyeDirection.x + jitterX)),
      y: Math.max(-1, Math.min(1, eyeDirection.y + jitterY)),
    };
  }, [audioLevel, eyeDirection, microMotion]);

  const isSpeaking = useMemo(() => {
    return isPlaying || audioLevel > 0.05;
  }, [audioLevel, isPlaying]);

  const handleEmotionChange = (key: keyof EmotionState, value: number) => {
    setEmotions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePresetSelect = (preset: PresetAvatar) => {
    setSelectedPresetId(preset.id);
    setAvatarSource(preset.src);
    setBackground({ type: "preset", value: preset.background });
  };

  const handleAudioUpload = async (file: File) => {
    try {
      await loadAudioFile(file);
      setLocalError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load audio file";
      setLocalError(message);
    }
  };

  const handleVideoUpload = async (file: File) => {
    try {
      await loadVideoFile(file);
      setLocalError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load video file";
      setLocalError(message);
    }
  };

  const handleGenerateSpeech = async (text: string) => {
    try {
      await generateSpeech(text);
      setLocalError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to synthesise speech";
      setLocalError(message);
    }
  };

  const handleRandomizePose = () => {
    setHeadNod(Math.round((Math.random() - 0.5) * 40));
    setHandGesture(Math.random() * 100);
    setEyeDirection({
      x: (Math.random() - 0.5) * 1.4,
      y: (Math.random() - 0.5) * 1.4,
    });
    setEmotions({
      happy: Math.random() * 100,
      sad: Math.random() * 60,
      angry: Math.random() * 70,
      surprised: Math.random() * 80,
      neutral: 50 + Math.random() * 30,
    });
    const angles: CameraAngle[] = ["front", "threeQuarterLeft", "threeQuarterRight", "closeUp", "wide"];
    setCameraAngle(angles[Math.floor(Math.random() * angles.length)]);
    if (Math.random() > 0.5) {
      const randomPreset = presetAvatars[Math.floor(Math.random() * presetAvatars.length)];
      setBackground({ type: "preset", value: randomPreset.background });
    }
  };

  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[#04050b] text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 md:px-12 md:py-10">
        <header className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.6em] text-indigo-300/80">
            Agentic Studio
          </span>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            AI Lip Sync Avatar Lab
          </h1>
          <p className="max-w-3xl text-sm text-zinc-400 md:text-base">
            Upload a face or pick a preset, generate or upload voice, and watch the avatar perform
            with expressive lip-sync, emotion-aware gestures, and cinematic scene controls. Export a
            1080p clip ready for sharing.
          </p>
        </header>

        {localError && (
          <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            <div className="flex items-center justify-between">
              <span>{localError}</span>
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  clearError();
                }}
                className="rounded-full border border-rose-400/40 px-3 py-1 text-xs uppercase tracking-[0.2em]"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,360px),1fr] xl:grid-cols-[minmax(0,400px),1fr]">
          <ControlPanel
            selectedPresetId={selectedPresetId}
            avatarSource={avatarSource}
            onSelectPreset={handlePresetSelect}
            onUploadAvatar={(value) => {
              setAvatarSource(value);
              setSelectedPresetId(null);
            }}
            emotions={emotions}
            onEmotionChange={handleEmotionChange}
            headNod={headNod}
            onHeadNodChange={setHeadNod}
            eyeDirection={eyeDirection}
            onEyeDirectionChange={setEyeDirection}
            handGesture={handGesture}
            onHandGestureChange={setHandGesture}
            cameraAngle={cameraAngle}
            onCameraAngleChange={setCameraAngle}
            background={background}
            onBackgroundChange={setBackground}
            onRandomizePose={handleRandomizePose}
          />

          <div className="flex flex-col gap-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-zinc-950/70 p-4 backdrop-blur-xl">
              <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/0">
                <div className="aspect-[4/5] w-full">
                  <AvatarCanvas
                    canvasRef={canvasRef}
                    avatarSource={avatarSource ?? undefined}
                    audioLevel={audioLevel}
                    headNod={dynamicHead}
                    eyeDirection={dynamicEyeDirection}
                    handGesture={dynamicHandEnergy}
                    emotions={emotions}
                    background={background}
                    cameraAngle={cameraAngle}
                    isSpeaking={isSpeaking}
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-4 py-3 text-xs text-white/70">
                  <span>Realtime Preview</span>
                  <span>{sourceMeta ? sourceMeta.label : "No audio source"}</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-zinc-400 md:text-sm">
                <Stat label="Mouth energy" value={Math.round(audioLevel * 100)} />
                <Stat label="Emotion blend" value={emotionBlend(emotions)} />
                <Stat label="Camera angle" value={cameraAngleLabel(cameraAngle)} />
              </div>
            </div>

            <MediaControls
              audioLevel={audioLevel}
              isPlaying={isPlaying}
              duration={duration}
              currentTime={currentTime}
              onTogglePlay={togglePlay}
              onStop={stop}
              onSeek={seek}
              onUploadAudio={handleAudioUpload}
              onUploadVideo={handleVideoUpload}
              onGenerateSpeech={handleGenerateSpeech}
              sourceMeta={sourceMeta}
              error={null}
              onDismissError={() => setLocalError(null)}
              onRelease={release}
            />

            <ExportPanel canvasRef={canvasRef} captureAudioStream={captureStream} />
          </div>
        </div>
      </main>
    </div>
  );
}

function emotionBlend(emotions: EmotionState) {
  const sorted = Object.entries(emotions).sort((a, b) => b[1] - a[1]);
  const labelMap: Record<keyof EmotionState, string> = {
    happy: "Happy",
    sad: "Sad",
    angry: "Angry",
    surprised: "Surprised",
    neutral: "Calm",
  };
  const [key, value] = sorted[0] as [keyof EmotionState, number];
  return `${labelMap[key]} • ${Math.round(value)}`;
}

function cameraAngleLabel(angle: CameraAngle) {
  switch (angle) {
    case "threeQuarterLeft":
      return "3/4 Left";
    case "threeQuarterRight":
      return "3/4 Right";
    case "closeUp":
      return "Close Up";
    case "wide":
      return "Wide";
    default:
      return "Front";
  }
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
      <div className="text-[0.6rem] uppercase tracking-[0.4em] text-zinc-500">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
