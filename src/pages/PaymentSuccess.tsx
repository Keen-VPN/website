import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PaymentSuccess = () => {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[80vh]">
        <Card className="max-w-lg w-full text-center border-primary/50 shadow-glow">
          <CardHeader className="space-y-4 pb-4">
            <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <CardTitle className="text-3xl text-foreground">Welcome to KeenVPN Premium!</CardTitle>
            <CardDescription className="text-muted-foreground text-lg">
              Your subscription is now active. Open the KeenVPN app to start browsing securely.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-4">
            <div className="bg-primary/5 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-foreground mb-2">What's Next?</h3>
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Open the KeenVPN app on your device</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Your subscription is automatically activated</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Connect to any server location worldwide</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Enjoy unlimited, secure browsing</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <Button asChild className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow" size="lg">
                <a href="vpnkeen://success">Open Desktop App</a>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link to="/account">Manage Account</Link>
              </Button>
              
              <Button asChild variant="ghost" className="w-full">
                <Link to="/">Back to Website</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default PaymentSuccess;