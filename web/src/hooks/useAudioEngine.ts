import { useCallback, useEffect, useRef, useState } from "react";

export type AudioSourceMeta = {
  type: "upload" | "tts" | "video";
  label: string;
  duration: number;
  url: string;
};

export function useAudioEngine() {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sourceMeta, setSourceMeta] = useState<AudioSourceMeta | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const destinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const dataBufferRef = useRef<Float32Array | null>(null);

  const ensureAudioElements = useCallback(() => {
    if (!audioElementRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";
      audio.controls = false;
      audioElementRef.current = audio;
    }
    if (!videoElementRef.current) {
      const video = document.createElement("video");
      video.preload = "auto";
      video.crossOrigin = "anonymous";
      video.controls = false;
      video.style.display = "none";
      videoElementRef.current = video;
    }
  }, []);

  const analyseLevel = useCallback(() => {
    const analyser = analyserRef.current;
    if (analyser && dataBufferRef.current) {
      analyser.getFloatTimeDomainData(dataBufferRef.current as Float32Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 0; i < dataBufferRef.current.length; i += 1) {
        const sample = dataBufferRef.current[i];
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / dataBufferRef.current.length);
      const level = Math.min(1, Math.max(0, rms * 8));
      setAudioLevel(level);
    }
    animationFrameRef.current = window.requestAnimationFrame(analyseLevel);
  }, []);

  const ensureAudioGraph = useCallback(
    async (element: HTMLMediaElement) => {
      ensureAudioElements();
      try {
        if (!audioContextRef.current) {
          const audioContextCtor = resolveAudioContext();
          audioContextRef.current = new audioContextCtor();
        }
        const ctx = audioContextRef.current;
        if (!ctx) return;

        if (ctx.state === "suspended") {
          await ctx.resume();
        }

        if (!destinationNodeRef.current) {
          destinationNodeRef.current = ctx.createMediaStreamDestination();
        }

        if (!gainNodeRef.current) {
          gainNodeRef.current = ctx.createGain();
          gainNodeRef.current.gain.value = 1;
        }

        if (!analyserRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.75;
          analyserRef.current = analyser;
          dataBufferRef.current = new Float32Array<ArrayBuffer>(
            new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT),
          );
        }

        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
        }

        sourceNodeRef.current = ctx.createMediaElementSource(element);
        sourceNodeRef.current.connect(gainNodeRef.current!);

        gainNodeRef.current!.connect(analyserRef.current!);
        gainNodeRef.current!.connect(ctx.destination);
        gainNodeRef.current!.connect(destinationNodeRef.current);

        if (!animationFrameRef.current) {
          animationFrameRef.current = window.requestAnimationFrame(analyseLevel);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Audio initialisation failed";
        setError(message);
      }
    },
    [ensureAudioElements, analyseLevel],
  );

  useEffect(() => {
    ensureAudioElements();
    const audio = audioElementRef.current!;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoaded = () => {
      const loadedDuration = audio.duration || 0;
      setDuration(loadedDuration);
      setSourceMeta((prev) =>
        prev
          ? {
              ...prev,
              duration: loadedDuration,
            }
          : prev,
      );
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
    };
  }, [ensureAudioElements]);

  const cleanupSource = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    setAudioLevel(0);
  }, []);

  const loadAudioFile = useCallback(
    async (file: File) => {
      cleanupSource();
      ensureAudioElements();
      const audio = audioElementRef.current!;
      const objectUrl = URL.createObjectURL(file);
      audio.src = objectUrl;
      audio.load();
      await ensureAudioGraph(audio);
      setSourceMeta({
        type: "upload",
        label: file.name,
        duration: 0,
        url: objectUrl,
      });
    },
    [cleanupSource, ensureAudioGraph, ensureAudioElements],
  );

  const loadVideoFile = useCallback(
    async (file: File) => {
      cleanupSource();
      ensureAudioElements();
      const video = videoElementRef.current!;
      const audio = audioElementRef.current!;
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      video.muted = true;
      video.load();

      audio.src = objectUrl;
      audio.load();

      await ensureAudioGraph(audio);
      setSourceMeta({
        type: "video",
        label: file.name,
        duration: 0,
        url: objectUrl,
      });
    },
    [cleanupSource, ensureAudioGraph, ensureAudioElements],
  );

  const togglePlay = useCallback(async () => {
    const audio = audioElementRef.current;
    if (!audio) return;
    await ensureAudioGraph(audio);
    if (audio.paused) {
      try {
        await audio.play();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Playback blocked. Interact with the page first.";
        setError(msg);
      }
    } else {
      audio.pause();
    }
  }, [ensureAudioGraph]);

  const stop = useCallback(() => {
    const audio = audioElementRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const seek = useCallback((value: number) => {
    const audio = audioElementRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
  }, []);

  const captureStream = useCallback(() => {
    if (destinationNodeRef.current) {
      return destinationNodeRef.current.stream;
    }
    return null;
  }, []);

  const generateSpeech = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setError("Enter text to generate speech.");
        return null;
      }
      cleanupSource();
      ensureAudioElements();
      const audio = audioElementRef.current!;

      const { blob, url, duration: speechDuration } = await synthesizeSpeech(trimmed);
      audio.src = url;
      audio.load();
      await ensureAudioGraph(audio);
      setSourceMeta({
        type: "tts",
        label: `AI Voice (${speechDuration.toFixed(1)}s)`,
        duration: speechDuration,
        url,
      });
      return { blob, url };
    },
    [cleanupSource, ensureAudioGraph, ensureAudioElements],
  );

  const release = useCallback(() => {
    cleanupSource();
    setSourceMeta(null);
    const audio = audioElementRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  }, [cleanupSource]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    audioLevel,
    isPlaying,
    duration,
    currentTime,
    error,
    sourceMeta,
    audioElement: audioElementRef.current,
    videoElement: videoElementRef.current,
    loadAudioFile,
    loadVideoFile,
    generateSpeech,
    togglePlay,
    stop,
    seek,
    captureStream,
    release,
    clearError,
  };

  async function synthesizeSpeech(text: string) {
    const sampleRate = 48000;
    const words = text.split(/\s+/).filter(Boolean);
    const phonemes = text.replace(/[^a-z ]/gi, "").split("");
    const baseDuration = Math.max(phonemes.length * 0.055, 0.9);
    const fullDuration = baseDuration + words.length * 0.08;
    const bufferLength = Math.floor(sampleRate * fullDuration);
    const samples = new Float32Array(bufferLength);

    let position = 0;
    for (let i = 0; i < phonemes.length; i += 1) {
      const ch = phonemes[i];
      const phonemeDuration = Math.max(0.04, ch === " " ? 0.08 : 0.06);
      const freq = 160 + ((ch.charCodeAt(0) * 13) % 120);
      const length = Math.floor(sampleRate * phonemeDuration);
      for (let n = 0; n < length && position + n < samples.length; n += 1) {
        const t = n / sampleRate;
        const envelope = Math.sin(Math.PI * (n / length));
        const vibrato = Math.sin(2 * Math.PI * 4 * t) * 5;
        const fundamental = Math.sin(2 * Math.PI * (freq + vibrato) * t);
        const harmonic = Math.sin(2 * Math.PI * (freq * 2.02 + vibrato) * t) * 0.35;
        const third = Math.sin(2 * Math.PI * (freq * 3.05 + vibrato) * t) * 0.18;
        samples[position + n] += (fundamental + harmonic + third) * envelope * 0.4;
      }
      position += length - Math.floor(sampleRate * 0.015);
    }

    const ctx = new AudioContext();
    const audioBuffer = ctx.createBuffer(1, samples.length, sampleRate);
    audioBuffer.getChannelData(0).set(samples);
    const wavBlob = await bufferToWav(audioBuffer);
    ctx.close();
    const url = URL.createObjectURL(wavBlob);
    return { blob: wavBlob, url, duration: fullDuration };
  }
}

