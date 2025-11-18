import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Car, CreditCard, DollarSign, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import DarkModeToggle from "@/components/DarkModeToggle";
import paymentImage from "@assets/generated_images/Luxury_car_payment_page_c3288913.png";

import { database, ref, set, get, child } from "../firebase/firebase";

export default function PaymentPage() {
  const params = useParams();
  const spotIdParam = params.spotId || "1";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
    zip: "",
  });

  // Lire la réservation en cours depuis localStorage
  const reservation = JSON.parse(localStorage.getItem("pendingReservation") || "{}");
  const spotId = reservation?.spotId || spotIdParam;
  const totalPrice = Number(reservation?.totalPrice || 0);

  // Remplir les champs au chargement une seule fois
useEffect(() => {
  if (reservation?.clientEmail) {
    setFormData(prev => ({
      ...prev,
      email: reservation.clientEmail || "",
    }));
  }
}, []);



const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (loading) return;

  if (!formData.email || !formData.firstName || !formData.lastName || !formData.cardNumber) {
    toast({
      title: "Erreur",
      description: "Veuillez remplir tous les champs requis",
      variant: "destructive",
    });
    return;
  }

  setLoading(true);

  try {
    // ===== Vérifier réservation existante =====
    const detailsSnap = await get(child(ref(database), "ParkingLotDetails"));
    const details = detailsSnap.val() || {};
    const activeReservation = Object.values(details).some((spot: any) => {
      return spot?.clientEmail === formData.email && new Date(spot.endDateTime) > new Date();
    });

    if (activeReservation) {
      toast({
        title: "Réservation existante",
        description: "Vous avez déjà une réservation en cours.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // ===== Vérifier si la place est déjà réservée =====
    const spotSnap = await get(child(ref(database), `ParkingLot/Place${spotId}`));
    if (spotSnap.exists() && spotSnap.val() === "reservé") {
      toast({
        title: "Place indisponible",
        description: "Cette place est déjà réservée.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // ===== Envoyer au backend pour générer le code =====
    const backendRes = await fetch("http://localhost:3000/create-reservation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parkingSpot: spotId,
        clientEmail: formData.email,
        clientName: `${formData.firstName} ${formData.lastName}`,
        startDateTime: reservation.startDateTime,
        endDateTime: reservation.endDateTime,
        totalPrice,
      }),
    });
    const backendData = await backendRes.json();
    if (!backendData.success) throw new Error(backendData.message || "Erreur backend");

    const accessCode = backendData.reservation.reservationCode;

    // ===== Stocker les infos côté Firebase comme avant =====
    await set(ref(database, `ParkingLotDetails/Place${spotId}`), {
      clientEmail: formData.email,
      clientName: `${formData.firstName} ${formData.lastName}`,
      startDateTime: reservation.startDateTime,
      endDateTime: reservation.endDateTime,
      totalPrice,
      accessCode,
    });
    await set(ref(database, `ParkingLot/Place${spotId}`), "reservé");

    localStorage.setItem(`paid_${spotId}`, "true");
    localStorage.setItem("accessCode", accessCode);
    localStorage.removeItem("pendingReservation");

    toast({
      title: "Paiement réussi !",
      description: `Votre code d'accès : ${accessCode}`,
    });

    setLoading(false);
    setTimeout(() => setLocation(`/payment-success/${spotId}`), 1200);

  } catch (err) {
    console.error(err);
    toast({
      title: "Erreur",
      description: "Impossible de finaliser le paiement. Réessayez.",
      variant: "destructive",
    });
    setLoading(false);
  }
};


  const paymentMethods = [
    { id: "card", label: "Carte de crédit", icon: CreditCard },
    { id: "paypal", label: "PayPal", icon: DollarSign },
    { id: "applepay", label: "Apple Pay", icon: CheckCircle2 },
    { id: "googlepay", label: "Google Pay", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Car className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">SmartPark</span>
          </div>
          <DarkModeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          <Card className="shadow-md border">
            <CardHeader>
              <CardTitle>Paiement sécurisé</CardTitle>
              <CardDescription>Entrez vos informations de paiement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-2 block">
                  Mode de paiement
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map(({ id, label, icon: Icon }) => (
                    <Button
                      key={id}
                      type="button"
                      variant={paymentMethod === id ? "default" : "outline"}
                      className="flex items-center justify-center gap-2 py-3"
                      onClick={() => setPaymentMethod(id)}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      placeholder="Prénom"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      placeholder="Nom"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardNumber">
                    <CreditCard className="inline h-4 w-4 mr-2" />
                    Numéro de carte
                  </Label>
                  <Input
                    id="cardNumber"
                    placeholder="4242 4242 4242 4242"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Exemple de test : 4242 4242 4242 4242
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="expiry">Date d’expiration</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/AA"
                      value={formData.expiry}
                      onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvc">
                      <Lock className="inline h-3 w-3 mr-1" />
                      CVC
                    </Label>
                    <Input
                      id="cvc"
                      placeholder="123"
                      value={formData.cvc}
                      onChange={(e) => setFormData({ ...formData, cvc: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">Code postal</Label>
                  <Input
                    id="zip"
                    placeholder="20000"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-4"
                  disabled={loading}
                >
                  {loading ? "Traitement du paiement..." : "Payer maintenant"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <div
              className="rounded-lg bg-cover bg-center h-[250px] relative overflow-hidden"
              style={{ backgroundImage: `url(${paymentImage})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent flex items-start justify-start p-6">
                <div className="text-white">
                  <h3 className="text-xl font-bold mb-1">Paiement sécurisé</h3>
                  <p className="text-white/90 text-sm">
                    Vos informations sont protégées
                  </p>
                </div>
              </div>
            </div>

            <Card className="shadow-sm border">
              <CardHeader>
                <CardTitle>Résumé de la réservation</CardTitle>
                <CardDescription>Vérifiez vos informations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Place</span>
                  <span>#{spotId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Durée</span>
                  <span>{reservation.duration ? reservation.duration.toFixed(1) : "0"} h</span>
                </div>
                <hr />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{totalPrice.toFixed(2)} MAD</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
