import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Car, Calendar, Clock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DarkModeToggle from "@/components/DarkModeToggle";
import { database, ref, onValue } from "../firebase/firebase";

interface Reservation {
  spotId: number;
  startDateTime: string;
  endDateTime: string;
  totalPrice: number;
  accessCode?: string; // قد تكون موجودة أو لا
}

export default function ReservationHistory() {
  const [, setLocation] = useLocation();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [revealedCodes, setRevealedCodes] = useState<Set<number>>(new Set());

  useEffect(() => {
    const sessionStr = localStorage.getItem("clientSession");
    if (!sessionStr) return;
    const client = JSON.parse(sessionStr);

    const detailsRef = ref(database, "ParkingLotDetails");

    onValue(detailsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const clientReservations = Object.keys(data)
        .filter((key) => data[key].clientEmail === client.email)
        .map((key) => ({
          spotId: Number(key.replace("Place", "")),
          startDateTime: data[key].startDateTime,
          endDateTime: data[key].endDateTime,
          totalPrice: data[key].totalPrice,
          accessCode: data[key].accessCode ? String(data[key].accessCode) : undefined, // تحويل الرقم إلى string إذا موجود
        }));

      clientReservations.sort(
        (a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime()
      );
      setReservations(clientReservations);
    });
  }, []);

  const toggleCodeReveal = (spotId: number) => {
    const newSet = new Set(revealedCodes);
    if (newSet.has(spotId)) newSet.delete(spotId);
    else newSet.add(spotId);
    setRevealedCodes(newSet);
  };

  const getStatusBadge = (start: string, end: string) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (now < startDate) return <Badge className="bg-blue-500 text-white">À venir</Badge>;
    if (now >= startDate && now <= endDate) return <Badge className="bg-green-500 text-white">En cours</Badge>;
    return <Badge variant="secondary">Terminé</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <Car className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">SmartPark</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setLocation("/parking")}>Retour au parking</Button>
          <DarkModeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {reservations.length === 0 ? (
            <Card className="text-center p-12">
              <p>Vous n'avez pas encore de réservations</p>
              <Button onClick={() => setLocation("/parking")}>Réserver une place</Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {reservations.map((res) => (
                <Card key={res.spotId} className="overflow-visible">
                  <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Car className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold">Place {res.spotId}</h3>
                          {getStatusBadge(res.startDateTime, res.endDateTime)}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(res.startDateTime).toLocaleDateString("fr-FR")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {new Date(res.startDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                              {new Date(res.endDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-3">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">Coût total</p>
                        <p className="text-2xl font-bold text-primary">{res.totalPrice} MAD</p>
                      </div>

                      {res.accessCode && (
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground mb-1">Code d'accès</p>
                            <p className="text-lg font-mono font-bold">
                              {revealedCodes.has(res.spotId) ? res.accessCode : `••${res.accessCode.slice(-2)}`}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => toggleCodeReveal(res.spotId)}>
                            {revealedCodes.has(res.spotId) ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
