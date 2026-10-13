'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, Image as ImageIcon, X, CheckCircle2, Sparkles, FileImage, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

type AdminFileUploadProps = {
  name: string
  existingImageUrl?: string | null
  accept?: string
  label?: string
  hint?: string
  maxSizeMb?: number
  onFileSelect?: (file: File | null) => void
}

export default function AdminFileUpload({
  name = 'image',
  existingImageUrl = null,
  accept = 'image/png,image/jpeg,image/webp',
  label = 'Cover Image (PNG, JPEG, WebP)',
  hint = 'Drag and drop or browse — Recommended ratio 16:9, max 5MB',
  maxSizeMb = 5,
  onFileSelect,
}: AdminFileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const reduceMotion = useReducedMotion()

  const handleFile = useCallback((selectedFile: File | null) => {
    setUploadError(null)
    if (!selectedFile) {
      setFile(null)
      setPreviewUrl(existingImageUrl)
      onFileSelect?.(null)
      return
    }

    // Validate size
    if (selectedFile.size > maxSizeMb * 1024 * 1024) {
      setUploadError(`File exceeds maximum size of ${maxSizeMb}MB.`)
      return
    }

    setFile(selectedFile)
    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)
    onFileSelect?.(selectedFile)
  }, [existingImageUrl, maxSizeMb, onFileSelect])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setFile(null)
    setPreviewUrl(null)
    if (inputRef.current) inputRef.current.value = ''
    onFileSelect?.(null)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="admin-cyber-upload-wrapper">
      <div className="admin-cyber-upload-head">
        <span className="admin-cyber-upload-label">
          <FileImage size={13} className="text-blue-400" />
          {label}
        </span>
        {previewUrl && (
          <span className="admin-cyber-upload-status">
            <CheckCircle2 size={11} className="text-emerald-400" />
            {file ? 'New image staged' : 'Current asset active'}
          </span>
        )}
      </div>

      {/* Hidden real inputs for server action FormData */}
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        className="admin-cyber-file-native"
        tabIndex={-1}
        id={`upload-${name}`}
      />
      {existingImageUrl && !file && (
        <input type="hidden" name="existingImageUrl" value={existingImageUrl} />
      )}

      {/* Interactive Drop / Upload Zone */}
      <motion.div
        className={`admin-cyber-dropzone ${isDragging ? 'admin-cyber-dropzone--active' : ''} ${previewUrl ? 'admin-cyber-dropzone--has-file' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={reduceMotion ? undefined : { scale: 1.006 }}
        whileTap={reduceMotion ? undefined : { scale: 0.995 }}
        transition={{ duration: 0.18 }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        {/* Animated Cyber Glow Overlay */}
        <div className="admin-cyber-glow-layer" />

        <AnimatePresence mode="wait">
          {previewUrl ? (
            <motion.div
              key="preview"
              className="admin-cyber-preview-layout"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
            >
              <div className="admin-cyber-preview-thumb-wrap">
                <img
                  src={previewUrl}
                  alt="Asset Preview"
                  className="admin-cyber-preview-img"
                />
                <div className="admin-cyber-preview-overlay">
                  <RefreshCw size={16} className="text-white" />
                  <span>Click to change</span>
                </div>
              </div>

              <div className="admin-cyber-preview-meta">
                <div className="admin-cyber-preview-title">
                  <strong>{file ? file.name : 'Current Image'}</strong>
                  <span className="admin-cyber-preview-badge">
                    {file ? formatSize(file.size) : 'Hosted on CDN'}
                  </span>
                </div>
                <p className="admin-cyber-preview-hint">
                  {file ? 'Ready for publishing with form submission' : 'Click area or drag a replacement file to swap'}
                </p>
              </div>

              <button
                type="button"
                className="admin-cyber-remove-btn"
                onClick={handleClear}
                title="Remove image"
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="admin-cyber-empty-content"
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <div className="admin-cyber-icon-halo">
                <motion.div
                  animate={isDragging || isHovered ? { y: [-2, 2, -2] } : { y: 0 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                >
                  <Upload size={20} className="text-blue-400" />
                </motion.div>
                <div className="admin-cyber-halo-pulse" />
              </div>

              <div className="admin-cyber-drop-text">
                <p className="admin-cyber-primary-text">
                  <span className="text-blue-400 font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="admin-cyber-hint-text">{hint}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {uploadError && (
        <p className="admin-cyber-upload-error" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  )
}
