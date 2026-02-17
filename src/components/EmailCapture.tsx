import { useState } from 'react';
import { Mail, Check, Loader2 } from 'lucide-react';

interface EmailCaptureProps {
  source?: string; // Track where signup came from
}

export function EmailCapture({ source = 'calculator' }: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email');
      setStatus('error');
      return;
    }

    setStatus('loading');

    // TODO: Replace with Beehiiv endpoint
    // Beehiiv embed form action: https://embeds.beehiiv.com/subscribe
    // For now, store in localStorage as a placeholder
    try {
      // Placeholder: In production, this would POST to Beehiiv
      // Example Beehiiv integration:
      // const response = await fetch('https://api.beehiiv.com/v2/publications/YOUR_PUB_ID/subscriptions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_API_KEY' },
      //   body: JSON.stringify({ email, utm_source: source })
      // });

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 500));

      // Store locally until Beehiiv is connected
      let subscribers: Array<{ email: string; source: string; timestamp: string }> = [];
      try {
        subscribers = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
        if (!Array.isArray(subscribers)) subscribers = [];
      } catch {
        subscribers = [];
      }
      subscribers.push({ email, source, timestamp: new Date().toISOString() });
      localStorage.setItem('newsletter_subscribers', JSON.stringify(subscribers));

      setStatus('success');
      setEmail('');
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div
        className="p-6 rounded-xl text-center"
        style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(110, 231, 183, 0.15)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center justify-center gap-2 text-[#6ee7b7] mb-2">
          <Check size={20} />
          <span className="font-semibold">You're on the list!</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Watch your inbox for tax planning insights.
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-6 rounded-xl"
      style={{ background: 'rgba(5, 150, 105, 0.06)', border: '1px solid rgba(110, 231, 183, 0.1)', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="p-3 rounded-lg shrink-0"
          style={{ background: 'rgba(5, 150, 105, 0.15)' }}
        >
          <Mail size={24} style={{ color: '#6ee7b7' }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Tax Planning for Canadian Physicians</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Get actionable CCPC strategies, RRSP vs IPP analysis, and year-end planning reminders.
            Built for doctors who want to keep more of what they earn.
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              placeholder="your@email.com"
              className="flex-1 px-4 py-2 rounded-lg text-sm"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: status === 'error' ? '1px solid #f87171' : '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-5 py-2 rounded-lg font-medium text-sm transition-all"
              style={{
                background: '#10b981',
                border: '1px solid rgba(110, 231, 183, 0.25)',
                color: 'white',
                opacity: status === 'loading' ? 0.7 : 1,
              }}
            >
              {status === 'loading' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Subscribe'
              )}
            </button>
          </form>

          {status === 'error' && (
            <p className="text-xs mt-2" style={{ color: '#f87171' }}>{errorMessage}</p>
          )}

          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
