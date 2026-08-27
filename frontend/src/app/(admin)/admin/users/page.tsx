'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Edit,
  Trash2,
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Mail,
  UserCheck,
  UserX,
  Camera,
  Plus,
  Sliders,
  DollarSign,
  ImageIcon,
  Settings as SettingsIcon,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from '@/components/ui/table';
import { LoadingState } from '@/components/common/loading-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminModal } from '@/components/admin/admin-modal';

export interface UserAccountItem {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'suspended';
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface RoleDefinitionItem {
  id: string;
  key: string;
  name: string;
  description: string;
  badgeColor: 'gold' | 'outline' | 'success' | 'warning';
  permissions: {
    managePrestations: boolean;
    manageGalleries: boolean;
    manageFinances: boolean;
    manageCrm: boolean;
    manageUsers: boolean;
    manageSettings: boolean;
  };
}

const DEFAULT_ROLES: RoleDefinitionItem[] = [
  {
    id: 'r-1',
    key: 'admin',
    name: 'Super Admin',
    description: 'Accès intégral sans restriction à l\'ensemble du système, finances et réglages.',
    badgeColor: 'gold',
    permissions: {
      managePrestations: true,
      manageGalleries: true,
      manageFinances: true,
      manageCrm: true,
      manageUsers: true,
      manageSettings: true,
    },
  },
  {
    id: 'r-2',
    key: 'photographer',
    name: 'Photographe Master',
    description: 'Gestion des formules, téléversement de galeries et suivi des prestations photo.',
    badgeColor: 'success',
    permissions: {
      managePrestations: true,
      manageGalleries: true,
      manageFinances: false,
      manageCrm: true,
      manageUsers: false,
      manageSettings: false,
    },
  },
  {
    id: 'r-3',
    key: 'assistant',
    name: 'Assistant Studio',
    description: 'Assistance au tri des photos, suivi des brouillons et modération des avis.',
    badgeColor: 'outline',
    permissions: {
      managePrestations: false,
      manageGalleries: true,
      manageFinances: false,
      manageCrm: true,
      manageUsers: false,
      manageSettings: false,
    },
  },
  {
    id: 'r-4',
    key: 'client',
    name: 'Client VIP',
    description: 'Accès privilège aux galeries privées, téléchargement de packs et factures.',
    badgeColor: 'warning',
    permissions: {
      managePrestations: false,
      manageGalleries: false,
      manageFinances: false,
      manageCrm: false,
      manageUsers: false,
      manageSettings: false,
    },
  },
];

const INITIAL_USERS: UserAccountItem[] = [];

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccountItem | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinitionItem | null>(null);

  // Load Roles
  const [roles, setRoles] = useState<RoleDefinitionItem[]>(DEFAULT_ROLES);

  const saveRoles = (newRoles: RoleDefinitionItem[]) => {
    setRoles(newRoles);
    try {
      localStorage.setItem('studio_user_roles', JSON.stringify(newRoles));
    } catch (e) {}
  };

