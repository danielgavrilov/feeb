import { useId } from "react";
import { cn } from "@/lib/utils";

interface HexagonIconProps {
  topColor: string;
  bottomColor: string;
  children: React.ReactNode;
  className?: string;
}

const HexagonIcon = ({ topColor, bottomColor, children, className }: HexagonIconProps) => {
  const gradientId = useId();
  const clipPathId = useId();

  return (
    <svg
      role="img"
      aria-hidden
      viewBox="0 0 64 64"
      className={cn("h-12 w-12 flex-shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={topColor} />
          <stop offset="100%" stopColor={bottomColor} />
        </linearGradient>
        <clipPath id={clipPathId}>
          <polygon points="32 0 60 16 60 48 32 64 4 48 4 16" />
        </clipPath>
      </defs>
      <polygon points="32 0 60 16 60 48 32 64 4 48 4 16" fill={`url(#${gradientId})`} />
      <g clipPath={`url(#${clipPathId})`}>{children}</g>
    </svg>
  );
};

const GrainStalk = () => (
  <>
    <path d="M32 14v36" stroke="white" strokeWidth={3} strokeLinecap="round" />
    <path
      d="M26 20c4 4 4 12 0 16 4 4 4 12 0 16"
      fill="none"
      stroke="white"
      strokeWidth={3}
      strokeLinecap="round"
    />
    <path
      d="M38 20c-4 4-4 12 0 16-4 4-4 12 0 16"
      fill="none"
      stroke="white"
      strokeWidth={3}
      strokeLinecap="round"
    />
  </>
);

const NutShape = () => (
  <>
    <path
      d="M32 18c8 0 14 6 14 14 0 10-10 16-14 18-4-2-14-8-14-18 0-8 6-14 14-14Z"
      fill="#fef3c7"
    />
    <path
      d="M32 20c4 4 6 8 6 12s-2 8-6 12c-4-4-6-8-6-12s2-8 6-12Z"
      fill="#fde68a"
    />
    <path d="M32 20v24" stroke="#d97706" strokeWidth={3} strokeLinecap="round" />
  </>
);

const createGrainIcon = (label: string) => {
  const Component = ({ className }: { className?: string }) => (
    <HexagonIcon topColor="#f4b942" bottomColor="#d97706" className={className}>
      <GrainStalk />
      <text
        x="32"
        y="46"
        textAnchor="middle"
        fontSize="14"
        fill="#fde68a"
        fontWeight={700}
        letterSpacing="0.5"
        dominantBaseline="middle"
      >
        {label}
      </text>
    </HexagonIcon>
  );
  Component.displayName = `GrainIcon${label}`;
  return Component;
};

const createNutIcon = (label: string) => {
  const Component = ({ className }: { className?: string }) => (
    <HexagonIcon topColor="#f59e0b" bottomColor="#92400e" className={className}>
      <NutShape />
      <text
        x="32"
        y="46"
        textAnchor="middle"
        fontSize="12"
        fill="#78350f"
        fontWeight={700}
        letterSpacing="0.5"
        dominantBaseline="middle"
      >
        {label}
      </text>
    </HexagonIcon>
  );
  Component.displayName = `NutIcon${label}`;
  return Component;
};

export const GlutenWheatIcon = createGrainIcon("W");
export const GlutenBarleyIcon = createGrainIcon("B");
export const GlutenRyeIcon = createGrainIcon("R");
export const GlutenOatsIcon = createGrainIcon("O");
export const GlutenSpeltIcon = createGrainIcon("S");
export const GlutenTriticaleIcon = createGrainIcon("T");

export const CrustaceansIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#fb7185" bottomColor="#be123c" className={className}>
    <path
      d="M21 28c0-6.5 5.5-12 12-12s12 5.5 12 12-5.5 12-12 12"
      fill="none"
      stroke="white"
      strokeWidth={3}
      strokeLinecap="round"
    />
    <path
      d="M23 36c3 3 7 5 10 5s7-2 10-5"
      fill="none"
      stroke="white"
      strokeWidth={3}
      strokeLinecap="round"
    />
    <path d="M21 28h6" stroke="white" strokeWidth={3} strokeLinecap="round" />
    <path d="M37 28h6" stroke="white" strokeWidth={3} strokeLinecap="round" />
    <circle cx="24" cy="24" r="2" fill="white" />
    <circle cx="40" cy="24" r="2" fill="white" />
  </HexagonIcon>
);

export const EggsIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#f97316" bottomColor="#c2410c" className={className}>
    <path
      d="M32 16c-7 0-12 10-12 18s5 14 12 14 12-6 12-14-5-18-12-18Z"
      fill="white"
      opacity={0.85}
    />
    <circle cx="32" cy="34" r="6" fill="#facc15" />
  </HexagonIcon>
);

