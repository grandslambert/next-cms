'use client';

import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function SwitchBackButton() {
  const { update } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const switchBackMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.delete('/api/auth/switch-user');
      return res.data.switchData;
    },
    onSuccess: async (switchData) => {
      await update({ switchData });
      toast.success(`Switched back to ${switchData.name}`);
      queryClient.invalidateQueries();
      router.refresh();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to switch back');
    },
  });

  return (
    <button
      onClick={() => switchBackMutation.mutate()}
      disabled={switchBackMutation.isPending}
      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {switchBackMutation.isPending ? (
        <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
      ) : (
        <>
          <span className="text-xl">🔙</span>
          <span>Switch Back</span>
        </>
      )}
    </button>
  );
}

