import { useState, useEffect, useRef } from 'react'
import { getNotes, addNote, deleteNote } from '../services/storage'
import { uploadFileToDrive, listDriveFiles, downloadDriveFile, deleteDriveFile, initFolderStructure } from '../services/googleDrive'
import { isSignedIn } from '../services/googleCalendar'
import { Upload, FileText, Image, Trash2, Download, Search, X, Cloud, CloudOff, RefreshCw, Check } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import './Notes.css'

const SUBJECTS = ['All','Biochemistry','Molecular Biology','Genetics','Bioprocess Engineering','Microbiology','Immunology','Plant and Animal Biology','Engineering Mathematics','General Aptitude','Other']

function fileIcon(type) {
  if (type && type.startsWith('image/')) return <Image size={20} />
  return <FileText size={20} />
}

function formatSize(bytes) {
  if (!bytes) return '—'
  bytes = parseInt(bytes)
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'
  return (bytes/(1024*1024)).toFixed(1) + ' MB'
}

export default function Notes() {
  const [localNotes, setLocalNotes] = useState([])
  const [driveFiles, setDriveFiles] = useState([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [viewMode, setViewMode] = useState('all') // 'all', 'local', 'cloud'
  const [uploadSubject, setUploadSubject] = useState('Biochemistry')
  const fileRef = useRef()
  const toast = useToast()
  const connected = isSignedIn()

  useEffect(() => {
    setLocalNotes(getNotes())
    if (connected) loadDriveFiles()
  }, [])

  const loadDriveFiles = async () => {
    if (!connected) return
    setSyncing(true)
    try {
      const files = await listDriveFiles(filter === 'All' ? null : filter)
      setDriveFiles(files)
    } catch (e) {
      console.error('Drive list error:', e)
    }
    setSyncing(false)
  }

  useEffect(() => {
    if (connected) loadDriveFiles()
  }, [filter])

  const processFile = async (file) => {
    if (file.size > 10 * 1024 * 1024) { toast('File too large (max 10MB)', 'error'); return; }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const note = { name: file.name, type: file.type, size: file.size, data: e.target.result, subject: uploadSubject }

      // Save locally
      setLocalNotes(addNote(note))

      // Upload to Google Drive if connected
      if (connected) {
        try {
          const driveFile = await uploadFileToDrive(note)
          toast(`"${file.name}" uploaded to GATE PREPARATION/${uploadSubject}! ☁️`, 'success')
          loadDriveFiles()
        } catch (err) {
          toast(`Saved locally. Drive upload failed: ${err.message}`, 'error')
        }
      } else {
        toast(`"${file.name}" saved locally. Connect Google to sync.`, 'success')
      }
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const handleFiles = (files) => Array.from(files).forEach(processFile)

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDeleteLocal = (id) => {
    setLocalNotes(deleteNote(id))
    toast('Note removed locally', 'info')
  }

  const handleDeleteDrive = async (fileId) => {
    if (!confirm('Delete this file from Google Drive?')) return
    try {
      await deleteDriveFile(fileId)
      setDriveFiles(f => f.filter(x => x.id !== fileId))
      toast('File deleted from Drive', 'info')
    } catch { toast('Delete failed', 'error') }
  }

  const handleDownloadDrive = async (file) => {
    try {
      const url = await downloadDriveFile(file.driveId || file.id)
      const a = document.createElement('a')
      a.href = url; a.download = file.name; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch { toast('Download failed', 'error') }
  }

  const handleDownloadLocal = (note) => {
    const a = document.createElement('a')
    a.href = note.data; a.download = note.name; a.click()
  }

  const initFolders = async () => {
    if (!connected) { toast('Connect Google Calendar first', 'error'); return }
    setSyncing(true)
    try {
      await initFolderStructure()
      toast('All subject folders created in GATE PREPARATION! 📁', 'success')
    } catch (e) { toast('Failed: ' + e.message, 'error') }
    setSyncing(false)
  }

  // Merge local and cloud files for display
  const allNotesMap = new Map()

  if (viewMode !== 'cloud') {
    const filtered = localNotes.filter(n => {
      const matchSubject = filter === 'All' || n.subject === filter
      const matchSearch = n.name.toLowerCase().includes(search.toLowerCase())
      return matchSubject && matchSearch
    })
    filtered.forEach(n => allNotesMap.set(n.name, { ...n, source: 'local', localId: n.id }))
  }

  if (viewMode !== 'local' && connected) {
    const filteredDrive = driveFiles.filter(f =>
      f.name.toLowerCase().includes(search.toLowerCase())
    )
    filteredDrive.forEach(f => {
      const existing = allNotesMap.get(f.name)
      if (existing) {
        existing.source = 'both'
        existing.driveId = f.id
        existing.webViewLink = f.webViewLink
      } else {
        allNotesMap.set(f.name, {
          id: f.id, name: f.name, type: f.mimeType, size: f.size,
          subject: f.subject, createdAt: f.createdTime,
          webViewLink: f.webViewLink, source: 'cloud', driveId: f.id
        })
      }
    })
  }

  const allNotes = Array.from(allNotesMap.values())

  return (
    <div className="page notes-page animate-fade">
      <div className="flex items-center justify-between" style={{marginBottom: 8}}>
        <h1 className="page-title" style={{marginBottom:0}}>📁 My Notes</h1>
        {connected && (
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={initFolders} disabled={syncing}>
              📁 Create All Folders
            </button>
            <button className="btn btn-ghost btn-sm" onClick={loadDriveFiles} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        )}
      </div>
      <p className="page-subtitle">
        Upload study materials to <strong>GATE PREPARATION</strong> folder in your Google Drive.
        {connected
          ? <span className="badge badge-emerald" style={{marginLeft:8}}>☁️ Drive Connected</span>
          : <span className="badge badge-amber" style={{marginLeft:8}}>⚡ Local Only</span>
        }
      </p>

      {/* Drop Zone */}
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'drop-uploading' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current.click()}
      >
        <input ref={fileRef} type="file" multiple hidden onChange={e => handleFiles(e.target.files)} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif,.ppt,.pptx,.xls,.xlsx" />
        {uploading ? (
          <>
            <RefreshCw size={32} className="animate-spin" style={{ opacity: 0.5 }} />
            <div className="drop-title">Uploading…</div>
          </>
        ) : (
          <>
            <Upload size={32} style={{ opacity: 0.5 }} />
            <div className="drop-title">Drop files here or click to upload</div>
            <div className="drop-sub">PDFs, images, documents, presentations · Max 10MB</div>
          </>
        )}
      </div>

      {/* Subject selector for upload */}
      <div className="upload-subject-bar">
        <span className="upload-label">Upload to folder:</span>
        <select className="input" style={{width:'auto',flex:1,maxWidth:280}} value={uploadSubject} onChange={e => setUploadSubject(e.target.value)}>
          {SUBJECTS.filter(s=>s!=='All').map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Filter & Search */}
      <div className="notes-toolbar">
        <div className="subject-filters">
          {SUBJECTS.map(s => (
            <button key={s} className={`filter-pill ${filter===s?'filter-active':''}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          {connected && (
            <div className="view-toggle">
              {[['all','All'],['local','💻 Local'],['cloud','☁️ Cloud']].map(([k,l]) => (
                <button key={k} className={`tab-btn ${viewMode===k?'tab-active':''}`} onClick={() => setViewMode(k)} style={{padding:'5px 10px',fontSize:'0.75rem'}}>{l}</button>
              ))}
            </div>
          )}
          <div className="search-wrap">
            <Search size={14} style={{ color:'var(--text-muted)' }} />
            <input className="input search-input" placeholder="Search files…" value={search} onChange={e=>setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')}><X size={14}/></button>}
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {allNotes.length === 0 ? (
        <div className="empty-state">
          <FileText size={40} />
          <p>{syncing ? 'Loading from Google Drive…' : 'No notes yet. Upload your first file above!'}</p>
        </div>
      ) : (
        <div className="notes-grid">
          {allNotes.map((note, idx) => (
            <div key={`${note.source}-${note.id || idx}`} className="note-card card">
              {/* Source badge */}
              <div className="note-source-badge">
                {note.source === 'cloud' ? (
                  <span className="badge badge-emerald"><Cloud size={10}/> Drive</span>
                ) : note.source === 'local' ? (
                  <span className="badge badge-accent">💻 Local</span>
                ) : (
                  <span className="badge" style={{background:'var(--bg-secondary)', color:'var(--text-primary)', border:'1px solid var(--border)'}}>💻 Local & <Cloud size={10} style={{display:'inline',marginLeft:2,marginRight:2}}/> Drive</span>
                )}
              </div>

              {/* Preview area */}
              <div className="note-preview" onClick={() => {
                if (note.source === 'cloud' && note.webViewLink) {
                  window.open(note.webViewLink, '_blank')
                } else if (note.data) {
                  setPreview(note)
                }
              }}>
                {note.type && note.type.startsWith('image/') && note.data ? (
                  <img src={note.data} alt={note.name} className="note-img-thumb" />
                ) : (
                  <div className="note-icon-wrap">{fileIcon(note.type)}</div>
                )}
              </div>

              <div className="note-info">
                <div className="note-name" title={note.name}>{note.name}</div>
                <div className="note-meta">
                  <span>{formatSize(note.size)}</span>
                  <span>·</span>
                  <span>{new Date(note.createdAt || note.createdTime).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
                </div>
                {note.subject && <div className="note-subject-tag">{note.subject}</div>}
              </div>

              <div className="note-actions">
                {note.source === 'cloud' && (
                  <>
                    <button className="btn-icon" title="Download" onClick={() => handleDownloadDrive(note)}><Download size={14}/></button>
                    {note.webViewLink && <button className="btn-icon" title="Open in Drive" onClick={() => window.open(note.webViewLink, '_blank')}>🔗</button>}
                    <button className="btn-icon" title="Delete from Drive" onClick={() => handleDeleteDrive(note.driveId)} style={{color:'var(--rose)'}}><Trash2 size={14}/></button>
                  </>
                )}
                {note.source === 'local' && (
                  <>
                    <button className="btn-icon" title="Download" onClick={() => handleDownloadLocal(note)}><Download size={14}/></button>
                    <button className="btn-icon" title="Delete" onClick={() => handleDeleteLocal(note.localId)} style={{color:'var(--rose)'}}><Trash2 size={14}/></button>
                  </>
                )}
                {note.source === 'both' && (
                  <>
                    <button className="btn-icon" title="Download Local" onClick={() => handleDownloadLocal(note)}><Download size={14}/></button>
                    {note.webViewLink && <button className="btn-icon" title="Open in Drive" onClick={() => window.open(note.webViewLink, '_blank')}>🔗</button>}
                    <button className="btn-icon" title="Delete Local" onClick={() => handleDeleteLocal(note.localId)} style={{color:'var(--rose)'}}><Trash2 size={14}/></button>
                    <button className="btn-icon" title="Delete from Drive" onClick={() => handleDeleteDrive(note.driveId)} style={{color:'var(--rose)'}}><CloudOff size={14}/></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal (local files only) */}
      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div className="modal preview-modal" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between" style={{marginBottom:16}}>
              <div className="modal-title" style={{margin:0}}>{preview.name}</div>
              <button className="btn-icon" onClick={() => setPreview(null)}><X size={16}/></button>
            </div>
            {preview.type && preview.type.startsWith('image/') ? (
              <img src={preview.data} alt={preview.name} style={{width:'100%',borderRadius:8,maxHeight:'70vh',objectFit:'contain'}} />
            ) : preview.type === 'application/pdf' ? (
              <iframe src={preview.data} title={preview.name} style={{width:'100%',height:'70vh',border:'none',borderRadius:8}} />
            ) : (
              <div className="empty-state"><FileText size={32}/><p>Preview not available. Download to view.</p></div>
            )}
            <button className="btn btn-primary" style={{marginTop:16,width:'100%',justifyContent:'center'}} onClick={() => handleDownloadLocal(preview)}>
              <Download size={16}/> Download
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
