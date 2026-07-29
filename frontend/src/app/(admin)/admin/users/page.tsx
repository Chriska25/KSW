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
  Sparkles,
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
import { LoadingState } from '@/components/common/loading-state';

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
      const formattedUsers = rows.map((u: Record<string, string>) => ({
        id: u.id,
        name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email,
        role: u.role || 'client',
        status: (u.status || 'active') as UserAccountItem['status'],
        twoFactorEnabled: u.role === 'admin' || u.role === 'photographer',
        createdAt: u.createdAt || '',
        lastLogin: u.lastLogin,
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Gestion <span className="gold-gradient-text">Utilisateurs & Rôles</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Administration de l'équipe, définition des rôles personnalisés et matrice des permissions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {activeTab === 'users' ? (
            <Button variant="gold" size="sm" onClick={handleOpenAddUser} className="space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Nouvel Utilisateur</span>
            </Button>
          ) : (
            <Button variant="gold" size="sm" onClick={handleOpenAddRole} className="space-x-2">
              <Plus className="h-4 w-4" />
              <span>Nouveau Rôle</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Comptes Utilisateurs ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'roles'
              ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Matrice des Rôles & Permissions ({roles.length})</span>
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <Card className="glass-panel p-5 space-y-2 border-zinc-800">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase">
                <span>Total Utilisateurs</span>
                <Users className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{users.length}</div>
              <div className="text-xs text-emerald-400 font-medium">Comptes enregistrés BDD</div>
            </Card>

            <Card className="glass-panel p-5 space-y-2 border-zinc-800">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase">
                <span>Rôles Définis</span>
                <Shield className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-amber-400">{roles.length}</div>
              <div className="text-xs text-zinc-400 font-medium">Profils de droits</div>
            </Card>

            <Card className="glass-panel p-5 space-y-2 border-zinc-800">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase">
                <span>Sécurité 2FA Activée</span>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-400">
                {users.filter((u) => u.twoFactorEnabled).length}
              </div>
              <div className="text-xs text-emerald-400 font-medium">Protections Fortes</div>
            </Card>

            <Card className="glass-panel p-5 space-y-2 border-zinc-800">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase">
                <span>Comptes Actifs</span>
                <UserCheck className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">
                {users.filter((u) => u.status === 'active').length}
              </div>
              <div className="text-xs text-zinc-400 font-medium">Accès Autorisés</div>
            </Card>
          </div>

          {/* Users Table */}
          <Card className="glass-panel space-y-4 border-zinc-800">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Comptes Utilisateurs ({filteredUsers.length})</CardTitle>
                <CardDescription>
                  Liste détaillée des membres de l'équipe et des accès au studio.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
                  <Input
                    placeholder="Rechercher par nom, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 text-xs"
                  />
                </div>

                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-300 focus:outline-none focus:border-amber-400"
                >
                  <option value="all">Tous les rôles</option>
                  {roles.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>

            <CardContent>
              {usersLoading ? (
                <LoadingState message="Chargement des utilisateurs…" />
              ) : usersError ? (
                <div className="py-8 text-center text-sm text-red-400">{usersError}</div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="bg-zinc-950/80 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Utilisateur</th>
                      <th className="py-3 px-4">Adresse Email</th>
                      <th className="py-3 px-4">Rôle Attribué</th>
                      <th className="py-3 px-4">Sécurité 2FA</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredUsers.map((u) => {
                      const meta = getRoleMeta(u.role);
                      return (
                        <tr key={u.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white flex items-center space-x-3">
                            <div className="h-9 w-9 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-extrabold text-sm shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div>{u.name}</div>
                              <div className="text-[11px] text-zinc-500 font-mono">ID: {u.id}</div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono text-zinc-300">{u.email}</td>
                          <td className="py-3.5 px-4">
                            <Badge variant={meta.color} className="text-[10px]">
                              {meta.label}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            {u.twoFactorEnabled ? (
                              <span className="inline-flex items-center text-xs text-emerald-400 font-semibold">
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Activé
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-xs text-zinc-500">
                                <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Désactivé
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <button onClick={() => handleToggleStatus(u.id)} className="cursor-pointer">
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
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditUser(u)}
                              className="h-8 w-8 text-zinc-300 hover:text-amber-400"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser(u.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                <Card key={role.id} className="glass-panel border-zinc-800 space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-white text-base flex items-center space-x-2">
                          <span>{role.name}</span>
                          <Badge variant={role.badgeColor} className="text-[10px]">
                            {role.key}
                          </Badge>
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">{assignedCount} Utilisateur(s) attribué(s)</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditRole(role)}
                        className="h-8 w-8 text-zinc-300 hover:text-amber-400"
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

                  <p className="text-xs text-zinc-300 leading-relaxed border-t border-b border-zinc-800/80 py-3">
                    {role.description}
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="font-bold text-zinc-400 uppercase tracking-wider text-[11px]">
                      Matrice des Droits d'Accès
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
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal User */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="glass-panel max-w-lg w-full border-amber-400/40 space-y-4">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-3">
              <CardTitle className="text-xl">
                {editingUser ? 'Modifier l\'Utilisateur' : 'Ajouter un Utilisateur'}
              </CardTitle>
              <button onClick={() => setIsUserModalOpen(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">Prénom</label>
                    <Input
                      required
                      value={userFormData.firstName}
                      onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">Nom</label>
                    <Input
                      required
                      value={userFormData.lastName}
                      onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Adresse Email Officielle</label>
                  <Input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">
                    Mot de passe {editingUser && '(Laisser vide pour ne pas modifier)'}
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
                    <label className="text-zinc-400 block mb-1 font-semibold">Rôle & Permissions Attribués</label>
                    <select
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                      className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                    >
                      {roles.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.name} ({r.key})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">Statut du Compte</label>
                    <select
                      value={userFormData.status}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          status: e.target.value as 'active' | 'pending' | 'suspended',
                        })
                      }
                      className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                    >
                      <option value="active">Actif (Accès Autorisé)</option>
                      <option value="pending">En Attente de Validation</option>
                      <option value="suspended">Suspendu</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
                  <span className="text-zinc-300 font-semibold flex items-center">
                    <ShieldCheck className="h-4 w-4 text-amber-400 mr-1.5" /> Exiger la Double Authentification (2FA)
                  </span>
                  <input
                    type="checkbox"
                    checked={userFormData.twoFactorEnabled}
                    onChange={(e) => setUserFormData({ ...userFormData, twoFactorEnabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-amber-400"
                  />
                </div>

                <div className="pt-4 flex justify-end space-x-3 border-t border-zinc-800">
                  <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" variant="gold">
                    Enregistrer l'Utilisateur
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Role */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="glass-panel max-w-lg w-full border-amber-400/40 space-y-4">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-3">
              <CardTitle className="text-xl">
                {editingRole ? 'Modifier le Rôle' : 'Créer un Nouveau Rôle'}
              </CardTitle>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Nom du Rôle</label>
                  <Input
                    required
                    placeholder="ex: Éditeur Retoucheur, Commercial Devis..."
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Description du Rôle</label>
                  <Input
                    required
                    placeholder="Description explicative des accès et missions..."
                    value={roleFormData.description}
                    onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Couleur de Badge</label>
                  <select
                    value={roleFormData.badgeColor}
                    onChange={(e) =>
                      setRoleFormData({
                        ...roleFormData,
                        badgeColor: e.target.value as 'gold' | 'outline' | 'success' | 'warning',
                      })
                    }
                    className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="gold">Doré (Haute Importance)</option>
                    <option value="success">Vert (Equipe Photographe)</option>
                    <option value="outline">Gris (Assistant & Staff)</option>
                    <option value="warning">Orange (Client / Externe)</option>
                  </select>
                </div>

                {/* Permissions Matrix Checkboxes */}
                <div className="pt-3 border-t border-zinc-800 space-y-3">
                  <div className="font-bold text-amber-400 flex items-center">
                    <ShieldCheck className="h-4 w-4 mr-1.5" /> Sélection des Permissions Granulaires
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                      <span className="text-zinc-200">Accès Catalogue Prestations & Tarifs</span>
                      <input
                        type="checkbox"
                        checked={roleFormData.permissions.managePrestations}
                        onChange={(e) =>
                          setRoleFormData({
                            ...roleFormData,
                            permissions: { ...roleFormData.permissions, managePrestations: e.target.checked },
                          })
                        }
                        className="h-4 w-4 accent-amber-400"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                      <span className="text-zinc-200">Accès Galeries Photos & Téléversement</span>
                      <input
                        type="checkbox"
                        checked={roleFormData.permissions.manageGalleries}
                        onChange={(e) =>
                          setRoleFormData({
                            ...roleFormData,
                            permissions: { ...roleFormData.permissions, manageGalleries: e.target.checked },
                          })
                        }
                        className="h-4 w-4 accent-amber-400"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                      <span className="text-zinc-200">Accès Finances & Émission Factures</span>
                      <input
                        type="checkbox"
                        checked={roleFormData.permissions.manageFinances}
                        onChange={(e) =>
                          setRoleFormData({
                            ...roleFormData,
                            permissions: { ...roleFormData.permissions, manageFinances: e.target.checked },
                          })
                        }
                        className="h-4 w-4 accent-amber-400"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                      <span className="text-zinc-200">Accès CRM & Fiches Clients</span>
                      <input
                        type="checkbox"
                        checked={roleFormData.permissions.manageCrm}
                        onChange={(e) =>
                          setRoleFormData({
                            ...roleFormData,
                            permissions: { ...roleFormData.permissions, manageCrm: e.target.checked },
                          })
                        }
                        className="h-4 w-4 accent-amber-400"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                      <span className="text-zinc-200">Accès Gestion Utilisateurs & Rôles</span>
                      <input
                        type="checkbox"
                        checked={roleFormData.permissions.manageUsers}
                        onChange={(e) =>
                          setRoleFormData({
                            ...roleFormData,
                            permissions: { ...roleFormData.permissions, manageUsers: e.target.checked },
                          })
                        }
                        className="h-4 w-4 accent-amber-400"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                      <span className="text-zinc-200">Accès Paramètres Studio & Clés API</span>
                      <input
                        type="checkbox"
                        checked={roleFormData.permissions.manageSettings}
                        onChange={(e) =>
                          setRoleFormData({
                            ...roleFormData,
                            permissions: { ...roleFormData.permissions, manageSettings: e.target.checked },
                          })
                        }
                        className="h-4 w-4 accent-amber-400"
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex justify-end space-x-3 border-t border-zinc-800">
                  <Button type="button" variant="outline" onClick={() => setIsRoleModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" variant="gold">
                    Enregistrer le Rôle
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
