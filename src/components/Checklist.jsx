import { useState, useEffect } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { getChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem } from '../services/storage'
import './Checklist.css'

export default function Checklist() {
  const [items, setItems] = useState([])
  const [text, setText] = useState('')

  useEffect(() => { setItems(getChecklist()) }, [])

  const add = () => {
    if (!text.trim()) return
    setItems(addChecklistItem(text.trim()))
    setText('')
  }

  const toggle = (id) => setItems(toggleChecklistItem(id))
  const remove = (id) => setItems(deleteChecklistItem(id))

  const done = items.filter(i => i.done).length

  return (
    <div className="card checklist-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title" style={{ margin: 0 }}>Today's Tasks</h3>
        <span className="badge badge-accent">{done}/{items.length}</span>
      </div>

      {/* Add input */}
      <div className="checklist-add">
        <input
          className="input" placeholder="Add a study task…"
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button className="btn btn-primary btn-sm" onClick={add}><Plus size={16} /></button>
      </div>

      {/* Items */}
      <div className="checklist-items">
        {items.length === 0 && (
          <div className="empty-state" style={{ padding: '24px 16px' }}>
            <Check size={28} />
            <p>No tasks yet. Add one above!</p>
          </div>
        )}
        {items.map(item => (
          <div key={item.id} className={`checklist-item ${item.done ? 'item-done' : ''}`}>
            <button className={`check-box ${item.done ? 'checked' : ''}`} onClick={() => toggle(item.id)}>
              {item.done && <Check size={12} strokeWidth={3} />}
            </button>
            <span className="item-text">{item.text}</span>
            <button className="btn-icon btn-sm" onClick={() => remove(item.id)} style={{ opacity: 0.5, padding: '4px' }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(done/items.length)*100}%`, background: done===items.length ? 'var(--emerald)' : 'var(--accent)' }} />
          </div>
        </div>
      )}
    </div>
  )
}
