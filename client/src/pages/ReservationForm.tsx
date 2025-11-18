import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Car, Calendar, Clock, ArrowLeft, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import DarkModeToggle from "@/components/DarkModeToggle";
import { database, ref, get, child } from "../firebase/firebase";

export default function ReservationForm() {
  const params = useParams();
  const spotId = params.spotId || "1";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [placeReserved, setPlaceReserved] = useState(false);

  const pricePerHour = 10;
  const [clientData, setClientData] = useState<{ email?: string; name?: string }>({});

  useEffect(() => {
    const session = localStorage.getItem("clientSession");
    if (session) {
      const client = JSON.parse(session);
      setClientData({ email: client.email, name: client.name || client.email });
    }

    // Vérifier réservation existante dans ParkingLotDetails
    get(child(ref(database), "ParkingLotDetails")).then((snapshot) => {
      const data: Record<string, any> | null = snapshot.val() || null;
      if (data && session) {
        const active = Object.values(data).some((spot: any) => {
          if (!spot || typeof spot !== "object") return false;
          if (!spot.clientEmail || !spot.endDateTime) return false;
          return spot.clientEmail === JSON.parse(session).email && new Date(spot.endDateTime) > new Date();
        });
        setHasActiveReservation(active);
      }
    });

    // Vérifier si la place est déjà réservée dans ParkingLot
    get(child(ref(database), `ParkingLot/Place${spotId}`)).then((snap) => {
      if (snap.exists() && snap.val() === "reservé") {
        setPlaceReserved(true);
      }
    });
  }, [spotId]);

  const calculateDuration = () => {
    if (!startDateTime || !endDateTime) return 0;
    const diff = new Date(endDateTime).getTime() - new Date(startDateTime).getTime();
    return diff > 0 ? diff / (1000 * 60 * 60) : 0;
  };

  const duration = calculateDuration();
  const totalPrice = duration * pricePerHour;

  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (placeReserved) return toast({ title: "Place indisponible", description: "Déjà réservée.", variant: "destructive" });
    if (hasActiveReservation) return toast({ title: "Réservation existante", description: "Vous avez déjà une réservation en cours.", variant: "destructive" });
    if (!startDateTime || !endDateTime || duration <= 0) return toast({ title: "Erreur", description: "Dates invalides.", variant: "destructive" });

    const reservation = { spotId, startDateTime, endDateTime, duration, totalPrice, clientEmail: clientData.email, clientName: clientData.name };
    localStorage.setItem("pendingReservation", JSON.stringify(reservation));

    toast({ title: "Réservation enregistrée", description: "Continuez vers le paiement." });
    setTimeout(() => setLocation(`/payment/${spotId}`), 800);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Car className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">SmartPark</span>
          </div>
          <DarkModeToggle />
        </div>
      </header>
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" size="sm" onClick={() => setLocation("/parking")} className="flex items-center gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" /> Retour aux places
          </Button>
          <h1 className="text-4xl font-bold text-center mb-2">Réservation - Place {spotId}</h1>
          <p className="text-center text-muted-foreground mb-8">Choisissez votre période et confirmez</p>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Date et Heure</CardTitle>
                <CardDescription>Sélectionnez vos dates et heures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="startDateTime"><Calendar className="inline h-4 w-4 mr-2" /> Date et heure de début</Label>
                  <Input type="datetime-local" value={startDateTime} onChange={(e) => setStartDateTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDateTime"><Clock className="inline h-4 w-4 mr-2" /> Date et heure de fin</Label>
                  <Input type="datetime-local" value={endDateTime} onChange={(e) => setEndDateTime(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Résumé du prix</CardTitle>
                <CardDescription>Détails de votre réservation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between py-2 border-b"><span>Tarif horaire</span><span>{pricePerHour} MAD/h</span></div>
                <div className="flex justify-between py-2 border-b"><span>Durée</span><span>{duration > 0 ? `${duration.toFixed(1)} heures` : "-"}</span></div>
                <div className="flex justify-between py-3 bg-primary/10 rounded-md px-4 font-bold">
                  <DollarSign className="inline h-5 w-5 mr-1" /> Total: {totalPrice > 0 ? `${totalPrice.toFixed(2)} MAD` : "-"}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Button size="lg" onClick={handleReservationSubmit}>Confirmer la réservation</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
