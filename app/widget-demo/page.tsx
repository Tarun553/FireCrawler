"use client";

import { useState } from "react";

export default function WidgetDemoPage() {
  const [publicKey, setPublicKey] = useState("pk_YOUR_PUBLIC_KEY_HERE");

  const embedCode = `<!-- Add this script to your website -->
<script 
  src="${typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/chatbot-widget.js" 
  data-public-key="${publicKey}"
></script>`;
  const analyticsEmbedCode = `<!-- Optional: Real-time analytics tracking -->
<script
  src="${typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/analytics.js"
  data-public-key="${publicKey}"
></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    alert("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Chatbot Widget Integration
          </h1>
          <p className="text-gray-600 mb-8">
            Embed our AI chatbot on your website in seconds
          </p>

          <div className="space-y-8">
            {/* Step 1 */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Step 1: Get Your Public Key
              </h2>
              <p className="text-gray-600 mb-4">
                After creating a project and completing a crawl, you'll receive a
                public key. Enter it below:
              </p>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="pk_xxx..."
              />
            </div>

            {/* Step 2 */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Step 2: Copy the Embed Code
              </h2>
              <p className="text-gray-600 mb-4">
                Add this script tag anywhere in your HTML, preferably before the
                closing &lt;/body&gt; tag:
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <code>{embedCode}</code>
                </pre>
                <button
                  onClick={copyToClipboard}
                  className="absolute top-4 right-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Copy Code
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Step 3: Enable Real-time Analytics (Optional)
              </h2>
              <p className="text-gray-600 mb-4">
                To track visitors, clicks, sessions, and AI insights, add the
                analytics script just before the closing &lt;/body&gt; tag:
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <code>{analyticsEmbedCode}</code>
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(analyticsEmbedCode)}
                  className="absolute top-4 right-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Copy Code
                </button>
              </div>
            </div>

            {/* Step 4 */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Step 4: That's It!
              </h2>
              <p className="text-gray-600 mb-4">
                The chatbot widget will automatically appear on your website. Users
                can click the floating button in the bottom-right corner to start
                chatting.
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
                <p className="text-purple-900 font-medium">
                  💡 Pro Tip: The chatbot will only work after your website has
                  been crawled and the project status is "READY".
                </p>
                <p className="text-purple-900">
                  🌐 The widget works on any domain! The script automatically detects
                  the API server from the script source URL.
                </p>
              </div>
            </div>

            {/* Features */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Features
              </h2>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">✓</span>
                  <span>
                    <strong>No dependencies:</strong> Pure JavaScript, works with
                    any website
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">✓</span>
                  <span>
                    <strong>Mobile responsive:</strong> Adapts to all screen sizes
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">✓</span>
                  <span>
                    <strong>AI-powered:</strong> Uses your website content to
                    answer questions
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">✓</span>
                  <span>
                    <strong>Easy to customize:</strong> Modify the widget's
                    appearance by editing the CSS
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">✓</span>
                  <span>
                    <strong>Real-time analytics:</strong> Track visitors, clicks,
                    sessions, and AI insights
                  </span>
                </li>
              </ul>
            </div>

            {/* API Endpoints */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                API Endpoints
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                      POST
                    </span>
                    <code className="text-sm">/api/projects</code>
                  </div>
                  <p className="text-sm text-gray-600">
                    Create a new project with a website URL
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                      POST
                    </span>
                    <code className="text-sm">/api/crawl</code>
                  </div>
                  <p className="text-sm text-gray-600">
                    Start crawling a project's website
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                      GET
                    </span>
                    <code className="text-sm">/api/crawl/[crawlId]</code>
                  </div>
                  <p className="text-sm text-gray-600">
                    Check the status of a crawl job
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                      POST
                    </span>
                    <code className="text-sm">/api/chat</code>
                  </div>
                  <p className="text-sm text-gray-600">
                    Send messages to the chatbot (used by widget)
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                      POST
                    </span>
                    <code className="text-sm">/api/analytics/collect</code>
                  </div>
                  <p className="text-sm text-gray-600">
                    Collect real-time analytics events from the tracking script
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
