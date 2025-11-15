export type PresetAvatar = {
  id: string;
  name: string;
  description: string;
  src: string;
  background: string;
};

export const presetAvatars: PresetAvatar[] = [
  {
    id: "nova",
    name: "Nova",
    description: "Futuristic presenter with subtle neon accents.",
    src: "/avatars/nova.svg",
    background:
      "radial-gradient(circle at top, rgba(88,130,193,0.35), transparent 60%), #05060a",
  },
  {
    id: "kai",
    name: "Kai",
    description: "Friendly guide with warm tones and soft lighting.",
    src: "/avatars/kai.svg",
    background:
      "radial-gradient(circle at center, rgba(255,163,67,0.25), transparent 65%), #080808",
  },
  {
    id: "luna",
    name: "Luna",
    description: "Calm storyteller themed with cool gradients.",
    src: "/avatars/luna.svg",
    background:
      "radial-gradient(circle at center, rgba(155,153,255,0.35), transparent 70%), #060612",
  },
];
