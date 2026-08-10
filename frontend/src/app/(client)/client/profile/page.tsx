'use client';

import { User } from 'lucide-react';
import { ClientPageHeader } from '@/components/client/client-page-header';
import { UserProfileEditor } from '@/components/profile/user-profile-editor';

export default function ClientProfilePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-0">
      <ClientPageHeader
        title="Mon"
        accent="Profil"
        description="Informations de votre compte client, photo et sécurité."
        icon={User}
      />
      <UserProfileEditor hideHeader />
    </div>
  );
}
