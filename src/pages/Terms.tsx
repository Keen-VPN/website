import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FileText, AlertTriangle, CreditCard, Shield } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-card/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 mb-6">
              <FileText className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Last updated: October 9, 2025</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Terms of Service
            </h1>
            <p className="text-xl text-muted-foreground">
              Our commitment to providing secure, reliable VPN services with clear, fair terms.
            </p>
          </div>

          {/* Quick Summary */}
          <div className="bg-gradient-card rounded-xl p-8 border border-border/50 mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Quick Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Privacy First</h3>
                    <p className="text-sm text-muted-foreground">Zero-log policy and complete anonymity protection</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CreditCard className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">30-Day Guarantee</h3>
                    <p className="text-sm text-muted-foreground">Full refund if not satisfied with our service</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Fair Use</h3>
                    <p className="text-sm text-muted-foreground">Use our service responsibly and legally</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Clear Terms</h3>
                    <p className="text-sm text-muted-foreground">No hidden clauses or confusing language</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="prose prose-invert max-w-none space-y-8">
            <div className="bg-gradient-card rounded-xl p-8 border border-border/50">
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Service Description</h2>
              <div className="text-muted-foreground space-y-3">
                <p>KeenVPN provides virtual private network (VPN) services that:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Encrypt your internet connection using enterprise-grade AES-256 encryption</li>
                  <li>Route your traffic through our global network of secure servers</li>
                  <li>Protect your privacy with our strict zero-log policy</li>
                  <li>Allow access to geo-restricted content and websites</li>
                  <li>Provide protection on public Wi-Fi networks</li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-card rounded-xl p-8 border border-border/50">
              <h2 className="text-2xl font-bold text-foreground mb-4">2. Acceptable Use</h2>
              <div className="text-muted-foreground space-y-4">
                <p>You agree to use KeenVPN services responsibly and in compliance with all applicable laws. You may NOT use our service for:</p>
                
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Prohibited Activities</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Illegal activities or content distribution</li>
                    <li>Hacking, cracking, or unauthorized access to systems</li>
                    <li>Spam, phishing, or fraudulent activities</li>
                    <li>Harassment, threats, or abuse of others</li>
                    <li>Distribution of malware or viruses</li>
                    <li>Copyright infringement or piracy</li>
                  </ul>
                </div>

                <p>Violation of these terms may result in immediate account suspension or termination.</p>
              </div>
            </div>

            <div className="bg-gradient-card rounded-xl p-8 border border-border/50">
              <h2 className="text-2xl font-bold text-foreground mb-4">3. Auto-Renewable Subscriptions</h2>
              <div className="text-muted-foreground space-y-4">
                <p>KeenVPN offers auto-renewable subscription plans with the following terms:</p>
                
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Subscription Plan</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Annual Plan:</strong> $100.00/year - Billed every 12 months</li>
                  </ul>
                  <p className="mt-2">All prices are in USD and may vary by region. Applicable taxes will be added at checkout.</p>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Auto-Renewal Terms</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Automatic Renewal:</strong> Your subscription will automatically renew at the end of each billing period unless you cancel</li>
                    <li><strong>Billing:</strong> You will be charged within 24 hours before the end of the current period</li>
                    <li><strong>Same Rate:</strong> Renewal will be at the same rate, unless we notify you of a price change</li>
                    <li><strong>Cancellation:</strong> You can cancel auto-renewal at any time through your account settings or by contacting support</li>
                    <li><strong>Cancel Deadline:</strong> To avoid being charged for the next period, cancel at least 24 hours before the renewal date</li>
                    <li><strong>Access After Cancellation:</strong> If you cancel, you'll retain access until the end of your current billing period</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Account Creation</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>You must provide accurate information during registration</li>
                    <li>You are responsible for maintaining account security</li>
                    <li>One account per person or organization</li>
                    <li>You must be 18 years or older to create an account</li>
                    <li><strong>Note:</strong> Account registration is optional for purchasing subscriptions, but recommended to access your subscription across multiple devices</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Payment and Refunds</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>All fees are billed in advance for the selected period</li>
                    <li>Payments are processed securely through Stripe</li>
                    <li>We accept major credit cards, debit cards, and other payment methods</li>
                    <li>30-day money-back guarantee for all new customers</li>
                    <li>Refund requests must be submitted within 30 days of purchase</li>
                    <li>Refunds are processed within 5-7 business days</li>
                    <li>No partial refunds for unused portions of subscription periods</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Managing Your Subscription</h3>
                  <p>You can manage your subscription through:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Your KeenVPN account settings</li>
                    <li>Contacting our support team at support@vpnkeen.com</li>
                    <li>The platform where you purchased (App Store, Google Play, etc.)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-xl p-8 border border-border/50">
              <h2 className="text-2xl font-bold text-foreground mb-4">4. Service Availability</h2>
              <div className="text-muted-foreground space-y-3">
                <p>While we strive for 99.9% uptime, we cannot guarantee uninterrupted service due to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Scheduled maintenance and updates</li>
                  <li>Network infrastructure issues</li>
                  <li>Third-party service dependencies</li>
                  <li>Force majeure events</li>
                </ul>
                <p>We will provide advance notice of planned maintenance whenever possible.</p>
              </div>
            </div>

            <div className="bg-gradient-card rounded-xl p-8 border border-border/50">
              <h2 className="text-2xl font-bold text-foreground mb-4">5. Privacy and Data Protection</h2>
              <div className="text-muted-foreground space-y-3">
                <p>Our privacy practices are detailed in our Privacy Policy, which includes:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Strict zero-log policy for user activity</li>
                  <li>Minimal data collection for service operation</li>
                  <li>Secure data handling and storage practices</li>
                  <li>No sharing of personal information with third parties</li>
                </ul>
                <p>
                  Please review our{" "}
                  <span className="text-primary font-medium">Privacy Policy</span>{" "}
                  for complete details on how we protect your information.
                </p>
              </div>
            </div>

            <div className="bg-gradient-card rounded-xl p-8 border border-border/50">
              <h2 className="text-2xl font-bold text-foreground mb-4">6. Limitation of Liability</h2>
              <div className="text-muted-foreground space-y-3">
                <p>KeenVPN provides services "as is" without warranties of any kind. We are not liable for:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Damages resulting from service interruptions</li>
                  <li>Loss of data or business opportunities</li>
                  <li>Consequences of prohibited use of our service</li>
                  <li>Third-party actions or content</li>
                </ul>
                <p>Our total liability is limited to the amount paid for the service in the preceding 12 months.</p>
              </div>
            </div>

            <div className="bg-gradient-card rounded-xl p-8 border border-border/50">
              <h2 className="text-2xl font-bold text-foreground mb-4">7. Changes to Terms</h2>
              <div className="text-muted-foreground space-y-3">
                <p>We may update these terms occasionally to reflect:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Changes in our services or features</li>
                  <li>Legal or regulatory requirements</li>
                  <li>Industry best practices</li>
                </ul>
                <p>We will notify users of significant changes via email and update the "Last updated" date above.</p>
              </div>
            </div>

            <div className="bg-gradient-card rounded-xl p-8 border border-border/50">
              <h2 className="text-2xl font-bold text-foreground mb-4">8. Contact Information</h2>
              <div className="text-muted-foreground">
                <p className="mb-4">For questions about these terms or our services:</p>
                <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                  <p><strong>Legal Team:</strong> legal@vpnkeen.com</p>
                  <p><strong>Customer Support:</strong> support@vpnkeen.com</p>
                  <p><strong>Business Address:</strong></p>
                  <p className="ml-4">
                    21915 W Firemist Ct<br />
                    Cypress, TX 77433<br />
                    United States
                  </p>
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

export default Terms;