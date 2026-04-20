import { Link } from 'react-router-dom';
import { useState } from 'react';
import { AuthLayout } from '../../components/AuthLayout';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <AuthLayout
      eyebrow="Password Reset"
      title={sent ? <>Check your <span className="text-orange">inbox</span>.</> : <>Forgot your <span className="text-orange">password</span>?</>}
      subtitle={sent ? 'If an account exists for that email, you\'ll get a reset link shortly.' : 'Enter your email and we\'ll send you a reset link.'}
      footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
    >
      {sent ? (
        <div className="text-sm text-white/60 text-center py-2">
          Didn't get it? Check spam or <button onClick={() => setSent(false)} className="text-orange hover:text-orange-hover">try again</button>.
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-5">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                   placeholder="you@company.com" className="input" />
          </div>
          <button type="submit" className="btn-primary w-full">Send reset link</button>
        </form>
      )}
    </AuthLayout>
  );
}
