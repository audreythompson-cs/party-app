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

// Modular SVG Asset Renderers (Functional String builders for compileRawSvgAvatar)
const HAIR_ASSETS = {
  'short-crop': (color) => `<path d="M70 45 C75 15, 125 15, 130 45 C135 35, 145 35, 142 55 C140 70, 135 70, 132 60 C125 50, 75 50, 68 60 C65 70, 60 70, 58 55 C55 35, 65 35, 70 45 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />`,
  'spiky': (color) => `<path d="M62 48 L70 32 L80 40 L95 24 L108 38 L122 22 L132 38 L142 26 L144 50 L138 60 C130 50, 70 50, 62 60 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />`,
  'long-bob': (color) => `
    <path d="M55 70 C50 110, 65 140, 75 140 C85 140, 115 140, 125 140 C135 140, 150 110, 145 70 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
    <path d="M60 45 C65 20, 135 20, 140 45 C145 52, 138 52, 135 48 C125 38, 75 38, 65 48 C62 52, 55 52, 60 45 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
  `,
  'curly-afro': (color) => `<path d="M65 40 C50 40, 50 65, 60 70 C50 78, 60 95, 72 90 C80 100, 100 100, 108 90 C120 95, 130 80, 125 70 C135 65, 130 40, 118 45 C115 32, 90 28, 82 38 C75 30, 68 32, 65 40 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />`,
  'bald': () => `<path d="M78 35 C88 32, 105 32, 112 35 C115 37, 110 39, 100 37 C90 35, 82 37, 78 35 Z" fill="#fff" opacity="0.3" />`,
  'cap': (color) => `
    <path d="M68 62 C75 58, 125 58, 132 62 C134 68, 135 70, 132 72 C125 68, 75 68, 68 72 Z" fill="#333" opacity="0.3" />
    <path d="M65 50 C68 22, 132 22, 135 50 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
    <path d="M52 48 C80 44, 120 44, 148 48 C152 53, 142 55, 132 55 C120 54, 80 54, 68 55 C58 55, 48 53, 52 48 Z" fill="${color}" filter="brightness(0.85)" stroke="#1e1e24" stroke-width="3" />
  `,
  'side-part': (color) => `
    <path d="M64 54 C60 40, 70 30, 85 28 C100 26, 125 24, 134 40 C140 50, 140 60, 135 64 C132 60, 130 50, 120 50 C110 50, 105 52, 95 48 C85 44, 70 50, 64 54 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
    <path d="M64 54 C75 44, 95 42, 115 48 C125 51, 132 58, 135 64" fill="none" stroke="#1e1e24" stroke-width="3" />
  `,
  'braids-dreads': (color) => `
    <g>
      <path d="M52 75 L45 150 M58 75 L52 160 M142 75 L148 160 M148 75 L155 150" stroke="${color}" stroke-width="7" stroke-linecap="round" />
      <path d="M52 75 L45 150 M58 75 L52 160 M142 75 L148 160 M148 75 L155 150" stroke="#1e1e24" stroke-width="9" stroke-linecap="round" style="z-index: -1" />
      <path d="M60 45 C65 20, 135 20, 140 45 C145 52, 138 52, 135 48 C125 38, 75 38, 65 48 C62 52, 55 52, 60 45 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
      <path d="M72 45 L72 70 M84 43 L84 72 M96 42 L96 73 M108 42 L108 73 M120 43 L120 72 M128 45 L128 70" stroke="#1e1e24" stroke-width="1.5" />
    </g>
  `
};

const FACIAL_HAIR_ASSETS = {
  'none': () => ``,
  'stubble': () => `<path d="M65 90 C65 125, 135 125, 135 90 C135 128, 65 128, 65 90 Z" fill="#333" opacity="0.25" />`,
  'full-beard': (color) => `<path d="M63 80 C60 115, 75 136, 100 136 C125 136, 140 115, 137 80 C137 95, 130 110, 100 110 C70 110, 63 95, 63 80 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />`,
  'goatee': (color) => `<path d="M85 96 C85 122, 115 122, 115 96 C115 116, 85 116, 85 96 Z" fill="${color}" stroke="#1e1e24" stroke-width="2.5" />`,
  'mustache': (color) => `<path d="M85 96 Q100 90, 115 96 Q100 102, 85 96 Z" fill="${color}" stroke="#1e1e24" stroke-width="2.5" />`
};

