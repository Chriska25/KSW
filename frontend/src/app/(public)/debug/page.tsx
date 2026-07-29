'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  HardDrive,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Cpu,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiClient, { getApiBaseUrl } from '@/lib/api-client';

interface DiagnosticsData {
  frontendUrl: string;
  apiUrl: string;
  hostname: string;
  liveSettings: string;
  apiConnected: boolean;
  apiLatencyMs: number | null;
  dbStatus: 'ok' | 'error' | 'unknown';
  storageStatus: 'ok' | 'error' | 'unknown';
  envVars: Record<string, string | undefined>;
  apiEndpointsTest: Array<{ name: string; url: string; status: 'ok' | 'error'; latency: number; message?: string }>;
}

export default function DebugPage() {
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData>({
    frontendUrl: '',
    apiUrl: '',
    hostname: '',
    liveSettings: '—',
    apiConnected: false,
    apiLatencyMs: null,
    dbStatus: 'unknown',
    storageStatus: 'unknown',
    envVars: {},
    apiEndpointsTest: [],
  });

  const runDiagnostics = async () => {
    setLoading(true);

    const fUrl = typeof window !== 'undefined' ? window.location.origin : 'Server-side';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '—';
    const aUrl = getApiBaseUrl();
    let liveSettings = '—';

    const envs = {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '(Non défini)',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '(Non défini)',
      BACKEND_INTERNAL_URL: process.env.BACKEND_INTERNAL_URL || '(Non défini)',
      NODE_ENV: process.env.NODE_ENV,
    };

    const endpointsToTest = [
      { name: 'Paramètres Système', path: '/settings' },
      { name: 'Témoignages Publics', path: '/testimonials' },
    ];

    const results: Array<{ name: string; url: string; status: 'ok' | 'error'; latency: number; message?: string }> = [];
    let isConnected = false;
    let mainLatency = 0;
    let dbState: 'ok' | 'error' | 'unknown' = 'unknown';

    const startOverall = Date.now();

    for (const ep of endpointsToTest) {
      const epStart = Date.now();
      try {
        const res = await apiClient.get(ep.path, { timeout: 4000 });
        const duration = Date.now() - epStart;
        results.push({
          name: ep.name,
          url: `${aUrl}${ep.path}`,
          status: 'ok',
          latency: duration,
          message: `HTTP ${res.status} OK`,
        });
        isConnected = true;
        mainLatency = duration;
        dbState = 'ok';
        if (ep.path === '/settings' && res.data?.data) {
          const s = res.data.data;
          liveSettings = `${s.studioNameFirstPart || '?'} ${s.studioNameSecondPart || '?'}`;
        }
      } catch (err: any) {
        const duration = Date.now() - epStart;
        results.push({
          name: ep.name,
          url: `${aUrl}${ep.path}`,
          status: 'error',
          latency: duration,
          message: err.message || 'Échec de connexion API',
        });
      }
    }

    setDiagnostics({
      frontendUrl: fUrl,
      apiUrl: aUrl,
      hostname,
      liveSettings,
      apiConnected: isConnected,
      apiLatencyMs: isConnected ? mainLatency : null,
      dbStatus: isConnected ? dbState : 'error',
      storageStatus: isConnected ? 'ok' : 'error',
      envVars: envs,
      apiEndpointsTest: results,
    });

    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="pt-32 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Badge variant="gold" className="mb-2">Module d'Auto-Diagnostic & Ngrok</Badge>
          <h1 className="text-3xl font-extrabold text-white">
            Diagnostic Réseau & <span className="gold-gradient-text">Santé Système</span>
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Vérification en temps réel des liaisons Frontend ↔ Backend, variables d'environnement, base de données et stockage.
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={runDiagnostics} disabled={loading} className="space-x-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Relancer l'Analyse</span>
        </Button>
      </div>

      {/* Main Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-panel border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">
              URL Frontend
            </CardTitle>
            <Globe className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono font-bold text-white truncate">{diagnostics.frontendUrl || '---'}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Host: {diagnostics.hostname || '—'}</div>
            <div className="text-[11px] text-amber-400/90 mt-1 font-semibold">BDD: {diagnostics.liveSettings}</div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">
              Liaison API Backend
            </CardTitle>
            <Server className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {diagnostics.apiConnected ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">Connecté ({diagnostics.apiLatencyMs}ms)</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-400" />
                  <span className="text-sm font-bold text-rose-400">Hors Ligne / Local Fallback</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono mt-1 truncate">{diagnostics.apiUrl || '---'}</div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">
              Base PostgreSQL
            </CardTitle>
            <Database className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {diagnostics.dbStatus === 'ok' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">Opérationnelle</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-400" />
                  <span className="text-sm font-bold text-rose-400">Non Accessible</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Liaison PostgreSQL Docker</div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">
              Stockage Fichiers (Storage)
            </CardTitle>
            <HardDrive className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {diagnostics.storageStatus === 'ok' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">Storage Link OK</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-400" />
                  <span className="text-sm font-bold text-rose-400">Erreur Stockage</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Uploads FastAPI /uploads</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Environment Variables Card */}
        <Card className="glass-panel border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Cpu className="h-4 w-4 text-amber-400 mr-2" /> Variables d'Environnement
            </CardTitle>
            <CardDescription className="text-xs">
              Configuration active du client web (Next.js).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-xs">
            {Object.entries(diagnostics.envVars).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-zinc-400">{key}</span>
                <span className="text-amber-400 font-bold">{val}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* API Endpoint Tests Table */}
        <Card className="glass-panel border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Activity className="h-4 w-4 text-amber-400 mr-2" /> Tests des Endpoints API
            </CardTitle>
            <CardDescription className="text-xs">
              Vérification directe des routes de réponse JSON.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-xs">
              {diagnostics.apiEndpointsTest.map((test, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{test.name}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">{test.url}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant={test.status === 'ok' ? 'success' : 'outline'}>
                      {test.status === 'ok' ? `${test.latency}ms` : 'Échec'}
                    </Badge>
                    <div className="text-[10px] text-zinc-400 mt-1">{test.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
