const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  new:       { bg: '#EEF2FF', color: '#3730A3', dot: '#6366F1' },
  contacted: { bg: '#FEF9C3', color: '#854D0E', dot: '#EAB308' },
  qualified: { bg: '#DCFCE7', color: '#166534', dot: '#22C55E' },
  closed:    { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

const TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  Homeowner:  { bg: '#EFF6FF', color: '#1D4ED8' },
  Contractor: { bg: '#FDF4FF', color: '#7E22CE' },
  Developer:  { bg: '#FFF7ED', color: '#C2410C' },
};

const POTENTIAL_STYLES: Record<string, { bg: string; color: string }> = {
  high:   { bg: '#DCFCE7', color: '#166534' },
  medium: { bg: '#FEF9C3', color: '#854D0E' },
  low:    { bg: '#F1F5F9', color: '#64748B' },
};

const SUP_STATUS: Record<string, { bg: string; color: string }> = {
  active:   { bg: '#DCFCE7', color: '#166534' },
  pending:  { bg: '#FEF9C3', color: '#854D0E' },
  inactive: { bg: '#F1F5F9', color: '#64748B' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.new;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function TypePill({ type }: { type: string }) {
  const s = TYPE_STYLES[type] ?? { bg: '#F1F5F9', color: '#64748B' };
  return <span style={{ background: s.bg, color: s.color, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{type}</span>;
}

export function PotentialBadge({ potential }: { potential: string }) {
  const s = POTENTIAL_STYLES[potential] ?? POTENTIAL_STYLES.low;
  return <span style={{ ...s, padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{potential} potential</span>;
}

export function SupplierStatusBadge({ status }: { status: string }) {
  const s = SUP_STATUS[status] ?? SUP_STATUS.inactive;
  return <span style={{ ...s, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export function PulsingDot() {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22C55E', marginRight: 6, boxShadow: '0 0 0 0 rgba(34,197,94,0.4)', animation: 'pulse 2s infinite' }} />;
}

export function sourceIcon(s: string) {
  const map: Record<string, string> = {
    Facebook: '📘', Nextdoor: '🏡', Reddit: '🔴', Houzz: '🏠',
    Instagram: '📸', 'Google Maps': '📍', LinkedIn: '💼',
    'Permit Records': '📋', 'Auto-Scan': '🤖', Angi: '🔧',
    HomeAdvisor: '🔧', BBB: '⭐', Referral: '🤝',
    Manual: '✏️', 'Web Form': '🌐',
  };
  return map[s] ?? '🔗';
}
