"use client";

import { useState } from "react";

interface Props {
  headshotUrl: string | null;
  firstName: string;
  lastName: string;
  size?: number;
}

const GRADIENTS = [
  "from-violet-400 to-indigo-500",
  "from-rose-400 to-orange-400",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-amber-400 to-pink-500",
];

function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export default function Avatar({ headshotUrl, firstName, lastName, size = 96 }: Props) {
  const [failed, setFailed] = useState(false);
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const proxiedSrc = headshotUrl
    ? `/api/image-proxy?url=${encodeURIComponent(headshotUrl)}`
    : null;

  const showPlaceholder = !proxiedSrc || failed;

  return (
    <div
      style={{ width: size, height: size }}
      className="relative shrink-0 rounded-full overflow-hidden ring-4 ring-white shadow-card"
    >
      {showPlaceholder ? (
        <div
          className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradientFor(
            `${firstName}${lastName}`
          )} text-white font-bold`}
          style={{ fontSize: size * 0.36 }}
        >
          {initials || "?"}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxiedSrc}
          alt={`${firstName} ${lastName}`}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
