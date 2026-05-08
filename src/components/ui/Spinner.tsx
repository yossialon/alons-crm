export default function Spinner({ label = '' }: { label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 12 }}>
      <div
        style={{
          width: 32, height: 32,
          border: '3px solid #E2E8F0',
          borderTop: '3px solid #92400E',
          borderRadius: '50%',
          animation: 'spin .7s linear infinite',
        }}
      />
      {label && <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{label}</div>}
    </div>
  );
}