export const FishIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#38bdf8" bottomColor="#0369a1" className={className}>
    <path
      d="M20 32c4-6 9-10 12-10 8 0 16 6 16 10s-8 10-16 10c-3 0-8-4-12-10Z"
      fill="none"
      stroke="white"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 32l-6-6v12l6-6Z"
      fill="white"
      opacity={0.9}
    />
    <circle cx="34" cy="30" r="2" fill="white" />
  </HexagonIcon>
);

export const PeanutsIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#eab308" bottomColor="#b45309" className={className}>
    <path
      d="M26 22c-4 4-4 10 0 14s4 10 0 14c4 4 10 4 14 0 4-4 4-10 0-14s-4-10 0-14c-4-4-10-4-14 0Z"
      fill="#fef3c7"
    />
    <path
      d="M32 22c-2 4-2 8 0 12s2 8 0 12"
      fill="none"
      stroke="#f59e0b"
      strokeWidth={3}
      strokeLinecap="round"
    />
  </HexagonIcon>
);

export const SoybeansIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#84cc16" bottomColor="#4d7c0f" className={className}>
    <path
      d="M20 36c4-8 12-14 24-16-2 10-8 18-16 22-4 2-6 2-8-6Z"
      fill="#dcfce7"
    />
    <circle cx="30" cy="30" r="3" fill="#86efac" />
    <circle cx="36" cy="36" r="3" fill="#86efac" />
    <circle cx="40" cy="28" r="2.5" fill="#4ade80" />
  </HexagonIcon>
);

export const MilkIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#bfdbfe" bottomColor="#1d4ed8" className={className}>
    <path
      d="M26 18h12l2 6v24c0 2.2-1.8 4-4 4h-8c-2.2 0-4-1.8-4-4V24l2-6Z"
      fill="white"
      opacity={0.92}
    />
    <path d="M26 24h16" stroke="#93c5fd" strokeWidth={3} strokeLinecap="round" />
    <rect x="28" y="32" width="8" height="6" rx="1" fill="#bfdbfe" />
  </HexagonIcon>
);

export const NutsAlmondIcon = createNutIcon("AL");
export const NutsHazelnutIcon = createNutIcon("HZ");
export const NutsWalnutIcon = createNutIcon("WA");
export const NutsCashewIcon = createNutIcon("CA");
export const NutsPecanIcon = createNutIcon("PE");
export const NutsBrazilNutIcon = createNutIcon("BR");
export const NutsPistachioIcon = createNutIcon("PI");
export const NutsMacadamiaIcon = createNutIcon("MA");

export const CeleryIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#34d399" bottomColor="#047857" className={className}>
    <path
      d="M30 16c-4 4-4 10-2 14-2 6-2 12 0 18h8c2-6 2-12 0-18 2-4 2-10-2-14"
      fill="#bbf7d0"
    />
    <path
      d="M28 20h8"
      stroke="#34d399"
      strokeWidth={3}
      strokeLinecap="round"
    />
    <path d="M28 26h8" stroke="#34d399" strokeWidth={3} strokeLinecap="round" />
    <path d="M30 32h4" stroke="#34d399" strokeWidth={3} strokeLinecap="round" />
  </HexagonIcon>
);

export const MustardIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#fbbf24" bottomColor="#92400e" className={className}>
    <path
      d="M28 18h8l4 6v22c0 2.2-1.8 4-4 4h-8c-2.2 0-4-1.8-4-4V24l4-6Z"
      fill="#fef3c7"
    />
    <rect x="28" y="26" width="8" height="10" rx="2" fill="#f59e0b" />
    <path d="M30 20h4" stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" />
  </HexagonIcon>
);

export const SesameIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#fcd34d" bottomColor="#b45309" className={className}>
    <g fill="white" opacity={0.95}>
      <ellipse cx="26" cy="24" rx="3" ry="4" />
      <ellipse cx="38" cy="22" rx="3" ry="4" />
      <ellipse cx="32" cy="30" rx="3" ry="4" />
      <ellipse cx="26" cy="36" rx="3" ry="4" />
      <ellipse cx="38" cy="38" rx="3" ry="4" />
      <ellipse cx="32" cy="44" rx="3" ry="4" />
    </g>
  </HexagonIcon>
);

