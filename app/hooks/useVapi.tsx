import { useState, useCallback, useEffect, useRef } from "react";
import Vapi from "@vapi-ai/web";

interface VapiConfig {
  publicKey: string;
  assistantId: string;
  baseUrl?: string;
}

interface VapiState {
  isSessionActive: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useVapi = (config: VapiConfig) => {
  const vapiRef = useRef<Vapi | null>(null);
  const [state, setState] = useState<VapiState>({
    isSessionActive: false,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const vapiInstance = new Vapi(config.publicKey, config.baseUrl);
    vapiRef.current = vapiInstance;

    const handleCallStart = () => {
      setState((prev) => ({
        ...prev,
        isSessionActive: true,
        isLoading: false,
      }));
    };

    const handleCallEnd = () => {
      setState((prev) => ({
        ...prev,
        isSessionActive: false,
        isLoading: false,
      }));
    };

    const handleError = (error: Error | { message: string } | unknown) => {
      let message = "An unknown error occurred";
      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error === "object" && "message" in error) {
        message = String((error as { message: unknown }).message);
      } else if (error) {
        message = String(error);
      }
      setState((prev) => ({ ...prev, error: message, isLoading: false }));
    };

    vapiInstance.on("call-start", handleCallStart);
    vapiInstance.on("call-end", handleCallEnd);
    vapiInstance.on("error", handleError);

    return () => {
      vapiInstance.off("call-start", handleCallStart);
      vapiInstance.off("call-end", handleCallEnd);
      vapiInstance.off("error", handleError);

      // Stop/destroy the Vapi instance to clean up connections
      vapiInstance.stop().catch((err) => {
        console.warn("Error during Vapi instance teardown:", err);
      });
      vapiRef.current = null;
    };
  }, [config.publicKey, config.baseUrl]);

  const startCall = useCallback(async () => {
    if (!vapiRef.current) {
      const errorMsg = "Vapi not initialized";
      console.warn(errorMsg);
      setState((prev) => ({ ...prev, error: errorMsg, isLoading: false }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await vapiRef.current.start(config.assistantId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setState((prev) => ({ ...prev, error: message, isLoading: false }));
    }
  }, [config.assistantId]);

  const endCall = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  return {
    startCall,
    endCall,
    ...state,
  };
};
