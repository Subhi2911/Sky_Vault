// Feature: html-to-react-migration
// Requirement 15.2 — shared Sidebar component

import StorageWidget from './StorageWidget';

const NAV_ITEMS = [
  { id: 'myfiles',   label: 'My Files',   icon: 'fas fa-home' },
  { id: 'recent',    label: 'Recent',     icon: 'fas fa-clock' },
  { id: 'starred',   label: 'Starred',    icon: 'fas fa-star' },
  { id: 'trash',     label: 'Trash',      icon: 'fas fa-trash' },
];

const TYPE_FILTERS = [
  { id: 'images',    label: 'Images',     icon: 'fas fa-file-image' },
  { id: 'documents', label: 'Documents',  icon: 'fas fa-file-alt' },
  { id: 'videos',    label: 'Videos',     icon: 'fas fa-file-video' },
  { id: 'audio',     label: 'Audio',      icon: 'fas fa-file-audio' },
];

function SidebarItem({ item, active, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(item.id)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(item.id)}
      className={`ud-sidebar-item${active ? ' active' : ''}`}
    >
      <i className={item.icon} style={{ width: 20, textAlign: 'center' }} />
      <span>{item.label}</span>
    </div>
  );
}

export default function Sidebar({ activeView, onViewChange, storageUsed, storageTotal }) {
  return (
    <aside className="ud-sidebar">
      <div className="ud-sidebar-section">
        <div className="ud-sidebar-title">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.id} item={item} active={activeView === item.id} onClick={onViewChange} />
        ))}
      </div>

      <div className="ud-sidebar-section">
        <div className="ud-sidebar-title">File Types</div>
        {TYPE_FILTERS.map((item) => (
          <SidebarItem key={item.id} item={item} active={activeView === item.id} onClick={onViewChange} />
        ))}
      </div>

      <StorageWidget usedBytes={storageUsed} totalBytes={storageTotal} />
    </aside>
  );
}
