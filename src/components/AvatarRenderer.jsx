import React from 'react';

// Color Palette Mappings
export const SKIN_TONES = {
  'fair-ivory': '#fff1f2',
  'light-peach': '#fed7aa',
  'medium-olive': '#f59e0b',
  'bronze-tan': '#b45309',
  'deep-cocoa': '#451a03'
};

export const HAIR_COLORS = {
  'black': '#09090b',
  'dark-brown': '#27272a',
  'medium-brown': '#78350f',
  'blonde': '#fde047',
  'red-auburn': '#b45309',
  'grey': '#71717a',
  'white-platinum': '#f4f4f5',
  'dyed-teal': '#06b6d4',
  'dyed-purple': '#a855f7'
};

// Modular SVG Asset Renderers
const HAIR_ASSETS = {
  'short-crop': (color) => `
    <path d="M65 54 C60 30, 140 30, 135 54 C138 46, 135 40, 126 40 C110 40, 100 44, 90 40 C80 36, 72 40, 65 54 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
  `,
  'spiky': (color) => `
    <path d="M63 56 L72 36 L82 45 L97 28 L108 43 L122 25 L132 42 L141 30 L137 56 Q100 45, 63 56 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
  `,
  'long-bob': (color) => `
    <g>
      <path d="M52 75 C48 105, 54 132, 64 132 C74 132, 126 132, 136 132 C146 132, 152 105, 148 75 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
      <path d="M62 52 C65 24, 135 24, 138 52 C144 58, 138 58, 134 54 C124 44, 76 44, 66 54 C62 58, 56 58, 62 52 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
    </g>
  `,
  'curly-afro': (color) => `
    <path d="M65 42 C50 42, 45 65, 55 75 C45 85, 55 102, 70 98 C78 108, 98 108, 106 98 C121 102, 131 85, 121 75 C131 65, 126 42, 111 46 C108 30, 82 28, 74 38 C68 30, 62 34, 65 42 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
  `,
  'bald': () => `
    <path d="M78 35 C88 32, 105 32, 112 35 C115 37, 110 39, 100 37 C90 35, 82 37, 78 35 Z" fill="#fff" opacity="0.3" />
  `,
  'cap': (color) => `
    <g>
      <path d="M65 52 C68 20, 132 20, 135 52 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
      <path d="M50 48 C78 40, 122 40, 150 48 C154 53, 142 56, 132 56 C120 55, 80 55, 68 56 C58 56, 46 53, 50 48 Z" fill="${color}" filter="brightness(0.85)" stroke="#1e1e24" stroke-width="3" />
    </g>
  `,
  'side-part': (color) => `
    <g>
      <path d="M64 54 C60 40, 70 28, 86 26 C100 24, 126 24, 135 38 C140 48, 140 58, 135 62 C132 58, 130 48, 120 48 C110 48, 104 50, 94 46 C84 42, 70 48, 64 54 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
      <path d="M64 54 C75 44, 95 42, 115 48 C125 51, 132 58, 135 62" fill="none" stroke="#1e1e24" stroke-width="3" />
    </g>
  `,
  'braids-dreads': (color) => `
    <g>
      <path d="M52 75 L45 155 M58 75 L52 165 M142 75 L148 165 M148 75 L155 155" stroke="${color}" stroke-width="7" stroke-linecap="round" />
      <path d="M52 75 L45 155 M58 75 L52 165 M142 75 L148 165 M148 75 L155 155" stroke="#1e1e24" stroke-width="9" stroke-linecap="round" style="z-index: -1" />
      <path d="M60 45 C65 20, 135 20, 140 45 C145 52, 138 52, 135 48 C125 38, 75 38, 65 48 C62 52, 55 52, 60 45 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
      <path d="M72 45 L72 70 M84 43 L84 72 M96 42 L96 73 M108 42 L108 73 M120 43 L120 72 M128 45 L128 70" stroke="#1e1e24" stroke-width="1.5" />
    </g>
  `,
  'long-straight': (color) => `
    <g>
      <path d="M52 75 C48 100, 48 135, 52 170 C70 170, 130 170, 148 170 C152 135, 152 100, 148 75 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
      <path d="M64 54 C68 25, 132 25, 136 54 C138 72, 138 100, 135 125 C132 125, 129 100, 126 80 C120 62, 80 62, 74 80 C71 100, 68 125, 65 125 C62 100, 62 72, 64 54 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
    </g>
  `
};

