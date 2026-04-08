// Feature: html-to-react-migration
// Requirement 15.7 — consistent inline error message component

export default function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      style={{
        color: '#dc2626',
        background: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 500,
      }}
    >
      {message}
    </div>
  );
}
