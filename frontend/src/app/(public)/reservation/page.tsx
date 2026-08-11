'use client';

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  CreditCard,
  Smartphone,
  ArrowRight,
  ChevronLeft,
  Wallet,
  Landmark,
  Banknote,
  ShieldCheck,
  ImageIcon,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { useServices } from '@/context/services-context';
import { submitBooking, createStripeCheckoutSession, getStripeSessionStatus, submitMobileMoneyPayment, type BookingRecord } from '@/lib/contact-api';
import {
  DEFAULT_TIME_SLOTS,
  fetchBookingAvailability,
  formatBookingDay,
  getSlotConflict,
  isWeddingService,
  type BookingAvailability,
  type BookingSlotSuggestion,
} from '@/lib/booking-availability';
import { getApiErrorMessage } from '@/lib/api-error';
import { isAllowedStripeCheckoutUrl } from '@/lib/safe-redirect';
import { ReservationStepper } from '@/components/reservation/reservation-stepper';
import { PaymentMethodList, type PaymentMethodChoice } from '@/components/reservation/payment-method-list';
import { BookingSummaryCard } from '@/components/reservation/booking-summary-card';

type PaymentMethodChoiceLocal = PaymentMethodChoice;

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function ReservationPage() {
  const { settings: systemSettings, formatPrice } = useSettings();
  const { services: apiServices } = useServices();
  const depositRate = systemSettings.depositRate || 30;

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [submittingMobileMoney, setSubmittingMobileMoney] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [bookingRecord, setBookingRecord] = useState<BookingRecord | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentMethodChoice, setPaymentMethodChoice] = useState<PaymentMethodChoiceLocal>('stripe');
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [mobileMoneyReference, setMobileMoneyReference] = useState('');
  const [availability, setAvailability] = useState<BookingAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  const [slotSuggestion, setSlotSuggestion] = useState<BookingSlotSuggestion | null>(null);
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
          category: s.category,
          price: s.price,
          deposit: Math.round((s.price * (s.depositPercentage || depositRate)) / 100),
          duration: s.durationMinutes ? `${Math.round(s.durationMinutes / 60)}h` : '2h',
        })),
    [apiServices, depositRate]
  );

  React.useEffect(() => {
    if (typeof window === 'undefined' || services.length === 0) return;
    const serviceFromUrl = new URLSearchParams(window.location.search).get('service');
    if (serviceFromUrl && services.some((s) => s.id === serviceFromUrl)) {
      setSelectedService(serviceFromUrl);
      return;
    }
    if (!selectedService) {
      setSelectedService(services[0].id);
    }
  }, [services, selectedService]);

  const currentServiceObj = services.find((s) => s.id === selectedService) || services[0];
  const isWeddingBooking = currentServiceObj
    ? isWeddingService(currentServiceObj.title, currentServiceObj.category)
    : false;
  const timeSlots = availability?.allSlots?.length ? availability.allSlots : [...DEFAULT_TIME_SLOTS];
  const bookedSlots = new Set(availability?.bookedSlots || []);
  const selectedSlotTaken = bookedSlots.has(selectedTime);

  React.useEffect(() => {
    if (step !== 2 || !currentServiceObj || !selectedDate) return;

    let cancelled = false;
    const loadAvailability = async () => {
      setAvailabilityLoading(true);
      try {
        const data = await fetchBookingAvailability(selectedDate, currentServiceObj.id, {
          serviceTitle: currentServiceObj.title,
          time: selectedTime,
        });
        if (cancelled) return;
        setAvailability(data);
        if (data.selectedSlotTaken) {
          setSlotNotice(data.message || 'Ce créneau est déjà réservé.');
          setSlotSuggestion(data.suggestion || null);
        } else {
          setSlotNotice(null);
          setSlotSuggestion(null);
        }
      } catch {
        if (!cancelled) {
          setAvailability(null);
          setSlotNotice(null);
          setSlotSuggestion(null);
        }
      } finally {
        if (!cancelled) setAvailabilityLoading(false);
      }
    };

    void loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [step, selectedDate, selectedTime, currentServiceObj]);

  const applySlotSuggestion = (suggestion: BookingSlotSuggestion) => {
    setSelectedDate(suggestion.date);
    setSelectedTime(suggestion.time);
    setSlotNotice(null);
    setSlotSuggestion(null);
  };

  const handleProceedFromSchedule = () => {
    if (selectedSlotTaken) {
      if (slotSuggestion) {
        setSlotNotice(
          availability?.message ||
            `Ce créneau est indisponible.${isWeddingBooking ? ' Un jour suivant vous est proposé.' : ''}`
        );
      } else {
        setSlotNotice(
          isWeddingBooking
            ? 'Ce créneau est pris et aucun jour disponible proche n’a été trouvé. Contactez le studio.'
            : 'Ce jour est complet. Choisissez une autre date ou un créneau libre.'
        );
      }
      return;
    }
    setSlotNotice(null);
    setStep(3);
  };

  const mobileMoneyEnabled = systemSettings.mobileMoneyEnabled !== false;
  const mobileMoneyProvider = systemSettings.mobileMoneyProvider || 'Mobile Money';
  const mobileMoneyNumber = systemSettings.mobileMoneyNumber || '';
  const mobileMoneyInstructions = systemSettings.mobileMoneyInstructions || '';
  const mobileMoneyPending = bookingRecord?.paymentStatus === 'mobile_money_pending';
  const payPalEnabled = systemSettings.payPalEnabled === true;
  const isOfflinePayment =
    paymentMethodChoice === 'virement' ||
    paymentMethodChoice === 'paypal' ||
    paymentMethodChoice === 'cash';

  const paymentOptions = React.useMemo(() => {
    const options: Array<{
      id: PaymentMethodChoice;
      label: string;
      description: string;
    }> = [
      {
        id: 'stripe',
        label: 'Carte bancaire',
        description: 'Paiement sécurisé via Stripe Checkout',
      },
    ];
    if (mobileMoneyEnabled && mobileMoneyNumber) {
      options.push({
        id: 'mobile_money',
        label: mobileMoneyProvider,
        description: 'Transfert Mobile Money',
      });
    }
    if (payPalEnabled) {
      options.push({
        id: 'paypal',
        label: 'PayPal',
        description: 'Paiement via compte PayPal',
      });
    }
    options.push(
      {
        id: 'virement',
        label: 'Virement bancaire',
        description: 'Règlement par transfert bancaire',
      },
      {
        id: 'cash',
        label: 'Espèces (cash)',
        description: 'Règlement en cash au studio ou sur place',
      }
    );
    return options;
  }, [mobileMoneyEnabled, mobileMoneyNumber, mobileMoneyProvider, payPalEnabled]);

  React.useEffect(() => {
    if (!paymentOptions.some((option) => option.id === paymentMethodChoice)) {
      setPaymentMethodChoice(paymentOptions[0]?.id || 'stripe');
    }
  }, [paymentOptions, paymentMethodChoice]);

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
        preferredPaymentMethod: paymentMethodChoice,
      });
      setBookingRecord(record);
      setPaymentConfirmed(false);
      setPaymentError('');
      setMobileMoneyPhone(formData.phone);
      setMobileMoneyReference('');
      setStep(4);
    } catch (err: unknown) {
      const conflict = getSlotConflict(err);
      if (conflict) {
        setSubmitError(conflict.message);
        setSlotNotice(conflict.message);
        setSlotSuggestion(conflict.suggestion || null);
        setStep(2);
        return;
      }
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

  const handleSubmitMobileMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingRecord?.id) return;
    setSubmittingMobileMoney(true);
    setPaymentError('');
    try {
      const updated = await submitMobileMoneyPayment({
        bookingId: bookingRecord.id,
        payerPhone: mobileMoneyPhone,
        transactionReference: mobileMoneyReference,
      });
      setBookingRecord(updated);
    } catch (err: unknown) {
      setPaymentError(getApiErrorMessage(err, 'Impossible d\'enregistrer le paiement Mobile Money.'));
    } finally {
      setSubmittingMobileMoney(false);
    }
  };

  return (
    <div className="pt-28 pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="text-center space-y-4 relative">
        <div className="absolute inset-x-0 -top-8 h-32 bg-gradient-to-b from-amber-400/8 to-transparent pointer-events-none rounded-full blur-3xl" />
        <Badge variant="gold" className="relative">Tunnel de Réservation Sécurisé</Badge>
        <h1 className="relative text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Réserver votre <span className="gold-gradient-text">séance photo</span>
        </h1>
        <p className="relative text-zinc-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Formule, créneau, coordonnées et acompte — un parcours fluide en quatre étapes.
        </p>
      </div>

      <ReservationStepper currentStep={step} />

      {step === 1 && (
        <Card className="glass-panel border-zinc-800/80 overflow-hidden">
          <CardHeader className="border-b border-zinc-800/60 bg-zinc-950/30">
            <CardTitle className="text-xl">Choisissez votre formule</CardTitle>
            <CardDescription>
              Sélectionnez l&apos;offre adaptée à votre projet photographique.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3">
            {services.map((svc) => {
              const selected = selectedService === svc.id;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setSelectedService(svc.id)}
                  className={`w-full p-5 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between gap-4 ${
                    selected
                      ? 'border-amber-400/50 bg-gradient-to-r from-amber-400/12 to-transparent shadow-[0_0_28px_-10px_rgba(251,191,36,0.4)]'
                      : 'border-zinc-800/90 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-base">{svc.title}</h3>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {svc.duration}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-white">{formatPrice(svc.price)}</div>
                    <div className="text-[11px] font-semibold text-amber-400 mt-0.5">
                      Acompte {formatPrice(svc.deposit)}
                    </div>
                  </div>
                </button>
              );
            })}

            <div className="pt-4 flex justify-end">
              <Button variant="gold" size="lg" onClick={() => setStep(2)} className="min-w-[200px]">
                Choisir la date <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="glass-panel border-zinc-800/80 overflow-hidden">
          <CardHeader className="border-b border-zinc-800/60 bg-zinc-950/30">
            <CardTitle className="text-xl">Date & créneau horaire</CardTitle>
            <CardDescription>
              Sélectionnez la date souhaitée et l&apos;heure de début de séance.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 block mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-amber-400" />
                  Date de la séance
                </label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={todayIso()}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 block mb-3 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  Créneaux disponibles
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((slot) => {
                    const isBooked = bookedSlots.has(slot);
                    const isSelected = selectedTime === slot;
                    return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBooked}
                      onClick={() => setSelectedTime(slot)}
                      className={`p-2.5 text-xs font-bold rounded-xl border transition-all duration-200 ${
                        isBooked
                          ? 'border-zinc-800/80 bg-zinc-900/60 text-zinc-600 cursor-not-allowed line-through'
                          : isSelected
                          ? 'border-amber-400 bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                      }`}
                    >
                      {slot}
                    </button>
                    );
                  })}
                </div>
                {availabilityLoading && (
                  <p className="text-[11px] text-zinc-500 mt-2">Vérification des créneaux…</p>
                )}
                {!availabilityLoading && bookedSlots.size > 0 && (
                  <p className="text-[11px] text-zinc-500 mt-2">
                    {bookedSlots.size} créneau{bookedSlots.size > 1 ? 'x' : ''} déjà réservé{bookedSlots.size > 1 ? 's' : ''} ce jour.
                  </p>
                )}
              </div>
            </div>

            {(slotNotice || selectedSlotTaken) && (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-200">Créneau indisponible</p>
                    <p className="text-xs text-amber-100/90 leading-relaxed">
                      {slotNotice ||
                        (isWeddingBooking
                          ? `Le ${formatBookingDay(selectedDate)} à ${selectedTime} est déjà réservé. Pour un mariage, nous proposons généralement le jour suivant.`
                          : `Le créneau ${selectedTime} est déjà pris. Choisissez une autre heure ce jour-là.`)}
                    </p>
                  </div>
                </div>
                {slotSuggestion && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pl-8">
                    <div className="text-xs text-zinc-200">
                      <Sparkles className="h-3.5 w-3.5 inline mr-1 text-amber-400" />
                      Proposition :{' '}
                      <strong className="text-white">
                        {formatBookingDay(slotSuggestion.date)} à {slotSuggestion.time}
                      </strong>
                      {isWeddingBooking && (
                        <span className="text-zinc-400"> (report mariage)</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="gold"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => applySlotSuggestion(slotSuggestion)}
                    >
                      Accepter ce créneau
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isWeddingBooking && !selectedSlotTaken && (
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Prestation mariage : si votre créneau est déjà pris, le studio vous proposera automatiquement le jour suivant.
              </p>
            )}

            {currentServiceObj && (
              <BookingSummaryCard
                serviceTitle={currentServiceObj.title}
                date={selectedDate}
                time={selectedTime}
                totalPrice={formatPrice(currentServiceObj.price)}
                deposit={formatPrice(currentServiceObj.deposit)}
                depositRate={depositRate}
              />
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button variant="gold" onClick={handleProceedFromSchedule} className="min-w-[180px]">
                Coordonnées <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          <Card className="glass-panel border-zinc-800/80 overflow-hidden">
            <CardHeader className="border-b border-zinc-800/60 bg-zinc-950/30">
              <CardTitle className="text-xl">Vos coordonnées</CardTitle>
              <CardDescription>
                Informations pour le contrat, la facture et la galerie privée.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSubmitBooking} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Prénom</label>
                    <Input
                      required
                      placeholder="Jean"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Nom</label>
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
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Email</label>
                    <Input
                      required
                      type="email"
                      placeholder="jean.dupont@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Téléphone</label>
                    <Input
                      required
                      placeholder="+33 6 12 34 56 78"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                    Lieu de la séance
                  </label>
                  <Input
                    required
                    placeholder="Ex: Château de Chantilly, Paris 8ème, Studio…"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 sm:p-5 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 block mb-3">
                      Mode de paiement de l&apos;acompte
                    </label>
                    <PaymentMethodList
                      options={paymentOptions}
                      value={paymentMethodChoice}
                      onChange={setPaymentMethodChoice}
                      depositLabel={formatPrice(currentServiceObj?.deposit || 0)}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 flex items-start gap-2 leading-relaxed">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    Paiement sécurisé — finalisation à l&apos;étape suivante selon le mode choisi.
                  </p>
                </div>

                {submitError && (
                  <p className="text-rose-400 text-xs rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                    {submitError}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-between gap-3">
                  <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Retour
                  </Button>
                  <Button type="submit" variant="gold" disabled={submitting || services.length === 0} className="min-w-[180px]">
                    {submitting ? 'Enregistrement…' : 'Valider la demande'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {currentServiceObj && (
            <div className="lg:sticky lg:top-28 space-y-4">
              <BookingSummaryCard
                serviceTitle={currentServiceObj.title}
                date={selectedDate}
                time={selectedTime}
                totalPrice={formatPrice(currentServiceObj.price)}
                deposit={formatPrice(currentServiceObj.deposit)}
                depositRate={depositRate}
              />
            </div>
          )}
        </div>
      )}

      {step === 4 && currentServiceObj && (
        <Card className="glass-panel-gold border-amber-400/30 gold-border-glow overflow-hidden">
          <CardHeader className="text-center border-b border-amber-400/15 bg-amber-400/5 pb-8 pt-8">
            <div
              className={`h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                paymentConfirmed
                  ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30'
                  : 'bg-amber-400/15 text-amber-400 ring-2 ring-amber-400/25'
              }`}
            >
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold">
              {paymentConfirmed
                ? 'Réservation confirmée !'
                : mobileMoneyPending
                  ? 'Paiement en cours de vérification'
                  : 'Demande enregistrée'}
            </CardTitle>
            <CardDescription className="max-w-lg mx-auto text-sm leading-relaxed mt-2">
              {paymentConfirmed
                ? `Votre acompte a été réglé. Référence : ${bookingRecord?.reference || '—'}. Le studio vous contactera pour finaliser les détails.`
                : mobileMoneyPending
                  ? `Votre transfert Mobile Money a été enregistré. Le studio validera votre acompte sous peu. Référence : ${bookingRecord?.reference || '—'}.`
                  : isOfflinePayment
                    ? `Votre demande pour le ${selectedDate} à ${selectedTime} a été enregistrée. Finalisez l'acompte selon le mode choisi.`
                    : `Votre demande pour le ${selectedDate} à ${selectedTime} a été transmise. Réglez l'acompte en ligne pour confirmer votre créneau.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-8 space-y-6">
            {bookingRecord?.reference && (
              <div className="rounded-xl border border-dashed border-amber-400/30 bg-amber-400/5 px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">Référence réservation</p>
                <p className="font-mono text-lg font-bold text-amber-400">{bookingRecord.reference}</p>
              </div>
            )}

            <BookingSummaryCard
              serviceTitle={currentServiceObj.title}
              date={selectedDate}
              time={selectedTime}
              totalPrice={formatPrice(currentServiceObj.price)}
              deposit={formatPrice(currentServiceObj.deposit)}
              depositRate={depositRate}
            />

            <div className="flex gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 text-xs text-zinc-400 leading-relaxed">
              <ImageIcon className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <p>
                Un espace galerie privé a été créé pour votre séance. Vous recevrez par email votre{' '}
                <strong className="text-amber-400">clé d&apos;accès</strong> et votre{' '}
                <strong className="text-amber-400">mot de passe</strong> pour consulter vos photos dès leur publication.
              </p>
            </div>

            {!paymentConfirmed && !mobileMoneyPending && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3 text-xs">
                  <span className="text-zinc-500">
                    Mode choisi :{' '}
                    <strong className="text-white">
                      {paymentOptions.find((option) => option.id === paymentMethodChoice)?.label}
                    </strong>
                  </span>
                  <button
                    type="button"
                    className="text-amber-400/90 hover:text-amber-400 font-semibold underline underline-offset-2"
                    onClick={() => setStep(3)}
                  >
                    Modifier
                  </button>
                </div>

                {isOfflinePayment ? (
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center gap-2">
                      {paymentMethodChoice === 'paypal' ? (
                        <Wallet className="h-4 w-4 text-amber-400" />
                      ) : paymentMethodChoice === 'cash' ? (
                        <Banknote className="h-4 w-4 text-amber-400" />
                      ) : (
                        <Landmark className="h-4 w-4 text-amber-400" />
                      )}
                      <span className="text-sm font-semibold text-white">
                        {paymentMethodChoice === 'paypal'
                          ? 'Paiement PayPal'
                          : paymentMethodChoice === 'cash'
                            ? 'Paiement en espèces (cash)'
                            : 'Virement bancaire'}
                      </span>
                    </div>
                    <div className="p-4 sm:p-5 space-y-3 text-sm">
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Réglez l&apos;acompte de{' '}
                        <strong className="text-white">{formatPrice(currentServiceObj.deposit)}</strong>{' '}
                        {paymentMethodChoice === 'cash' ? (
                          <>
                            en espèces au studio
                            {systemSettings.address ? (
                              <> — <strong className="text-white">{systemSettings.address}</strong></>
                            ) : null}
                            . Mentionnez la référence{' '}
                          </>
                        ) : (
                          <>
                            par {paymentMethodChoice === 'paypal' ? 'PayPal' : 'virement'} avec la référence{' '}
                          </>
                        )}
                        <strong className="font-mono text-amber-400">{bookingRecord?.reference}</strong>.
                      </p>
                      <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 px-3 py-2 text-[11px] text-zinc-500">
                        Contact : {systemSettings.contactEmail || 'contact@kswstudio.fr'}
                        {systemSettings.phone ? ` • ${systemSettings.phone}` : ''}
                      </div>
                    </div>
                  </div>
                ) : paymentMethodChoice === 'mobile_money' ? (
                  <form
                    onSubmit={handleSubmitMobileMoney}
                    className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 overflow-hidden space-y-0"
                  >
                    <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-semibold text-white">Paiement {mobileMoneyProvider}</span>
                    </div>
                    <div className="p-4 sm:p-5 space-y-4">
                      <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-4 space-y-2.5 text-xs">
                        <div className="flex justify-between gap-4">
                          <span className="text-zinc-500">Numéro à créditer</span>
                          <span className="font-mono font-bold text-amber-400">{mobileMoneyNumber}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-zinc-500">Montant acompte</span>
                          <span className="font-bold text-white">{formatPrice(currentServiceObj.deposit)}</span>
                        </div>
                        {bookingRecord?.reference && (
                          <div className="flex justify-between gap-4 pt-2 border-t border-zinc-800">
                            <span className="text-zinc-500">Référence</span>
                            <span className="font-mono text-amber-400">{bookingRecord.reference}</span>
                          </div>
                        )}
                        {mobileMoneyInstructions && (
                          <p className="text-zinc-500 pt-2 border-t border-zinc-800 leading-relaxed">{mobileMoneyInstructions}</p>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                            Votre numéro
                          </label>
                          <Input
                            required
                            placeholder="+225 07 00 00 00 00"
                            value={mobileMoneyPhone}
                            onChange={(e) => setMobileMoneyPhone(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                            Réf. transaction
                          </label>
                          <Input
                            required
                            placeholder="TXN-123456789"
                            value={mobileMoneyReference}
                            onChange={(e) => setMobileMoneyReference(e.target.value)}
                          />
                        </div>
                      </div>
                      {paymentError && (
                        <p className="text-rose-400 text-xs rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                          {paymentError}
                        </p>
                      )}
                      <Button
                        type="submit"
                        variant="gold"
                        size="lg"
                        className="w-full justify-center"
                        disabled={submittingMobileMoney || !bookingRecord?.id}
                      >
                        {submittingMobileMoney ? 'Envoi en cours…' : 'Confirmer le transfert Mobile Money'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-semibold text-white">Stripe Checkout</span>
                      <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-emerald-400">SSL</span>
                    </div>
                    <div className="p-4 sm:p-5 space-y-3">
                      {paymentError && (
                        <p className="text-rose-400 text-xs rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                          {paymentError}
                        </p>
                      )}
                      <Button
                        variant="gold"
                        size="lg"
                        className="w-full justify-center"
                        disabled={paying || !bookingRecord?.id}
                        onClick={handlePayDeposit}
                      >
                        {paying ? 'Redirection vers Stripe…' : `Payer l'acompte — ${formatPrice(currentServiceObj.deposit)}`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
