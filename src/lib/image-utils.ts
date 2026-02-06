import imageCompression from 'browser-image-compression';

export async function compressImage(file: File, maxWidth = 1080, quality = 0.7): Promise<File> {
  // Se for HEIC, a biblioteca imageCompression vai converter automaticamente
  // Não precisa de conversão intermediária para JPEG!
  
  const options = {
    maxSizeMB: 0.3,
    maxWidthOrHeight: maxWidth,
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: quality,
  };
  
  const compressedFile = await imageCompression(file, options);
  
  return new File([compressedFile], file.name.replace(/\.[^.]+$/, '.webp'), {
    type: 'image/webp',
    lastModified: Date.now()
  });
}
