import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        style: {
          background: '#141010',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#fff',
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: '12px',
          padding: '14px 18px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,107,31,0.1)',
        },
        className: 'font-sans',
      }}
      icons={{
        success: <span className="text-success">●</span>,
        error: <span className="text-error">●</span>,
        info: <span className="text-orange">●</span>,
      }}
    />
  );
}
