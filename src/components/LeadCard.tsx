import { TypePill, PotentialBadge, sourceIcon } from './ui/Badges';

interface LeadCardData {
  id?: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  area: string;
  type: string;
  source: string;
  rating: string;
  potential: string;
  notes: string;
  imported?: boolean;
}

interface Props {
  lead: LeadCardData;
  onImport?: () => void;
  onMessage?: () => void;
  imported?: boolean;
}

export default function LeadCard({ lead, onImport, onMessage, imported = false }: Props) {
  return (
    <div
      style={{
        background: '#fff',
        border: `1.5px solid ${imported ? '#E2E8F0' : '#BBF7D0'}`,
        borderRadius: 12, padding: 16,
        display: 'flex', gap: 14, alignItems: 'flex-start',
        opacity: imported ? 0.65 : 1,
        transition: 'opacity .2s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{lead.name}</span>
          <TypePill type={lead.type} />
          <PotentialBadge potential={lead.potential} />
          {imported && (
            <span style={{ background: '#F1F5F9', color: '#94A3B8', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
              ✓ Imported
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#64748B', marginBottom: 8 }}>
          {lead.source && <span>{sourceIcon(lead.source.split(' ')[0])} {lead.source}</span>}
          {lead.phone  && <span>📞 {lead.phone}</span>}
          {lead.email  && <span>✉️ {lead.email}</span>}
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noreferrer noopener" style={{ color: '#3B82F6', fontSize: 12 }}>
              🌐 Website
            </a>
          )}
          {lead.rating && <span>⭐ {lead.rating}</span>}
          {lead.area   && <span>📍 {lead.area}</span>}
        </div>
        {lead.notes && (
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, background: '#F8FAFC', padding: '8px 12px', borderRadius: 8, borderLeft: '3px solid #D97706' }}>
            💡 {lead.notes}
          </div>
        )}
      </div>
      {!imported && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 80 }}>
          {onImport && (
            <button
              onClick={onImport}
              style={{ background: '#DCFCE7', color: '#166534', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              + Import
            </button>
          )}
          {onMessage && (
            <button
              onClick={onMessage}
              style={{ background: '#DBEAFE', color: '#1D4ED8', border: 'none', borderRadius: 8, padding: '7px 10px', fontWeight: 600, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}
            >
              ✉️ Draft
            </button>
          )}
        </div>
      )}
    </div>
  );
}
