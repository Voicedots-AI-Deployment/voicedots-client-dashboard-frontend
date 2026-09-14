import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collegeApi, collegeError, type CollegeAccess } from '@/api/collegeApi';
export function useCollegeAccess() {
  const { user } = useAuth();
  const [access, setAccess] = useState<CollegeAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setAccess(null); setError(''); setLoading(true);
    collegeApi.get<CollegeAccess>('access', controller.signal).then(value => {
      if (!controller.signal.aborted) setAccess(value);
    }).catch(e => { if (!controller.signal.aborted) setError(collegeError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.email, version]);
  return { access, loading, error, retry: () => setVersion(v => v + 1) };
}
