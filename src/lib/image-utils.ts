import imageCompression from 'browser-image-compression';

async function convertHeicToWebP(file: File): Promise<File> {
  if (!file.type.includes('heic') && !file.name.toLowerCase().endsWith('.heic') && !file.name.toLowerCase().endsWith('.heif')) {
    return file;
  }
  
  const heic2any = (await import('heic2any')).default;
  const blob = await heic2any({
    blob: file,
    toType: 'image/webp',
    quality: 0.7
  }) as Blob;
  
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.webp'), {
    type: 'image/webp',
    lastModified: Date.now()
  });
}

export async function compressImage(file: File, maxWidth = 1080, quality = 0.7): Promise<File> {
  let processedFile = file;
  
  if (file.type.includes('heic') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
    processedFile = await convertHeicToWebP(file);
  }
  
  const options = {
    maxSizeMB: 0.3,
    maxWidthOrHeight: maxWidth,
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: quality,
  };
  
  const compressedFile = await imageCompression(processedFile, options);
  
  return new File([compressedFile], processedFile.name.replace(/\.[^.]+$/, '.webp'), {
    type: 'image/webp',
    lastModified: Date.now()
  });
}
