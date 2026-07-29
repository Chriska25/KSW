'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, Calendar, Sparkles, ArrowRight, Star, Quote, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { useServices } from '@/context/services-context';
import apiClient from '@/lib/api-client';

export default function Home() {
  const { settings, formatPrice } = useSettings();

  return (
    <div className="w-full space-y-16">
      {/* Hero Section */}
      <section className="relative pt-36 pb-24 overflow-hidden border-b border-zinc-800">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          <Badge variant="gold" className="px-4 py-1.5 text-xs font-semibold uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-400" /> {settings.studioName}
          </Badge>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] max-w-5xl mx-auto">
            Sublimer Vos Plus Beaux <span className="gold-gradient-text">Instants d'Émotion</span>
          </h1>

          <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Reportages photo sur-mesure pour mariages d'exception, portraits d'art en studio et visuels d'entreprise haut de gamme.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/reservation">
              <Button variant="gold" size="lg" className="px-8 font-bold text-sm">
                Réserver Votre Date <Calendar className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/portfolio">
              <Button variant="outline" size="lg" className="px-8 border-zinc-800 text-zinc-300 hover:text-amber-400 text-sm">
                Découvrir le Portfolio
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Key Prestations Showcase */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <Badge variant="gold">Catalogue Exclusif</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Des Prestations <span className="gold-gradient-text">Haut de Gamme</span>
          </h2>
        </div>

        <HomeServicesGrid formatPrice={formatPrice} />
      </section>

      {/* Testimonials Showcase Section */}
      <HomeTestimonialsSection />
    </div>
  );
}

function HomeServicesGrid({ formatPrice }: { formatPrice: (val: number) => string }) {
  const { services } = useServices();

  if (services.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 rounded-2xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {services.slice(0, 3).map((item) => (
        <Card key={item.id} className="glass-panel overflow-hidden border-zinc-800 group hover:border-amber-400/50 transition-all">
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={item.coverImage}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <CardContent className="p-6 space-y-3">
            <h3 className="text-xl font-bold text-white">{item.title}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{item.category} haut de gamme</p>
            <div className="pt-2 flex justify-between items-center">
              <span className="font-extrabold text-amber-400 text-sm">À partir de {formatPrice(item.price)}</span>
              <Link href="/prestations">
                <Button variant="ghost" size="sm" className="text-xs text-zinc-300 hover:text-white">
                  En savoir plus <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HomeTestimonialsSection() {
  const [testimonials, setTestimonials] = React.useState<any[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await apiClient.get(`/testimonials?t=${Date.now()}`);
        if (res.data?.data?.length > 0) {
          setTestimonials(res.data.data);
        }
      } catch (e) {
        console.error('Erreur chargement témoignages accueil:', e);
      } finally {
        setLoaded(true);
      }
    };
    fetchTestimonials();
  }, []);

  if (!loaded) {
    return (
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 border-t border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) return null;

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 border-t border-zinc-800">
      <div className="text-center space-y-3">
        <Badge variant="gold">Témoignages & Recommandations</Badge>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Ce que disent nos <span className="gold-gradient-text">Mariés & Clients</span>
        </h2>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Découvrez les retours d'expérience et avis vérifiés de nos clients après leur séance photo ou mariage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((t) => (
          <Card key={t.id} className="glass-panel border-zinc-800 p-6 flex flex-col justify-between space-y-4 hover:border-amber-400/40 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-amber-400">
                  {Array.from({ length: t.rating || 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <Quote className="h-5 w-5 text-amber-400/40" />
              </div>
              <p className="text-sm text-zinc-300 italic leading-relaxed">
                "{t.content}"
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-4 border-t border-zinc-800/80">
              <img
                src={t.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'}
                alt={t.clientName}
                className="h-10 w-10 rounded-full object-cover border border-amber-400/40 shrink-0"
              />
              <div>
                <div className="font-bold text-white text-sm">{t.clientName}</div>
                <div className="text-[11px] text-zinc-400">{t.clientRole || 'Client Studio'}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center pt-4">
        <Link href="/contact">
          <Button variant="outline" size="sm" className="space-x-2 border-zinc-800">
            <MessageSquare className="h-4 w-4 text-amber-400" />
            <span>Déposer Votre Avis / Témoignage</span>
          </Button>
        </Link>
      </div>
    </section>
  );
}
