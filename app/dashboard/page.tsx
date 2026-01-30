"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  RefreshCw,
  ExternalLink,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  websiteUrl: string;
  publicKey: string;
  pineconeNamespace: string;
  status: "CREATING" | "READY" | "FAILED";
  createdAt: string;
  crawls: Crawl[];
}

interface Crawl {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  pagesCount: number | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [crawling, setCrawling] = useState<string | null>(null);

  // New project form
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectUrl, setNewProjectUrl] = useState("");

  // Chat test
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "bot"; message: string }>
  >([]);

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      } else {
        toast.error("Failed to fetch projects");
      }
    } catch (error) {
      toast.error("Error fetching projects");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Create new project
  const handleCreateProject = async () => {
    if (!newProjectName || !newProjectUrl) {
      toast.error("Please fill in all fields");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          websiteUrl: newProjectUrl,
        }),
      });

      if (res.ok) {
        const newProject = await res.json();
        toast.success("Project created successfully!");
        setProjects([newProject, ...projects]);
        setNewProjectName("");
        setNewProjectUrl("");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create project");
      }
    } catch (error) {
      console.log(error);
      toast.error("Error creating project");
    } finally {
      setCreating(false);
    }
  };

  // Start crawl
  const handleStartCrawl = async (projectId: string) => {
    setCrawling(projectId);
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (res.ok) {
        toast.success("Crawl started! Check back in a few minutes.");
        setTimeout(fetchProjects, 2000);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to start crawl");
      }
    } catch (error) {
      toast.error("Error starting crawl");
    } finally {
      setCrawling(null);
    }
  };

  // Send chat message
  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedProject) return;

    const userMessage = chatMessage;
    setChatMessage("");
    setChatHistory([...chatHistory, { role: "user", message: userMessage }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: selectedProject.publicKey,
          message: userMessage,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setChatHistory((prev) => [
          ...prev,
          { role: "bot", message: data.reply },
        ]);
      } else {
        toast.error(data.error || "Failed to get response");
        setChatHistory((prev) => [
          ...prev,
          { role: "bot", message: "Sorry, I encountered an error." },
        ]);
      }
    } catch (error) {
      toast.error("Error sending message");
      console.log(error);
    } finally {
      setChatLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "READY":
      case "COMPLETED":
        return "bg-green-500";
      case "CREATING":
      case "PENDING":
      case "PROCESSING":
        return "bg-yellow-500";
      case "FAILED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage your AI chatbot projects
            </p>
          </div>
          <Button onClick={fetchProjects} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Create New Project */}
        <Card className="mb-8 border-2 border-purple-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Project
            </CardTitle>
            <CardDescription>
              Add a website to crawl and create an AI chatbot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Project Name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCreateProject()}
              />
              <Input
                placeholder="Website URL (https://example.com)"
                value={newProjectUrl}
                onChange={(e) => setNewProjectUrl(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCreateProject()}
              />
              <Button
                onClick={handleCreateProject}
                disabled={creating}
                className="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {projects.length === 0 ? (
            <Card className="col-span-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500 text-lg">
                  No projects yet. Create your first project above!
                </p>
              </CardContent>
            </Card>
          ) : (
            projects.map((project) => (
              <Card
                key={project.id}
                className="border-2 hover:border-purple-300 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{project.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <ExternalLink className="w-3 h-3" />
                        <a
                          href={project.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {project.websiteUrl}
                        </a>
                      </CardDescription>
                    </div>
                    <Badge
                      className={`${getStatusColor(project.status)} text-white`}
                    >
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Public Key */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Public Key
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={project.publicKey}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(project.publicKey)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Latest Crawl Info */}
                  {project.crawls?.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Latest Crawl
                        </span>
                        <Badge
                          variant="outline"
                          className={getStatusColor(project.crawls[0].status)}
                        >
                          {project.crawls[0].status}
                        </Badge>
                      </div>
                      {project.crawls[0].pagesCount && (
                        <p className="text-sm text-gray-600">
                          Pages: {project.crawls[0].pagesCount}
                        </p>
                      )}
                      {project.crawls[0].error && (
                        <p className="text-sm text-red-600 mt-1">
                          {project.crawls[0].error}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleStartCrawl(project.id)}
                      disabled={crawling === project.id}
                      className="flex-1"
                      variant={
                        project.status === "READY" ? "outline" : "default"
                      }
                    >
                      {crawling === project.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {!project.crawls?.length ? "Start Crawl" : "Re-crawl"}
                        </>
                      )}
                    </Button>
                    {project.status === "READY" && (
                      <Button
                        onClick={() => {
                          setSelectedProject(project);
                          setChatHistory([]);
                        }}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
                      >
                        Test Chatbot
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Chat Test Modal */}
        {selectedProject && (
          <Card className="fixed inset-4 md:inset-auto md:right-8 md:bottom-8 md:w-[500px] md:h-[600px] shadow-2xl border-2 border-purple-300 z-50 flex flex-col">
            <CardHeader className="bg-linear-to-r from-purple-600 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Test Chatbot</CardTitle>
                  <CardDescription className="text-purple-100">
                    {selectedProject.name}
                  </CardDescription>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setSelectedProject(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {chatHistory.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    <p>Start a conversation!</p>
                  </div>
                )}
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-linear-to-r from-purple-600 to-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={chatLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={chatLoading || !chatMessage.trim()}
                  className="bg-linear-to-r from-purple-600 to-blue-600"
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
