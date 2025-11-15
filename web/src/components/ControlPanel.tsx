import Image from "next/image";
import { ChangeEvent } from "react";
import {
  AvatarCanvasProps,
  BackgroundSetting,
  CameraAngle,
  EmotionState,
} from "./AvatarCanvas";
import { PresetAvatar, presetAvatars } from "@/utils/avatarPresets";

type ControlPanelProps = {
  selectedPresetId: string | null;
  avatarSource: string | null;
  onSelectPreset: (preset: PresetAvatar) => void;
  onUploadAvatar: (dataUrl: string) => void;
  emotions: EmotionState;
  onEmotionChange: (name: keyof EmotionState, value: number) => void;
  headNod: number;
  onHeadNodChange: (value: number) => void;
  eyeDirection: AvatarCanvasProps["eyeDirection"];
  onEyeDirectionChange: (value: { x: number; y: number }) => void;
  handGesture: number;
  onHandGestureChange: (value: number) => void;
  cameraAngle: CameraAngle;
  onCameraAngleChange: (angle: CameraAngle) => void;
  background: BackgroundSetting;
  onBackgroundChange: (setting: BackgroundSetting) => void;
  onRandomizePose: () => void;
};

const cameraAngles: { value: CameraAngle; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "threeQuarterLeft", label: "3/4 Left" },
  { value: "threeQuarterRight", label: "3/4 Right" },
  { value: "closeUp", label: "Close Up" },
  { value: "wide", label: "Wide" },
];

const backgroundPresets: BackgroundSetting[] = [
  {
    type: "preset",
    value: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #111827 100%)",
  },
  {
    type: "preset",
    value: "linear-gradient(135deg, #3a0ca3 0%, #7209b7 45%, #4361ee 100%)",
  },
  {
    type: "preset",
    value: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
  },
  {
    type: "preset",
    value: "linear-gradient(135deg, #1a1a1a 0%, #111111 100%)",
  },
];

export function ControlPanel({
  selectedPresetId,
  avatarSource,
  onSelectPreset,
  onUploadAvatar,
  emotions,
  onEmotionChange,
  headNod,
  onHeadNodChange,
  eyeDirection,
  onEyeDirectionChange,
  handGesture,
  onHandGestureChange,
  cameraAngle,
  onCameraAngleChange,
  background,
  onBackgroundChange,
  onRandomizePose,
}: ControlPanelProps) {
  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        onUploadAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBackgroundUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        onBackgroundChange({ type: "image", value: result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex w-full flex-col gap-6 rounded-3xl border border-white/5 bg-zinc-950/70 p-6 backdrop-blur-xl">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Avatars
          </h2>
          {selectedPresetId === null && avatarSource && (
            <span className="text-xs text-zinc-500">Custom source active</span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {presetAvatars.map((preset) => {
            const active = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                type="button"
                className={`group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-left transition ${
                  active
                    ? "border-indigo-400/60 bg-indigo-500/10 shadow-lg shadow-indigo-900/30"
                    : "hover:border-white/10 hover:bg-white/10"
                }`}
                onClick={() => onSelectPreset(preset)}
              >
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-black/50">
                  <Image
                    src={preset.src}
                    alt={preset.name}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">{preset.name}</span>
                  <span className="text-xs text-zinc-400">{preset.description}</span>
                </div>
              </button>
            );
          })}
        </div>
        <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-400 hover:border-white/20 hover:text-zinc-200">
          Upload custom avatar
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <span className="text-xs text-zinc-500">
            PNG, JPG, SVG. Recommended square image with transparent background.
          </span>
        </label>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Emotions
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {(
            [
              ["happy", "Happy"],
              ["sad", "Sad"],
              ["angry", "Angry"],
              ["surprised", "Surprised"],
              ["neutral", "Calm"],
            ] as Array<[keyof EmotionState, string]>
          ).map(([key, label]) => (
            <div key={key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs uppercase text-zinc-400">
                <span>{label}</span>
                <span className="text-zinc-500">{Math.round(emotions[key])}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={emotions[key]}
                onChange={(event) => onEmotionChange(key, Number(event.target.value))}
                className="h-1 w-full appearance-none rounded-full bg-zinc-800 accent-indigo-400"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <ControlSlider
          label="Head motion"
          value={headNod}
          min={-35}
          max={35}
          onChange={onHeadNodChange}
        />
        <ControlSlider
          label="Hand energy"
          value={handGesture}
          min={0}
          max={100}
          onChange={onHandGestureChange}
        />
        <ControlSlider
          label="Eyes horizontal"
          value={eyeDirection.x}
          min={-1}
          max={1}
          step={0.01}
          onChange={(value) => onEyeDirectionChange({ x: value, y: eyeDirection.y })}
        />
        <ControlSlider
          label="Eyes vertical"
          value={eyeDirection.y}
          min={-1}
          max={1}
          step={0.01}
          onChange={(value) => onEyeDirectionChange({ x: eyeDirection.x, y: value })}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Camera & Scene
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {cameraAngles.map((angle) => {
            const active = angle.value === cameraAngle;
            return (
              <button
                type="button"
                key={angle.value}
                onClick={() => onCameraAngleChange(angle.value)}
                className={`rounded-2xl border border-white/5 px-3 py-2 text-sm transition ${
                  active ? "border-indigo-400/60 bg-indigo-500/10 text-white" : "text-zinc-400"
                }`}
              >
                {angle.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {backgroundPresets.map((preset, index) => {
            const active = background.type === "preset" && background.value === preset.value;
            return (
              <button
                type="button"
                key={index}
                onClick={() => onBackgroundChange(preset)}
                style={{ background: preset.value }}
                className={`h-20 rounded-2xl border border-white/5 transition ${
                  active ? "ring-2 ring-indigo-400/70" : "hover:border-white/20"
                }`}
              />
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">Solid color</label>
          <input
            type="color"
            value={background.type === "solid" ? background.value : "#101322"}
            onChange={(event) => onBackgroundChange({ type: "solid", value: event.target.value })}
            className="h-12 w-full cursor-pointer rounded-2xl border border-white/5 bg-white/5 p-2"
          />
        </div>
        <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-400 hover:border-white/20 hover:text-zinc-200">
          Upload backdrop
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBackgroundUpload}
          />
        </label>
      </section>

      <button
        type="button"
        onClick={onRandomizePose}
        className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/10 py-3 text-sm font-medium text-white transition hover:border-indigo-400/60 hover:bg-indigo-500/20"
      >
        Regenerate pose & micro-gestures
      </button>
    </div>
  );
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

function ControlSlider({ label, value, min, max, step = 1, onChange }: SliderProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 p-3 text-sm text-zinc-300">
      <div className="flex items-center justify-between text-xs uppercase text-zinc-500">
        <span>{label}</span>
        <span>{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full appearance-none rounded-full bg-zinc-800 accent-indigo-400"
      />
    </div>
  );
}
