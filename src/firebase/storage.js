/**
 * Advanced HTML5 Canvas Face & Feature Tracking Pipeline
 * Uses YCbCr chrominance skin-segmentation to locate the face bounding box,
 * then dynamically samples hair color, hair length, glasses, and mouth curvature.
 */

// Curated natural human skin tones
const SKIN_PALETTE = [
  { hex: '#fed7aa', rgb: [254, 215, 170] }, // Warm Ivory
  { hex: '#fdba74', rgb: [253, 186, 116] }, // Peach / Light
  { hex: '#f59e0b', rgb: [245, 158, 11] },  // Amber
  { hex: '#d97706', rgb: [217, 119, 6] },   // Medium Brown
  { hex: '#b45309', rgb: [180, 83, 9] },    // Rich Bronze
  { hex: '#78350f', rgb: [120, 53, 15] },   // Deep Brown
  { hex: '#502008', rgb: [80, 32, 8] }      // Espresso
];

// Curated natural hair colors
const HAIR_PALETTE = [
  { hex: '#121214', rgb: [18, 18, 20] },    // Jet Black
  { hex: '#27272a', rgb: [39, 39, 42] },    // Dark Grey / Soft Black
  { hex: '#52525b', rgb: [82, 82, 91] },    // Grey / Ash
  { hex: '#78350f', rgb: [120, 53, 15] },   // Dark Brown
  { hex: '#b45309', rgb: [180, 83, 9] },    // Auburn / Red
  { hex: '#d97706', rgb: [217, 119, 6] },   // Golden Blonde
  { hex: '#fde047', rgb: [253, 224, 71] }   // Platinum Blonde
];

/**
 * Loads an image from a URL or File object.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    if (typeof src === 'string') {
      img.src = src;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(src);
    }
  });
}

/**
 * Calculates Euclidean distance between two RGB colors.
 */
function getColorDistance(rgb1, rgb2) {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  );
}

/**
 * Finds the closest palette color to the sampled RGB.
 */
function findClosestColor(sampledRgb, palette) {
  let minDistance = Infinity;
  let closest = palette[0].hex;
  
  for (const color of palette) {
    const d = getColorDistance(sampledRgb, color.rgb);
    if (d < minDistance) {
      minDistance = d;
      closest = color.hex;
    }
  }
  return closest;
}

/**
 * YCbCr skin tone classifier. Highly ethnic-independent because it removes
 * luminance (brightness) and focuses purely on chrominance ranges.
 */
function isSkinPixel(r, g, b) {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  // Standard human chrominance bounding values
  return r > 50 && g > 30 && b > 20 && r > g && r > b && (cr > 133 && cr < 178) && (cb > 80 && cb < 135);
}

/**
 * Helper to convert hex string to RGB array.
 */
function hexToRgb(hex) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

/**
 * Detects the face bounding box using skin-color segmentation.
 */
