import { useState, useEffect, useRef } from 'react'
import { getPortfolio, updateContent, uploadImage } from '../../api'
import { FiPlus, FiTrash2, FiImage, FiLoader } from 'react-icons/fi'

export default function AdminCreators() {
  const [creators, setCreators] = useState([])
  const [newName, setNewName] = useState('')
  const [newLogo, setNewLogo] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const res = await getPortfolio()
      if (res.data.success && res.data.data) {
        const data = res.data.data
        // Use the new creators array if it exists, otherwise migrate from marqueeText
        if (data.creators && data.creators.length > 0) {
          setCreators(data.creators)
        } else {
          const text = data.marqueeText || ''
          const list = text.split(',').map(s => ({ name: s.trim(), logo: '' })).filter(c => c.name)
          setCreators(list)
        }
      }
    } catch (e) {
      console.error('Failed to load creators', e)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const res = await uploadImage(file)
      if (res.data.success) {
        setNewLogo(res.data.url)
        setStatus('Logo uploaded!')
      }
    } catch (err) {
      console.error('Upload failed', err)
      setStatus('Logo upload failed')
    } finally {
      setUploading(false)
      setTimeout(() => setStatus(''), 3000)
    }
  }

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    if (creators.some(c => c.name.toLowerCase() === newName.trim().toLowerCase())) {
      setStatus('Name already exists')
      return
    }
    
    const updated = [...creators, { name: newName.trim(), logo: newLogo }]
    setCreators(updated)
    setNewName('')
    setNewLogo('')
    save(updated)
  }

  const handleRemove = (name) => {
    const updated = creators.filter(c => c.name !== name)
    setCreators(updated)
    save(updated)
  }

  const save = async (list) => {
    try {
      // Save to both for safety/migration, but primary is 'creators'
      await updateContent({ 
        creators: list,
        marqueeText: list.map(c => c.name).join(', ') 
      })
      setStatus('Updated successfully')
      setTimeout(() => setStatus(''), 3000)
    } catch (e) {
      console.error('Save error', e)
      const msg = e.response?.data?.error || e.response?.data?.details || 'Failed to save'
      setStatus(`Failed to save: ${msg}`)
    }
  }

  if (loading) return <div className="admin-loading-state">Loading...</div>

  return (
    <div className="admin-section">
      <header className="dash-dashboard-header">
        <span className="dash-dashboard-eyebrow">Marquee Content</span>
        <h1 className="dash-page-title dash-dashboard-title">Manage Creator Names</h1>
        <div className="dash-dashboard-title-line" aria-hidden />
        <p className="dash-dashboard-sub">
          These names and logos will scroll in the motion line on your homepage.
        </p>
      </header>

      <div className="admin-glass-form-card">
        <form onSubmit={handleAdd} className="admin-creator-add-form">
          <div className="admin-form-group">
            <label className="admin-label">Add Creator</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                  className="admin-input" 
                  placeholder="Creator Name (e.g. MrBeast)" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                />
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Upload Logo"
                  style={{ padding: '0 15px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {uploading ? <FiLoader className="spin" /> : <FiImage />}
                  <span>{newLogo ? 'Change Pic' : 'Add Pic'}</span>
                </button>
                <input 
                  type="file" 
                  hidden 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*"
                />
              </div>

              {newLogo && (
                <div className="logo-preview-wrap">
                  <img src={newLogo} alt="Preview" className="logo-preview-img" />
                  <span className="logo-preview-label">Logo ready</span>
                  <button type="button" className="logo-preview-remove" onClick={() => setNewLogo('')}>×</button>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>
                <FiPlus style={{ marginRight: '8px' }} /> Add Creator
              </button>
            </div>
          </div>
        </form>

        <div className="admin-creators-list" style={{ marginTop: '32px' }}>
          <h4 className="admin-glass-form-title" style={{ fontSize: '14px', marginBottom: '16px', opacity: 0.7 }}>
            Active Creators ({creators.length})
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {creators.length === 0 ? (
              <p style={{ opacity: 0.5, fontSize: '14px' }}>No creators added yet.</p>
            ) : (
              creators.map(c => (
                <div key={c.name} className="admin-creator-tag full-width">
                  {c.logo ? (
                    <img src={c.logo} alt="" className="admin-creator-avatar" />
                  ) : (
                    <div className="admin-creator-avatar-placeholder"><FiImage size={10} /></div>
                  )}
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <button onClick={() => handleRemove(c.name)} className="admin-creator-remove">
                    <FiTrash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {status && <div style={{ marginTop: '20px', color: status.includes('Failed') ? '#ef4444' : '#4ade80', fontSize: '14px' }}>{status}</div>}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .logo-preview-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px dashed rgba(255, 255, 255, 0.2);
          width: fit-content;
        }
        .logo-preview-img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(229, 23, 63, 0.5);
        }
        .logo-preview-label {
          font-size: 12px;
          color: #4ade80;
        }
        .logo-preview-remove {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          font-size: 18px;
          padding: 0 4px;
        }

        .admin-creator-tag {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          color: #fff;
          transition: all 0.2s;
        }
        .admin-creator-tag.full-width {
           width: 100%;
        }
        .admin-creator-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .admin-creator-avatar-placeholder {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.3);
        }
        .admin-creator-tag:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(229, 23, 63, 0.3);
        }
        .admin-creator-remove {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.2s;
        }
        .admin-creator-remove:hover {
          color: #ef4444;
        }
        .admin-loading-state {
          padding: 40px;
          text-align: center;
          opacity: 0.6;
        }
      `}</style>
    </div>
  )
}
