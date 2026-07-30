'use client';

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Sparkles,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { useServices } from '@/context/services-context';
import { submitBooking, createStripeCheckoutSession, getStripeSessionStatus, type BookingRecord } from '@/lib/contact-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { isAllowedStripeCheckoutUrl } from '@/lib/safe-redirect';

export default function ReservationPage() {
  const { settings: systemSettings, formatPrice } = useSettings();
  const { services: apiServices } = useServices();
  const depositRate = systemSettings.depositRate || 30;

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-08-15');
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [bookingRecord, setBookingRecord] = useState<BookingRecord | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    notes: '',
  });

  const services = React.useMemo(
    () =>
      apiServices
        .filter((s) => s.isActive !== false)
        .map((s) => ({
          id: s.id,
          title: s.title,
          price: s.price,
          deposit: Math.round((s.price * (s.depositPercentage || depositRate)) / 100),
          duration: s.durationMinutes ? `${Math.round(s.durationMinutes / 60)}h` : '2h',
        })),
    [apiServices, depositRate]
  );

  React.useEffect(() => {
    if (services.length > 0 && !selectedService) {
      setSelectedService(services[0].id);
    }
  }, [services, selectedService]);

  const currentServiceObj = services.find((s) => s.id === selectedService) || services[0];

  const timeSlots = ['09:00', '10:30', '14:00', '16:00', '18:00'];

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return;

    const verifyPayment = async () => {
      setStep(4);
      setPaying(true);
      try {
        const status = await getStripeSessionStatus(sessionId);
        if (status.paid) {
          setPaymentConfirmed(true);
        } else {
          setPaymentError('Le paiement n\'a pas été confirmé. Réessayez ou contactez le studio.');
        }
      } catch (err: unknown) {
        setPaymentError(getApiErrorMessage(err, 'Impossible de vérifier le paiement.'));
      } finally {
        setPaying(false);
        window.history.replaceState({}, '', '/reservation');
      }
    };

    verifyPayment();
  }, []);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentServiceObj) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const record = await submitBooking({
        serviceId: currentServiceObj.id,
        serviceTitle: currentServiceObj.title,
        date: selectedDate,
        time: selectedTime,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        notes: formData.notes,
        depositAmount: currentServiceObj.deposit,
        totalPrice: currentServiceObj.price,
      });
      setBookingRecord(record);
      setPaymentConfirmed(false);
      setPaymentError('');
      setStep(4);
    } catch (err: unknown) {
      setSubmitError(getApiErrorMessage(err, 'Impossible d\'enregistrer la réservation.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayDeposit = async () => {
    if (!bookingRecord?.id) return;
    setPaying(true);
    setPaymentError('');
    try {
      const origin = window.location.origin;
      const { checkoutUrl } = await createStripeCheckoutSession({
        bookingId: bookingRecord.id,
        successUrl: `${origin}/reservation?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/reservation?cancelled=1`,
      });
      if (!isAllowedStripeCheckoutUrl(checkoutUrl)) {
        throw new Error('URL de paiement Stripe invalide.');
      }
      window.location.href = checkoutUrl;
    } catch (err: unknown) {
      setPaymentError(getApiErrorMessage(err, 'Impossible d\'ouvrir le paiement Stripe.'));
      setPaying(false);
    }
  };

  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <Badge variant="gold">Tunnel de Réservation Sécurisé</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          Réserver Votre <span className="gold-gradient-text">Séance Photo</span>
        </h1>
        <p className="text-zinc-400 text-sm">
          Sélectionnez la formule, choisissez votre créneau et validez votre acompte en toute simplicité.
        </p>
      </div>

      {/* Stepper Indicator */}
      <div className="flex items-center justify-between glass-panel p-4 rounded-2xl border-zinc-800">
        {[
          { step: 1, label: 'Formule' },
          { step: 2, label: 'Date & Heure' },
          { step: 3, label: 'Vos Coordonnées' },
          { step: 4, label: 'Acompte & Confirmation' },
        ].map((s) => (
          <div key={s.step} className="flex items-center space-x-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s.step
                  ? 'bg-amber-400 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {s.step}
            </div>
            <span
              className={`hidden sm:inline text-xs font-medium ${
                step >= s.step ? 'text-white' : 'text-zinc-500'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* STEP 1: Select Service */}
      {step === 1 && (
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle>Étape 1 : Choisissez votre Formule</CardTitle>
            <CardDescription>
              Sélectionnez l'offre adaptée à votre projet photographique.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {services.map((svc) => (
              <div
                key={svc.id}
                onClick={() => setSelectedService(svc.id)}
                className={`p-5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedService === svc.id
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-zinc-800 hover:border-zinc-700 glass-panel'
                }`}
              >
                <div>
                  <h3 className="font-bold text-white text-base">{svc.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{svc.duration}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-white">{formatPrice(svc.price)}</div>
                  <div className="text-xs text-amber-400">Acompte {formatPrice(svc.deposit)}</div>
                </div>
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <Button variant="gold" size="lg" onClick={() => setStep(2)}>
                Étape Suivante : Choisir la Date <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Select Date & Time */}
      {step === 2 && (
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle>Étape 2 : Date & Créneau Horaires</CardTitle>
            <CardDescription>
              Sélectionnez la date souhaitée et l'heure de début de séance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                  Date de la séance
                </label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                  Créneaux Disponibles
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`p-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        selectedTime === slot
                          ? 'border-amber-400 bg-amber-400 text-zinc-950'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button variant="gold" onClick={() => setStep(3)}>
                Étape Suivante : Coordonnées <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Client Details */}
      {step === 3 && (
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle>Étape 3 : Vos Coordonnées</CardTitle>
            <CardDescription>
              Entrez vos informations pour l'établissement du contrat et de la facture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Prénom</label>
                  <Input
                    required
                    placeholder="Jean"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Nom</label>
                  <Input
                    required
                    placeholder="Dupont"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Email</label>
                  <Input
                    required
                    type="email"
                    placeholder="jean.dupont@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Téléphone</label>
                  <Input
                    required
                    placeholder="+33 6 12 34 56 78"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Lieu de la séance / Réception</label>
                <Input
                  required
                  placeholder="Ex: Château de Chantilly, Paris 8ème, Studio..."
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              {submitError && <p className="text-rose-400 text-xs">{submitError}</p>}

              <div className="pt-4 flex items-center justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Retour
                </Button>
                <Button type="submit" variant="gold" disabled={submitting || services.length === 0}>
                  {submitting ? 'Enregistrement…' : 'Valider la demande'} <CreditCard className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Confirmation & Deposit Payment */}
      {step === 4 && currentServiceObj && (
        <Card className="space-y-6 border-amber-400/50 gold-border-glow">
          <CardHeader className="text-center">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-3 ${paymentConfirmed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-400/20 text-amber-400'}`}>
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {paymentConfirmed ? 'Réservation confirmée !' : 'Demande enregistrée !'}
            </CardTitle>
            <CardDescription>
              {paymentConfirmed
                ? `Votre acompte a été réglé. Référence : ${bookingRecord?.reference || '—'}. Le studio vous contactera pour finaliser les détails.`
                : `Votre demande pour le ${selectedDate} à ${selectedTime} a été transmise. Réglez l'acompte en ligne pour confirmer votre créneau.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="glass-panel p-5 rounded-2xl space-y-3 text-sm">
              {bookingRecord?.reference && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Référence :</span>
                  <span className="font-mono text-amber-400">{bookingRecord.reference}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-400">Prestation :</span>
                <span className="font-semibold text-white">{currentServiceObj.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Montant Total :</span>
                <span className="font-semibold text-white">{formatPrice(currentServiceObj.price)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2 text-base">
                <span className="text-amber-400 font-bold">Acompte ({depositRate}%) :</span>
                <span className="text-amber-400 font-extrabold">{formatPrice(currentServiceObj.deposit)}</span>
              </div>
            </div>

            {!paymentConfirmed && (
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300">
                  <CreditCard className="h-4 w-4 text-amber-400" />
                  <span>Paiement sécurisé via Stripe Checkout</span>
                </div>
                {paymentError && <p className="text-rose-400 text-xs">{paymentError}</p>}
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full justify-center"
                  disabled={paying || !bookingRecord?.id}
                  onClick={handlePayDeposit}
                >
                  {paying ? 'Redirection vers Stripe…' : `Payer l'acompte de ${formatPrice(currentServiceObj.deposit)}`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
