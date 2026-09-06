import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FolderPlus, Folder, Music, Upload, Play, Pause, Trash2, Plus, X, Clock } from 'lucide-react'
import { db, type AudioFolder, type AudioFile } from '../../lib/db'
import { useAppStore } from '../../store/useAppStore'
import { t } from '../../lib/i18n'

export default function Reminiscence() {
  const navigate = useNavigate()
  const { language } = useAppStore()
  const [folders, setFolders] = useState<AudioFolder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<AudioFolder | null>(null)
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [playingId, setPlayingId] = useState<number | string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showSundowning, setShowSundowning] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const SUNDOWNING_TRACKS = [
    { id: 'sd-1', name: 'Calming Wind', duration: 180, url: '/sounds/Wind.mp3' },
    { id: 'sd-2', name: 'Evening Nature Birds', duration: 300, url: '/sounds/Bird.mp3' },
    { id: 'sd-3', name: 'Soft Rain & Wind Chimes', duration: 240, url: '/sounds/Rain.mp3' },
    { id: 'sd-4', name: 'Brahmaputra Riverside Calm', duration: 360, url: '/sounds/Water_Drop.mp3' }
  ];

  // Load folders
  useEffect(() => {
    loadFolders()
  }, [])

  // Load files when folder is selected
  useEffect(() => {
    if (selectedFolder?.id) {
      loadFiles(selectedFolder.id)
    }
  }, [selectedFolder])

  const loadFolders = async () => {
    const allFolders = await db.audio_folders.orderBy('created_at').reverse().toArray()
    setFolders(allFolders)
  }

  const loadFiles = async (folderId: number) => {
    const files = await db.audio_files.where('folder_id').equals(folderId).toArray()
    setAudioFiles(files)
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    await db.audio_folders.add({
      name: newFolderName.trim(),
      created_at: new Date().toISOString()
    })
    setNewFolderName('')
    setShowNewFolder(false)
    loadFolders()
  }

  const deleteFolder = async (folderId: number) => {
    if (!confirm('Delete this folder and all its audio files?')) return
    // Delete all audio files in folder
    await db.audio_files.where('folder_id').equals(folderId).delete()
    await db.audio_folders.delete(folderId)
    if (selectedFolder?.id === folderId) {
      setSelectedFolder(null)
      setAudioFiles([])
    }
    loadFolders()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !selectedFolder?.id) return

    setUploading(true)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('audio/')) continue

      // Get audio duration
      const duration = await getAudioDuration(file)

      await db.audio_files.add({
        folder_id: selectedFolder.id,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        blob: file,
        duration: Math.round(duration),
        created_at: new Date().toISOString()
      })
    }
    setUploading(false)
    loadFiles(selectedFolder.id)
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.preload = 'metadata'
      audio.onloadedmetadata = () => {
        resolve(audio.duration || 0)
        URL.revokeObjectURL(audio.src)
      }
      audio.onerror = () => resolve(0)
      audio.src = URL.createObjectURL(file)
    })
  }

  const playAudio = (file: AudioFile) => {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause()
      URL.revokeObjectURL(audioRef.current.src)
    }

    if (playingId === file.id) {
      setPlayingId(null)
      return
    }

    const url = URL.createObjectURL(file.blob)
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => {
      setPlayingId(null)
      URL.revokeObjectURL(url)
    }
    audio.play()
    setPlayingId(file.id ?? null)
  }

  const playStaticAudio = (trackId: string, url: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src)
      }
    }
    
    if (playingId === trackId) {
      setPlayingId(null)
      return
    }

    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => setPlayingId(null)
    audio.play()
    setPlayingId(trackId)
  }

  const deleteFile = async (fileId: number) => {
    if (playingId === fileId && audioRef.current) {
      audioRef.current.pause()
      setPlayingId(null)
    }
    await db.audio_files.delete(fileId)
    if (selectedFolder?.id) loadFiles(selectedFolder.id)
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-background dark:bg-[#121212] font-sans pb-24">
      {/* Header */}
      <header className="px-6 py-4 flex items-center gap-4 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-[#1E293B] sticky top-0 z-10">
        <button onClick={() => {
          if (showSundowning) setShowSundowning(false)
          else if (selectedFolder) setSelectedFolder(null)
          else navigate('/patient')
        }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-700 dark:text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            {showSundowning ? t('Sundowning Therapy', language) : selectedFolder ? selectedFolder.name : t('Reminiscence', language)}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {showSundowning
              ? t('Evening calm & relaxation', language)
              : selectedFolder
                ? `${audioFiles.length} audio files`
                : t('Music, stories and memories from past', language)
            }
          </p>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-3xl mx-auto">
        {showSundowning ? (
          // =================== SUNDOWNING THERAPY VIEW ===================
          <div className="space-y-3 animate-in fade-in duration-300">
            {SUNDOWNING_TRACKS.map((track, idx) => (
              <div
                key={track.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  playingId === track.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-500/40 shadow-md'
                    : 'bg-white dark:bg-[#1E293B] border-gray-100 dark:border-white/10 hover:shadow-sm'
                }`}
              >
                <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-6 text-center">{idx + 1}</span>

                <button
                  onClick={() => playStaticAudio(track.id, track.url)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                    playingId === track.id
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                  }`}
                >
                  {playingId === track.id ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-800 dark:text-white text-sm truncate">{track.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDuration(track.duration)}</span>
                  </div>
                </div>

                {playingId === track.id && (
                  <div className="flex items-end gap-0.5 h-4">
                    <div className="w-1 bg-indigo-500 rounded-full animate-bounce" style={{ height: '100%', animationDelay: '0ms' }} />
                    <div className="w-1 bg-indigo-500 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '150ms' }} />
                    <div className="w-1 bg-indigo-500 rounded-full animate-bounce" style={{ height: '80%', animationDelay: '300ms' }} />
                    <div className="w-1 bg-indigo-500 rounded-full animate-bounce" style={{ height: '40%', animationDelay: '450ms' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : !selectedFolder ? (
          // =================== FOLDER LIST VIEW ===================
          <>
            {/* Create Folder Button */}
            {!showNewFolder && (
              <button
                onClick={() => setShowNewFolder(true)}
                className="w-full mb-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-4 flex items-center justify-center gap-3 font-bold text-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
              >
                <FolderPlus size={24} />
                {t('Create New Folder', language)}
              </button>
            )}

            {/* New Folder Input */}
            {showNewFolder && (
              <div className="mb-6 bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-white/10 animate-in slide-in-from-top-2">
                <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">Folder Name</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createFolder()}
                    placeholder="e.g. Old Songs, Bhajans, Stories..."
                    autoFocus
                    className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button onClick={createFolder} className="bg-amber-500 text-white px-5 py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors">
                    Create
                  </button>
                  <button onClick={() => { setShowNewFolder(false); setNewFolderName('') }} className="p-3 text-gray-400 hover:text-red-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Folder Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* Static Folder: Sundowning Therapy */}
              <div
                onClick={() => setShowSundowning(true)}
                className="relative group bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 shadow-sm border border-indigo-100 dark:border-indigo-800/50 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mb-3">
                    <Music size={32} className="text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-sm leading-tight">Sundowning Therapy</h3>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-300 mt-1 uppercase font-bold tracking-wider">
                    Evening Calm
                  </p>
                </div>
              </div>

              {folders.map(folder => (
                  <div
                    key={folder.id}
                    className="relative group bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/10 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
                  >
                    <div onClick={() => setSelectedFolder(folder)} className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-3">
                        <Folder size={32} className="text-amber-500" />
                      </div>
                      <h3 className="font-bold text-gray-800 dark:text-white text-sm leading-tight">{folder.name}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(folder.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id!) }}
                      className="absolute top-2 right-2 p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
          </>
        ) : (
          // =================== AUDIO FILES VIEW (Inside Folder) ===================
          <>
            {/* Upload Button */}
            <input
              type="file"
              accept="audio/*"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full mb-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-4 flex items-center justify-center gap-3 font-bold text-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload size={24} />
              )}
              {uploading ? t('Switching...', language).replace('Switching', 'Uploading') : t('Upload Audio', language)}
            </button>

            {/* Audio List */}
            {audioFiles.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload size={36} className="text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-700 dark:text-white mb-2">No Audio Files</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                  Upload songs, bhajans, stories or any audio that brings back memories.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {audioFiles.map((file, idx) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      playingId === file.id
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-500/40 shadow-md'
                        : 'bg-white dark:bg-[#1E293B] border-gray-100 dark:border-white/10 hover:shadow-sm'
                    }`}
                  >
                    {/* Track Number */}
                    <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-6 text-center">{idx + 1}</span>

                    {/* Play/Pause Button */}
                    <button
                      onClick={() => playAudio(file)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                        playingId === file.id
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                      }`}
                    >
                      {playingId === file.id ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 dark:text-white text-sm truncate">{file.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDuration(file.duration)}</span>
                      </div>
                    </div>

                    {/* Playing Indicator */}
                    {playingId === file.id && (
                      <div className="flex items-end gap-0.5 h-4">
                        <div className="w-1 bg-amber-500 rounded-full animate-bounce" style={{ height: '100%', animationDelay: '0ms' }} />
                        <div className="w-1 bg-amber-500 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '150ms' }} />
                        <div className="w-1 bg-amber-500 rounded-full animate-bounce" style={{ height: '80%', animationDelay: '300ms' }} />
                        <div className="w-1 bg-amber-500 rounded-full animate-bounce" style={{ height: '40%', animationDelay: '450ms' }} />
                      </div>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => deleteFile(file.id!)}
                      className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
