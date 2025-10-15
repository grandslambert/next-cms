'use client';

import { useParams } from 'next/navigation';
import PostTypeForm from '@/components/admin/PostTypeForm';

export default function NewPostTypePage() {
  const params = useParams();
  const postTypeSlug = params?.slug as string;

  return <PostTypeForm postTypeSlug={postTypeSlug} isEdit={false} />;
}

