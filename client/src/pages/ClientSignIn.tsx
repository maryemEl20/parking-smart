import { useState, useEffect } from "react"; 
import { useLocation } from "wouter";
import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DarkModeToggle from "@/components/DarkModeToggle";
import { database, ref, set ,get } from "../firebase/firebase";

export default function ClientSignIn() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ fullName: "", email: "" });

  // Vérifier la session dès le chargement
  useEffect(() => {
    const session = localStorage.getItem("clientSession");
    if (session) {
      setLocation("/parking"); // si déjà connecté, redirige directement
    }
  }, [setLocation]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!formData.fullName || !formData.email) {
    toast({
      title: "Erreur",
      description: "Veuillez remplir tous les champs",
      variant: "destructive",
    });
    return;
  }

  try {
    // Vérifier si l'email existe déjà
    const clientsRef = ref(database, "Clients");
    const snapshot = await get(clientsRef);

    let existingClientId = null;

    if (snapshot.exists()) {
      const clients = snapshot.val();

      // Chercher si l'email existe déjà
      for (const id in clients) {
        if (clients[id].email === formData.email) {
          existingClientId = id;
          break;
        }
      }
    }

    let clientId = existingClientId;

    // Si le client n'existe pas → créer un nouveau
    if (!clientId) {
      clientId = `client_${Date.now()}`;
      await set(ref(database, `Clients/${clientId}`), {
        fullName: formData.fullName,
        email: formData.email,
        role: "client",
      });
    }

    // Sauvegarde session local
    localStorage.setItem(
      "clientSession",
      JSON.stringify({ id: clientId, ...formData })
    );

    toast({
      title: "Bienvenue !",
      description: `${formData.fullName}, vous êtes connecté.`,
    });

    setLocation("/parking");
  } catch (err) {
    toast({
      title: "Erreur",
      description: (err as Error).message,
      variant: "destructive",
    });
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4"><DarkModeToggle /></div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Car className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Connexion Client</CardTitle>
          <CardDescription>Entrez vos informations pour accéder au parking</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" type="text" placeholder="Jean Dupont" value={formData.fullName}
                     onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="jean@example.com" value={formData.email}
                     onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">Continuer</Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="ghost" onClick={() => setLocation("/")}>← Retour à l'accueil</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
