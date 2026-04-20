import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';

export function NotFoundPage() {
  return (
    <AuthLayout
      eyebrow="404"
      title={<>Page <span className="text-orange">not found</span>.</>}
      subtitle="The page you're looking for doesn't exist."
    >
      <Link to="/" className="btn-primary w-full">Back to portal</Link>
    </AuthLayout>
  );
}
