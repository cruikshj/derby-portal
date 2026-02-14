import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent } from "@/components/ui/card";
import { usePackName } from "@/hooks/use-pack-name";
import { Redirect } from "wouter";

export default function PrivacyPolicy() {
  usePageTitle("Privacy Policy");
  const { packName, isLoading } = usePackName();

  if (isLoading) return null;

  if (!packName) {
    return <Redirect to="/" />;
  }

  return (
    <div className="py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2" data-testid="text-privacy-title">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Pinewood Derby Portal
          </p>
        </div>

        <Card>
          <CardContent className="prose dark:prose-invert max-w-none pt-6" data-testid="content-privacy-policy">
            <p><strong>Effective Date:</strong> January 11, 2026</p>

            <p>
              At {packName}, we value your privacy. This Privacy Policy explains how we collect, use, store, share, and protect your personal information when you use our app, Pinewood Derby Portal, a small tool designed solely for managing our local Cub Scout Pack's Pinewood Derby event. The app uses Google Authentication for secure sign-in.
            </p>

            <p>
              We collect minimal data and only use it for the app's core functions, such as user authentication and event participation. We do not sell data, use it for advertising, or share it unnecessarily.
            </p>

            <h5>1. Data We Collect</h5>

            <p>We collect the following personal information:</p>

            <ul>
              <li><strong>From Google Authentication</strong>: Your name and email address, provided by Google when you sign in. This is used for account creation and login.</li>
              <li><strong>Other Data</strong>: Any event-related info you provide, such as racer names or scores (if applicable). We do not collect sensitive data like payment info or health details.</li>
              <li><strong>Device and Usage Data</strong>: Automatically collected info like device type, app version, and usage patterns to improve the app and troubleshoot issues.</li>
              <li><strong>No Location Data</strong>: Unless you enable it for optional features (e.g., event check-ins), we do not collect location.</li>
            </ul>

            <p>We do not access your Google email contents or any other restricted data beyond what's needed for sign-in.</p>

            <h5>2. How We Use Your Data</h5>

            <p>We use your data only for:</p>

            <ul>
              <li>Providing app features, like authenticating users, registering for the derby, and tracking results.</li>
              <li>Communicating about the event (e.g., sending email updates via your provided address).</li>
              <li>Improving the app based on anonymous usage stats.</li>
              <li>Complying with legal requirements, such as safety or event records.</li>
            </ul>

            <p>Data is not used for advertising, AI training, or any non-event purposes.</p>

            <h5>3. Legal Basis for Processing</h5>

            <ul>
              <li><strong>Consent</strong>: By signing in with Google, you consent to us accessing your name and email.</li>
              <li><strong>Contract</strong>: To fulfill your use of the app (e.g., participating in the derby).</li>
              <li><strong>Legitimate Interests</strong>: For basic app maintenance and security.</li>
            </ul>

            <p>You can withdraw consent by revoking Google access in your Google account settings or deleting your app account.</p>

            <h5>4. Data Sharing and Disclosure</h5>

            <p>We do not sell or rent your data. We may share it only:</p>

            <ul>
              <li>With Google for authentication purposes.</li>
              <li>If required by law (e.g., for safety in youth events).</li>
              <li>In case of app transfer (e.g., if the pack changes leadership), with notice to you.</li>
            </ul>

            <p>No data is shared with third parties for marketing or other unrelated uses.</p>

            <h5>5. Data Security</h5>

            <p>We protect your data with reasonable measures, such as:</p>

            <ul>
              <li>Encryption for data in transit.</li>
              <li>Secure storage on our private server or cloud service with access controls.</li>
              <li>Limiting access to only authorized pack leaders.</li>
            </ul>

            <p>While we strive for security, no system is perfect—please use strong passwords.</p>

            <h5>6. Data Retention and Deletion</h5>

            <p>We keep data only as long as needed for the derby event and archives, or legal reasons. You can request deletion by contacting us, and we'll remove it promptly. Google data access can be revoked via your Google settings.</p>

            <h5>7. Children's Privacy (COPPA Compliance)</h5>

            <p>Our app is primarily for adult pack leaders and parents, not directed at children under 13. Google Auth is optional and requires adult supervision. We do not knowingly collect data from children under 13 without verifiable parental consent. If we learn of such data, we'll delete it immediately. Parents: Contact us for consent or questions.</p>

            <h5>8. Your Rights</h5>

            <p>You have the right to:</p>

            <ul>
              <li>Access, update, or delete your data.</li>
              <li>Object to processing.</li>
              <li>Port your data.</li>
            </ul>

            <p>Contact us to exercise these rights.</p>

            <h5>9. Changes to This Policy</h5>

            <p>We may update this policy. Changes will be posted here with a new effective date, and we'll notify you via email if significant.</p>

            <h5>10. Contact Us</h5>

            <p>For questions, contact your pack leadership.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
