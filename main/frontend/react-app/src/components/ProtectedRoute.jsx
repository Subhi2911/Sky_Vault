import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

/**
 * Wraps a route that requires authentication.
 * - Shows <Spinner /> while the initial auth state is resolving.
 * - Redirects to `redirectTo` when the user is not authenticated.
 * - Renders `children` when the user is authenticated.
 */
export default function ProtectedRoute({ children, redirectTo = '/user-auth' }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to={redirectTo} replace />;
  return children;
}
