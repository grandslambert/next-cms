'use client';

import { useParams } from 'next/navigation';
import PostTypeForm from '@/components/admin/PostTypeForm';

export default function EditPostTypePage() {
  const params = useParams();
  const postTypeSlug = params?.slug as string;
  const postId = params?.id as string;

  return <PostTypeForm postTypeSlug={postTypeSlug} postId={postId} isEdit={true} />;
}

