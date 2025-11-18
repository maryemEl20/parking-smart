import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Car, Clock, User, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ClientRoute from "@/components/clientRoute";
import { database, ref, onValue, set ,get } from "../firebase/firebase";

type SpotStatus = "available" | "reserved" | "occupied";

interface ParkingSpot {
  id: number;
  status: SpotStatus;
  clientName?: string;
  endTime?: string;
}

export default function ParkingMap() {
  const [, setLocation] = useLocation();
  const [spots, setSpots] = useState<ParkingSpot[]>([]);

useEffect(() => {
  const spotsRef = ref(database, "ParkingLot");
  const detailsRef = ref(database, "ParkingLotDetails");

  const unsubscribe = onValue(spotsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    get(detailsRef).then((detailsSnap) => {
      const details = detailsSnap.val() || {};

      const updatedSpots = Object.keys(data).map((place) => {
        const placeStatus = data[place]; // Libre / reservé / Occupée
        const detail = details[place];

        let status: SpotStatus;
        if (placeStatus === "Libre") status = "available";
        else if (placeStatus === "reservé") status = "reserved";
        else status = "occupied";

        const endTime = detail?.endDateTime
          ? new Date(detail.endDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : undefined;

        return {
          id: Number(place.replace("Place", "")),
          status,
          clientName: detail?.clientName,
          endTime,
        };
      });

      setSpots(updatedSpots);
    });
  });

  return () => unsubscribe();
}, []);

  const getStatusIcon = (status: SpotStatus) => {
    switch (status) {
      case "available":
        return <Car className="h-12 w-12 text-green-500" />;
      case "reserved":
        return <Clock className="h-12 w-12 text-blue-500" />;
      case "occupied":
        return <Ban className="h-12 w-12 text-red-500" />;
    }
  };

  const handleSpotClick = (spot: ParkingSpot) => {
    if (spot.status === "available") {
      setLocation(`/reserve/${spot.id}`);
    }
  };

  return (
    <ClientRoute>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">SmartPark</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setLocation("/reservation-history")}>
                Mes réservations
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  localStorage.removeItem("clientSession");
                  setLocation("/");
                }}
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Places de parking disponibles</h1>
            <div className="flex gap-6 justify-center flex-wrap">
              <div className="flex items-center gap-2">
                <Car className="h-6 w-6 text-green-500" />
                <span className="text-muted-foreground">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-6 w-6 text-blue-500" />
                <span className="text-muted-foreground">Réservée</span>
              </div>
              <div className="flex items-center gap-2">
                <Ban className="h-6 w-6 text-red-500" />
                <span className="text-muted-foreground">Occupée</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {spots.map((spot) => (
              <Card
                key={spot.id}
                className={`${
                  spot.status === "available"
                    ? "cursor-pointer hover-elevate active-elevate-2"
                    : "cursor-not-allowed opacity-80"
                } transition-all overflow-visible`}
                onClick={() => handleSpotClick(spot)}
              >
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="mb-4">{getStatusIcon(spot.status)}</div>
                    <h3 className="text-3xl font-bold mb-2">Place {spot.id}</h3>

                    <div
                      className={`inline-block px-4 py-1 rounded-full text-white mb-4 ${
                        spot.status === "available"
                          ? "bg-green-500"
                          : spot.status === "reserved"
                          ? "bg-blue-500"
                          : "bg-red-500"
                      }`}
                    >
                      {spot.status === "available"
                        ? "Disponible"
                        : spot.status === "reserved"
                        ? "Réservé"
                        : "Occupée"}
                    </div>

                    {spot.status !== "available" && spot.clientName && (
                      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{spot.clientName}</span>
                        </div>
                        {spot.endTime && (
                          <div className="flex items-center justify-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Jusqu'à {spot.endTime}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </ClientRoute>
  );
}
