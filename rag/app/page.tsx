"use client";

import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "@/components/ui/toast";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

export default function LandingPage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const toast = useToast();


  const handleSubmit = async () => {
    try {
      if (!user) {
        toast.error("User not loaded yet");
        return;
      }

      const clerk_id = user.id; // ✅ always a string
      const name = user.fullName || "Unnamed"; // ✅ fallback safety
      const email = user.primaryEmailAddress?.emailAddress; // ✅ correct email string

      if (!email) {
        toast.error("No email found for user");
        return;
      }

      const response = await fetch(`${BASE_URL}"/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // ✅ REQUIRED
        },
        body: JSON.stringify({  // ✅ MUST be JSON, not querystring
          clerk_id,
          name,
          email,
        }),
      });

      const data = await response.json();
      console.log("Register response:", data);
      router.push("/pages/home");
    } catch (err) {
      toast.error("Something wrong with the user");
      console.error("Fetch error:", err);
    }
  };


  return (
    <div className="min-h-screen flex flex-col">
      {/* ===== Clerk Header ===== */}
      <header className="flex justify-end items-center p-4 gap-4 h-16 bg-white shadow-md">
        <SignedOut>
          <div className="flex gap-4">
            <SignInButton mode="modal">
              <button className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">
                Sign Up
              </button>
            </SignUpButton>
          </div>
        </SignedOut>

        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </header>

      {/* ===== Landing Page Content ===== */}
      <main className="flex flex-col items-center justify-center flex-1 bg-gradient-to-b from-white to-gray-100 text-center px-6">
        <h1 className="text-4xl sm:text-6xl font-bold mb-6">Welcome to RAG Assistant 🤖</h1>
        <p className="text-lg sm:text-xl mb-8 max-w-2xl">
          Your AI-powered knowledge assistant with real-time document retrieval and smart insights.
        </p>

        <SignedOut>
          <div className="flex gap-4">
            <SignUpButton>
              <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700">
                Get Started
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-xl font-medium hover:bg-indigo-50">
                Sign In
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="flex flex-col gap-4 items-center">
            <button
              onClick={handleSubmit}
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700"
            >
              Go to RAG Workspace
            </button>
          </div>
        </SignedIn>
      </main>
    </div>
  );
}