const FACIAL_HAIR_ASSETS = {
  'none': () => ``,
  'stubble': () => `<path d="M66 85 C66 122, 134 122, 134 85 C134 124, 66 124, 66 85 Z" fill="#27272a" opacity="0.22" />`,
  'full-beard': (color) => `<path d="M64 78 C60 115, 76 138, 100 138 C124 138, 140 115, 136 78 C136 96, 128 114, 100 114 C72 114, 64 96, 64 78 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />`,
  'goatee': (color) => `<path d="M82 94 C82 124, 118 124, 118 94 C118 118, 82 118, 82 94 Z" fill="${color}" stroke="#1e1e24" stroke-width="2.5" />`,
  'mustache': (color) => `<path d="M84 94 Q100 88, 116 94 Q100 101, 84 94 Z" fill="${color}" stroke="#1e1e24" stroke-width="2.5" />`
};

const GLASSES_ASSETS = {
  'none': () => ``,
  'round': () => `
    <g>
      <circle cx="84" cy="78" r="14" fill="none" stroke="#1e1e24" stroke-width="3.5" />
      <circle cx="84" cy="78" r="12" fill="rgba(6, 182, 212, 0.12)" />
      <circle cx="116" cy="78" r="14" fill="none" stroke="#1e1e24" stroke-width="3.5" />
      <circle cx="116" cy="78" r="12" fill="rgba(6, 182, 212, 0.12)" />
      <line x1="98" y1="78" x2="102" y2="78" stroke="#1e1e24" stroke-width="4" />
      <path d="M70 78 L64 76 M130 78 L136 76" stroke="#1e1e24" stroke-width="3.5" />
    </g>
  `,
  'square': () => `
    <g>
      <rect x="68" y="65" width="30" height="24" rx="4" fill="none" stroke="#1e1e24" stroke-width="4.5" />
      <rect x="68" y="65" width="30" height="24" rx="4" fill="rgba(6, 182, 212, 0.08)" />
      <rect x="102" y="65" width="30" height="24" rx="4" fill="none" stroke="#1e1e24" stroke-width="4.5" />
      <rect x="102" y="65" width="30" height="24" rx="4" fill="rgba(6, 182, 212, 0.08)" />
      <line x1="98" y1="75" x2="102" y2="75" stroke="#1e1e24" stroke-width="4" />
      <path d="M68 73 L63 71 M132 73 L137 71" stroke="#1e1e24" stroke-width="4" />
    </g>
  `,
  'sunglasses': () => `
    <g>
      <path d="M66 70 L97 70 L95 90 Q95 95, 75 95 Q68 93, 66 90 Z" fill="#1e1e24" stroke="#1e1e24" stroke-width="3" />
      <path d="M103 70 L134 70 L132 90 Q132 95, 112 95 Q105 93, 103 90 Z" fill="#1e1e24" stroke="#1e1e24" stroke-width="3" />
      <line x1="96" y1="74" x2="104" y2="74" stroke="#1e1e24" stroke-width="4.5" />
      <path d="M66 74 L62 72 M134 74 L138 72" stroke="#1e1e24" stroke-width="3.5" />
    </g>
  `
};

const EYE_ASSETS = {
  'default': () => `
    <g>
      <circle cx="84" cy="78" r="6" fill="#1e1e24" />
      <circle cx="82.5" cy="76.5" r="1.8" fill="#fff" />
      <circle cx="116" cy="78" r="6" fill="#1e1e24" />
      <circle cx="114.5" cy="76.5" r="1.8" fill="#fff" />
    </g>
  `,
  'happy': () => `
    <g fill="none" stroke="#1e1e24" stroke-width="3.5" stroke-linecap="round">
      <path d="M78 80 Q84 72, 90 80" />
      <path d="M110 80 Q116 72, 122 80" />
    </g>
  `,
  'wink': () => `
    <g>
      <path d="M78 80 Q84 72, 90 80" fill="none" stroke="#1e1e24" stroke-width="3.5" stroke-linecap="round" />
      <circle cx="116" cy="78" r="6" fill="#1e1e24" />
      <circle cx="114.5" cy="76.5" r="1.8" fill="#fff" />
    </g>
  `
};

const MOUTH_ASSETS = {
  'smile': () => `<path d="M86 98 Q100 114, 114 98 Q100 96, 86 98 Z" fill="#f87171" stroke="#1e1e24" stroke-width="3" stroke-linejoin="round" />`,
  'grin': () => `
    <g>
      <path d="M84 96 C84 96, 88 116, 100 116 C112 116, 116 96, 116 96 Z" fill="#f87171" stroke="#1e1e24" stroke-width="3" stroke-linejoin="round" />
      <path d="M87 96 Q100 102, 113 96" fill="#fff" stroke="#1e1e24" stroke-width="2" />
    </g>
  `,
  'smirk': () => `<path d="M92 100 Q105 104, 112 96" fill="none" stroke="#1e1e24" stroke-width="3" stroke-linecap="round" />`,
  'neutral': () => `<line x1="91" y1="102" x2="109" y2="102" stroke="#1e1e24" stroke-width="3" stroke-linecap="round" />`
};

