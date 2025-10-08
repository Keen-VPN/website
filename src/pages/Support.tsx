import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  Shield, 
  Mail, 
  HelpCircle,
  Smartphone,
  Wifi,
  Lock,
  Settings,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Support = () => {

  const faqCategories = [
    {
      id: 'setup',
      title: 'Setup & Installation',
      icon: <Smartphone className="h-5 w-5" />,
      questions: [
        {
          q: "How do I download and install KeenVPN?",
          a: "You can download KeenVPN from the App Store (iOS/macOS), Google Play Store (Android), Microsoft Store (Windows), or our website. Each platform has specific installation instructions, but all apps will guide you through the setup process."
        },
        {
          q: "What are the system requirements?",
          a: "KeenVPN supports multiple platforms: macOS 11.0+, iOS 14.0+, Windows 10+, and Android 8.0+. The app is optimized for all device types and requires about 50MB of free storage space for installation."
        },
        {
          q: "How do I activate my subscription?",
          a: "After completing your purchase through Stripe, your subscription will be automatically activated in your KeenVPN account. If you're having issues with activation, contact support with your purchase details."
        }
      ]
    },
    {
      id: 'connection',
      title: 'Connection Issues',
      icon: <Wifi className="h-5 w-5" />,
      questions: [
        {
          q: "Why can't I connect to the VPN?",
          a: "First, check your internet connection. If that's working, try switching to a different server location. Restart the app and your network connection. If issues persist, contact our support team."
        },
        {
          q: "The VPN connects but I have no internet access",
          a: "This can happen due to DNS issues or firewall conflicts. Try disconnecting and reconnecting, or switch to a different server location. Check that no other VPN software is running simultaneously."
        },
        {
          q: "How do I switch server locations?",
          a: "In the KeenVPN app, click on your current location in the sidebar. You can instantly switch between available servers (US and Nigeria) even while connected."
        }
      ]
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: <Lock className="h-5 w-5" />,
      questions: [
        {
          q: "What encryption does KeenVPN use?",
          a: "KeenVPN uses military-grade IKEv2/IPSec protocol with AES-256 encryption. This is the same level of security used by governments and financial institutions worldwide."
        },
        {
          q: "Do you keep logs of my activity?",
          a: "No. KeenVPN has a strict zero-logs policy. We don't track, collect, or store any information about your online activities, browsing history, or connection logs."
        },
        {
          q: "Is my data safe on public WiFi?",
          a: "Yes! When connected to KeenVPN, all your internet traffic is encrypted and secure, even on public WiFi networks. Your data is protected from hackers and eavesdroppers."
        }
      ]
    },
    {
      id: 'account',
      title: 'Account & Billing',
      icon: <CreditCard className="h-5 w-5" />,
      questions: [
        {
          q: "How do I manage my subscription?",
          a: "Your subscription is managed through Stripe, our secure payment processor. You can view and modify your subscription by logging into your KeenVPN account or contacting our support team for assistance."
        },
        {
          q: "Can I get a refund?",
          a: "Yes, we offer a 30-day money-back guarantee. Contact our support team within 30 days of purchase if you're not satisfied with the service."
        },
        {
          q: "How many devices can I use with one account?",
          a: "KeenVPN supports multiple devices per account. You can use your subscription on up to 5 devices simultaneously, including macOS, iOS, Windows, and Android devices."
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Support',
      icon: <Settings className="h-5 w-5" />,
      questions: [
        {
          q: "The app crashes or won't start",
          a: "Try restarting your Mac and launching the app again. If the issue persists, uninstall and reinstall KeenVPN. Make sure you're running the latest version of macOS."
        },
        {
          q: "How do I enable VPN permissions on macOS?",
          a: "Go to System Preferences > Security & Privacy > Privacy > VPN. Make sure KeenVPN is listed and enabled. You may need to click the lock icon and enter your password to make changes."
        },
        {
          q: "Can I use KeenVPN with other security software?",
          a: "KeenVPN is compatible with most antivirus and firewall software. However, other VPN applications may conflict. Make sure to disconnect from other VPNs before using KeenVPN."
        }
      ]
    }
  ];



  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-card/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 mb-6">
              <HelpCircle className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm text-muted-foreground">We're here to help</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Support Center
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Find answers to common questions, get technical support, or contact our team directly. 
              We're committed to providing the best VPN experience possible.
            </p>
          </div>


          {/* FAQ Section */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">Find quick answers to the most common questions about KeenVPN</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {faqCategories.map((category) => (
                <div key={category.id} className="bg-gradient-card rounded-xl p-6 border border-border/50">
                  <div className="flex items-center mb-6">
                    <div className="text-primary mr-3">
                      {category.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">{category.title}</h3>
                  </div>

                  <Accordion type="single" collapsible className="space-y-2">
                    {category.questions.map((item, index) => (
                      <AccordionItem key={index} value={`${category.id}-${index}`} className="border-border/50">
                        <AccordionTrigger className="text-left text-foreground hover:text-primary">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </section>

          {/* Additional Resources */}
          <section className="mt-16">
            <div className="bg-gradient-card rounded-xl p-8 border border-border/50 text-center">
              <h3 className="text-2xl font-bold text-foreground mb-4">Still Need Help?</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Can't find what you're looking for? Our support team is standing by to help you resolve any issues 
                and answer your questions about KeenVPN.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="outline" 
                  className="border-primary/50 hover:bg-primary/10"
                  onClick={() => window.location.href = 'mailto:support@vpnkeen.com?subject=KeenVPN Support Request'}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  support@vpnkeen.com
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Support;
