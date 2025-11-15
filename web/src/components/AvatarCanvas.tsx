import { useEffect, useMemo, useRef } from "react";

export type CameraAngle =
  | "front"
  | "threeQuarterLeft"
  | "threeQuarterRight"
  | "closeUp"
  | "wide";

export type BackgroundSetting =
  | { type: "preset"; value: string }
  | { type: "solid"; value: string }
  | { type: "image"; value: string };

export type EmotionState = {
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  neutral: number;
};

export type AvatarCanvasProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  avatarSource?: string | null;
  audioLevel: number;
  headNod: number;
  eyeDirection: { x: number; y: number };
  handGesture: number;
  emotions: EmotionState;
  background: BackgroundSetting;
  cameraAngle: CameraAngle;
  isSpeaking: boolean;
  width?: number;
  height?: number;
};

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1080;

type LoadedImage = {
  element: HTMLImageElement;
  src: string;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function AvatarCanvas({
  canvasRef,
  avatarSource,
  audioLevel,
  headNod,
  eyeDirection,
  handGesture,
  emotions,
  background,
  cameraAngle,
  isSpeaking,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
}: AvatarCanvasProps) {
  const imageRef = useRef<LoadedImage | null>(null);
  const blinkStateRef = useRef({
    closing: false,
    openness: 1,
    target: 1,
  });

  useEffect(() => {
    if (!avatarSource) {
      imageRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = { element: img, src: avatarSource };
    };
    img.onerror = () => {
      imageRef.current = null;
    };
    img.src = avatarSource;
    return () => {
      imageRef.current = null;
    };
  }, [avatarSource]);

  const backgroundStyle = useMemo(() => {
    if (background.type === "solid") {
      return background.value;
    }
    if (background.type === "image") {
      return background.value;
    }
    return background.value;
  }, [background]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    let animationFrame: number;
    let lastBlinkTime = performance.now();
    const render = () => {
      const now = performance.now();
      const elapsed = now - lastBlinkTime;
      if (elapsed > 2800 + Math.random() * 2000) {
        blinkStateRef.current.closing = true;
        blinkStateRef.current.target = 0;
        lastBlinkTime = now;
      }

      const blinkState = blinkStateRef.current;

      if (blinkState.closing) {
        blinkState.openness -= 0.15;
        if (blinkState.openness <= 0) {
          blinkState.openness = 0;
          blinkState.closing = false;
          blinkState.target = 1;
        }
      } else if (blinkState.openness < blinkState.target) {
        blinkState.openness += 0.12;
        if (blinkState.openness >= 1) {
          blinkState.openness = 1;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground(ctx, backgroundStyle, canvas.width, canvas.height);

      const camera = computeCameraOffset(cameraAngle);
      ctx.save();
      ctx.translate(canvas.width / 2 + camera.x, canvas.height * camera.y);
      ctx.scale(camera.scale, camera.scale);

      const headRotation = headNod * 0.5 + camera.x * 0.03;
      ctx.rotate((headRotation * Math.PI) / 180);

      const currentImage = imageRef.current;
      drawAvatarBase(ctx, currentImage, emotions);
      drawFacialFeatures(ctx, audioLevel, emotions, blinkState.openness, eyeDirection, isSpeaking);
      drawHands(ctx, audioLevel, handGesture, emotions);

      ctx.restore();

      animationFrame = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrame);
  }, [
    canvasRef,
    width,
    height,
    backgroundStyle,
    audioLevel,
    headNod,
    handGesture,
    emotions,
    eyeDirection,
    cameraAngle,
    isSpeaking,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full rounded-3xl border border-white/10 bg-black/90 shadow-2xl ring-1 ring-white/10"
    />
  );
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  backgroundValue: string,
  width: number,
  height: number,
) {
  if (backgroundValue.startsWith("data:image")) {
    const img = new Image();
    img.src = backgroundValue;
    if (img.complete) {
      ctx.drawImage(img, 0, 0, width, height);
    } else {
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
    }
    return;
  }

  if (backgroundValue.startsWith("http") || backgroundValue.startsWith("/")) {
    const img = new Image();
    img.src = backgroundValue;
    if (img.complete) {
      ctx.filter = "brightness(0.75)";
      ctx.drawImage(img, 0, 0, width, height);
      ctx.filter = "none";
    } else {
      img.onload = () => {
        ctx.filter = "brightness(0.75)";
        ctx.drawImage(img, 0, 0, width, height);
        ctx.filter = "none";
      };
    }
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#040406");
  gradient.addColorStop(0.5, backgroundValue);
  gradient.addColorStop(1, "#08090c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 35; i += 1) {
    const cx = Math.random() * width;
    const cy = Math.random() * height * 0.7;
    const r = 140 + Math.random() * 220;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255,255,255,0.06)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAvatarBase(
  ctx: CanvasRenderingContext2D,
  loadedImage: LoadedImage | null,
  emotions: EmotionState,
) {
  const baseWidth = 420;
  const baseHeight = 520;
  ctx.save();
  ctx.translate(0, 40);
  ctx.fillStyle = "rgba(18,20,35,0.65)";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 60;
  ctx.beginPath();
  ctx.ellipse(0, 320, 200, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(-baseWidth / 2, -baseHeight / 2);
  if (loadedImage) {
    ctx.drawImage(loadedImage.element, 0, 0, baseWidth, baseHeight);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, baseHeight);
    gradient.addColorStop(0, "rgba(55,66,120,0.95)");
    gradient.addColorStop(1, "rgba(22,24,52,0.95)");
    ctx.fillStyle = gradient;
    roundRect(ctx, 0, 0, baseWidth, baseHeight, 160);
    ctx.fill();
  }

  const glowStrength = emotions.happy / 120 + emotions.surprised / 140;
  ctx.fillStyle = `rgba(93,156,255,${0.15 + glowStrength})`;
  ctx.shadowBlur = 120;
  ctx.shadowColor = `rgba(93,156,255,${0.35 + glowStrength})`;
  roundRect(ctx, 18, 18, baseWidth - 36, baseHeight - 36, 150);
  ctx.strokeStyle = `rgba(112,210,255,${0.35 + glowStrength})`;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

function drawFacialFeatures(
  ctx: CanvasRenderingContext2D,
  audioLevel: number,
  emotions: EmotionState,
  blinkOpenness: number,
  eyeDirection: { x: number; y: number },
  isSpeaking: boolean,
) {
  const mouthOpenBase = audioLevel * (0.65 + emotions.surprised / 180);
  const mouthOpen = clamp01(mouthOpenBase + (emotions.happy - emotions.sad) / 400);
  const eyebrowOffset = (emotions.angry - emotions.happy) / 150;
  const smileCurve = 0.4 + emotions.happy / 120 - emotions.sad / 180;

  ctx.save();
  ctx.translate(0, -40);

  // Eyes
  const eyeY = -40 + eyeDirection.y * 4;
  const eyeXOffset = 100;
  const eyeWidth = 110;
  const eyeHeight = 52 * (0.3 + 0.7 * blinkOpenness);
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.beginPath();
  ctx.ellipse(-eyeXOffset + eyeDirection.x * 12, eyeY, eyeWidth, eyeHeight, 0, 0, Math.PI * 2);
  ctx.ellipse(eyeXOffset + eyeDirection.x * 12, eyeY, eyeWidth, eyeHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111627";
  const pupilRadius = 26;
  ctx.beginPath();
  ctx.arc(-eyeXOffset + eyeDirection.x * 16, eyeY, pupilRadius, 0, Math.PI * 2);
  ctx.arc(eyeXOffset + eyeDirection.x * 16, eyeY, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(-eyeXOffset + eyeDirection.x * 8 - 8, eyeY - 10, 10, 0, Math.PI * 2);
  ctx.arc(eyeXOffset + eyeDirection.x * 8 - 8, eyeY - 10, 10, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = `rgba(82,132,255,${0.6 + emotions.angry / 200})`;
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-160, eyeY - 70 + eyebrowOffset * 10);
  ctx.lineTo(-60, eyeY - 70 - eyebrowOffset * 6);
  ctx.moveTo(60, eyeY - 70 - eyebrowOffset * 6);
  ctx.lineTo(160, eyeY - 70 + eyebrowOffset * 10);
  ctx.stroke();

  // Mouth
  ctx.translate(0, 160);
  const mouthWidth = 220;
  const mouthHeight = 42 + mouthOpen * 60;
  ctx.fillStyle = "rgba(20,20,60,0.95)";
  ctx.beginPath();
  ctx.moveTo(-mouthWidth / 2, 0);
  ctx.quadraticCurveTo(0, mouthHeight * smileCurve, mouthWidth / 2, 0);
  ctx.quadraticCurveTo(0, mouthHeight * -0.3, -mouthWidth / 2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `rgba(244,72,109,${0.45 + mouthOpen * 0.4})`;
  ctx.beginPath();
  ctx.moveTo(-mouthWidth / 2 + 24, 8);
  ctx.quadraticCurveTo(0, mouthHeight * 0.36, mouthWidth / 2 - 24, 8);
  ctx.quadraticCurveTo(0, mouthHeight * -0.25, -mouthWidth / 2 + 24, 8);
  ctx.closePath();
  ctx.fill();

  if (!isSpeaking) {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(-mouthWidth / 2, -6, mouthWidth, 12);
  }

  ctx.restore();
}

function drawHands(
  ctx: CanvasRenderingContext2D,
  audioLevel: number,
  handGesture: number,
  emotions: EmotionState,
) {
  const amplitude = audioLevel * 14 + emotions.happy / 16;
  const leftRaise = Math.sin(handGesture + amplitude) * 40;
  const rightRaise = Math.sin(handGesture + amplitude * 1.1) * 40;

  const drawArm = (direction: number, raise: number) => {
    ctx.save();
    ctx.translate(direction * 200, 150);
    ctx.rotate(((direction * 20 + raise) * Math.PI) / 180);
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, "rgba(78,105,190,0.85)");
    gradient.addColorStop(1, "rgba(32,42,88,0.85)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(26, 0);
    ctx.quadraticCurveTo(46, 90, 18, 180);
    ctx.quadraticCurveTo(-18, 180, -46, 90);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(235,236,255,0.82)";
    ctx.beginPath();
    ctx.ellipse(0, 180, 38, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawArm(-1, leftRaise);
  drawArm(1, rightRaise);
}

function computeCameraOffset(angle: CameraAngle) {
  switch (angle) {
    case "threeQuarterLeft":
      return { x: -30, y: 0.52, scale: 1.02 };
    case "threeQuarterRight":
      return { x: 30, y: 0.52, scale: 1.02 };
    case "closeUp":
      return { x: 0, y: 0.45, scale: 1.18 };
    case "wide":
      return { x: 0, y: 0.58, scale: 0.92 };
    default:
      return { x: 0, y: 0.52, scale: 1 };
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
