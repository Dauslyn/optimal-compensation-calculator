/**
 * ExportModal Component
 *
 * Modal for previewing and exporting PDF reports.
 */

import { memo, useCallback, useRef } from 'react';
import { PrintableReport } from './PrintableReport';
import type { ProjectionSummary, UserInputs } from '../lib/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ProjectionSummary;
  inputs: UserInputs;
  scenarioName?: string;
}

export const ExportModal = memo(function ExportModal({
  isOpen,
  onClose,
  results,
  inputs,
  scenarioName,
}: ExportModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.75)' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl flex flex-col"
        style={{ background: 'var(--bg-elevated)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Export Report
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Preview your report before printing or saving as PDF
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-md"
              style={{
                background: 'var(--accent-primary)',
                color: 'white',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-black/10"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div
          className="flex-1 overflow-auto p-6"
          style={{ background: '#f0f4f8' }}
        >
          <div ref={printRef}>
            <PrintableReport
              results={results}
              inputs={inputs}
              scenarioName={scenarioName}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-base)',
          }}
        >
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Tip: In the print dialog, select "Save as PDF" as the destination to create a PDF file.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ExportModal;