  // Load Users
  const [users, setUsers] = useState<UserAccountItem[]>(INITIAL_USERS);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const fetchLiveUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await apiClient.get('/admin/users');
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      const formattedUsers = rows.map((u: Record<string, string | boolean>) => ({
        id: u.id as string,
        name: (u.name as string) || `${u.firstName || ''} ${u.lastName || ''}`.trim() || (u.email as string),
        firstName: (u.firstName as string) || '',
        lastName: (u.lastName as string) || '',
        email: u.email as string,
        role: (u.role as string) || 'client',
        status: ((u.status as string) || 'active') as UserAccountItem['status'],
        twoFactorEnabled: Boolean(u.twoFactorEnabled),
        createdAt: (u.createdAt as string) || '',
        lastLogin: u.lastLogin as string | undefined,
      }));
      setUsers(formattedUsers);
    } catch (e) {
      console.error('Erreur chargement utilisateurs API:', e);
      setUsers([]);
      setUsersError('Impossible de charger les utilisateurs depuis l\'API.');
    } finally {
      setUsersLoading(false);
    }
  };

  const syncUserToApi = async (user: UserAccountItem, password?: string) => {
    await apiClient.post('/admin/users', {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      password: password || undefined,
    });
  };

  useEffect(() => {
    fetchLiveUsers();
  }, []);

  // User Form State
  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'photographer',
    status: 'active' as 'active' | 'pending' | 'suspended',
    twoFactorEnabled: true,
  });

  // Role Form State
  const [roleFormData, setRoleFormData] = useState<RoleDefinitionItem>({
    id: '',
    key: '',
    name: '',
    description: '',
    badgeColor: 'gold',
    permissions: {
      managePrestations: true,
      manageGalleries: true,
      manageFinances: false,
      manageCrm: true,
      manageUsers: false,
      manageSettings: false,
    },
  });

  // User Handlers
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: roles[0]?.key || 'photographer',
      status: 'active',
      twoFactorEnabled: true,
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: UserAccountItem) => {
    setEditingUser(user);
    setUserFormData({
      firstName: user.firstName || user.name.split(' ')[0] || '',
      lastName: user.lastName || user.name.split(' ').slice(1).join(' ') || '',
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
    });
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
    try {
      await apiClient.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      console.error('Erreur suppression utilisateur:', e);
      alert('Impossible de supprimer cet utilisateur.');
    }
  };

  const handleToggleStatus = async (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const nextStatus: UserAccountItem['status'] =
      target.status === 'active' ? 'suspended' : 'active';
    const updated = { ...target, status: nextStatus };
    try {
      await syncUserToApi(updated);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (e) {
      console.error('Erreur mise à jour statut:', e);
      alert('Impossible de modifier le statut.');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${userFormData.firstName} ${userFormData.lastName}`.trim() || userFormData.email;

    let savedUser: UserAccountItem;
    if (editingUser) {
      savedUser = {
        ...editingUser,
        name: fullName,
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        email: userFormData.email,
        role: userFormData.role,
        status: userFormData.status,
        twoFactorEnabled: userFormData.twoFactorEnabled,
      };
    } else {
      savedUser = {
        id: `u-${Date.now()}`,
        name: fullName,
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        email: userFormData.email,
        role: userFormData.role,
        status: userFormData.status,
        twoFactorEnabled: userFormData.twoFactorEnabled,
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: 'Jamais',
      };
    }

    try {
      await syncUserToApi(savedUser, userFormData.password || undefined);
      await fetchLiveUsers();
      setIsUserModalOpen(false);
    } catch (err) {
      console.error('Erreur sauvegarde utilisateur:', err);
      alert('Impossible d\'enregistrer l\'utilisateur.');
    }
  };

  // Role Handlers
  const handleOpenAddRole = () => {
    setEditingRole(null);
    setRoleFormData({
      id: `r-${Date.now()}`,
      key: `custom_${Date.now()}`,
      name: '',
      description: '',
      badgeColor: 'gold',
      permissions: {
        managePrestations: true,
        manageGalleries: true,
        manageFinances: false,
        manageCrm: true,
        manageUsers: false,
        manageSettings: false,
      },
    });
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: RoleDefinitionItem) => {
    setEditingRole(role);
    setRoleFormData({ ...role });
    setIsRoleModalOpen(true);
  };

  const handleDeleteRole = (id: string, roleKey: string) => {
    if (roleKey === 'admin') {
      alert('Impossible de supprimer le rôle Super Admin principal.');
      return;
    }
    if (confirm('Voulez-vous vraiment supprimer ce rôle d\'utilisateur ?')) {
      const updated = roles.filter((r) => r.id !== id);
      saveRoles(updated);
    }
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedKey = roleFormData.key || roleFormData.name.toLowerCase().replace(/\s+/g, '_');
    const toSave: RoleDefinitionItem = {
      ...roleFormData,
      key: formattedKey,
    };

    let updated: RoleDefinitionItem[];
    if (editingRole) {
      updated = roles.map((r) => (r.id === editingRole.id ? toSave : r));
    } else {
      updated = [...roles, toSave];
    }
    saveRoles(updated);
    setIsRoleModalOpen(false);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    const matchesStatus = selectedStatusFilter === 'all' || u.status === selectedStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleMeta = (roleKey: string) => {
    const found = roles.find((r) => r.key === roleKey);
    if (found) return { label: found.name, color: found.badgeColor };
    return { label: roleKey, color: 'outline' as const };
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Gestion"
        accent="Utilisateurs & Rôles"
        description="Administration de l'équipe, définition des rôles personnalisés et matrice des permissions."
        actions={
          activeTab === 'users' ? (
            <Button variant="primary" size="sm" onClick={handleOpenAddUser} className="space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Nouvel Utilisateur</span>
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleOpenAddRole} className="space-x-2">
              <Plus className="h-4 w-4" />
              <span>Nouveau Rôle</span>
            </Button>
          )
        }
      />

      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'users'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-muted'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Comptes Utilisateurs ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'roles'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-muted'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Matrice des Rôles & Permissions ({roles.length})</span>
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-caption font-semibold uppercase">Total utilisateurs</CardTitle>
                <Users className="h-4 w-4 text-primary" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground tabular-nums">{users.length}</div>
                <div className="text-caption mt-1">Comptes enregistrés</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-caption font-semibold uppercase">Rôles définis</CardTitle>
                <Shield className="h-4 w-4 text-primary" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground tabular-nums">{roles.length}</div>
                <div className="text-caption mt-1">Profils de droits</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-caption font-semibold uppercase">Sécurité 2FA</CardTitle>
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground tabular-nums">
                  {users.filter((u) => u.twoFactorEnabled).length}
                </div>
                <div className="text-caption mt-1 text-success">Protections actives</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-caption font-semibold uppercase">Comptes actifs</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground tabular-nums">
                  {users.filter((u) => u.status === 'active').length}
                </div>
                <div className="text-caption mt-1">Accès autorisés</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-h2">Comptes utilisateurs ({filteredUsers.length})</CardTitle>
                <CardDescription>
                  Liste détaillée des membres de l&apos;équipe et des accès au studio.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, email…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 text-xs"
                  />
                </div>

                <Select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="w-full sm:w-auto text-xs"
                >
                  <option value="all">Tous les rôles</option>
                  {roles.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              {usersLoading ? (
                <LoadingState message="Chargement des utilisateurs…" />
              ) : usersError ? (
                <div className="py-8 text-center text-sm text-danger">{usersError}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>2FA</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableEmpty colSpan={6} message="Aucun utilisateur trouvé." />
                    ) : (
                      filteredUsers.map((u) => {
                        const meta = getRoleMeta(u.role);
                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary-muted border border-primary/25 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">{u.name}</div>
                                  <div className="text-caption font-mono">ID: {u.id}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <Badge variant={meta.color} className="text-[10px]">
                                {meta.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {u.twoFactorEnabled ? (
                                <span className="inline-flex items-center text-xs text-success font-medium">
                                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Activé
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-xs text-muted-foreground">
                                  <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Désactivé
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <button type="button" onClick={() => handleToggleStatus(u.id)} className="cursor-pointer">
                                <Badge
                                  variant={
                                    u.status === 'active'
                                      ? 'success'
                                      : u.status === 'pending'
                                      ? 'warning'
                                      : 'outline'
                                  }
                                >
                                  {u.status === 'active'
                                    ? 'Actif'
                                    : u.status === 'pending'
                                    ? 'En attente'
                                    : 'Suspendu'}
                                </Badge>
                              </button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditUser(u)}
                                  className="h-8 w-8"
                                  aria-label="Modifier"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="h-8 w-8 text-destructive hover:text-destructive/80"
                                  aria-label="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS MATRIX */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map((role) => {
              const assignedCount = users.filter((u) => u.role === role.key).length;
              return (
                <Card key={role.id} className="space-y-4">
                  <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary-muted border border-primary/25 flex items-center justify-center text-primary">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-base flex items-center gap-2">
                          <span>{role.name}</span>
                          <Badge variant={role.badgeColor} className="text-[10px]">
                            {role.key}
                          </Badge>
                        </div>
                        <div className="text-caption mt-0.5">{assignedCount} utilisateur(s) attribué(s)</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditRole(role)}
                        className="h-8 w-8"
                        aria-label="Modifier le rôle"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRole(role.id, role.key)}
                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed border-t border-b border-border py-3">
                    {role.description}
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="font-semibold text-muted-foreground uppercase tracking-wider text-caption">
                      Matrice des droits d&apos;accès
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`p-2 rounded-lg border flex items-center justify-between ${role.permissions.managePrestations ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-zinc-800 text-zinc-500'}`}>
                        <span>Prestations & Tarifs</span>
                        {role.permissions.managePrestations ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-zinc-600" />}
                      </div>

                      <div className={`p-2 rounded-lg border flex items-center justify-between ${role.permissions.manageGalleries ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-zinc-800 text-zinc-500'}`}>
                        <span>Galeries & Upload</span>
                        {role.permissions.manageGalleries ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-zinc-600" />}
                      </div>

                      <div className={`p-2 rounded-lg border flex items-center justify-between ${role.permissions.manageFinances ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-zinc-800 text-zinc-500'}`}>
                        <span>Finances & Factures</span>
                        {role.permissions.manageFinances ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-zinc-600" />}
                      </div>

                      <div className={`p-2 rounded-lg border flex items-center justify-between ${role.permissions.manageCrm ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-zinc-800 text-zinc-500'}`}>
                        <span>CRM & Fiches Clients</span>
                        {role.permissions.manageCrm ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-zinc-600" />}
                      </div>

                      <div className={`p-2 rounded-lg border flex items-center justify-between ${role.permissions.manageUsers ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-zinc-800 text-zinc-500'}`}>
                        <span>Gestion Utilisateurs</span>
                        {role.permissions.manageUsers ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-zinc-600" />}
                      </div>

                      <div className={`p-2 rounded-lg border flex items-center justify-between ${role.permissions.manageSettings ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-zinc-800 text-zinc-500'}`}>
                        <span>Paramètres Studio</span>
                        {role.permissions.manageSettings ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-zinc-600" />}
                      </div>
                    </div>
                  </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <AdminModal
        open={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ?"Modifier l'utilisateur" : 'Ajouter un utilisateur'}
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="user-form" variant="primary">
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSaveUser} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Prénom</label>
              <Input
                required
                value={userFormData.firstName}
                onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Nom</label>
              <Input
                required
                value={userFormData.lastName}
                onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">Email</label>
            <Input
              type="email"
              required
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">
              Mot de passe {editingUser && '(laisser vide pour ne pas modifier)'}
            </label>
            <Input
              type="password"
              required={!editingUser}
              placeholder="••••••••••••"
              value={userFormData.password}
              onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Rôle</label>
              <Select
                value={userFormData.role}
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                className="text-xs"
              >
                {roles.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name} ({r.key})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Statut</label>
              <Select
                value={userFormData.status}
                onChange={(e) =>
                  setUserFormData({
                    ...userFormData,
                    status: e.target.value as 'active' | 'pending' | 'suspended',
                  })
                }
                className="text-xs"
              >
                <option value="active">Actif</option>
                <option value="pending">En attente</option>
                <option value="suspended">Suspendu</option>
              </Select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-border">
            <span className="text-sm font-medium text-foreground flex items-center">
              <ShieldCheck className="h-4 w-4 text-primary mr-1.5" /> Double authentification (2FA)
            </span>
            <input
              type="checkbox"
              checked={userFormData.twoFactorEnabled}
              disabled={!['admin', 'photographer', 'assistant'].includes(userFormData.role)}
              onChange={(e) => setUserFormData({ ...userFormData, twoFactorEnabled: e.target.checked })}
              className="h-4 w-4 rounded accent-primary disabled:opacity-40"
            />
          </div>
          {!['admin', 'photographer', 'assistant'].includes(userFormData.role) && (
            <p className="text-[11px] text-muted-foreground">La 2FA s&apos;applique uniquement aux comptes staff.</p>
          )}
        </form>
      </AdminModal>

      <AdminModal
        open={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={editingRole ? 'Modifier le rôle' : 'Créer un rôle'}
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsRoleModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="role-form" variant="primary">
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="role-form" onSubmit={handleSaveRole} className="space-y-4 text-sm">
          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">Nom du rôle</label>
            <Input
              required
              placeholder="ex: Éditeur retoucheur, Commercial devis…"
              value={roleFormData.name}
              onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">Description</label>
            <Input
              required
              placeholder="Description des accès et missions…"
              value={roleFormData.description}
              onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">Couleur du badge</label>
            <Select
              value={roleFormData.badgeColor}
              onChange={(e) =>
                setRoleFormData({
                  ...roleFormData,
                  badgeColor: e.target.value as 'gold' | 'outline' | 'success' | 'warning',
                })
              }
              className="text-xs"
            >
              <option value="gold">Primary (haute importance)</option>
              <option value="success">Vert (équipe photo)</option>
              <option value="outline">Neutre (assistant)</option>
              <option value="warning">Orange (client / externe)</option>
            </Select>
          </div>

          <div className="pt-3 border-t border-border space-y-3">
            <div className="font-semibold text-primary flex items-center text-sm">
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Permissions
            </div>

            <div className="space-y-2">
              {(
                [
                  ['managePrestations', 'Catalogue prestations & tarifs'],
                  ['manageGalleries', 'Galeries photos & téléversement'],
                  ['manageFinances', 'Finances & factures'],
                  ['manageCrm', 'CRM & fiches clients'],
                  ['manageUsers', 'Gestion utilisateurs & rôles'],
                  ['manageSettings', 'Paramètres studio & clés API'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface-muted border border-border cursor-pointer"
                >
                  <span className="text-foreground text-sm">{label}</span>
                  <input
                    type="checkbox"
                    checked={roleFormData.permissions[key]}
                    onChange={(e) =>
                      setRoleFormData({
                        ...roleFormData,
                        permissions: { ...roleFormData.permissions, [key]: e.target.checked },
                      })
                    }
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              ))}
            </div>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
