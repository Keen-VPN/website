import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PaymentCancel = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-foreground">Payment Cancelled</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your payment was cancelled. No charges have been made to your account.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Need help?</p>
              <ul className="text-sm space-y-1 text-left">
                <li>• Check our pricing for different plans</li>
                <li>• Contact support if you encountered issues</li>
                <li>• Try again when you're ready</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <Button asChild className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                <Link to="/#pricing">View Pricing Plans</Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Return to Homepage</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default PaymentCancel;