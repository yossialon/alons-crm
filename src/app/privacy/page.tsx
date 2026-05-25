export const metadata = {
  title: "Privacy Policy — Alon's Kitchens",
  description: "Privacy Policy for Alon's Kitchens CRM and customer services.",
};

export default function PrivacyPage() {
  const lastUpdated = "May 25, 2026";
  const company = "Alon's Kitchens";
  const domain = "alonskitchens.com";
  const email = "shimon@alonskitchens.com";

  return (
    <main style={{
      fontFamily: "'Georgia', 'Times New Roman', serif",
      maxWidth: "760px",
      margin: "0 auto",
      padding: "60px 24px 100px",
      color: "#1a1a1a",
      lineHeight: "1.8",
    }}>
      <header style={{ marginBottom: "56px", borderBottom: "2px solid #1a1a1a", paddingBottom: "32px" }}>
        <p style={{ fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#666", margin: "0 0 16px" }}>
          {company}
        </p>
        <h1 style={{ fontSize: "42px", fontWeight: "700", margin: "0 0 12px", lineHeight: "1.15" }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: "14px", color: "#888", margin: 0 }}>
          Last updated: {lastUpdated}
        </p>
      </header>

      <Section title="1. Introduction">
        <p>
          {company} ("we," "our," or "us") operates the website{" "}
          <a href={`https://${domain}`} style={linkStyle}>{domain}</a> and
          related services. This Privacy Policy explains how we collect, use,
          disclose, and safeguard your information when you interact with our
          business or use our services.
        </p>
        <p>
          By using our services, you agree to the collection and use of
          information in accordance with this policy. If you have questions,
          contact us at{" "}
          <a href={`mailto:${email}`} style={linkStyle}>{email}</a>.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p>We may collect the following types of information:</p>
        <ul style={listStyle}>
          <li><strong>Contact information</strong> — name, phone number, email address, and physical address provided when you request a quote or contact us.</li>
          <li><strong>Project information</strong> — details about your kitchen renovation or remodeling project.</li>
          <li><strong>Communication data</strong> — messages sent via WhatsApp, Instagram, email, or our website contact forms.</li>
          <li><strong>Usage data</strong> — IP address, browser type, pages visited, and time spent on our website (collected automatically via cookies and analytics tools).</li>
          <li><strong>Social media data</strong> — if you interact with us through Facebook, Instagram, or WhatsApp, we may receive information consistent with your privacy settings on those platforms.</li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul style={listStyle}>
          <li>Respond to inquiries and provide quotes for kitchen projects</li>
          <li>Communicate with you about your project status and appointments</li>
          <li>Send promotional offers and updates (with your consent)</li>
          <li>Improve our website and customer service</li>
          <li>Comply with legal obligations</li>
          <li>Process payments for completed work</li>
        </ul>
      </Section>

      <Section title="4. Meta (Facebook & Instagram) Data">
        <p>
          We use Meta platforms (Facebook, Instagram, WhatsApp) to communicate
          with customers and run advertising campaigns. When you interact with
          our ads or pages on Meta platforms:
        </p>
        <ul style={listStyle}>
          <li>We may receive your name, contact details, and message content through Meta Lead Forms or direct messages.</li>
          <li>We use Meta Webhooks to receive real-time notifications of messages and leads.</li>
          <li>Data received from Meta is stored securely and used solely to follow up on your inquiry.</li>
          <li>We do not sell your Meta-sourced data to third parties.</li>
        </ul>
        <p>
          For more information on how Meta handles your data, please review{" "}
          <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Meta's Privacy Policy
          </a>.
        </p>
      </Section>

      <Section title="5. Cookies and Tracking">
        <p>
          Our website uses cookies to enhance your browsing experience. You can
          choose to disable cookies through your browser settings, though some
          features of our site may not function properly as a result.
        </p>
        <p>
          We may use third-party analytics services (such as Google Analytics)
          to understand website usage. These services collect anonymized data
          about your visit.
        </p>
      </Section>

      <Section title="6. Data Sharing and Disclosure">
        <p>We do not sell your personal information. We may share your data with:</p>
        <ul style={listStyle}>
          <li><strong>Service providers</strong> — trusted vendors who help us operate our business (e.g., email services, payment processors), bound by confidentiality agreements.</li>
          <li><strong>Legal authorities</strong> — when required by law or to protect our legal rights.</li>
          <li><strong>Business transfers</strong> — in the event of a merger, acquisition, or sale of assets, your data may be transferred as part of that transaction.</li>
        </ul>
      </Section>

      <Section title="7. Data Retention">
        <p>
          We retain your personal information for as long as necessary to
          fulfill the purposes outlined in this policy, or as required by law.
          Customer project records are typically retained for 7 years for
          accounting and warranty purposes. You may request deletion of your
          data at any time (see Section 9).
        </p>
      </Section>

      <Section title="8. Data Security">
        <p>
          We implement industry-standard security measures to protect your
          information, including encrypted connections (HTTPS), access controls,
          and secure database storage. However, no method of transmission over
          the Internet is 100% secure, and we cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="9. Your Rights">
        <p>You have the right to:</p>
        <ul style={listStyle}>
          <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
          <li><strong>Correction</strong> — request correction of inaccurate data</li>
          <li><strong>Deletion</strong> — request deletion of your personal data</li>
          <li><strong>Opt-out</strong> — unsubscribe from marketing communications at any time</li>
          <li><strong>Portability</strong> — request your data in a portable format</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a href={`mailto:${email}`} style={linkStyle}>{email}</a>.
          We will respond within 30 days.
        </p>
      </Section>

      <Section title="10. Children's Privacy">
        <p>
          Our services are not directed to individuals under the age of 13. We
          do not knowingly collect personal information from children. If you
          believe we have inadvertently collected such information, please
          contact us immediately.
        </p>
      </Section>

      <Section title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of significant changes by posting the new policy on this page with
          an updated date. We encourage you to review this policy periodically.
        </p>
      </Section>

      <Section title="12. Contact Us">
        <p>If you have questions or concerns about this Privacy Policy, please contact us:</p>
        <div style={{
          background: "#f7f7f5",
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
          padding: "24px 28px",
          marginTop: "16px",
          fontSize: "15px",
        }}>
          <p style={{ margin: "0 0 6px" }}><strong>{company}</strong></p>
          <p style={{ margin: "0 0 6px" }}>
            Email:{" "}
            <a href={`mailto:${email}`} style={linkStyle}>{email}</a>
          </p>
          <p style={{ margin: 0 }}>
            Website:{" "}
            <a href={`https://${domain}`} style={linkStyle}>{domain}</a>
          </p>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "44px" }}>
      <h2 style={{
        fontSize: "20px",
        fontWeight: "700",
        margin: "0 0 16px",
        paddingBottom: "8px",
        borderBottom: "1px solid #e8e8e8",
      }}>
        {title}
      </h2>
      <div style={{ fontSize: "16px", color: "#2a2a2a" }}>{children}</div>
    </section>
  );
}

const linkStyle: React.CSSProperties = {
  color: "#1a1a1a",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
};

const listStyle: React.CSSProperties = {
  paddingLeft: "24px",
  margin: "12px 0",
};
