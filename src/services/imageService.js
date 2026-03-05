/**
 * Image Service
 * Handles image upload to Supabase Storage
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Upload product image to Supabase Storage
 * @param {File|string} imageFile - File object or base64 string
 * @param {string} productId - Product ID for unique filename
 * @returns {Promise<string>} Public URL of uploaded image
 */
export const uploadProductImage = async (imageFile, productId) => {
  if (!isSupabaseConfigured() || !supabase) {
    // Mock mode: return base64 data URL
    if (typeof imageFile === 'string') {
      return imageFile
    }
    // Convert file to base64 for mock mode
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(imageFile)
    })
  }

  try {
    let fileToUpload
    let fileName = `product-${productId || Date.now()}-${Math.random().toString(36).substring(7)}.png`

    // Convert base64 to blob if needed
    if (typeof imageFile === 'string') {
      // Base64 string
      const response = await fetch(imageFile)
      const blob = await response.blob()
      fileToUpload = blob
    } else {
      // File object
      fileToUpload = imageFile
      fileName = `product-${productId || Date.now()}-${fileToUpload.name}`
    }

    // Upload to Supabase Storage bucket 'product-images'
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading image:', error)
      // If bucket doesn't exist, fall back to base64
      if (error.message && error.message.includes('Bucket not found')) {
        console.warn('⚠️ Storage bucket not found, using base64 fallback')
        if (typeof imageFile === 'string') {
          return imageFile
        }
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(imageFile)
        })
      }
      throw error
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error('Error in uploadProductImage:', error)
    // Fallback to base64 if upload fails
    if (typeof imageFile === 'string') {
      return imageFile
    }
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(imageFile)
    })
  }
}

/**
 * Delete product image from Supabase Storage
 * @param {string} imageUrl - Public URL or path of image to delete
 */
export const deleteProductImage = async (imageUrl) => {
  if (!isSupabaseConfigured() || !supabase) {
    return // Mock mode: nothing to delete
  }

  try {
    // Extract path from URL
    const urlParts = imageUrl.split('/storage/v1/object/public/product-images/')
    if (urlParts.length < 2) {
      console.warn('Invalid image URL format:', imageUrl)
      return
    }

    const filePath = urlParts[1]
    
    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath])

    if (error) {
      console.error('Error deleting image:', error)
    }
  } catch (error) {
    console.error('Error in deleteProductImage:', error)
  }
}

export const imageService = {
  uploadProductImage,
  deleteProductImage
}
