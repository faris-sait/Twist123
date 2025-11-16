/**
 * Compresses an image file to ensure it's under the target size
 * @param {File} file - The image file to compress
 * @param {number} maxSizeMB - Maximum size in megabytes (default: 5MB)
 * @param {number} maxWidthOrHeight - Maximum width or height in pixels (default: 1920)
 * @returns {Promise<string>} - Base64 encoded image string
 */
export async function compressImage(file, maxSizeMB = 5, maxWidthOrHeight = 1920) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = (height * maxWidthOrHeight) / width;
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = (width * maxWidthOrHeight) / height;
            height = maxWidthOrHeight;
          }
        }
        
        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Start with high quality
        let quality = 0.9;
        let base64String = canvas.toDataURL('image/jpeg', quality);
        
        // Iteratively reduce quality until size is acceptable
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        
        // Estimate base64 size (roughly 1.33x the actual data size)
        while (base64String.length > maxSizeBytes * 1.33 && quality > 0.1) {
          quality -= 0.1;
          base64String = canvas.toDataURL('image/jpeg', quality);
        }
        
        // If still too large, reduce dimensions
        if (base64String.length > maxSizeBytes * 1.33) {
          width = Math.floor(width * 0.8);
          height = Math.floor(height * 0.8);
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          base64String = canvas.toDataURL('image/jpeg', 0.8);
        }
        
        resolve(base64String);
      };
      
      img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Get human-readable file size
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Estimate base64 string size in bytes
 * @param {string} base64String - Base64 encoded string
 * @returns {number} - Estimated size in bytes
 */
export function getBase64Size(base64String) {
  const stringLength = base64String.length - 'data:image/jpeg;base64,'.length;
  return Math.floor(stringLength * 0.75);
}
