"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/nextjs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [query, setQuery] = useState("");
  const toast = useToast();
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();


  const handleFileUpload = async (files: File[]) => {
    if (!isSignedIn) {
      toast.warning("Please sign in first");
      return;
    }

    if (files.length > 1) {
      toast.warning("Only one file is supported in the basic plan");
      return;
    }

    if (files.length === 0) return;
    const userId = user?.id;
    if (!userId) {
      toast.error("User id missing. Please sign in again.");
      return;
    }
    const token = await getToken(); // ✅ CLERK JWT

    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("clerkId", userId); 
    try {
      const response = await fetch(BASE_URL + "/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // ✅ JWT SENT
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Error: ${response.status} - ${errorText}`);
        setFiles([]);
        return;
      }

      const data = await response.json();
      console.log("Upload success:", data);
      toast.success("File uploaded successfully!");
      //console.log("File path used:", response?.path);

      setFiles(files);
    } catch (err) {
      toast.error("Upload failed");
      console.error("Fetch error:", err);
      setFiles([]);
    }
  };


  const handleSubmit = async () => {
    if (!isSignedIn) {
      toast.warning("Please sign in first");
      return;
    }

    if (files.length === 0) {
      toast.warning("Please upload a file before querying!");
      return;
    }

    if (!query.trim()) {
      toast.warning("Please enter a query!");
      return;
    }

    try {
      const token = await getToken();
      const id = user?.id;

      if (!id) {
        toast.warning("User Id is not available");
        return;
      }
      if (!token) {
        toast.warning("Please relogin! No token");
        return;
      }

      // ============================
      // NEW TITLE LOGIC (4 words max)
      // ============================

      const rawFileName = files[0].name.replace(/\.[^/.]+$/, "");
      const cleanName = rawFileName.replace(/[_-]+/g, " ");
      const title = cleanName.trim().split(/\s+/).slice(0, 4).join(" ");

      const response = await fetch(BASE_URL + "/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clerk_id: id,
          title,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      const data = await response.json();

      router.push(`/pages/chatpage/${data.session.id}`);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create session");
    }
  };



  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-slate-900/90 backdrop-blur-lg shadow-xl border-b border-slate-800/50 sticky top-0 z-50">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          RAG App
        </h1>
        <div>
          <SignedOut>
            <div className="flex gap-3">
              <SignInButton mode="modal">
                <button className="px-5 py-2 border border-indigo-500/50 text-indigo-400 rounded-lg hover:bg-indigo-500/10 hover:border-indigo-400 transition-all duration-200">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-500 hover:to-indigo-600 transition-all duration-200 shadow-lg shadow-indigo-500/30">
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-1 px-6 py-16 space-y-12">
        {/* Heading */}
        <div className="text-center space-y-4">
          <h2 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Welcome to RAG App
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Your AI-powered knowledge assistant with real-time document retrieval and smart insights.
          </p>
        </div>

        {/* Cards Container */}
        <div className="w-full max-w-2xl space-y-6">
          {/* Upload Section */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
            <h3 className="text-2xl font-semibold mb-6 text-slate-200">Upload Document</h3>
            <div className="space-y-4">
              <Input
                type="file"
                onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
                className="w-full h-12 bg-slate-900/70 text-slate-200 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer hover:file:bg-indigo-500"
              />
              {files.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/50 rounded-lg px-4 py-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{files[0].name} selected</span>
                </div>
              )}
            </div>
          </div>

          {/* Query Section */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
            <h3 className="text-2xl font-semibold mb-6 text-slate-200">Ask a Question</h3>
            <div className="space-y-4">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What would you like to know?"
                className="w-full bg-slate-900/70 text-slate-200 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-500"
              />
              <Button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
              >
                Submit Query
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}