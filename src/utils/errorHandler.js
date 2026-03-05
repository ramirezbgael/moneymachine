/**
 * Error handling utilities
 * Centralized error handling and user feedback
 */

export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = null) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
  }
}

/**
 * Handle API errors
 */
export const handleApiError = (error) => {
  if (error instanceof AppError) {
    return error
  }

  // Supabase errors
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        return new AppError('Resource not found', 'NOT_FOUND', error)
      case '23505':
        return new AppError('Duplicate entry', 'DUPLICATE', error)
      case '23503':
        return new AppError('Referenced resource not found', 'FOREIGN_KEY', error)
      default:
        return new AppError(error.message || 'Database error', 'DATABASE_ERROR', error)
    }
  }

  // Network errors
  if (error?.message?.includes('fetch')) {
    return new AppError('Network error. Please check your connection.', 'NETWORK_ERROR', error)
  }

  // Default
  return new AppError(error?.message || 'An unexpected error occurred', 'UNKNOWN_ERROR', error)
}

/**
 * Show error notification to user
 */
export const showError = (error, context = '') => {
  const message = error instanceof AppError ? error.message : error?.message || 'An error occurred'
  console.error(`[${context}]`, error)
  
  // In production, integrate with a toast/notification system
  // For now, we'll use alert as fallback
  if (process.env.NODE_ENV === 'development') {
    alert(`${context ? `[${context}] ` : ''}${message}`)
  }
  
  return message
}

/**
 * Show success notification
 */
export const showSuccess = (message) => {
  console.log('[Success]', message)
  // In production, integrate with a toast/notification system
  if (process.env.NODE_ENV === 'development') {
    console.log('Success:', message)
  }
}