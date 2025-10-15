'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ContentTypesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Post Types by default
    router.push('/admin/content-types/post-types');
  }, [router]);

  return null;
}

