import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';

export function ResetPasswordPage() {
  return (
    <AuthLayout
      eyebrow="Password Reset"
      title={<>Set a new <span className="text-orange">password</span>.</>}
      footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
    >
      <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-5">
        <div>
          <label className="label" htmlFor="pw">New password</label>
          <input id="pw" type="password" required className="input" placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="label" htmlFor="pw2">Confirm password</label>
          <input id="pw2" type="password" required className="input" />
        </div>
        <button type="submit" className="btn-primary w-full">Update password</button>
      </form>
    </AuthLayout>
  );
}
