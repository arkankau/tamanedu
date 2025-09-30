// This module should only be used server-side
import { executeQuery, generateId } from './mysql'

// Dynamic imports for Node.js modules (server-side only)
let fs: any = null
let path: any = null

// Initialize Node.js modules only on server-side
if (typeof window === 'undefined') {
  fs = require('fs/promises')
  path = require('path')
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf,text/csv').split(',')

export interface FileUpload {
  id: string
  user_id: string
  session_id?: string
  filename: string
  original_filename: string
  file_path: string
  file_size: number
  mime_type: string
  upload_type: 'worksheet' | 'answer_key' | 'export'
  created_at: string
}

export class FileStorageService {
  // Initialize upload directories
  static async initializeStorage(): Promise<void> {
    // Only run on server-side
    if (typeof window !== 'undefined' || !fs || !path) {
      return
    }
    
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
      await fs.mkdir(path.join(UPLOAD_DIR, 'worksheets'), { recursive: true })
      await fs.mkdir(path.join(UPLOAD_DIR, 'answer_keys'), { recursive: true })
      await fs.mkdir(path.join(UPLOAD_DIR, 'exports'), { recursive: true })
      console.log('✅ File storage directories initialized')
    } catch (error) {
      console.error('❌ Failed to initialize storage directories:', error)
    }
  }

  // Upload file
  static async uploadFile(
    file: File,
    userId: string,
    uploadType: 'worksheet' | 'answer_key' | 'export',
    sessionId?: string
  ): Promise<{ file: FileUpload | null, error: string | null }> {
    // Only run on server-side
    if (typeof window !== 'undefined' || !fs || !path) {
      return { file: null, error: 'File operations only available on server-side' }
    }
    
    try {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return { 
          file: null, 
          error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` 
        }
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { 
          file: null, 
          error: `File type ${file.type} is not allowed` 
        }
      }

      // Generate unique filename
      const fileId = generateId()
      const fileExtension = path.extname(file.name)
      const filename = `${fileId}${fileExtension}`
      const subDir = uploadType === 'worksheet' ? 'worksheets' : 
                     uploadType === 'answer_key' ? 'answer_keys' : 'exports'
      const filePath = path.join(UPLOAD_DIR, subDir, filename)

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true })

      // Save file to disk
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await fs.writeFile(filePath, buffer)

      // Save file metadata to database
      const fileRecord: Partial<FileUpload> = {
        id: fileId,
        user_id: userId,
        session_id: sessionId,
        filename: filename,
        original_filename: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        upload_type: uploadType
      }

      const result = await executeQuery(
        `INSERT INTO file_uploads 
         (id, user_id, session_id, filename, original_filename, file_path, file_size, mime_type, upload_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileRecord.id,
          fileRecord.user_id,
          fileRecord.session_id || null,
          fileRecord.filename,
          fileRecord.original_filename,
          fileRecord.file_path,
          fileRecord.file_size,
          fileRecord.mime_type,
          fileRecord.upload_type
        ]
      )

      if (result.error) {
        // Clean up file if database insert failed
        try {
          await fs.unlink(filePath)
        } catch (cleanupError) {
          console.error('Failed to cleanup file after database error:', cleanupError)
        }
        return { file: null, error: result.error }
      }

      return { 
        file: {
          ...fileRecord,
          created_at: new Date().toISOString()
        } as FileUpload, 
        error: null 
      }

    } catch (error: any) {
      console.error('File upload error:', error)
      return { file: null, error: 'Failed to upload file' }
    }
  }

  // Get file by ID
  static async getFile(fileId: string, userId: string): Promise<{ file: FileUpload | null, error: string | null }> {
    try {
      const result = await executeQuery<FileUpload>(
        'SELECT * FROM file_uploads WHERE id = ? AND user_id = ?',
        [fileId, userId]
      )

      if (result.error) {
        return { file: null, error: result.error }
      }

      const file = result.data[0] || null
      return { file, error: null }

    } catch (error: any) {
      console.error('Get file error:', error)
      return { file: null, error: 'Failed to get file' }
    }
  }

  // Get files by session
  static async getFilesBySession(
    sessionId: string, 
    userId: string, 
    uploadType?: 'worksheet' | 'answer_key' | 'export'
  ): Promise<{ files: FileUpload[], error: string | null }> {
    try {
      let query = 'SELECT * FROM file_uploads WHERE session_id = ? AND user_id = ?'
      const params = [sessionId, userId]

      if (uploadType) {
        query += ' AND upload_type = ?'
        params.push(uploadType)
      }

      query += ' ORDER BY created_at DESC'

      const result = await executeQuery<FileUpload>(query, params)

      if (result.error) {
        return { files: [], error: result.error }
      }

      return { files: result.data, error: null }

    } catch (error: any) {
      console.error('Get files by session error:', error)
      return { files: [], error: 'Failed to get files' }
    }
  }

  // Read file content
  static async readFile(fileId: string, userId: string): Promise<{ content: Buffer | null, error: string | null }> {
    // Only run on server-side
    if (typeof window !== 'undefined' || !fs || !path) {
      return { content: null, error: 'File operations only available on server-side' }
    }
    
    try {
      const { file, error } = await this.getFile(fileId, userId)

      if (error || !file) {
        return { content: null, error: error || 'File not found' }
      }

      // Check if file exists on disk
      try {
        await fs.access(file.file_path)
      } catch {
        return { content: null, error: 'File not found on disk' }
      }

      // Read file content
      const content = await fs.readFile(file.file_path)
      return { content, error: null }

    } catch (error: any) {
      console.error('Read file error:', error)
      return { content: null, error: 'Failed to read file' }
    }
  }

  // Delete file
  static async deleteFile(fileId: string, userId: string): Promise<{ success: boolean, error: string | null }> {
    // Only run on server-side
    if (typeof window !== 'undefined' || !fs || !path) {
      return { success: false, error: 'File operations only available on server-side' }
    }
    
    try {
      const { file, error } = await this.getFile(fileId, userId)

      if (error || !file) {
        return { success: false, error: error || 'File not found' }
      }

      // Delete from database
      const deleteResult = await executeQuery(
        'DELETE FROM file_uploads WHERE id = ? AND user_id = ?',
        [fileId, userId]
      )

      if (deleteResult.error) {
        return { success: false, error: deleteResult.error }
      }

      // Delete file from disk
      try {
        await fs.unlink(file.file_path)
      } catch (diskError) {
        console.warn('Failed to delete file from disk:', diskError)
        // Don't return error here since database deletion succeeded
      }

      return { success: true, error: null }

    } catch (error: any) {
      console.error('Delete file error:', error)
      return { success: false, error: 'Failed to delete file' }
    }
  }

  // Clean up orphaned files (files without database records)
  static async cleanupOrphanedFiles(): Promise<void> {
    // Only run on server-side
    if (typeof window !== 'undefined' || !fs || !path) {
      return
    }
    
    try {
      const directories = ['worksheets', 'answer_keys', 'exports']
      
      for (const dir of directories) {
        const dirPath = path.join(UPLOAD_DIR, dir)
        
        try {
          const files = await fs.readdir(dirPath)
          
          for (const filename of files) {
            const filePath = path.join(dirPath, filename)
            
            // Check if file exists in database
            const result = await executeQuery(
              'SELECT id FROM file_uploads WHERE filename = ?',
              [filename]
            )
            
            if (result.data.length === 0) {
              // File not in database, delete it
              await fs.unlink(filePath)
              console.log(`Cleaned up orphaned file: ${filename}`)
            }
          }
        } catch (dirError) {
          console.warn(`Failed to cleanup directory ${dir}:`, dirError)
        }
      }
    } catch (error) {
      console.error('Cleanup orphaned files error:', error)
    }
  }

  // Get file URL for serving
  static getFileUrl(fileId: string): string {
    return `/api/files/${fileId}`
  }
}

// Initialize storage on module load (server-side only)
if (typeof window === 'undefined') {
  FileStorageService.initializeStorage()
}