/**
 * Compiles a raw SVG string for the avatar template, embedding a customizable shirt color placeholder.
 */
export function compileRawSvgAvatar(
  skinToneKey, 
  hairColorKey, 
  shirtColor, 
  nameSeed = '', 
  hairStyleKey = 'short-crop', 
  facialHairKey = 'none', 
  glassesKey = 'none', 
  eyeStyleKey = 'default', 
  mouthStyleKey = 'smile'
) {
  // Resolve Color Palette Hex codes
  const skinColor = SKIN_TONES[skinToneKey] || SKIN_TONES['light-peach'];
  const hairColor = HAIR_COLORS[hairColorKey] || HAIR_COLORS['black'];

  // Resolve shape components
  const hairSvg = (HAIR_ASSETS[hairStyleKey] || HAIR_ASSETS['short-crop'])(hairColor);
  const facialHairSvg = (FACIAL_HAIR_ASSETS[facialHairKey] || FACIAL_HAIR_ASSETS['none'])(hairColor);
  const glassesSvg = (GLASSES_ASSETS[glassesKey] || GLASSES_ASSETS['none'])();
  const eyesSvg = (EYE_ASSETS[eyeStyleKey] || EYE_ASSETS['default'])();
  const mouthSvg = (MOUTH_ASSETS[mouthStyleKey] || MOUTH_ASSETS['smile'])();

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
      <!-- Background Circle -->
      <circle cx="100" cy="100" r="95" fill="#bae6fd" stroke="#1e1e24" stroke-width="3" />
      
      <!-- Torso / Shirt -->
      <path d="M45 160 C45 140, 65 130, 100 130 C135 130, 155 140, 155 160 L155 200 L45 200 Z" fill="${shirtColor}" stroke="#1e1e24" stroke-width="3" stroke-linejoin="round" />
      <path d="M80 130 C85 142, 115 142, 120 130" fill="none" stroke="#1e1e24" stroke-width="2.5" />
      
      <!-- Neck -->
      <rect x="90" y="112" width="20" height="25" rx="3" fill="${skinColor}" stroke="#1e1e24" stroke-width="3" />
      
      <!-- Ears -->
      <path d="M66 76 C58 76, 58 92, 66 92 Z" fill="${skinColor}" stroke="#1e1e24" stroke-width="3" />
      <path d="M134 76 C142 76, 142 92, 134 92 Z" fill="${skinColor}" stroke="#1e1e24" stroke-width="3" />

      <!-- Head Base -->
      <path d="M66 58 C66 32, 134 32, 134 58 C134 85, 126 116, 100 116 C74 116, 66 85, 66 58 Z" fill="${skinColor}" stroke="#1e1e24" stroke-width="3" />

      <!-- Eyebrows -->
      <path d="M74 67 C78 63, 86 63, 90 67" fill="none" stroke="#1e1e24" stroke-width="3" stroke-linecap="round" />
      <path d="M110 67 C114 63, 122 63, 126 67" fill="none" stroke="#1e1e24" stroke-width="3" stroke-linecap="round" />

      <!-- Eyes -->
      ${eyesSvg}

      <!-- Nose -->
      <path d="M97 82 L97 92 Q97 94, 102 93" fill="none" stroke="#1e1e24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Mouth -->
      ${mouthSvg}

      <!-- Facial Hair -->
      ${facialHairSvg}

      <!-- Glasses -->
      ${glassesSvg}

      <!-- Hair -->
      ${hairSvg}

      <!-- Sparkle/Glow indicator -->
      <circle cx="45" cy="45" r="2" fill="#fff" opacity="0.2" />
    </svg>
  `.replace(/\s+/g, ' ').trim();
}

/**
 * Standard React Component to render the avatar on the screen.
 */
export default function AvatarRenderer({ 
  skinTone = 'light-peach', 
  hairColor = 'black', 
  shirtColor = '#06B6D4', 
  nameSeed = '',
  hairStyle = 'short-crop',
  facialHair = 'none',
  glasses = 'none',
  eyeStyle = 'default',
  mouthStyle = 'smile'
}) {
  const rawSvg = compileRawSvgAvatar(
    skinTone, 
    hairColor, 
    shirtColor, 
    nameSeed, 
    hairStyle, 
    facialHair, 
    glasses, 
    eyeStyle, 
    mouthStyle
  );

  return (
    <div 
      style={{ width: '100%', height: '100%' }}
      dangerouslySetInnerHTML={{ __html: rawSvg }} 
    />
  );
}
