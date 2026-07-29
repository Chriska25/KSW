'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  Star,
  Award,
  Shield,
  Layers,
  Heart,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { useGalleries } from '@/context/gallery-context';

export default function HomePage() {
  const { settings } = useSettings();
  const { publicPhotos } = useGalleries();
  const [activeCategory, setActiveCategory] = useState('all');

  const portfolioItems = publicPhotos.map((p, idx) => ({
    id: p.id || idx,
    category: (p.cat || 'wedding').toLowerCase(),
    title: p.title || 'Photographie d\'Art',
    image: p.url,
    tag: p.cat === 'portrait' ? "Portrait d'Art" : p.cat === 'corporate' ? 'Corporate & Luxe' : "Mariage D'Exception",
  }));

  const filteredPortfolio =
    activeCategory === 'all'
      ? portfolioItems
      : portfolioItems.filter((item) => item.category === activeCategory);

  return (
    <div className="space-y-24 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[92vh] flex items-center justify-center pt-24 pb-16 overflow-hidden">
        {/* Background Ambient Glow & Subtle Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-950/80 to-zinc-950" />
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2000&auto=format&fit=crop")',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 text-center space-y-8 z-10">
          <Badge variant="gold" className="px-4 py-1.5 text-xs font-semibold uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 mr-2 inline" /> Studio Photographique d'Art & Prestige
          </Badge>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
            Sublimer l'Instant, <br />
            <span className="gold-gradient-text">Graver l'Émotion</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-zinc-300 font-light leading-relaxed">
            Photographe professionnel spécialisé dans les reportages de mariage haut de gamme, les portraits d'art et l'accompagnement visuel sur-mesure.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/reservation">
              <Button variant="gold" size="lg" className="w-full sm:w-auto space-x-3 px-8 text-base">
                <Calendar className="h-5 w-5" />
                <span>Réserver une Séance</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/portfolio">
              <Button variant="outline" size="lg" className="w-full sm:w-auto space-x-2 px-8 text-base">
                <Camera className="h-5 w-5 text-amber-400" />
                <span>Explorer le Portfolio</span>
              </Button>
            </Link>
          </div>

          {/* Social Proof badges */}
          <div className="pt-10 flex flex-wrap items-center justify-center gap-8 text-xs text-zinc-400 border-t border-zinc-800/80">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-amber-400" />
              <span>Membre Fearless Photographers</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span>Note 5/5 (180+ Avis Vérifiés)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-amber-400" />
              <span>Galerie Securisée & Livraison HD</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS COUNTER BAR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center border-amber-500/20">
          <div>
            <div className="text-3xl md:text-4xl font-extrabold gold-gradient-text">12+</div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 mt-1">
              Années d'Expérience
            </div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold gold-gradient-text">450+</div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 mt-1">
              Mariages & Projets
            </div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold gold-gradient-text">15</div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 mt-1">
              Distinctions Internationales
            </div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold gold-gradient-text">100%</div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 mt-1">
              Livraison Haute Définition
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRESTATIONS CAROUSEL SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <Badge variant="gold">Prestations D'Exception</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Des formules conçues pour immortaliser <br />
            <span className="gold-gradient-text">vos plus grands moments</span>
          </h2>
          <p className="text-zinc-400 text-sm">
            Chaque prestation comprend la direction artistique, la retouche minutieuse haute précision et l'accès à une galerie privée en ligne.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Mariage */}
          <Card className="flex flex-col justify-between hover:border-amber-400/50 group">
            <CardHeader className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Heart className="h-6 w-6" />
              </div>
              <CardTitle>Reportage Mariage D'Exception</CardTitle>
              <CardDescription>
                Du préparatif de la mariée jusqu'à l'ouverture du bal, une couverture discrète et élégante.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-300">
              <ul className="space-y-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Présence de 8h à 14h de couverture</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>450+ Photos retouchées en Haute Définition</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Galerie privée sécurisée + Coffret USB Bois</span>
                </li>
              </ul>
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-500 block">À partir de</span>
                  <span className="text-2xl font-bold text-white">1 890 {settings.currency || 'EUR (€)'}</span>
                </div>
                <Link href="/reservation">
                  <Button variant="gold" size="sm">
                    Réserver <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Portrait Studio */}
          <Card className="flex flex-col justify-between border-amber-400/30 gold-border-glow hover:border-amber-400 group">
            <CardHeader className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-amber-400 text-zinc-950 flex items-center justify-center font-bold shadow-lg shadow-amber-400/20 group-hover:scale-110 transition-transform">
                <Camera className="h-6 w-6" />
              </div>
              <CardTitle className="gold-gradient-text">Séance Portrait Studio & Mode</CardTitle>
              <CardDescription>
                Révélez votre personnalité à travers une séance guidée en studio privé ou en extérieur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-300">
              <ul className="space-y-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Séance d'1h30 avec mises en lumière artistiques</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>15 Photos au choix retouchées avec soin</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Conseils vestimentaires et pose inclus</span>
                </li>
              </ul>
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-500 block">À partir de</span>
                  <span className="text-2xl font-bold text-white">350 {settings.currency || 'EUR (€)'}</span>
                </div>
                <Link href="/reservation">
                  <Button variant="gold" size="sm">
                    Réserver <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Corporate */}
          <Card className="flex flex-col justify-between hover:border-amber-400/50 group">
            <CardHeader className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Layers className="h-6 w-6" />
              </div>
              <CardTitle>Branding & Portrait Corporate</CardTitle>
              <CardDescription>
                Valorisez votre image de marque, vos collaborateurs et vos infrastructures de prestige.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-300">
              <ul className="space-y-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Portraits trombinoscope & reportage d'équipe</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Droits d'utilisation commerciale inclus</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Livraison express sous 48h</span>
                </li>
              </ul>
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-500 block">Sur Devis à partir de</span>
                  <span className="text-2xl font-bold text-white">650 {settings.currency || 'EUR (€)'}</span>
                </div>
                <Link href="/contact">
                  <Button variant="outline" size="sm">
                    Demander un Devis
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. INTERACTIVE PORTFOLIO PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div>
            <Badge variant="gold">Galerie Sélective</Badge>
            <h2 className="text-3xl font-bold text-white mt-2">Dernières Réalisations</h2>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Tous les projets' },
              { id: 'wedding', label: 'Mariages' },
              { id: 'portrait', label: 'Portraits' },
              { id: 'corporate', label: 'Corporate' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  activeCategory === tab.id
                    ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                    : 'glass-panel text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Portfolio Masonry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPortfolio.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-2xl glass-panel aspect-[4/3] cursor-pointer"
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-end">
                <Badge variant="gold" className="w-max mb-2">
                  {item.tag}
                </Badge>
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link href="/portfolio">
            <Button variant="outline" size="lg" className="space-x-2">
              <span>Voir l'ensemble du Portfolio</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 5. TESTIMONIALS CAROUSEL */}
      <section className="bg-zinc-900/40 py-16 border-y border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="gold">Témoignages Clients</Badge>
            <h2 className="text-3xl font-bold text-white">Ce qu'ils disent du Studio</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Sophie & Alexandre',
                event: 'Mariage au Château de Gilly',
                text: 'Une présence merveilleuse lors de notre mariage. Les photos sont à couper le souffle, d’une poésie rare. Nos invités ont tous souligné sa discrétion et son professionnalisme.',
                stars: 5,
              },
              {
                name: 'Julien M.',
                event: 'Portrait Professionnel Studio',
                text: 'Moi qui déteste poser devant un objectif, l’expérience en studio a été d’une fluidité remarquable. Le résultat pour mon profil LinkedIn et presse est exceptionnel.',
                stars: 5,
              },
              {
                name: 'Cabinet Vaneau & Associés',
                event: 'Reportage Corporate 50 Collaborateurs',
                text: 'Livraison des photos dans des délais record. La qualité des portraits trombinoscopes et des prises de vue d’architecture a sublimé notre nouveau site internet.',
                stars: 5,
              },
            ].map((t, idx) => (
              <Card key={idx} className="glass-panel space-y-4">
                <div className="flex items-center space-x-1">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 italic leading-relaxed">"{t.text}"</p>
                <div className="pt-4 border-t border-zinc-800/80">
                  <div className="font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-zinc-400">{t.event}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl glass-panel-gold p-10 md:p-16 overflow-hidden text-center space-y-6 border-amber-400/40">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">
              Prêt à immortaliser <span className="gold-gradient-text">vos souvenirs ?</span>
            </h2>
            <p className="text-zinc-300 text-sm md:text-base">
              Vérifiez la disponibilité de votre date et réservez votre créneau directement en ligne avec paiement sécurisé de l'acompte.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/reservation">
                <Button variant="gold" size="lg" className="px-8 space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Réserver en Ligne Maintenant</span>
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg" className="px-8">
                  Formulaire de Contact
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