const GLASSES_ASSETS = {
  'none': () => ``,
  'round': () => `
    <g>
      <circle cx="85" cy="82" r="12" fill="none" stroke="#1e1e24" stroke-width="3" />
      <circle cx="85" cy="82" r="10" fill="rgba(6, 182, 212, 0.15)" />
      <circle cx="115" cy="82" r="12" fill="none" stroke="#1e1e24" stroke-width="3" />
      <circle cx="115" cy="82" r="10" fill="rgba(6, 182, 212, 0.15)" />
      <line x1="97" y1="82" x2="103" y2="82" stroke="#1e1e24" stroke-width="3" />
      <path d="M73 82 L65 80 M127 82 L135 80" stroke="#1e1e24" stroke-width="3" />
    </g>
  `,
  'square': () => `
    <g>
      <rect x="71" y="70" width="26" height="22" rx="4" fill="none" stroke="#1e1e24" stroke-width="4.5" />
      <rect x="71" y="70" width="26" height="22" rx="4" fill="rgba(6, 182, 212, 0.1)" />
      <rect x="103" y="70" width="26" height="22" rx="4" fill="none" stroke="#1e1e24" stroke-width="4.5" />
      <rect x="103" y="70" width="26" height="22" rx="4" fill="rgba(6, 182, 212, 0.1)" />
      <line x1="97" y1="80" x2="103" y2="80" stroke="#1e1e24" stroke-width="4" />
      <path d="M71 78 L65 76 M129 78 L135 76" stroke="#1e1e24" stroke-width="4" />
    </g>
  `,
  'sunglasses': () => `
    <g>
      <path d="M70 72 L96 72 L94 92 C94 96, 74 96, 72 92 Z M104 72 L130 72 L128 92 C128 96, 108 96, 106 92 Z" fill="#1e1e24" stroke="#1e1e24" stroke-width="3" />
      <line x1="96" y1="76" x2="104" y2="76" stroke="#1e1e24" stroke-width="4.5" />
      <path d="M70 76 L65 74 M130 76 L135 74" stroke="#1e1e24" stroke-width="3" />
    </g>
  `
};

const EYE_ASSETS = {
  'default': () => `
    <g>
      <circle cx="85" cy="82" r="5" fill="#1e1e24" />
      <circle cx="83.5" cy="80.5" r="1.5" fill="#fff" />
      <circle cx="115" cy="82" r="5" fill="#1e1e24" />
      <circle cx="113.5" cy="80.5" r="1.5" fill="#fff" />
    </g>
  `,
  'happy': () => `
    <g fill="none" stroke="#1e1e24" stroke-width="3" stroke-linecap="round">
      <path d="M80 84 Q85 78, 90 84" />
      <path d="M110 84 Q115 78, 120 84" />
    </g>
  `,
  'wink': () => `
    <g>
      <path d="M80 84 Q85 78, 90 84" fill="none" stroke="#1e1e24" stroke-width="3" stroke-linecap="round" />
      <circle cx="115" cy="82" r="5" fill="#1e1e24" />
      <circle cx="113.5" cy="80.5" r="1.5" fill="#fff" />
    </g>
  `
};

const MOUTH_ASSETS = {
  'smile': () => `<path d="M86 98 Q100 114, 114 98 Q100 98, 86 98 Z" fill="#ff6f61" stroke="#1e1e24" stroke-width="2.5" stroke-linejoin="round" />`,
  'grin': () => `
    <path d="M84 98 C84 98, 88 114, 100 114 C112 114, 116 98, 116 98 Z" fill="#ff6f61" stroke="#1e1e24" stroke-width="2.5" />
    <path d="M88 98 Q100 103, 112 98" fill="#fff" stroke="#1e1e24" stroke-width="1.5" />
  `,
  'smirk': () => `<path d="M93 100 Q105 104, 111 97" fill="none" stroke="#1e1e24" stroke-width="3" stroke-linecap="round" />`,
  'neutral': () => `<line x1="92" y1="102" x2="108" y2="102" stroke="#1e1e24" stroke-width="3" stroke-linecap="round" />`
};

/**
 * Compiles a raw SVG string for the avatar template, embedding a customizable shirt color placeholder.
 * This is used both locally and when generating custom assets.
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
      <path d="M50 160 C50 140, 70 135, 100 135 C130 135, 150 140, 150 160 C150 180, 150 200, 150 200 L50 200 Z" fill="${shirtColor}" stroke="#1e1e24" stroke-width="3" />
      <path d="M85 135 Q100 150, 115 135" fill="none" stroke="#1e1e24" stroke-width="2.5" />
      
      <!-- Neck -->
      <rect x="90" y="118" width="20" height="22" rx="4" fill="${skinColor}" stroke="#1e1e24" stroke-width="3" />
      <path d="M90 128 Q100 132, 110 128" fill="none" stroke="#1e1e24" stroke-width="2" opacity="0.3" />

      <!-- Ears -->
      <circle cx="61" cy="85" r="9" fill="${skinColor}" stroke="#1e1e24" stroke-width="3" />
      <circle cx="139" cy="85" r="9" fill="${skinColor}" stroke="#1e1e24" stroke-width="3" />

      <!-- Head Base -->
      <rect x="65" y="52" width="70" height="74" rx="28" fill="${skinColor}" stroke="#1e1e24" stroke-width="3" />

      <!-- Eyes -->
      ${eyesSvg}

      <!-- Nose -->
      <path d="M97 90 Q100 93, 103 90" fill="none" stroke="#1e1e24" stroke-width="2.5" stroke-linecap="round" />

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
 * For this application, it translates the string keys to pre-defined SVGs.
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
