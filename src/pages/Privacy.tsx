import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield, Eye, Database, Lock, Server, UserX } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-card/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 mb-6">
              <Shield className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Last updated: January 15, 2024</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Privacy Policy
            </h1>
            <p className="text-xl text-muted-foreground">
              Your privacy is our highest priority. Learn how we protect your data and maintain your anonymity.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 bg-gradient-card rounded-xl border border-border/50 text-center">
              <Eye className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Zero Logs</h3>
              <p className="text-sm text-muted-foreground">We never track or store your online activity</p>
            </div>
            <div className="p-6 bg-gradient-card rounded-xl border border-border/50 text-center">
              <Database className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">No Data Collection</h3>
              <p className="text-sm text-muted-foreground">Your personal information stays private</p>
            </div>
            <div className="p-6 bg-gradient-card rounded-xl border border-border/50 text-center">
              <Lock className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">End-to-End Encryption</h3>
              <p className="text-sm text-muted-foreground">Military-grade protection for all data</p>
            </div>
          </div>

          {/* Content Sections */}
          <div className="prose prose-invert max-w-none">
            <div className="bg-gradient-card rounded-xl p-8 border border-border/50 mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                <UserX className="h-6 w-6 text-primary mr-3" />
                Information We DON'T Collect
              </h2>
              <div className="text-muted-foreground space-y-3">
                <p>At KeenVPN, we are committed to true privacy. We specifically do NOT collect, log, or store:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Your IP address when connected to our VPN</li>
                  <li>Websites you visit or content you access</li>
                  <li>DNS queries or browsing history</li>
                  <li>Connection timestamps or session duration</li>
                  <li>Bandwidth usage or data transferred</li>
                  <li>Network traffic or metadata</li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-card rounded-xl p-8 border border-border/50 mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                <Database className="h-6 w-6 text-primary mr-3" />
                Limited Information We Collect
              </h2>
              <div className="text-muted-foreground space-y-4">
                <p>To provide our service, we collect only the minimal information necessary:</p>
                
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Account Information</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Email address (for account creation and support)</li>
                    <li>Payment information (processed by third-party providers)</li>
                    <li>Support ticket communications</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Technical Information</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>App version and operating system (for compatibility)</li>
                    <li>Crash reports (anonymous, for service improvement)</li>
                    <li>Aggregate bandwidth usage (for capacity planning)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-xl p-8 border border-border/50 mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                <Server className="h-6 w-6 text-primary mr-3" />
                Server Locations & Jurisdiction
              </h2>
              <div className="text-muted-foreground space-y-3">
                <p>KeenVPN operates under privacy-friendly jurisdictions with strong data protection laws:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Primary operations based in countries with no mandatory data retention laws</li>
                  <li>Servers located in privacy-respecting jurisdictions</li>
                  <li>No cooperation with mass surveillance programs</li>
                  <li>Regular security audits and transparency reports</li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-card rounded-xl p-8 border border-border/50 mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Data Sharing & Third Parties</h2>
              <div className="text-muted-foreground space-y-3">
                <p>We never sell, rent, or share your personal information with third parties for marketing purposes.</p>
                <p>We may share limited information only in these specific circumstances:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Payment processing (handled by secure, certified payment providers)</li>
                  <li>Legal compliance when required by valid court orders</li>
                  <li>Service providers who help us operate our platform (under strict confidentiality)</li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-card rounded-xl p-8 border border-border/50 mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Your Rights</h2>
              <div className="text-muted-foreground space-y-3">
                <p>You have complete control over your information:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access any personal data we have about you</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Delete your account and associated data at any time</li>
                  <li>Export your account information</li>
                  <li>Opt out of marketing communications</li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-card rounded-xl p-8 border border-border/50">
              <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
              <div className="text-muted-foreground">
                <p className="mb-4">Questions about our privacy practices? We're here to help:</p>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p><strong>Privacy Team:</strong> privacy@keenvpn.com</p>
                  <p><strong>Support:</strong> support@keenvpn.com</p>
                  <p><strong>Legal Inquiries:</strong> legal@keenvpn.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;