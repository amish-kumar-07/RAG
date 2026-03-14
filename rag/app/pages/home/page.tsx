"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatHistory from "@/components/ChatHistory";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/nextjs";


const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [query, setQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileId, setFileId] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [fileInfoId, setFileInfoId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [refreshChatHistory, setRefreshChatHistory] = useState(0);

  const toast = useToast();
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    console.log("Updated fileId:", fileId);
    console.log("Public URL:", publicUrl);
    console.log("Updated fileInfoId:", fileInfoId);
  }, [fileId, publicUrl, fileInfoId]);

  const handleFileUpload = async (selectedFiles: File[]) => {
    if (!isSignedIn) {
      toast.warning("Please sign in to upload files");
      return;
    }

    if (selectedFiles.length > 1) {
      toast.warning("Only one file is supported in the basic plan");
      return;
    }

    if (selectedFiles.length === 0) return;

    const userId = user?.id;
    if (!userId) {
      toast.error("User ID missing. Please sign in again.");
      return;
    }

    setIsUploading(true);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", selectedFiles[0]);
      formData.append("clerkId", userId);

      const response = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Upload failed: ${response.status} - ${errorText}`);
        setFiles([]);
        return;
      }

      const data = await response.json();
      console.log("Upload successful:", data);

      setFileId(data.fileId);
      setFiles(selectedFiles);
      setPublicUrl(data.publicUrl);

      await extractTextFromDocument(
        data.fileId,
        data.publicUrl,
        selectedFiles[0].type
      );

      toast.success("File uploaded successfully!");
    } catch (error) {
      toast.error("Upload failed. Please try again.");
      console.error("Upload error:", error);
      setFiles([]);
    } finally {
      setIsUploading(false);
    }
  };

  const extractTextFromDocument = async (
    documentId: string,
    url: string,
    fileType: string
  ) => {
    try {
      const token = await getToken();

      if (!token) {
        console.error("Authentication token unavailable");
        return;
      }

      toast.info("Extracting text from document...");

      const response = await fetch(`${BASE_URL}/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          file_id: documentId,
          publicUrl: url,
          fileType: fileType,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();
      console.log("Text extraction successful:", data);
      setFileInfoId(data.id);
      toast.success("Document processed successfully!");
    } catch (error: any) {
      console.error("Extraction error:", error);
      toast.error("Failed to extract text from document");
    }
  };

  const generateResponse = async (
    sessionIdentifier: string,
    fileInformationId: string
  ) => {
    try {
      const token = await getToken();
      if (!token) {
        toast.warning("Authentication issue. Please sign in again.");
        return;
      }

      const response = await fetch(`${BASE_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: query,
          session_id: sessionIdentifier,
          fileInformation_id: fileInformationId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();
      console.log("Response generated:", data);
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate response");
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isSignedIn) {
      toast.warning("Please sign in to submit queries");
      return;
    }

    if (files.length === 0) {
      toast.warning("Please upload a file before querying");
      return;
    }

    if (!fileId) {
      toast.warning("File upload incomplete. Please try again.");
      return;
    }

    if (!query.trim()) {
      toast.warning("Please enter a query");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getToken();
      const userId = user?.id;

      if (!userId) {
        toast.warning("User ID unavailable. Please sign in again.");
        return;
      }

      if (!token) {
        toast.warning("Authentication required. Please sign in again.");
        return;
      }

      // Generate session title from filename (max 4 words)
      const rawFileName = files[0].name.replace(/\.[^/.]+$/, "");
      const cleanName = rawFileName.replace(/[_-]+/g, " ");
      const title = cleanName.trim().split(/\s+/).slice(0, 4).join(" ");

      const response = await fetch(`${BASE_URL}/api/create-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clerk_id: userId,
          file_id: fileId,
          file_information_id: fileInfoId,
          title,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();
      const newSessionId = data.session.id;
      setSessionId(newSessionId);

      await generateResponse(newSessionId, fileInfoId);
      setRefreshChatHistory(prev => prev + 1);
      router.push(`/pages/chatpage/${newSessionId}`);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.message || "Failed to create session");
    } finally {
      setIsSubmitting(false);
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
            Your AI-powered knowledge assistant with real-time document
            retrieval and smart insights.
          </p>
        </div>

        {/* Cards Container */}
        <div className="w-full max-w-2xl space-y-6">
          {/* Upload Section */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
            <h3 className="text-2xl font-semibold mb-6 text-slate-200">
              Upload Document
            </h3>
            <div className="space-y-4">
              <Input
                type="file"
                onChange={(e) =>
                  handleFileUpload(Array.from(e.target.files || []))
                }
                disabled={isUploading}
                className="w-full h-12 bg-slate-900/70 text-slate-200 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer hover:file:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {/* Upload Loader */}
              {isUploading && (
                <div className="flex items-center gap-3 text-sm text-blue-400 bg-slate-900/50 rounded-lg px-4 py-3 animate-pulse">
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="font-medium">Uploading your document...</span>
                </div>
              )}

              {/* Success Indicator */}
              {files.length > 0 && !isUploading && (
                <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/50 rounded-lg px-4 py-2">
                  <svg
                    className="w-4 h-4 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{files[0].name} selected</span>
                </div>
              )}
            </div>
          </div>

          {/* Query Section */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
            <h3 className="text-2xl font-semibold mb-6 text-slate-200">
              Ask a Question
            </h3>
            <div className="space-y-4">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What would you like to know?"
                disabled={isSubmitting}
                className="w-full bg-slate-900/70 text-slate-200 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                onClick={handleSubmit}
                disabled={isUploading || isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-indigo-600"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Processing...</span>
                  </div>
                ) : (
                  "Submit Query"
                )}
              </Button>
            </div>
          </div>

          {/* ✅ ADD THIS - Chat History Component */}
          <ChatHistory refreshTrigger={refreshChatHistory} />
        </div>
      </main>
    </div>
  );
}
