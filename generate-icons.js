/**
 * 生成 Tab Clean 图标 - 根据用户提供的样式
 * 蓝白简约：蓝色渐变圆角方形背景 + 两个白色圆点 + 白色底部线条
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 表（缓存优化）
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const crcData = Buffer.concat([typeBuffer, data]);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(crcData), 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function bilinearInterpolate(srcPixels, srcW, srcH, x, y) {
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x >= srcW - 1) x = srcW - 1;
  if (y >= srcH - 1) y = srcH - 1;
  
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, srcW - 1);
  const y1 = Math.min(y0 + 1, srcH - 1);
  
  const fx = x - x0;
  const fy = y - y0;
  
  const getPixel = (px, py) => {
    const idx = (py * srcW + px) * 4;
    return [srcPixels[idx], srcPixels[idx+1], srcPixels[idx+2], srcPixels[idx+3]];
  };
  
  const p00 = getPixel(x0, y0);
  const p10 = getPixel(x1, y0);
  const p01 = getPixel(x0, y1);
  const p11 = getPixel(x1, y1);
  
  const result = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const top = p00[i] * (1 - fx) + p10[i] * fx;
    const bottom = p01[i] * (1 - fx) + p11[i] * fx;
    result[i] = Math.round(top * (1 - fy) + bottom * fy);
  }
  
  return result;
}

// 生成一个高品质的图标像素数据（使用 256x256 作为源图）
function generateSourcePixels(size) {
  const width = size;
  const height = size;
  const pixels = new Uint8ClampedArray(width * height * 4);
  
  const centerX = width / 2;
  const centerY = height / 2;
  const cornerRadius = width * 0.2;
  
  // 生成蓝色渐变 + 白色图标元素
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // 圆角矩形检测
      const inRoundedRect = isInRoundedRect(x, y, width, height, cornerRadius);
      
      if (!inRoundedRect) {
        // 外部透明
        pixels[idx] = 0;
        pixels[idx+1] = 0;
        pixels[idx+2] = 0;
        pixels[idx+3] = 0;
      } else {
        // 计算是否在图标元素上（白色圆点和线条）
        const onIcon = isIconElement(x, y, width, height);
        
        if (onIcon) {
          // 白色图标元素
          pixels[idx] = 255;
          pixels[idx+1] = 255;
          pixels[idx+2] = 255;
          pixels[idx+3] = 255;
        } else {
          // 蓝色渐变背景
          // 根据用户提供的图标样式：顶部浅蓝，底部深蓝
          const normalizedY = y / height;  // 0 at top, 1 at bottom
          
          // 渐变：从 #667eea (顶部) 到 #4a6fff (底部)
          const topColor = [102, 126, 234];  // #667eea
          const bottomColor = [74, 111, 255]; // #4a6fff
          
          const r = Math.round(topColor[0] * (1 - normalizedY) + bottomColor[0] * normalizedY);
          const g = Math.round(topColor[1] * (1 - normalizedY) + bottomColor[1] * normalizedY);
          const b = Math.round(topColor[2] * (1 - normalizedY) + bottomColor[2] * normalizedY);
          
          pixels[idx] = r;
          pixels[idx+1] = g;
          pixels[idx+2] = b;
          pixels[idx+3] = 255;
        }
      }
    }
  }
  
  return pixels;
}

function isInRoundedRect(x, y, width, height, cornerRadius) {
  // 检查是否在主体矩形内
  if (x < 0 || x >= width || y < 0 || y >= height) return false;
  
  // 检查四个角
  if (x < cornerRadius && y < cornerRadius) {
    // 左上角
    const dx = x - cornerRadius;
    const dy = y - cornerRadius;
    return (dx * dx + dy * dy) <= (cornerRadius * cornerRadius);
  }
  if (x >= width - cornerRadius && y < cornerRadius) {
    // 右上角
    const dx = x - (width - cornerRadius - 1);
    const dy = y - cornerRadius;
    return (dx * dx + dy * dy) <= (cornerRadius * cornerRadius);
  }
  if (x < cornerRadius && y >= height - cornerRadius) {
    // 左下角
    const dx = x - cornerRadius;
    const dy = y - (height - cornerRadius - 1);
    return (dx * dx + dy * dy) <= (cornerRadius * cornerRadius);
  }
  if (x >= width - cornerRadius && y >= height - cornerRadius) {
    // 右下角
    const dx = x - (width - cornerRadius - 1);
    const dy = y - (height - cornerRadius - 1);
    return (dx * dx + dy * dy) <= (cornerRadius * cornerRadius);
  }
  
  // 矩形内部
  return true;
}

function isIconElement(x, y, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  
  // 两个白色圆点（眼睛样式）
  // 左圆点
  const leftEyeX = cx - width * 0.18;
  const leftEyeY = cy - height * 0.1;
  const leftEyeR = width * 0.12;
  
  const dx1 = x - leftEyeX;
  const dy1 = y - leftEyeY;
  const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  
  if (dist1 <= leftEyeR) return true;
  
  // 右圆点
  const rightEyeX = cx + width * 0.18;
  const rightEyeY = cy - height * 0.1;
  const rightEyeR = width * 0.12;
  
  const dx2 = x - rightEyeX;
  const dy2 = y - rightEyeY;
  const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  
  if (dist2 <= rightEyeR) return true;
  
  // 底部圆角矩形线条
  const rectY = cy + height * 0.12;
  const rectHeight = height * 0.1;
  const rectWidth = width * 0.5;
  const rectLeft = cx - rectWidth / 2;
  const rectRight = cx + rectWidth / 2;
  const rectTop = rectY - rectHeight / 2;
  const rectBottom = rectY + rectHeight / 2;
  
  // 主体矩形
  if (x >= rectLeft && x <= rectRight && y >= rectTop && y <= rectBottom) {
    return true;
  }
  
  // 左右半圆
  const arcR = rectHeight / 2;
  // 左半圆
  const leftArcCx = rectLeft;
  const leftArcCy = rectY;
  const dxL = x - leftArcCx;
  const dyL = y - leftArcCy;
  if (Math.sqrt(dxL * dxL + dyL * dyL) <= arcR) return true;
  
  // 右半圆
  const rightArcCx = rectRight;
  const rightArcCy = rectY;
  const dxR = x - rightArcCx;
  const dyR = y - rightArcCy;
  if (Math.sqrt(dxR * dxR + dyR * dyR) <= arcR) return true;
  
  return false;
}

function resizePixels(srcPixels, srcSize, targetSize) {
  const pixels = new Uint8ClampedArray(targetSize * targetSize * 4);
  const scale = srcSize / targetSize;
  
  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const srcX = (x + 0.5) * scale - 0.5;
      const srcY = (y + 0.5) * scale - 0.5;
      
      const pixel = bilinearInterpolate(srcPixels, srcSize, srcSize, srcX, srcY);
      const idx = (y * targetSize + x) * 4;
      pixels[idx] = pixel[0];
      pixels[idx+1] = pixel[1];
      pixels[idx+2] = pixel[2];
      pixels[idx+3] = pixel[3];
    }
  }
  
  return pixels;
}

function createPNGFromPixels(pixels, width, height) {
  // PNG 签名
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);
  
  // 生成带 filter byte 的图像数据
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rawData.push(pixels[idx], pixels[idx+1], pixels[idx+2], pixels[idx+3]);
    }
  }
  
  // IDAT chunk
  const compressed = zlib.deflateSync(Buffer.from(rawData), { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function generateIcon(targetSize) {
  // 先生成 256x256 的高质量源图
  const SOURCE_SIZE = 256;
  const sourcePixels = generateSourcePixels(SOURCE_SIZE);
  
  // 缩放到目标大小
  const targetPixels = resizePixels(sourcePixels, SOURCE_SIZE, targetSize);
  
  // 生成 PNG
  return createPNGFromPixels(targetPixels, targetSize, targetSize);
}

// 主程序
const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('🎨 生成 Tab Clean 图标...\n');

sizes.forEach(size => {
  const png = generateIcon(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`  ✓ ${filePath} (${png.length} 字节, ${size}x${size})`);
});

console.log('\n🎉 所有图标生成完成！');
console.log('💡 请回到 chrome://extensions/ 页面，点击 Tab Clean 的刷新按钮（⟳）重新加载扩展。');
