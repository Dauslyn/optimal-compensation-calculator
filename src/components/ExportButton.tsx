/**
 * Export Button Component
 *
 * Provides functionality to export the results as a PDF using the browser's print dialog.
 */

interface ExportButtonProps {
  disabled?: boolean;
}

export function ExportButton({ disabled = false }: ExportButtonProps) {
  const handleExport = () => {
    // Add a class to the body for print-specific styling
    document.body.classList.add('printing');

    // Trigger print dialog
    window.print();

    // Remove the class after printing (or cancelling)
    // Use a timeout to ensure the print dialog has fully appeared
    setTimeout(() => {
      document.body.classList.remove('printing');
    }, 1000);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
      style={{
        background: disabled ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        color: disabled ? 'var(--text-dim)' : 'var(--text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      title={disabled ? 'Calculate results first' : 'Export to PDF'}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="text-sm font-medium">Export PDF</span>
    </button>
  );
}