function findFaceBoundingBox(ctx, size) {
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  
  let minX = size, maxX = 0, minY = size, maxY = 0;
  let count = 0;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const r = data[idx];
      const g = data[idx+1];
      const b = data[idx+2];
      
      if (isSkinPixel(r, g, b)) {
        // Constrain to center-ish region to filter background noise
        if (x > size * 0.15 && x < size * 0.85 && y > size * 0.2 && y < size * 0.85) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          count++;
        }
      }
    }
  }
  
  // Fallback if no face detected (use center)
  if (count < 80) {
    return {
      left: Math.round(size * 0.3),
      right: Math.round(size * 0.7),
      top: Math.round(size * 0.3),
      bottom: Math.round(size * 0.75),
      width: Math.round(size * 0.4),
      height: Math.round(size * 0.45)
    };
  }
  
  return {
    left: minX,
    right: maxX,
    top: minY,
    bottom: maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Processes a guest's selfie, extracts skin and hair colors,
 * detects glasses, hair style, and facial expression.
 */
export async function extractAvatarColors(fileOrDataUrl) {
  try {
    const img = await loadImage(fileOrDataUrl);

    // Create canvas
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Square crop
    let srcX = 0;
    let srcY = 0;
    let srcWidth = img.width;
    let srcHeight = img.height;

    if (img.width > img.height) {
      srcWidth = img.height;
      srcX = (img.width - img.height) / 2;
    } else {
      srcHeight = img.width;
      srcY = (img.height - img.width) / 2;
    }

    ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, size, size);

    // 1. Locate Face Bounding Box
    const face = findFaceBoundingBox(ctx, size);

    // 2. Sample Skin Tone: Center of the detected face box
    const skinX = face.left + Math.round(face.width * 0.4);
    const skinY = face.top + Math.round(face.height * 0.45);
    const skinSize = Math.max(2, Math.round(face.width * 0.15));
    
    const skinImg = ctx.getImageData(skinX, skinY, skinSize, skinSize).data;
    let rSkin = 0, gSkin = 0, bSkin = 0, skinCount = 0;
    for (let i = 0; i < skinImg.length; i += 4) {
      rSkin += skinImg[i];
      gSkin += skinImg[i+1];
      bSkin += skinImg[i+2];
      skinCount++;
    }
    const avgSkin = skinCount > 0 ? [Math.round(rSkin/skinCount), Math.round(gSkin/skinCount), Math.round(bSkin/skinCount)] : [254, 215, 170];
    const skinColor = findClosestColor(avgSkin, SKIN_PALETTE);

    // 3. Sample Hair Color: Immediately above the detected face top (y: faceTop - 12)
    const hairX = face.left + Math.round(face.width * 0.4);
    const hairY = Math.max(2, face.top - 12);
    const hairSize = Math.max(2, Math.round(face.width * 0.15));
    
    const hairImg = ctx.getImageData(hairX, hairY, hairSize, hairSize).data;
    let rHair = 0, gHair = 0, bHair = 0, hairCount = 0;
    for (let i = 0; i < hairImg.length; i += 4) {
      rHair += hairImg[i];
      gHair += hairImg[i+1];
      bHair += hairImg[i+2];
      hairCount++;
    }
    const avgHair = hairCount > 0 ? [Math.round(rHair/hairCount), Math.round(gHair/hairCount), Math.round(bHair/hairCount)] : [39, 39, 42];
    const hairColor = findClosestColor(avgHair, HAIR_PALETTE);

    // 4. Estimate Hair Style: Check pixels to the left & right of the face box (sides)
    const hairRgb = hexToRgb(hairColor);
    const hairTolerance = 52; // Matching color threshold

    const isHairPixel = (r, g, b) => {
      return getColorDistance([r, g, b], hairRgb) < hairTolerance;
    };

    // Scan side panels next to cheeks/shoulders
    const sideWidth = Math.max(4, Math.round(face.width * 0.3));
    const sideHeight = Math.max(5, Math.round(face.height * 0.5));
    const sideY = face.top + Math.round(face.height * 0.3);
    
    const leftX = Math.max(0, face.left - sideWidth);
    const rightX = Math.min(size - sideWidth, face.right);

    const leftSideImg = ctx.getImageData(leftX, sideY, sideWidth, sideHeight).data;
    const rightSideImg = ctx.getImageData(rightX, sideY, sideWidth, sideHeight).data;
    
    let sideHairCount = 0;
    let sideTotal = 0;

    for (let i = 0; i < leftSideImg.length; i += 4) {
      if (isHairPixel(leftSideImg[i], leftSideImg[i+1], leftSideImg[i+2])) sideHairCount++;
      if (isHairPixel(rightSideImg[i], rightSideImg[i+1], rightSideImg[i+2])) sideHairCount++;
      sideTotal += 2;
    }

    const sideHairRatio = sideTotal > 0 ? sideHairCount / sideTotal : 0;

    let hairStyle = 0; // Default: Short/Classic Crop

    if (sideHairRatio > 0.16) {
      // High hair pixel density on the sides = Long Hair (Style 2: Bob/Long locks)
      hairStyle = 2;
    } else {
      // Check top of the head for hair
      const topWidth = Math.round(face.width * 0.5);
      const topHeight = Math.max(2, Math.round(face.height * 0.2));
      const topHairX = face.left + Math.round(face.width * 0.25);
      const topHairY = Math.max(0, face.top - topHeight);
      
      const topHairImg = ctx.getImageData(topHairX, topHairY, topWidth, topHeight).data;
      let topHairCount = 0;
      let topTotal = 0;
      for (let i = 0; i < topHairImg.length; i += 4) {
        if (isHairPixel(topHairImg[i], topHairImg[i+1], topHairImg[i+2])) topHairCount++;
        topTotal++;
      }
      
      const topHairRatio = topTotal > 0 ? topHairCount / topTotal : 0;
      
      if (topHairRatio > 0.2) {
        hairStyle = topHairRatio > 0.45 ? 1 : 0; // 1 = Spiky, 0 = Short Crop
      } else {
        hairStyle = 5; // Bald / Shaved stubble
      }
    }

    // 5. Glasses Detection (Eye-bridge scan)
    const bridgeX = face.left + Math.round(face.width * 0.35);
    const bridgeY = face.top + Math.round(face.height * 0.36);
    const bridgeW = Math.round(face.width * 0.3);
    const bridgeH = Math.round(face.height * 0.08);

    const bridgeData = ctx.getImageData(bridgeX, bridgeY, bridgeW, bridgeH).data;
    let darkPixels = 0;
    let bridgeTotal = 0;
    for (let i = 0; i < bridgeData.length; i += 4) {
      const luminance = 0.299 * bridgeData[i] + 0.587 * bridgeData[i+1] + 0.114 * bridgeData[i+2];
      if (luminance < 80) darkPixels++;
      bridgeTotal++;
    }
    const darkRatio = bridgeTotal > 0 ? darkPixels / bridgeTotal : 0;
    const eyeStyle = darkRatio > 0.15 ? 2 : 0; // 2 = Glasses, 0 = Normal

    // 6. Facial Expression / Smile Detection (Mouth scan)
    // Mouth is in the lower 70% to 90% of the face height
    const mouthX = face.left + Math.round(face.width * 0.3);
    const mouthY = face.top + Math.round(face.height * 0.7);
    const mouthW = Math.round(face.width * 0.4);
    const mouthH = Math.round(face.height * 0.18);

    const mouthData = ctx.getImageData(mouthX, mouthY, mouthW, mouthH).data;
    let lipPixels = 0;
    let mouthTotal = 0;
    let whitePixels = 0; // Detect open teeth smiling

    for (let i = 0; i < mouthData.length; i += 4) {
      const r = mouthData[i];
      const g = mouthData[i+1];
      const b = mouthData[i+2];
      
      // Lips are generally redder/pinker than cheeks
      if (r - g > 25 && r - b > 10) {
        lipPixels++;
      }
      // Teeth are bright white
      if (r > 190 && g > 190 && b > 190) {
        whitePixels++;
      }
      mouthTotal++;
    }

    const lipRatio = mouthTotal > 0 ? lipPixels / mouthTotal : 0;
    const teethRatio = mouthTotal > 0 ? whitePixels / mouthTotal : 0;
    
    // A smiling mouth has a wider red area or visible teeth
    const mouthStyle = (lipRatio > 0.08 || teethRatio > 0.015) ? 0 : 2; // 0 = Smile, 2 = Neutral

    return { skinColor, hairColor, hairStyle, eyeStyle, mouthStyle };
  } catch (error) {
    console.error('Error extracting colors from image:', error);
    return { skinColor: '#fed7aa', hairColor: '#27272a', hairStyle: 0, eyeStyle: 0, mouthStyle: 0 };
  }
}

// Kept signature for backwards compatibility
export async function processAndUploadAvatar(userId, fileOrDataUrl) {
  const colors = await extractAvatarColors(fileOrDataUrl);
  return JSON.stringify(colors);
}
