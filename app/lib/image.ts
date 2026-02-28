/**
 * Shared utility for client-side image compression.
 * Resizes images to a maximum dimension (default 1200px) 
 * and compresses them to JPEG format with a quality setting (default 0.7).
 */
export const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
            const img = new window.Image()
            img.src = event.target?.result as string
            img.onload = () => {
                const canvas = document.createElement("canvas")
                let width = img.width
                let height = img.height

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width
                        width = maxWidth
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height
                        height = maxHeight
                    }
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext("2d")
                ctx?.drawImage(img, 0, 0, width, height)

                // Convert to JPEG with specified quality to reduce file size
                const dataUrl = canvas.toDataURL("image/jpeg", quality)
                resolve(dataUrl)
            }
            img.onerror = (err) => reject(new Error("Image loading failed: " + err))
        }
        reader.onerror = (err) => reject(new Error("File reading failed: " + err))
    })
}
