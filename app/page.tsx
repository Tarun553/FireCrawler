import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Sparkles, Zap, Shield, Globe } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = await auth();
  
  // Redirect to dashboard if already signed in
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full mb-6">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">AI-Powered Customer Support</span>
        </div>
        
        <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-linear-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
          Turn Your Website Into
          <br />
          An AI Chatbot
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Automatically crawl your website, create a knowledge base, and deploy an AI chatbot that answers customer questions instantly.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link href="/sign-up">
            <Button size="lg" className="bg-linear-to-r from-purple-600 to-blue-600 text-lg px-8">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link href="/widget-demo">
            <Button size="lg" variant="outline" className="text-lg px-8">
              View Demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-2 hover:border-purple-300 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>1. Crawl Your Website</CardTitle>
              <CardDescription>
                Enter your website URL and our crawler automatically extracts all the content and information.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>2. AI Training</CardTitle>
              <CardDescription>
                Your content is processed and stored in a vector database, ready to answer questions with AI.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-pink-300 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-pink-600" />
              </div>
              <CardTitle>3. Deploy Widget</CardTitle>
              <CardDescription>
                Copy one line of code to add the chatbot to your website. It&apos;s that simple!
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-linear-to-r from-purple-600 to-blue-600 text-white border-0">
          <CardContent className="p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6">Why Choose Firecrawl AI?</h2>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Shield className="w-6 h-6 shrink-0 mt-1" />
                    <div>
                      <strong className="block">Secure & Private</strong>
                      <span className="text-purple-100">Your data is encrypted and stored securely</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Zap className="w-6 h-6 shrink-0 mt-1" />
                    <div>
                      <strong className="block">Lightning Fast</strong>
                      <span className="text-purple-100">Instant responses powered by AI</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 shrink-0 mt-1" />
                    <div>
                      <strong className="block">Easy Integration</strong>
                      <span className="text-purple-100">One line of code to add to your site</span>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                <h3 className="text-2xl font-bold mb-4">Ready to get started?</h3>
                <p className="text-purple-100 mb-6">
                  Create your first AI chatbot in minutes. No credit card required.
                </p>
                <Link href="/sign-up">
                  <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 w-full">
                    Start Building Now
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>Built with ❤️ using Next.js, Firecrawl, Pinecone, and Google Gemini</p>
      </footer>
    </div>
  );
}
