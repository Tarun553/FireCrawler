import { useEffect, useState } from "react";
import Vapi from "@vapi-ai/web";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";

// Initialize Vapi outside component to avoid re-creation
// REPLACE WITH YOUR PUBLIC KEY
const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "");

export function VapiAssistant() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Event listeners
    vapi.on("call-start", () => {
      setIsSessionActive(true);
      setIsLoading(false);
    });

    vapi.on("call-end", () => setIsSessionActive(false));

    // Optional: Handle errors
    vapi.on("error", (e) => {
      console.error(e);
      setIsLoading(false);
      setIsSessionActive(false);
    });

    return () => {
      // vapi.removeAllListeners(); // Be careful removing global listeners if used elsewhere
    };
  }, []);

  const toggleCall = async () => {
    if (isSessionActive) {
      vapi.stop();
    } else {
      setIsLoading(true);
      // Start call with your Assistant ID
      // You can also pass system messages or variable overrides here
      try {
        await vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "");
      } catch (e) {
        console.error("Failed to start call", e);
        setIsLoading(false);
      }
    }
  };

  return (
    <Button
      onClick={toggleCall}
      variant={isSessionActive ? "destructive" : "default"}
      className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-xl z-50 flex items-center justify-center transition-all hover:scale-110"
    >
      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : isSessionActive ? (
        <MicOff className="w-6 h-6" />
      ) : (
        <Mic className="w-6 h-6" />
      )}
    </Button>
  );
}
