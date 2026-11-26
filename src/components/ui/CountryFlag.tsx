import React from 'react';

interface CountryFlagProps {
  code?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<CountryFlagProps['size']>, string> = {
  sm: 'w-4 h-[11px]',
  md: 'w-5 h-[14px]',
  lg: 'w-6 h-[17px]',
};

/**
 * Windows-compatible inline SVG country flags.
 * Windows WebView2/Chromium does not render Unicode regional indicator flag emojis
 * (showing raw 2-letter text like "US" or "LK" instead), so every flag is drawn
 * as crisp inline vector geometry with zero external network dependencies.
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({
  code = 'AUTO',
  size = 'md',
  className = '',
}) => {
  const cc = code.toUpperCase();
  const dims = SIZE_CLASSES[size];

  if (cc === 'AUTO' || cc === 'GLOBE' || cc === 'NONE') {
    return (
      <svg
        viewBox="0 0 24 16"
        aria-hidden="true"
        className={`${dims} shrink-0 rounded-[3px] ring-1 ring-black/12 dark:ring-white/15 ${className}`}
      >
        <rect width="24" height="16" fill="var(--bg-surface-hover)" />
        <circle cx="12" cy="8" r="5.2" fill="none" stroke="var(--accent)" strokeWidth="1.2" />
        <ellipse cx="12" cy="8" rx="2.5" ry="5.2" fill="none" stroke="var(--accent)" strokeWidth="1" />
        <line x1="6.8" y1="8" x2="17.2" y2="8" stroke="var(--accent)" strokeWidth="1" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 16"
      aria-hidden="true"
      className={`${dims} shrink-0 rounded-[3px] ring-1 ring-black/12 dark:ring-white/15 ${className}`}
    >
      {renderFlagSvg(cc)}
    </svg>
  );
};

function renderFlagSvg(cc: string): React.ReactNode {
  switch (cc) {
    case 'US':
      return (
        <>
          <rect width="24" height="16" fill="#FFFFFF" />
          <rect y="0" width="24" height="1.25" fill="#B22234" />
          <rect y="2.46" width="24" height="1.25" fill="#B22234" />
          <rect y="4.92" width="24" height="1.25" fill="#B22234" />
          <rect y="7.38" width="24" height="1.25" fill="#B22234" />
          <rect y="9.84" width="24" height="1.25" fill="#B22234" />
          <rect y="12.3" width="24" height="1.25" fill="#B22234" />
          <rect y="14.76" width="24" height="1.25" fill="#B22234" />
          <rect width="10.2" height="8.6" fill="#3C3B6E" />
          <circle cx="2" cy="2" r="0.55" fill="#FFFFFF" />
          <circle cx="4.4" cy="2" r="0.55" fill="#FFFFFF" />
          <circle cx="6.8" cy="2" r="0.55" fill="#FFFFFF" />
          <circle cx="9" cy="2" r="0.55" fill="#FFFFFF" />
          <circle cx="3.2" cy="3.6" r="0.55" fill="#FFFFFF" />
          <circle cx="5.6" cy="3.6" r="0.55" fill="#FFFFFF" />
          <circle cx="8" cy="3.6" r="0.55" fill="#FFFFFF" />
          <circle cx="2" cy="5.2" r="0.55" fill="#FFFFFF" />
          <circle cx="4.4" cy="5.2" r="0.55" fill="#FFFFFF" />
          <circle cx="6.8" cy="5.2" r="0.55" fill="#FFFFFF" />
          <circle cx="9" cy="5.2" r="0.55" fill="#FFFFFF" />
          <circle cx="3.2" cy="6.8" r="0.55" fill="#FFFFFF" />
          <circle cx="5.6" cy="6.8" r="0.55" fill="#FFFFFF" />
          <circle cx="8" cy="6.8" r="0.55" fill="#FFFFFF" />
        </>
      );

    case 'GB':
      return (
        <>
          <rect width="24" height="16" fill="#012169" />
          <path d="M0 0 L24 16 M24 0 L0 16" stroke="#FFFFFF" strokeWidth="3.2" />
          <path d="M0 0 L24 16 M24 0 L0 16" stroke="#C8102E" strokeWidth="1.4" />
          <path d="M12 0 V16 M0 8 H24" stroke="#FFFFFF" strokeWidth="4.6" />
          <path d="M12 0 V16 M0 8 H24" stroke="#C8102E" strokeWidth="2.6" />
        </>
      );

    case 'LK':
      return (
        <>
          <rect width="24" height="16" fill="#FFBE29" />
          <rect x="1.2" y="1.2" width="3" height="13.6" fill="#00534E" />
          <rect x="4.5" y="1.2" width="3" height="13.6" fill="#EB7400" />
          <rect x="8.6" y="1.2" width="14.2" height="13.6" fill="#8D153A" />
          {/* Stylized golden lion & corner bo-leaves */}
          <circle cx="9.8" cy="2.4" r="0.6" fill="#FFBE29" />
          <circle cx="21.6" cy="2.4" r="0.6" fill="#FFBE29" />
          <circle cx="9.8" cy="13.6" r="0.6" fill="#FFBE29" />
          <circle cx="21.6" cy="13.6" r="0.6" fill="#FFBE29" />
          <path
            d="M12.2 10.6 C12.4 8.2 13.8 6.4 16.2 6.4 C17.8 6.4 18.8 7.5 18.9 9.1 C19.4 8.6 19.7 7.6 19.3 6.5 L20.2 6.3 C20.8 8.2 20.1 10.2 18.6 10.9 L18.9 12.1 H17.5 L17.1 10.6 H14.4 L14.1 12.1 H12.7 Z"
            fill="#FFBE29"
          />
          <line x1="12.5" y1="7.5" x2="11.2" y2="4.2" stroke="#FFBE29" strokeWidth="1" strokeLinecap="round" />
        </>
      );

    case 'IN':
      return (
        <>
          <rect width="24" height="5.34" fill="#FF9933" />
          <rect y="5.34" width="24" height="5.34" fill="#FFFFFF" />
          <rect y="10.68" width="24" height="5.34" fill="#138808" />
          <circle cx="12" cy="8" r="1.9" fill="none" stroke="#000080" strokeWidth="0.65" />
          <circle cx="12" cy="8" r="0.45" fill="#000080" />
        </>
      );

    case 'ES':
      return (
        <>
          <rect width="24" height="16" fill="#AA151B" />
          <rect y="4" width="24" height="8" fill="#F1BF00" />
          <rect x="5.4" y="6.1" width="2.4" height="3.6" rx="0.5" fill="#AA151B" />
          <rect x="5.8" y="6.7" width="1.6" height="1.2" fill="#F1BF00" />
        </>
      );

    case 'FR':
      return (
        <>
          <rect width="8" height="16" fill="#002395" />
          <rect x="8" width="8" height="16" fill="#FFFFFF" />
          <rect x="16" width="8" height="16" fill="#ED2939" />
        </>
      );

    case 'DE':
      return (
        <>
          <rect width="24" height="5.34" fill="#111111" />
          <rect y="5.34" width="24" height="5.34" fill="#DD0000" />
          <rect y="10.68" width="24" height="5.34" fill="#FFCE00" />
        </>
      );

    case 'BR':
      return (
        <>
          <rect width="24" height="16" fill="#009C3B" />
          <polygon points="12,2.2 21.4,8 12,13.8 2.6,8" fill="#FFDF00" />
          <circle cx="12" cy="8" r="3.2" fill="#002776" />
          <path d="M9.1 7.6 Q12 6.5 14.9 8.5" fill="none" stroke="#FFFFFF" strokeWidth="0.7" />
        </>
      );

    case 'PT':
      return (
        <>
          <rect width="9.6" height="16" fill="#006600" />
          <rect x="9.6" width="14.4" height="16" fill="#FF0000" />
          <circle cx="9.6" cy="8" r="2.7" fill="#FFCC00" />
          <rect x="8.6" y="6.8" width="2" height="2.4" rx="0.4" fill="#FF0000" />
          <rect x="9.1" y="7.3" width="1" height="1.4" fill="#FFFFFF" />
        </>
      );

    case 'JP':
      return (
        <>
          <rect width="24" height="16" fill="#FFFFFF" />
          <circle cx="12" cy="8" r="4.5" fill="#BC002D" />
        </>
      );

    case 'KR':
      return (
        <>
          <rect width="24" height="16" fill="#FFFFFF" />
          <circle cx="12" cy="8" r="3.6" fill="#CD2E3A" />
          <path d="M8.4 8 A3.6 3.6 0 0 0 15.6 8 A1.8 1.8 0 0 1 12 8 A1.8 1.8 0 0 0 8.4 8 Z" fill="#0047A0" />
          <path d="M4.2 4.2 L6.5 2.4 M5 5 L7.3 3.2 M17.5 2.4 L19.8 4.2 M16.7 3.2 L19 5 M4.2 11.8 L6.5 13.6 M5 11 L7.3 12.8 M17.5 13.6 L19.8 11.8 M16.7 12.8 L19 11" stroke="#111111" strokeWidth="0.8" />
        </>
      );

    case 'CN':
      return (
        <>
          <rect width="24" height="16" fill="#DE2910" />
          <polygon points="4.6,2.6 5.2,4.4 7,4.4 5.5,5.5 6.1,7.3 4.6,6.2 3.1,7.3 3.7,5.5 2.2,4.4 4,4.4" fill="#FFDE00" />
          <circle cx="8.6" cy="2.6" r="0.65" fill="#FFDE00" />
          <circle cx="9.9" cy="4.2" r="0.65" fill="#FFDE00" />
          <circle cx="9.9" cy="6.4" r="0.65" fill="#FFDE00" />
          <circle cx="8.6" cy="8" r="0.65" fill="#FFDE00" />
        </>
      );

    case 'TW':
      return (
        <>
          <rect width="24" height="16" fill="#FE0000" />
          <rect width="12" height="8" fill="#000095" />
          <circle cx="6" cy="4" r="2.1" fill="#FFFFFF" />
          <circle cx="6" cy="4" r="1.2" fill="#000095" />
        </>
      );

    case 'SA':
      return (
        <>
          <rect width="24" height="16" fill="#006C35" />
          <path d="M5.5 6.8 H18.5 M7 5.3 H17 M8.5 8.2 H15.5" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="6.5" y1="11.2" x2="17.5" y2="11.2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
        </>
      );

    case 'IT':
      return (
        <>
          <rect width="8" height="16" fill="#009246" />
          <rect x="8" width="8" height="16" fill="#FFFFFF" />
          <rect x="16" width="8" height="16" fill="#CE2B37" />
        </>
      );

    case 'NL':
      return (
        <>
          <rect width="24" height="5.34" fill="#AE1C28" />
          <rect y="5.34" width="24" height="5.34" fill="#FFFFFF" />
          <rect y="10.68" width="24" height="5.34" fill="#21468B" />
        </>
      );

    case 'RU':
      return (
        <>
          <rect width="24" height="5.34" fill="#FFFFFF" />
          <rect y="5.34" width="24" height="5.34" fill="#0039A6" />
          <rect y="10.68" width="24" height="5.34" fill="#D52B1E" />
        </>
      );

    case 'TR':
      return (
        <>
          <rect width="24" height="16" fill="#E30A17" />
          <circle cx="10" cy="8" r="3.8" fill="#FFFFFF" />
          <circle cx="11.1" cy="8" r="3" fill="#E30A17" />
          <polygon points="15.1,6.2 15.6,7.6 17,7.6 15.9,8.4 16.3,9.8 15.1,8.9 13.9,9.8 14.3,8.4 13.2,7.6 14.6,7.6" fill="#FFFFFF" />
        </>
      );

    case 'VN':
      return (
        <>
          <rect width="24" height="16" fill="#DA251D" />
          <polygon points="12,3.4 13.1,6.8 16.7,6.8 13.8,8.9 14.9,12.3 12,10.2 9.1,12.3 10.2,8.9 7.3,6.8 10.9,6.8" fill="#FFFF00" />
        </>
      );

    case 'ID':
      return (
        <>
          <rect width="24" height="8" fill="#CE1126" />
          <rect y="8" width="24" height="8" fill="#FFFFFF" />
        </>
      );

    case 'TH':
      return (
        <>
          <rect width="24" height="16" fill="#A51931" />
          <rect y="2.7" width="24" height="10.6" fill="#F4F5F8" />
          <rect y="5.3" width="24" height="5.4" fill="#2D2A4A" />
        </>
      );

    case 'PL':
      return (
        <>
          <rect width="24" height="8" fill="#FFFFFF" />
          <rect y="8" width="24" height="8" fill="#DC143C" />
        </>
      );

    case 'SE':
      return (
        <>
          <rect width="24" height="16" fill="#006AA7" />
          <rect x="6.5" width="3" height="16" fill="#FECC00" />
          <rect y="6.5" width="24" height="3" fill="#FECC00" />
        </>
      );

    case 'NO':
      return (
        <>
          <rect width="24" height="16" fill="#BA0C2F" />
          <rect x="6" width="4" height="16" fill="#FFFFFF" />
          <rect y="6" width="24" height="4" fill="#FFFFFF" />
          <rect x="7" width="2" height="16" fill="#00205B" />
          <rect y="7" width="24" height="2" fill="#00205B" />
        </>
      );

    case 'PH':
      return (
        <>
          <rect width="24" height="8" fill="#0038A8" />
          <rect y="8" width="24" height="8" fill="#CE1126" />
          <polygon points="0,0 10.5,8 0,16" fill="#FFFFFF" />
          <circle cx="3.8" cy="8" r="1.7" fill="#FCD116" />
        </>
      );

    case 'MY':
      return (
        <>
          <rect width="24" height="16" fill="#FFFFFF" />
          <rect y="0" width="24" height="1.35" fill="#CC0001" />
          <rect y="2.7" width="24" height="1.35" fill="#CC0001" />
          <rect y="5.4" width="24" height="1.35" fill="#CC0001" />
          <rect y="8.1" width="24" height="1.35" fill="#CC0001" />
          <rect y="10.8" width="24" height="1.35" fill="#CC0001" />
          <rect y="13.5" width="24" height="1.35" fill="#CC0001" />
          <rect width="12" height="8.6" fill="#010066" />
          <circle cx="5.2" cy="4.3" r="2.4" fill="#FFCC00" />
          <circle cx="6.1" cy="4.3" r="1.9" fill="#010066" />
          <circle cx="8.6" cy="4.3" r="1.1" fill="#FFCC00" />
        </>
      );

    case 'PK':
      return (
        <>
          <rect width="6" height="16" fill="#FFFFFF" />
          <rect x="6" width="18" height="16" fill="#01411C" />
          <circle cx="15" cy="8" r="3.8" fill="#FFFFFF" />
          <circle cx="16.2" cy="7.2" r="3.2" fill="#01411C" />
          <circle cx="17.2" cy="6.2" r="0.9" fill="#FFFFFF" />
        </>
      );

    case 'BD':
      return (
        <>
          <rect width="24" height="16" fill="#006A4E" />
          <circle cx="10.8" cy="8" r="4.3" fill="#F42A41" />
        </>
      );

    case 'UA':
      return (
        <>
          <rect width="24" height="8" fill="#005BBB" />
          <rect y="8" width="24" height="8" fill="#FFD500" />
        </>
      );

    case 'GR':
      return (
        <>
          <rect width="24" height="16" fill="#0D5EAF" />
          <rect y="1.8" width="24" height="1.8" fill="#FFFFFF" />
          <rect y="5.4" width="24" height="1.8" fill="#FFFFFF" />
          <rect y="9" width="24" height="1.8" fill="#FFFFFF" />
          <rect y="12.6" width="24" height="1.8" fill="#FFFFFF" />
          <rect width="9" height="9" fill="#0D5EAF" />
          <rect x="3.6" width="1.8" height="9" fill="#FFFFFF" />
          <rect y="3.6" width="9" height="1.8" fill="#FFFFFF" />
        </>
      );

    case 'IL':
      return (
        <>
          <rect width="24" height="16" fill="#FFFFFF" />
          <rect y="1.8" width="24" height="2" fill="#0038B8" />
          <rect y="12.2" width="24" height="2" fill="#0038B8" />
          <polygon points="12,5.1 14.5,9.6 9.5,9.6" fill="none" stroke="#0038B8" strokeWidth="0.85" />
          <polygon points="12,10.9 14.5,6.4 9.5,6.4" fill="none" stroke="#0038B8" strokeWidth="0.85" />
        </>
      );

    default:
      return (
        <>
          <rect width="24" height="16" fill="var(--bg-surface-hover)" />
          <text
            x="12"
            y="10.8"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="700"
            fill="var(--text-secondary)"
            fontFamily="sans-serif"
          >
            {cc.slice(0, 2)}
          </text>
        </>
      );
  }
}
