/* eslint-disable react-refresh/only-export-components */

// Deterministic hashing helper
export function getHashCode(str = '') {
  let hash = 0;
  const stringToHash = str.trim() || 'Guest';
  for (let i = 0; i < stringToHash.length; i++) {
    hash = stringToHash.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Predefined SVG segments for avatar assembly
const HAIR_STYLES = [
  // Style 0: Short/Classic Crop
  (color) => (
    <path 
      d="M70 45 C75 15, 125 15, 130 45 C135 35, 145 35, 142 55 C140 70, 135 70, 132 60 C125 50, 75 50, 68 60 C65 70, 60 70, 58 55 C55 35, 65 35, 70 45 Z" 
      fill={color} 
    />
  ),
  // Style 1: Spiky/Cool hair
  (color) => (
    <path 
      d="M62 48 L70 32 L80 40 L95 24 L108 38 L122 22 L132 38 L142 26 L144 50 L138 60 C130 50, 70 50, 62 60 Z" 
      fill={color} 
    />
  ),
  // Style 2: Long Locks / Bob
  (color) => (
    <g>
      {/* Back hair */}
      <path d="M55 70 C50 110, 65 140, 75 140 C85 140, 115 140, 125 140 C135 140, 150 110, 145 70 Z" fill={color} />
      {/* Front bangs */}
      <path d="M60 45 C65 20, 135 20, 140 45 C145 52, 138 52, 135 48 C125 38, 75 38, 65 48 C62 52, 55 52, 60 45 Z" fill={color} />
    </g>
  ),
  // Style 3: Curly / Afro puff
  (color) => (
    <path 
      d="M65 40 C50 40, 50 65, 60 70 C50 78, 60 95, 72 90 C80 100, 100 100, 108 90 C120 95, 130 80, 125 70 C135 65, 130 40, 118 45 C115 32, 90 28, 82 38 C75 30, 68 32, 65 40 Z" 
      fill={color} 
    />
  ),
  // Style 4: Cap/Hat
  (color) => (
    <g>
      {/* Stubble hair line */}
      <path d="M68 62 C75 58, 125 58, 132 62 C134 68, 135 70, 132 72 C125 68, 75 68, 68 72 Z" fill="#333" opacity="0.3" />
      {/* Cap Dome */}
      <path d="M65 50 C68 22, 132 22, 135 50 Z" fill={color} />
      {/* Visor/Brim */}
      <path d="M52 48 C80 44, 120 44, 148 48 C152 53, 142 55, 132 55 C120 54, 80 54, 68 55 C58 55, 48 53, 52 48 Z" fill={color} filter="brightness(0.85)" />
    </g>
  ),
  // Style 5: Bald (Shine highlight)
  () => (
    <path 
      d="M78 35 C88 32, 105 32, 112 35 C115 37, 110 39, 100 37 C90 35, 82 37, 78 35 Z" 
      fill="#fff" 
      opacity="0.3" 
    />
  )
];

const EYE_STYLES = [
  // Style 0: Classic Cute Dots
  () => (
    <g>
      <circle cx="85" cy="82" r="5" fill="#1e1e24" />
      <circle cx="83.5" cy="80.5" r="1.5" fill="#fff" />
      <circle cx="115" cy="82" r="5" fill="#1e1e24" />
      <circle cx="113.5" cy="80.5" r="1.5" fill="#fff" />
    </g>
  ),
  // Style 1: Happy arcs
  () => (
    <g fill="none" stroke="#1e1e24" strokeWidth="3" strokeLinecap="round">
      <path d="M80 84 Q85 78, 90 84" />
      <path d="M110 84 Q115 78, 120 84" />
    </g>
  ),
  // Style 2: Cool glasses
  () => (
    <g>
      {/* Glass frame left */}
      <circle cx="85" cy="82" r="11" fill="none" stroke="#1e1e24" strokeWidth="3" />
      <circle cx="85" cy="82" r="9" fill="rgba(6, 182, 212, 0.2)" />
      {/* Glass frame right */}
      <circle cx="115" cy="82" r="11" fill="none" stroke="#1e1e24" strokeWidth="3" />
      <circle cx="115" cy="82" r="9" fill="rgba(6, 182, 212, 0.2)" />
      {/* Bridge */}
      <line x1="96" y1="82" x2="104" y2="82" stroke="#1e1e24" strokeWidth="3" />
      {/* Frame wings */}
      <path d="M74 82 L66 80" stroke="#1e1e24" strokeWidth="3" />
      <path d="M126 82 L134 80" stroke="#1e1e24" strokeWidth="3" />
    </g>
  )
];

const MOUTH_STYLES = [
  // Style 0: Open Smile
  () => (
    <path 
      d="M86 98 Q100 114, 114 98 Q100 98, 86 98 Z" 
      fill="#ff6f61" 
      stroke="#1e1e24" 
      strokeWidth="2.5" 
      strokeLinejoin="round" 
    />
  ),
  // Style 1: Shy Smirk
  () => (
    <path 
      d="M93 100 Q105 104, 111 97" 
      fill="none" 
      stroke="#1e1e24" 
      strokeWidth="3" 
      strokeLinecap="round" 
    />
  ),
  // Style 2: Neutral
  () => (
    <line 
      x1="92" 
      y1="102" 
      x2="108" 
      y2="102" 
      stroke="#1e1e24" 
      strokeWidth="3" 
      strokeLinecap="round" 
    />
  )
];

// Helper to compile the full raw SVG source code as a string (with customizable shirt placeholder token)
export function compileRawSvgAvatar(skinColor, hairColor, shirtColor, nameSeed = '', hairStyle = null, eyeStyle = null, mouthStyle = null) {
  const hash = getHashCode(nameSeed);
  const hairIdx = hairStyle !== null && hairStyle !== undefined ? hairStyle : (hash % HAIR_STYLES.length);
  const eyeIdx = eyeStyle !== null && eyeStyle !== undefined ? eyeStyle : ((hash >> 2) % EYE_STYLES.length);
  const mouthIdx = mouthStyle !== null && mouthStyle !== undefined ? mouthStyle : ((hash >> 4) % MOUTH_STYLES.length);

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
      ${getEyeSvgString(eyeIdx)}

      <!-- Nose -->
      <path d="M97 90 Q100 93, 103 90" fill="none" stroke="#1e1e24" stroke-width="2.5" stroke-linecap="round" />

      <!-- Mouth -->
      ${getMouthSvgString(mouthIdx)}

      <!-- Hair -->
      ${getHairSvgString(hairIdx, hairColor)}

      <!-- Sparkle/Glow indicator -->
      <circle cx="45" cy="45" r="2" fill="#fff" opacity="0.2" />
    </svg>
  `.replace(/\s+/g, ' ').trim();
}

// Helper to compile the full raw SVG source code as string
export function compileSvgAvatar(skinColor, hairColor, shirtColor, nameSeed = '', hairStyle = null, eyeStyle = null, mouthStyle = null) {
  const hash = getHashCode(nameSeed);
  const hairIdx = hairStyle !== null && hairStyle !== undefined ? hairStyle : (hash % HAIR_STYLES.length);
  const eyeIdx = eyeStyle !== null && eyeStyle !== undefined ? eyeStyle : ((hash >> 2) % EYE_STYLES.length);
  const mouthIdx = mouthStyle !== null && mouthStyle !== undefined ? mouthStyle : ((hash >> 4) % MOUTH_STYLES.length);

  // Render static SVG template
  const svgContent = `
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
      ${getEyeSvgString(eyeIdx)}

      <!-- Nose -->
      <path d="M97 90 Q100 93, 103 90" fill="none" stroke="#1e1e24" stroke-width="2.5" stroke-linecap="round" />

      <!-- Mouth -->
      ${getMouthSvgString(mouthIdx)}

      <!-- Hair -->
      ${getHairSvgString(hairIdx, hairColor)}

      <!-- Sparkle/Glow indicator -->
      <circle cx="45" cy="45" r="2" fill="#fff" opacity="0.2" />
    </svg>
  `.replace(/\s+/g, ' ').trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
}

// String builders for raw SVG generation (used for Firestore upload)
function getHairSvgString(idx, color) {
  switch(idx) {
    case 0:
      return `<path d="M70 45 C75 15, 125 15, 130 45 C135 35, 145 35, 142 55 C140 70, 135 70, 132 60 C125 50, 75 50, 68 60 C65 70, 60 70, 58 55 C55 35, 65 35, 70 45 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />`;
    case 1:
      return `<path d="M62 48 L70 32 L80 40 L95 24 L108 38 L122 22 L132 38 L142 26 L144 50 L138 60 C130 50, 70 50, 62 60 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />`;
    case 2:
      return `
        <path d="M55 70 C50 110, 65 140, 75 140 C85 140, 115 140, 125 140 C135 140, 150 110, 145 70 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
        <path d="M60 45 C65 20, 135 20, 140 45 C145 52, 138 52, 135 48 C125 38, 75 38, 65 48 C62 52, 55 52, 60 45 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
      `;
    case 3:
      return `<path d="M65 40 C50 40, 50 65, 60 70 C50 78, 60 95, 72 90 C80 100, 100 100, 108 90 C120 95, 130 80, 125 70 C135 65, 130 40, 118 45 C115 32, 90 28, 82 38 C75 30, 68 32, 65 40 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />`;
    case 4:
      return `
        <path d="M68 62 C75 58, 125 58, 132 62 C134 68, 135 70, 132 72 C125 68, 75 68, 68 72 Z" fill="#333" opacity="0.3" />
        <path d="M65 50 C68 22, 132 22, 135 50 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" />
        <path d="M52 48 C80 44, 120 44, 148 48 C152 53, 142 55, 132 55 C120 54, 80 54, 68 55 C58 55, 48 53, 52 48 Z" fill="${color}" stroke="#1e1e24" stroke-width="3" filter="brightness(0.85)" />
      `;
    default:
      return `<path d="M78 35 C88 32, 105 32, 112 35 C115 37, 110 39, 100 37 C90 35, 82 37, 78 35 Z" fill="#fff" opacity="0.3" />`;
  }
}

function getEyeSvgString(idx) {
  switch(idx) {
    case 0:
      return `
        <circle cx="85" cy="82" r="5" fill="#1e1e24" />
        <circle cx="83.5" cy="80.5" r="1.5" fill="#fff" />
        <circle cx="115" cy="82" r="5" fill="#1e1e24" />
        <circle cx="113.5" cy="80.5" r="1.5" fill="#fff" />
      `;
    case 1:
      return `
        <path d="M80 84 Q85 78, 90 84" fill="none" stroke="#1e1e24" stroke-width="3" stroke-linecap="round" />
        <path d="M110 84 Q115 78, 120 84" fill="none" stroke="#1e1e24" stroke-width="3" stroke-linecap="round" />
      `;
    default:
      return `
        <circle cx="85" cy="82" r="11" fill="none" stroke="#1e1e24" stroke-width="3" />
        <circle cx="85" cy="82" r="9" fill="rgba(6, 182, 212, 0.2)" />
        <circle cx="115" cy="82" r="11" fill="none" stroke="#1e1e24" stroke-width="3" />
        <circle cx="115" cy="82" r="9" fill="rgba(6, 182, 212, 0.2)" />
        <line x1="96" y1="82" x2="104" y2="82" stroke="#1e1e24" stroke-width="3" />
        <path d="M74 82 L66 80" stroke="#1e1e24" stroke-width="3" />
        <path d="M126 82 L134 80" stroke="#1e1e24" stroke-width="3" />
      `;
  }
}

function getMouthSvgString(idx) {
  switch(idx) {
    case 0:
      return `<path d="M86 98 Q100 114, 114 98 Q100 98, 86 98 Z" fill="#ff6f61" stroke="#1e1e24" stroke-width="2.5" stroke-linejoin="round" />`;
    case 1:
      return `<path d="M93 100 Q105 104, 111 97" fill="none" stroke="#1e1e24" stroke-width="3" stroke-linecap="round" />`;
    default:
      return `<line x1="92" y1="102" x2="108" y2="102" stroke="#1e1e24" stroke-width="3" stroke-linecap="round" />`;
  }
}

// React component to render the avatar on the screen in real-time
export default function AvatarRenderer({ 
  skinColor = '#FCD34D', 
  hairColor = '#3F3F46', 
  shirtColor = '#06B6D4', 
  nameSeed = '',
  hairStyle = null,
  eyeStyle = null,
  mouthStyle = null
}) {
  const hash = getHashCode(nameSeed);
  
  const hairStyleFn = HAIR_STYLES[hairStyle !== null && hairStyle !== undefined ? hairStyle : (hash % HAIR_STYLES.length)];
  const eyeStyleFn = EYE_STYLES[eyeStyle !== null && eyeStyle !== undefined ? eyeStyle : ((hash >> 2) % EYE_STYLES.length)];
  const mouthStyleFn = MOUTH_STYLES[mouthStyle !== null && mouthStyle !== undefined ? mouthStyle : ((hash >> 4) % MOUTH_STYLES.length)];

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
      {/* Background Circle */}
      <circle cx="100" cy="100" r="95" fill="#bae6fd" stroke="#1e1e24" strokeWidth="3" />
      
      {/* Torso / Shirt */}
      <path 
        d="M50 160 C50 140, 70 135, 100 135 C130 135, 150 140, 150 160 C150 180, 150 200, 150 200 L50 200 Z" 
        fill={shirtColor} 
        stroke="#1e1e24" 
        strokeWidth="3" 
      />
      <path d="M85 135 Q100 150, 115 135" fill="none" stroke="#1e1e24" strokeWidth="2.5" />
      
      {/* Neck */}
      <rect x="90" y="118" width="20" height="22" rx="4" fill={skinColor} stroke="#1e1e24" strokeWidth="3" />
      <path d="M90 128 Q100 132, 110 128" fill="none" stroke="#1e1e24" strokeWidth="2" opacity="0.3" />

      {/* Ears */}
      <circle cx="61" cy="85" r="9" fill={skinColor} stroke="#1e1e24" strokeWidth="3" />
      <circle cx="139" cy="85" r="9" fill={skinColor} stroke="#1e1e24" strokeWidth="3" />

      {/* Head Base */}
      <rect x="65" y="52" width="70" height="74" rx="28" fill={skinColor} stroke="#1e1e24" strokeWidth="3" />

      {/* Eyes */}
      {eyeStyleFn()}

      {/* Nose */}
      <path d="M97 90 Q100 93, 103 90" fill="none" stroke="#1e1e24" strokeWidth="2.5" strokeLinecap="round" />

      {/* Mouth */}
      {mouthStyleFn()}

      {/* Hair */}
      {hairStyleFn(hairColor)}

      {/* Sparkle/Glow indicator */}
      <circle cx="45" cy="45" r="2" fill="#fff" opacity="0.2" />
    </svg>
  );
}
