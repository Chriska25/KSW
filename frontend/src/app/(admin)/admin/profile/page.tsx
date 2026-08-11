'use client';

import { UserProfileEditor } from '@/components/profile/user-profile-editor';

export default function AdminProfilePage() {
  return (
    <UserProfileEditor
      title="Mon Compte"
      subtitle="Gérez votre identité staff, votre photo et votre mot de passe."
      showTheme={false}
    />
  );
}
