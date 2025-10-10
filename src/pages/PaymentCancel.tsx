import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PaymentCancel = () => {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[80vh]">
        <Card className="max-w-lg w-full text-center border-primary/50 shadow-glow">
          <CardHeader className="space-y-4 pb-4">
            <div className="mx-auto w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <XCircle className="w-12 h-12 text-yellow-500" />
            </div>
            <CardTitle className="text-3xl text-foreground">Payment Cancelled</CardTitle>
            <CardDescription className="text-muted-foreground text-lg">
              No charges have been made to your account. You can try subscribing again anytime.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-4">
            <div className="bg-primary/5 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-foreground mb-2">Why Subscribe to KeenVPN?</h3>
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li className="flex items-start">
                  <span className="mr-2">🌍</span>
                  <span>Access to all server locations worldwide</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">🔒</span>
                  <span>Military-grade encryption for your data</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">⚡</span>
                  <span>Unlimited bandwidth with no throttling</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">💰</span>
                  <span>Just $100/year - less than $8.33/month</span>
                </li>
              </ul>
            </div>
            
            <Button asChild className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow" size="lg">
              <Link to="/subscribe">Try Again</Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <a href="keenvpn://cancel">Return to App</a>
            </Button>
            
            <Button asChild variant="ghost" className="w-full">
              <Link to="/">Back to Website</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default PaymentCancel;