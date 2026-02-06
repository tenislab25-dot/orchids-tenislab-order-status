import imageCompression from 'browser-image-compression';

async function convertHeicToJpeg(file: File): Promise<File> {
  if (!file.type.includes('heic') && !file.name.toLowerCase().endsWith('.heic') && !file.name.toLowerCase().endsWith('.heif')) {
    return file;
  }
  
  const heic2any = (await import('heic2any')).default;
  const blob = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.8
  }) as Blob;
  
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
    type: 'image/jpeg',
    lastModified: Date.now()
  });
}

export async function compressImage(file: File, maxWidth = 1080, quality = 0.7): Promise<File> {
  let processedFile = file;
  
  if (file.type.includes('heic') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
    processedFile = await convertHeicToJpeg(file);
  }
  
  const options = {
    maxSizeMB: 0.3,
    maxWidthOrHeight: maxWidth,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    initialQuality: quality,
  };
  
  const compressedFile = await imageCompression(processedFile, options);
  
  return new File([compressedFile], processedFile.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg',
    lastModified: Date.now()
  });
}
