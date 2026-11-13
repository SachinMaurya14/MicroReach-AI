import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useAppRouter } from '../../app/routes';
import { BrandLogo } from '../../components/BrandLogo';
import { Button } from '../../components/ui/Button';
import { useDemoSession } from '../../hooks/useDemoSession';

function extractFragmentToken(): string | null {
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
    const params = new URLSearchParams(cleanHash);
    const fromHash = params.get('token');
    if (fromHash && fromHash.trim()) {
      return fromHash.trim();
    }
  }

  const query = new URLSearchParams(window.location.search);
  const fromQuery = query.get('token');
  if (fromQuery && fromQuery.trim()) {
    return fromQuery.trim();
  }

  return null;
}

export const DemoAccessPage: React.FC = () => {
  const { navigate } = useAppRouter();
  const { exchangeAccessToken, authenticated, loading } = useDemoSession();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const token = extractFragmentToken();

    // Immediately scrub any token fragment or query param from browser history
    window.history.replaceState({}, '', '/demo-access');

    if (!token) {
      if (!loading && authenticated) {
        navigate('/dashboard');
        return;
      }
      setStatus('error');
      setErrorMessage(
        'No invitation token was found in this URL. Open the complete private invitation link (/demo-access#token=...) provided by the project owner.'
      );
      return;
    }

    (async () => {
      const result = await exchangeAccessToken(token);
      if (result.ok) {
        setStatus('success');
        setTimeout(() => {
          navigate('/dashboard');
        }, 450);
      } else {
        setStatus('error');
        setErrorMessage(result.message);
      }
    })();
  }, [authenticated, exchangeAccessToken, loading, navigate]);

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#111827] flex flex-col">
      <header className="h-16 border-b border-[#E5E7EB] bg-white px-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="cursor-pointer"
          aria-label="MicroReach AI Home"
        >
          <BrandLogo size="sm" tone="dark" />
        </button>

        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Landing Page</span>
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[480px] rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm text-center">
          {status === 'verifying' && (
            <>
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EDE9FE] text-[#5B21B6]">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-[#111827]">
                Verifying Invitation Link
              </h1>
              <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
                Validating your private shared-workspace invitation and establishing a short-lived
                secure session.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#D1FAE5] text-[#059669]">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-[#111827]">
                Shared Workspace Access Granted
              </h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                Redirecting you to the MicroReach AI workspace...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-[#111827]">
                Invitation Link Required
              </h1>
              <p className="mt-2.5 text-sm text-[#4B5563] leading-relaxed">
                {errorMessage}
              </p>

              <div className="mt-5 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-3.5 text-left text-xs text-[#4B5563]">
                <div className="flex items-center gap-2 font-semibold text-[#5B21B6]">
                  <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Link-Restricted Shared Demo</span>
                </div>
                <p className="mt-1 leading-relaxed">
                  MicroReach AI does not use user registration or passwords. Request an updated
                  invitation link from the project owner if this link has expired or been rotated.
                </p>
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <Button variant="primary" size="sm" onClick={() => navigate('/')}>
                  Return to Landing Page
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
