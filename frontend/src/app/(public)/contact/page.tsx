'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ShieldCheck,
  MessageCircle,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { submitContactMessage } from '@/lib/contact-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { submitTestimonial } from '@/lib/testimonials';
import { fetchPublicFaq } from '@/lib/faq-api';
import { StudioMapEmbed } from '@/components/common/studio-map-embed';
import { RevealPhotoCard } from '@/components/common/reveal-photo-card';
import { ContactAmbianceGallery } from '@/components/contact/contact-ambiance-gallery';
import { useGalleries } from '@/context/gallery-context';

export default function ContactPage() {
  const { settings } = useSettings();
  const { publicPhotos } = useGalleries();
  const formStartedAt = React.useRef(0);
  React.useEffect(() => {
    formStartedAt.current = Date.now();
  }, []);

  const ambiancePhotos = React.useMemo(
    () =>
      publicPhotos.slice(0, 8).map((p) => ({
        url: p.url,
        thumbUrl: p.thumbUrl,
        title: p.title || p.albumName || 'Portfolio studio',
      })),
    [publicPhotos]
  );

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([]);

  const fallbackFaqs = React.useMemo(
    () => [
      {
        q: 'Combien de temps à l\'avance dois-je réserver mon mariage ?',
        a: 'Pour les mariages entre mai et septembre, il est recommandé de réserver entre 8 et 12 mois à l\'avance. N\'hésitez pas toutefois à nous contacter pour vérifier la disponibilité sur une date spécifique.',
      },
      {
        q: 'Comment s\'effectue la livraison de mes photographies ?',
        a: 'Toutes vos photographies retouchées en Haute Définition vous sont livrées dans une galerie privée sécurisée sous 2 à 3 semaines, avec possibilité de téléchargement ZIP illimité.',
      },
      {
        q: 'Fournissez-vous les fichiers bruts (RAW) ?',
        a: `Le travail d'étalonnage et de retouche fait partie intégrante de la signature artistique de ${settings.studioName}. Nous livrons uniquement des images sélectionnées et sublimées en format JPEG HD.`,
      },
      {
        q: 'Quels sont les modes de paiement acceptés pour l\'acompte ?',
        a: `Nous acceptons le règlement de l'acompte (${settings.depositRate}%) directement en ligne par carte bancaire via Stripe sécurisé, PayPal ou par virement bancaire.`,
      },
    ],
    [settings.studioName, settings.depositRate]
  );

  React.useEffect(() => {
    let cancelled = false;
    fetchPublicFaq()
      .then((items) => {
        if (cancelled) return;
        if (items.length > 0) {
          setFaqs(items.map((item) => ({ q: item.question, a: item.answer })));
        } else {
          setFaqs(fallbackFaqs);
        }
      })
      .catch(() => {
        if (!cancelled) setFaqs(fallbackFaqs);
      });
    return () => {
      cancelled = true;
    };
  }, [fallbackFaqs]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Mariage',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaVerified) {
      alert('Veuillez cocher la case de sécurité Captcha anti-spam.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitContactMessage({
        ...formData,
        website: honeypot,
        formStartedAt: formStartedAt.current,
      });
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: 'Mariage', message: '' });
    } catch (err: unknown) {
      setSubmitError(getApiErrorMessage(err, 'Impossible d\'envoyer votre message. Réessayez.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="gold">Contact & Conciergerie</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Écrivez à <span className="gold-gradient-text">{settings.studioName}</span>
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed">
          Une question sur un projet de mariage, une séance portrait ou une prestation corporate ? Le studio vous répond avec soin sous 24 heures.
        </p>
      </div>

      <ContactAmbianceGallery photos={ambiancePhotos} />

      {/* Main Grid: Form + Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Contact Form */}
        <div className="lg:col-span-7">
          <Card className="glass-panel border-zinc-800 p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Formulaire de Contact</h3>
              <p className="text-xs text-zinc-400">
                Remplissez les détails de votre projet pour recevoir notre plaquette tarifaire.
              </p>
            </div>

            {submitted ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-3 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-400" />
                <h4 className="font-bold text-lg text-white">Message Transmis avec Succès !</h4>
                <p className="text-xs text-zinc-300">
                  Merci {formData.name}, nous avons bien reçu votre demande concernant votre projet. Notre équipe vous recontactera très rapidement.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">Nom & Prénom *</label>
                    <Input
                      required
                      placeholder="Sophie Dupont"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">Adresse Email *</label>
                    <Input
                      required
                      type="email"
                      placeholder="sophie@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">Numéro de Téléphone</label>
                    <Input
                      placeholder="+33 6 12 34 56 78"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">Type de Projet *</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="Mariage">Reportage de Mariage</option>
                      <option value="Portrait">Séance Portrait d'Art</option>
                      <option value="Corporate">Branding & Corporate</option>
                      <option value="Autre">Autre Demande</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Votre Message *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Décrivez votre projet, la date souhaitée, le lieu..."
                    className="flex w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                {/* Captcha anti-spam Checkbox simulation */}
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
                  <label className="flex items-center space-x-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={captchaVerified}
                      onChange={(e) => setCaptchaVerified(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400"
                    />
                    <span className="text-xs text-zinc-300 font-medium">Je ne suis pas un robot (reCAPTCHA)</span>
                  </label>
                  <ShieldCheck className="h-5 w-5 text-amber-400" />
                </div>

                {submitError && <p className="text-rose-400 text-[11px] font-medium">{submitError}</p>}

                <Button type="submit" variant="gold" size="lg" className="w-full font-bold" disabled={submitting}>
                  {submitting ? 'Envoi en cours…' : 'Envoyer le Message'} {!submitting && <Send className="h-4 w-4 ml-2" />}
                </Button>
              </form>
            )}
          </Card>
        </div>

        {/* Studio Info & Opening Hours */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="glass-panel border-zinc-800 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <MapPin className="h-5 w-5 text-amber-400 mr-2" /> Coordonnées du Studio
            </h3>
            <div className="space-y-3 text-xs text-zinc-300">
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{settings.address}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{settings.contactEmail}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{settings.phone}</span>
              </div>
            </div>
          </Card>

          {/* Horaires d'ouverture */}
          <Card className="glass-panel border-zinc-800 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <Clock className="h-5 w-5 text-amber-400 mr-2" /> Horaires d'Ouverture
            </h3>
            <div className="space-y-2 text-xs text-zinc-300">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span>Lundi - Vendredi</span>
                <span className="font-semibold text-white">09:00 - 19:00</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span>Samedi</span>
                <span className="font-semibold text-white">10:00 - 18:00</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Dimanche</span>
                <span className="text-amber-400 font-semibold">Sur rendez-vous (Mariages)</span>
              </div>
            </div>
          </Card>

          <RevealPhotoCard index={0} withShine={false} className="rounded-2xl overflow-hidden">
            <StudioMapEmbed title={`Localisation — ${settings.address}`} className="h-48 w-full rounded-none border-0 shadow-none" />
          </RevealPhotoCard>
        </div>
      </div>

      {/* Public Review & Testimonial Submission Form Section */}
      <ReviewSubmissionSection />

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto space-y-6 pt-10 border-t border-zinc-800">
        <div className="text-center space-y-2">
          <Badge variant="gold">Questions Fréquentes</Badge>
          <h2 className="text-3xl font-bold text-white">
            Tout ce que vous devez savoir avant de <span className="gold-gradient-text">réserver</span>
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card
              key={index}
              onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
              className="glass-panel p-5 cursor-pointer border-zinc-800 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center justify-between font-bold text-white text-sm">
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-amber-400 transition-transform duration-300 ${
                    openFaqIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {openFaqIndex === index && (
                <p className="mt-3 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-3 animate-in fade-in duration-200">
                  {faq.a}
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Floating WhatsApp Quick Action Button */}
      <a
        href={`https://wa.me/${(settings.phone || '').replace(/[^0-9]/g, '')}?text=Bonjour%20${encodeURIComponent(settings.studioName || 'Studio Lumiere')}%2C%20je%20souhaite%20des%20informations%20sur%20vos%20prestations.`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-emerald-500 text-zinc-950 font-bold shadow-2xl shadow-emerald-500/40 hover:scale-110 transition-all duration-300 flex items-center space-x-2"
      >
        <MessageCircle className="h-6 w-6 fill-zinc-950" />
        <span className="hidden sm:inline text-xs">WhatsApp Direct</span>
      </a>
    </div>
  );
}

function ReviewSubmissionSection() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Mariés');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !content) return;

    setLoading(true);
    setError('');
    try {
      await submitTestimonial({
        clientName: name,
        clientRole: role || 'Client Studio',
        rating,
        content,
      });
      setSubmitted(true);
      setName('');
      setContent('');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible d\'envoyer votre avis. Réessayez dans un instant.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-panel p-8 max-w-4xl mx-auto border-amber-400/30 gold-border-glow space-y-6">
      <div className="text-center space-y-2">
        <Badge variant="gold">Votre Retours d'Expérience</Badge>
        <h2 className="text-2xl font-bold text-white">
          Déposer un <span className="gold-gradient-text">Avis / Témoignage</span>
        </h2>
        <p className="text-xs text-zinc-400 max-w-lg mx-auto">
          Vous avez réalisé une séance ou célébré votre mariage avec nous ? Laissez votre avis ! Il sera vérifié par le studio puis publié sur le site.
        </p>
      </div>

      {submitted ? (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Merci pour votre témoignage !</h3>
          <p className="text-xs text-zinc-300">
            Votre avis a bien été enregistré. Il apparaîtra sur le site dès sa validation par notre équipe.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSubmitted(false)}
            className="mt-2 text-xs"
          >
            Déposer un autre avis
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-zinc-300 block mb-1 font-semibold">Votre Nom / Prénoms *</label>
              <Input
                required
                placeholder="Ex: Sophie & Alexandre"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-zinc-300 block mb-1 font-semibold">Prestation / Qualité</label>
              <Input
                placeholder="Ex: Mariage Juillet 2026"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <div>
              <label className="text-zinc-300 block mb-1 font-semibold">Note attribuée</label>
              <div className="flex items-center space-x-1 h-11 px-3 bg-zinc-950 rounded-xl border border-zinc-800">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    onClick={() => setRating(star)}
                    className={`h-5 w-5 cursor-pointer transition-colors ${
                      star <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-zinc-300 block mb-1 font-semibold">Votre Témoignage / Avis *</label>
            <textarea
              required
              rows={4}
              placeholder="Racontez votre expérience avec le studio..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {error && <p className="text-rose-400 text-[11px] font-medium">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" variant="gold" size="md" className="font-bold space-x-2" disabled={loading}>
              <Send className="h-4 w-4" />
              <span>{loading ? 'Envoi en cours…' : 'Soumettre Mon Avis pour Publication'}</span>
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
