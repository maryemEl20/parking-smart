import { useEffect, useState } from "react";
// Utilisation de onValue pour les mises à jour en temps réel (ParkingLot) et get pour une récupération ponctuelle (Details/History)
import { database, ref, onValue, get } from "../firebase/firebase";
import { Car, Users, Activity, TrendingUp, Clock, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

// Définition des types pour les places de parking et les clients
type Spot = { id: number; status: "available" | "reserved" | "occupied"; client?: string; clientEmail?: string };
type Client = { fullName: string; email: string };

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  const [spots, setSpots] = useState<Spot[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [revenueToday, setRevenueToday] = useState(0);
  const [financeStats, setFinanceStats] = useState({
    revenueTotal: 0,
    avgRevenuePerSpot: 0,
    occupancyRate: 0,
    avgDurationHours: 0,
  });

  // Fonction utilitaire pour générer la date du jour au format YYYY-MM-DD
  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  };
  
  // 1. Charger l'état des places, intégrer les détails client et les clients actifs
  useEffect(() => {
    const spotsRef = ref(database, "ParkingLot");
    const detailsRef = ref(database, "ParkingLotDetails");

    // On utilise onValue pour surveiller les changements d'état des places en temps réel
    const unsubscribe = onValue(spotsRef, async (snapshot) => {
      const parkingLotData: Record<string, any> | null = snapshot.val(); 
      
      // Récupération des détails des réservations en cours (Details) en parallèle
      const detailsSnap = await get(detailsRef);
      const detailsData: Record<string, any> | null = detailsSnap.val();

      if (parkingLotData) {
        // Mise à jour de l'état des places avec intégration des détails client
        const updatedSpots = Object.keys(parkingLotData).map((key) => {
          let status: "available" | "reserved" | "occupied";
          
          const value = String(parkingLotData[key] || '').trim();

          if (value === "Libre") status = "available";
          else if (value === "Occupée") status = "occupied";
          else status = "reserved";

          const spotNumberMatch = key.match(/Place(\d+)/);
          const spotNumber = spotNumberMatch ? parseInt(spotNumberMatch[1], 10) : 0;
          
          const detail = detailsData ? detailsData[key] : null;

          return {
            id: spotNumber,
            status,
            client: detail?.clientName, // Ajout du nom du client
            clientEmail: detail?.clientEmail, // Ajout de l'email du client
          };
        }).filter(s => s.id > 0) // Filtrer les places avec un numéro valide
          .sort((a, b) => a.id - b.id); // Trier par numéro de place

        setSpots(updatedSpots);
        
        // Extraction des clients actifs à partir des détails
        if (detailsData) {
            const activeClientsMap = new Map<string, Client>();
            Object.values(detailsData).forEach((entry: any) => {
              if (entry.clientEmail && entry.clientName) {
                activeClientsMap.set(entry.clientEmail, {
                  fullName: entry.clientName,
                  email: entry.clientEmail,
                });
              }
            });
            setClients(Array.from(activeClientsMap.values()));
        } else {
            setClients([]);
        }

      }
    });
    return () => unsubscribe();
  }, []); 

  // 2. Calcul des revenus quotidiens et des statistiques financières (Dépend de 'spots')
  useEffect(() => {
    const calculateRevenue = async () => {
      if (spots.length === 0) return; 

      const detailsRef = ref(database, "ParkingLotDetails");
      const historyRef = ref(database, "ParkingLotHistory");

      // Récupération des données Details et History
      const [detailsSnap, historySnap] = await Promise.all([get(detailsRef), get(historyRef)]);
      const detailsData: Record<string, any> | null = detailsSnap.val();
      const historyData: Record<string, any> | null = historySnap.val();

      let totalRevenue = 0;
      let totalDuration = 0;
      let countReservations = 0;

      const today = getTodayDateString(); 

      // 1. Cumul des revenus de l'historique (History) - Logique de parcours corrigée
      if (historyData && historyData[today]) {
        const dayHistory = historyData[today];
        
        // Itération sur les emplacements (Place1, Place2, ...)
        Object.values(dayHistory).forEach((placeData: any) => {
            // placeData est un objet contenant les clés de réservation (e.g., Place1_1763471966043)
            
            // Itération sur les entrées de réservation individuelles (entry)
            Object.values(placeData).forEach((entry: any) => {
                // entry est l'objet de réservation complet (totalPrice, startDateTime, etc.)
                if (entry.totalPrice && entry.startDateTime && entry.endDateTime) {
                    totalRevenue += entry.totalPrice; // **Ajoute 240 MAD**
                    const start = new Date(entry.startDateTime);
                    const end = new Date(entry.endDateTime);
                    totalDuration += (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Durée en heures
                    countReservations++;
                }
            });
        });
      }

      // 2. Cumul des revenus des détails en cours (Details)
      if (detailsData) {
        Object.values(detailsData).forEach((entry: any) => {
          if (entry.totalPrice && entry.startDateTime && entry.endDateTime) {
            totalRevenue += entry.totalPrice; // **Ajoute 70 MAD (50 + 20)**
            const start = new Date(entry.startDateTime);
            const end = new Date(entry.endDateTime);
            totalDuration += (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Durée en heures
            countReservations++;
          }
        });
      }

      const totalSpots = spots.length;
      const occupiedSpots = spots.filter((s) => s.status !== "available").length;

      setRevenueToday(totalRevenue); 
      setFinanceStats({
        revenueTotal: totalRevenue,
        avgRevenuePerSpot: totalSpots ? totalRevenue / totalSpots : 0,
        occupancyRate: totalSpots ? Math.round((occupiedSpots / totalSpots) * 100) : 0,
        avgDurationHours: countReservations ? totalDuration / countReservations : 0,
      });
    };

    calculateRevenue();
  }, [spots]); 

  // Fonctions utilitaires pour l'affichage
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-500";
      case "reserved": return "bg-blue-500";
      case "occupied": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available": return "🟢";
      case "reserved": return "🔵";
      case "occupied": return "🔴";
      default: return "⚪";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminSession");
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Car className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-gray-800">SmartPark Admin</span>
          </div>
          <Button variant="destructive" onClick={handleLogout}>Déconnexion</Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold mb-10 text-gray-800">Tableau de bord</h1>

        {/* Statistiques principales */}
        <div className="grid md:grid-cols-4 gap-6 mb-10">
          <Card>
            <CardHeader className="flex justify-between items-center pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total des places</CardTitle>
              <Activity className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{spots.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between items-center pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Disponibles</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {spots.filter((s) => s.status === "available").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between items-center pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Réservées/Occupées</CardTitle>
              <Clock className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {spots.filter((s) => s.status !== "available").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between items-center pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Revenus aujourd'hui</CardTitle>
              <CreditCard className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{revenueToday.toFixed(2)} MAD</div> 
            </CardContent>
          </Card>
        </div>

        {/* Vue d'ensemble */}
        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          {/* État des places */}
          <Card>
            <CardHeader>
              <CardTitle>État des places</CardTitle>
              <CardDescription>Vue en temps réel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {spots.map((spot) => (
                  <div key={spot.id} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{getStatusIcon(spot.status)}</span>
                      <div>
                        <p className="font-semibold text-gray-700">Place {spot.id}</p>
                        {spot.client && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Users className="h-3 w-3" /> {spot.client}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${getStatusColor(spot.status)} text-white`}>
                        {spot.status === "available" && "Disponible"}
                        {spot.status === "reserved" && "Réservée"}
                        {spot.status === "occupied" && "Occupée"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Clients actifs */}
          <Card>
            <CardHeader>
              <CardTitle>Clients actifs</CardTitle>
              <CardDescription>Réservations أو Occupations en cours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition">
                    <div>
                      <p className="font-semibold text-gray-700">{client.fullName}</p>
                      <p className="text-sm text-gray-500">{client.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Finances */}
        <Card>
          <CardHeader>
            <CardTitle>Finances</CardTitle>
            <CardDescription>Aperçu rapide des revenus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition">
                <p className="text-sm text-gray-500 mb-2">Revenus moyens / place</p>
                <p className="text-3xl font-bold text-primary">{financeStats.avgRevenuePerSpot.toFixed(2)} MAD</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-100 hover:bg-green-200 transition">
                <p className="text-sm text-gray-500 mb-2">Taux d'occupation</p>
                <p className="text-3xl font-bold text-green-500">{financeStats.occupancyRate}%</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-100 hover:bg-blue-200 transition">
                <p className="text-sm text-gray-500 mb-2">Durée moyenne</p>
                <p className="text-3xl font-bold text-blue-500">{financeStats.avgDurationHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}