import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsOfService() {
  usePageTitle("Terms of Service");

  return (
    <div className="py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2" data-testid="text-terms-title">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Pinewood Derby Tracker
          </p>
        </div>

        <Card>
          <CardContent className="prose dark:prose-invert max-w-none pt-6" data-testid="content-terms-of-service">
            <p><strong>Effective Date:</strong> January 11, 2026</p>

            <p>
              Welcome to Pinewood Derby Tracker (the "App"), a free tool provided by Cub Scout Pack 77 ("we," "us," or "our") for managing our local Pinewood Derby event. By accessing or using the App, including signing in with Google Authentication, you agree to these Terms of Service ("Terms"). If you do not agree, please do not use the App.
            </p>

            <p>
              These Terms govern your use of the App and form a binding agreement between you and us. We may update these Terms at any time—continued use means you accept changes.
            </p>

            <h5>1. Eligibility and Accounts</h5>

            <ul>
              <li><strong>Age Requirement</strong>: You must be at least 18 years old or have parental/guardian consent to use the App. The App is intended for adult pack leaders, parents, and scouts under adult supervision. Children under 13 may not create accounts without verifiable parental consent (per COPPA).</li>
              <li><strong>Google Authentication</strong>: Accounts are created via Google Sign-In. You must have a valid Google account and comply with Google's terms. We do not store your Google password—authentication is handled securely by Google.</li>
              <li><strong>Account Responsibility</strong>: Keep your account secure. You're responsible for all activity under your account. Notify us immediately of unauthorized use.</li>
            </ul>

            <h5>2. Use of the App</h5>

            <ul>
              <li><strong>Permitted Use</strong>: The App is for Pinewood Derby-related activities only, such as registering racers, tracking scores, and receiving updates. Use it in a manner consistent with Scouting values: respectful, honest, and fun.</li>
              <li><strong>Prohibited Conduct</strong>: Do not:
                <ul>
                  <li>Use the App for commercial purposes, spam, or illegal activities.</li>
                  <li>Harass, bully, or share inappropriate content.</li>
                  <li>Attempt to hack, disrupt, or reverse-engineer the App.</li>
                  <li>Upload viruses, malware, or harmful code.</li>
                  <li>Violate intellectual property rights or privacy of others.</li>
                </ul>
              </li>
              <li><strong>Content You Provide</strong>: Any data you submit (e.g., racer names, photos) must be accurate and appropriate. You grant us a non-exclusive license to use it for App purposes.</li>
            </ul>

            <h5>3. Intellectual Property</h5>

            <ul>
              <li><strong>Our Ownership</strong>: The App, including its design, code, and content (except user-submitted data), is owned by us or our licensors. You may not copy, modify, or distribute it without permission.</li>
              <li><strong>Trademarks</strong>: "Cub Scouts," "Pinewood Derby," and related marks are owned by Boy Scouts of America. Our use is under their guidelines for pack activities.</li>
              <li><strong>User Content</strong>: You retain ownership of your submissions but grant us rights to display and use them in the App.</li>
            </ul>

            <h5>4. Disclaimers and Limitations of Liability</h5>

            <ul>
              <li><strong>No Warranties</strong>: The App is provided "as is" without warranties. We do not guarantee it's error-free, always available, or secure. Use at your own risk.</li>
              <li><strong>Limitation of Liability</strong>: To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from App use, including data loss or event disruptions. Our total liability is limited to $0, as this is a free, volunteer service.</li>
              <li><strong>Indemnification</strong>: You agree to indemnify us against claims arising from your misuse of the App.</li>
            </ul>

            <h5>5. Termination</h5>

            <ul>
              <li>We may suspend or terminate your access at any time for violations of these Terms or other reasons, without notice.</li>
              <li>You can stop using the App anytime. Upon termination, your data may be deleted.</li>
            </ul>

            <h5>6. Governing Law</h5>

            <p>These Terms are governed by the laws of the State of Wisconsin, without regard to conflict of laws principles. Any disputes will be resolved in courts located in Waukesha County, Wisconsin.</p>

            <h5>7. Miscellaneous</h5>

            <ul>
              <li><strong>Entire Agreement</strong>: These Terms, along with our Privacy Policy, constitute the full agreement.</li>
              <li><strong>Severability</strong>: If any provision is invalid, the rest remain in effect.</li>
              <li><strong>No Waiver</strong>: Failure to enforce a term doesn't waive our rights.</li>
              <li><strong>Contact</strong>: For questions, email <a href="mailto:pack77meadowbrook@gmail.com">pack77meadowbrook@gmail.com</a>.</li>
            </ul>

            <p>By using the App, you acknowledge you've read and agree to these Terms. Thank you for participating in our Pack's Derby!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
