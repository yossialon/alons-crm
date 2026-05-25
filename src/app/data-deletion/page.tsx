import type { Metadata } from 'next';
import DataDeletionForm from './DataDeletionForm';

export const metadata: Metadata = {
  title: "Data Deletion Request — Alon's Kitchens",
  description: "Request deletion of your personal data from Alon's Kitchens.",
};

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function DataDeletionPage({ searchParams }: Props) {
  const { code } = await searchParams;
  const company = "Alon's Kitchens";

  return (
    <main style={{
      fontFamily: "'Georgia', 'Times New Roman', serif",
      maxWidth: '680px',
      margin: '0 auto',
      padding: '60px 24px 100px',
      color: '#1a1a1a',
      lineHeight: '1.8',
    }}>
      <header style={{ marginBottom: '48px', borderBottom: '2px solid #1a1a1a', paddingBottom: '32px' }}>
        <p style={{ fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#666', margin: '0 0 16px' }}>
          {company}
        </p>
        <h1 style={{ fontSize: '38px', fontWeight: '700', margin: '0 0 12px', lineHeight: '1.15' }}>
          Data Deletion Request
        </h1>
        {!code && (
          <p style={{ fontSize: '15px', color: '#555', margin: 0 }}>
            Submit this form to request deletion of your personal data from our systems.
            We will respond within 30 days.
          </p>
        )}
      </header>

      <DataDeletionForm confirmationCode={code} />
    </main>
  );
}
