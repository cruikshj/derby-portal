import { FileText, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Rules() {
  return (
    <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">
            Derby Rules & Guidelines
          </h1>
          <p className="text-muted-foreground">
            Everything you need to know about participating
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Rules Coming Soon</CardTitle>
            <CardDescription>
              The official Pinewood Derby rules and guidelines will be posted here.
            </CardDescription>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-0">
                Event organizers will add the official rules here. Check back soon for updates!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
