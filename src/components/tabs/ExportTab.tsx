import { memo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import type { ProjectionSummary, UserInputs } from '../../lib/types';
import type { ComparisonResult } from '../../lib/strategyComparison';
import { ReportTemplate } from '../ReportTemplate';
import { EmailAccountantButton } from '../EmailAccountantButton';
import { generateShareUrl } from '../../lib/shareLink';

interface ExportTabProps {
  summary: ProjectionSummary;
  inputs: UserInputs;
  comparison: ComparisonResult | null;
  clientName: string;
}

export const ExportTab = memo(function ExportTab({
  summary,
  inputs,
  comparison,
  clientName,
}: ExportTabProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Optimal_Compensation_Report_${new Date().toISOString().split('T')[0]}`,
  });

  const handleCopyLink = async () => {
    const url = generateShareUrl(inputs);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Hidden Report Template (only renders for print) */}
      <div style={{ display: 'none' }}>
        <ReportTemplate
          ref={componentRef}
          summary={summary}
          inputs={inputs}
          clientName={clientName || undefined}
          comparison={comparison}
        />
      </div>

      <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
        Share Your Results
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PDF Download */}
        <div
          className="p-5 rounded-xl text-center space-y-3"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="text-3xl">PDF</div>
          <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Download PDF Report
          </h4>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Complete analysis with all strategies
          </p>
          <button
            onClick={() => handlePrint()}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: '#10b981',
              border: '1px solid rgba(110, 231, 183, 0.25)',
              color: 'white',
            }}
          >
            <Printer size={16} />
            Download PDF
          </button>
        </div>

        {/* Email Accountant */}
        <div
          className="p-5 rounded-xl text-center space-y-3"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="text-3xl">@</div>
          <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Email to Accountant
          </h4>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Pre-filled with summary + share link
          </p>
          <EmailAccountantButton
            inputs={inputs}
            summary={summary}
            comparison={comparison}
          />
        </div>

        {/* Share Link */}
        <div
          className="p-5 rounded-xl text-center space-y-3"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="text-3xl">Link</div>
          <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Share Link
          </h4>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Copy a link with your exact inputs
          </p>
          <button
            onClick={handleCopyLink}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: copied ? 'var(--accent-success, #6ee7b7)' : 'var(--bg-base)',
              border: '1px solid var(--border-subtle)',
              color: copied ? 'white' : 'var(--text-primary)',
            }}
          >
            {copied ? 'Copied!' : 'Copy Share Link'}
          </button>
        </div>
      </div>

      {/* Report Preview */}
      <div>
        <h4 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Report Preview
        </h4>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            maxHeight: '500px',
            overflowY: 'auto',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133.33%' }}>
            <ReportTemplate
              summary={summary}
              inputs={inputs}
              clientName={clientName || undefined}
              comparison={comparison}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