export const SulphitesIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#a855f7" bottomColor="#6b21a8" className={className}>
    <text
      x="32"
      y="36"
      textAnchor="middle"
      fontSize="18"
      fill="white"
      fontWeight="bold"
    >
      SO<tspan baselineShift="sub" fontSize="10">2</tspan>
    </text>
  </HexagonIcon>
);

export const LupinIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#c084fc" bottomColor="#6d28d9" className={className}>
    <path
      d="M32 18c-4 8-6 14-6 18 0 6 2 10 6 14 4-4 6-8 6-14 0-4-2-10-6-18Z"
      fill="#ede9fe"
    />
    <path
      d="M32 18c-2 6-4 10-4 14 0 4 2 8 4 10 2-2 4-6 4-10 0-4-2-8-4-14Z"
      fill="#ddd6fe"
    />
    <circle cx="32" cy="32" r="3" fill="#c4b5fd" />
  </HexagonIcon>
);

export const MolluscsIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#60a5fa" bottomColor="#1e3a8a" className={className}>
    <path
      d="M20 36c0-8 10-18 20-18 4 0 8 4 8 10s-4 12-10 16-10 4-14 0c-2-2-4-4-4-8Z"
      fill="none"
      stroke="white"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M28 34c2 2 6 2 8 0" stroke="white" strokeWidth={3} strokeLinecap="round" />
    <path d="M26 40c4 2 8 2 12 0" stroke="white" strokeWidth={3} strokeLinecap="round" />
  </HexagonIcon>
);

export const MeatIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#f87171" bottomColor="#b91c1c" className={className}>
    <path
      d="M24 26c-4 4-4 10 0 14s10 4 14 0 4-10 0-14-10-4-14 0Z"
      fill="#fecdd3"
    />
    <path
      d="M38 32c4-2 6 2 6 4 2 0 4 2 4 4s-2 4-4 4-4-2-4-4c-2 2-6 2-8 0"
      fill="none"
      stroke="#fee2e2"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="42" cy="38" r="2.5" fill="#fee2e2" />
    <circle cx="46" cy="42" r="2" fill="white" opacity={0.85} />
  </HexagonIcon>
);

export const AnimalProductIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#facc15" bottomColor="#b45309" className={className}>
    <path
      d="M32 18c-6 6-10 12-10 18 0 6 4 12 10 12s10-6 10-12c0-6-4-12-10-18Z"
      fill="#fef3c7"
    />
    <path
      d="M28 32c2 2 6 2 8 0"
      stroke="#fbbf24"
      strokeWidth={3}
      strokeLinecap="round"
    />
    <path
      d="M30 38c2 2 4 2 6 0"
      stroke="#f59e0b"
      strokeWidth={3}
      strokeLinecap="round"
    />
    <circle cx="32" cy="28" r="4" fill="#fcd34d" />
    <circle cx="32" cy="44" r="3" fill="#fde68a" />
  </HexagonIcon>
);

export const VeganIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#22c55e" bottomColor="#166534" className={className}>
    <path
      d="M20 36c6-14 14-20 24-22-2 12-8 22-14 28-4-4-6-2-10-6Z"
      fill="#dcfce7"
    />
    <path
      d="M24 38c4 4 8 8 12 10"
      stroke="#16a34a"
      strokeWidth={3}
      strokeLinecap="round"
    />
    <path
      d="M26 26c4 0 8 2 10 4"
      stroke="#16a34a"
      strokeWidth={3}
      strokeLinecap="round"
    />
  </HexagonIcon>
);

export const VegetarianIcon = ({ className }: { className?: string }) => (
  <HexagonIcon topColor="#4ade80" bottomColor="#15803d" className={className}>
    <path
      d="M22 40c2-10 8-18 18-24 0 10-2 18-8 26-2 2-6 4-10-2Z"
      fill="#bbf7d0"
    />
    <path
      d="M24 42c6 4 12 4 16 0"
      stroke="#15803d"
      strokeWidth={3}
      strokeLinecap="round"
    />
    <circle cx="30" cy="28" r="3" fill="#4ade80" />
  </HexagonIcon>
);