async function bufferToWav(buffer: AudioBuffer) {
  const worker = createWavWorker();
  const channelData = buffer.getChannelData(0);
  const transferable = channelData.buffer.slice(0);
  return new Promise<Blob>((resolve, reject) => {
    worker.onmessage = (event) => {
      if (event.data.type === "result") {
        const { blob } = event.data;
        resolve(blob);
        worker.terminate();
      } else if (event.data.type === "error") {
        reject(new Error(event.data.message));
        worker.terminate();
      }
    };
    worker.postMessage(
      {
        type: "convert",
        payload: {
          sampleRate: buffer.sampleRate,
          channelData: transferable,
        },
      },
      [transferable],
    );
  });
}

function createWavWorker() {
  const blob = new Blob(
    [
      `
    self.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type !== "convert") return;
      try {
        const { sampleRate, channelData } = payload;
        const samples = new Float32Array(channelData);
        const wavBuffer = encodeWav(samples, sampleRate);
        self.postMessage({ type: "result", blob: new Blob([wavBuffer], { type: "audio/wav" }) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to encode WAV";
        self.postMessage({ type: "error", message });
      }
    };

    function encodeWav(samples, sampleRate) {
      const bytesPerSample = 2;
      const blockAlign = bytesPerSample;
      const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
      const view = new DataView(buffer);

      writeString(view, 0, "RIFF");
      view.setUint32(4, 36 + samples.length * bytesPerSample, true);
      writeString(view, 8, "WAVE");
      writeString(view, 12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * blockAlign, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bytesPerSample * 8, true);
      writeString(view, 36, "data");
      view.setUint32(40, samples.length * bytesPerSample, true);

      floatTo16BitPCM(view, 44, samples);
      return buffer;
    }

    function floatTo16BitPCM(output, offset, input) {
      for (let i = 0; i < input.length; i++) {
        let s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
    }

    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }
    `,
    ],
    { type: "application/javascript" },
  );
  const url = URL.createObjectURL(blob);
  return new Worker(url);
}

function resolveAudioContext(): typeof AudioContext {
  const extendedWindow = window as Window &
    typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  if (extendedWindow.AudioContext) return extendedWindow.AudioContext;
  if (extendedWindow.webkitAudioContext) return extendedWindow.webkitAudioContext;
  throw new Error("Web Audio API is not supported in this browser.");
}
