import { useState, useEffect } from "react";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import QRCode from "react-qr-code";

function App() {
  const [mode, setMode] = useState("send");
  const [file, setFile] = useState(null);
  const [code, setCode] = useState("");
  const [secretWord, setSecretWord] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerId, setTimerId] = useState(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const scannedCode = urlParams.get("code");
    const scannedSecret = urlParams.get("secret");

    if (scannedCode && scannedSecret) {
      setMode("receive");
      setCode(scannedCode);
      setSecretWord(scannedSecret);
      showInfo("Details auto-filled from QR!");
    }
  }, []);

  const showSuccess = (message) => {
    toast(message, {
      position: "top-center",
      style: {
        background: "#FFFFFF",
        color: "#2563EB",
        border: "1px solid #2563EB",
      },
      icon: false,
      progressStyle: {
        background: "#2563EB", // ✅ BLUE ONLY — NO RAINBOW
      },
    });
  };

  const showError = (message) => {
    toast(message, {
      position: "top-center",
      style: {
        background: "#FFFFFF",
        color: "#EF4444",
        border: "1px solid #EF4444",
      },
      icon: false,
      progressStyle: {
        background: "#EF4444", // ✅ RED ONLY — NO RAINBOW
      },
    });
  };

  const showInfo = (message) => {
    toast(message, {
      position: "top-center",
      style: {
        background: "#FFFFFF",
        color: "#2563EB",
        border: "1px solid #2563EB",
      },
      icon: false,
      progressStyle: {
        background: "#2563EB", // ✅ BLUE ONLY — NO RAINBOW
      },
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const maxSize = 20 * 1024 * 1024;

    if (selectedFile && selectedFile.size > maxSize) {
      showError("File exceeds 20MB limit!");
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !secretWord) {
      showError("File and secret word are required!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("secretWord", secretWord);

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setGeneratedCode(data.code);
        setShowResult(true);
        startTimer(600);
        showSuccess("File uploaded successfully!");
      } else {
        showError(data.error || "Upload failed");
      }
    } catch (err) {
      showError("Server error. Try again!");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!code || !secretWord) {
      showError("Please enter both code and secret word.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, secretWord }),
      });

      const data = await res.json();

      if (res.ok && data.fileUrl) {
        const fileRes = await fetch(data.fileUrl);
        if (!fileRes.ok) {
          showError("Error fetching the file!");
          return;
        }
        const blob = await fileRes.blob();

        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;

        const parts = data.fileUrl.split("/");
        const fileName =
          decodeURIComponent(parts[parts.length - 1]) || "downloaded-file";

        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        a.remove();

        showSuccess("File downloaded!");
      } else {
        showError(data.error || "Invalid details");
      }
    } catch (err) {
      showError("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setSecretWord("");
    setCode("");
    setGeneratedCode("");
    setShowResult(false);
    setTimeLeft(null);
    if (timerId) {
      clearInterval(timerId);
    }
  };

  const startTimer = (seconds) => {
    setTimeLeft(seconds);
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          showError("File expired!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerId(id);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const qrURL = generatedCode
    ? `${
        window.location.origin
      }/?code=${generatedCode}&secret=${encodeURIComponent(secretWord)}`
    : "";

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <ToastContainer transition={Slide} />
      <div className="w-full max-w-lg rounded-2xl shadow-2xl p-8 bg-white/70 backdrop-blur-sm border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-[#2563EB] mb-4 tracking-tight">
            ✨ QuickShare
          </h1>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => {
                setMode("send");
                reset();
              }}
              className={`flex-1 py-3 font-semibold transition ${
                mode === "send"
                  ? "bg-[#2563EB] text-white"
                  : "text-[#111827] hover:bg-[#E5E7EB]"
              }`}
            >
              Send
            </button>
            <button
              onClick={() => {
                setMode("receive");
                reset();
              }}
              className={`flex-1 py-3 font-semibold transition ${
                mode === "receive"
                  ? "bg-[#2563EB] text-white"
                  : "text-[#111827] hover:bg-[#E5E7EB]"
              }`}
            >
              Receive
            </button>
          </div>
        </div>

        {mode === "send" && !showResult && (
          <div className="space-y-6">
            <div>
              <label className="block text-[#111827] font-semibold mb-2">
                Select File
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#111827] bg-white placeholder-gray-400"
              />
              {file && (
                <p className="text-sm text-gray-500 mt-2 truncate">
                  {file.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[#111827] font-semibold mb-2">
                Secret Word
              </label>
              <input
                type="text"
                value={secretWord}
                onChange={(e) => setSecretWord(e.target.value)}
                placeholder="Enter a secret word"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#111827] bg-white placeholder-gray-400"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || !secretWord || loading}
              className="w-full py-3 text-white font-bold rounded-lg bg-[#2563EB] hover:bg-[#1E40AF] transition disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Upload & Generate Code"}
            </button>
          </div>
        )}

        {mode === "send" && showResult && (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-[#111827]">
              ✅ Share This Info
            </h2>
            <div className="flex justify-center gap-4">
              <div className="bg-[#E5E7EB] rounded-lg p-4 min-w-[140px]">
                <p className="text-gray-600 text-xs mb-1">Code</p>
                <p className="text-2xl font-bold text-[#111827] tracking-widest">
                  {generatedCode}
                </p>
              </div>
              <div className="bg-[#E5E7EB] rounded-lg p-4 min-w-[140px]">
                <p className="text-gray-600 text-xs mb-1">Secret</p>
                <p className="text-lg font-semibold text-[#111827] break-words">
                  {secretWord}
                </p>
              </div>
            </div>

            {qrURL && (
              <div className="flex flex-col items-center space-y-4">
                <QRCode
                  value={qrURL}
                  size={160}
                  fgColor="#000000"
                  bgColor="transparent"
                  includeMargin={true}
                />
                {timeLeft !== null && (
                  <>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2563EB] transition-all duration-500"
                        style={{ width: `${(timeLeft / (10 * 60)) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatTime(timeLeft)} left
                    </p>
                  </>
                )}
                <p className="text-xs text-gray-600">
                  Scan to auto-fill details
                </p>
              </div>
            )}

            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Code: ${generatedCode}\nSecret: ${secretWord}\nURL: ${qrURL}`
                );
                showSuccess("Copied to clipboard!");
              }}
              className="w-full py-3 text-white font-bold bg-[#2563EB] hover:bg-[#1E40AF] rounded-lg transition"
            >
              Copy Info
            </button>

            <button
              onClick={reset}
              className="w-full py-3 text-[#111827] font-bold bg-gray-200 hover:bg-gray-300 rounded-lg transition"
            >
              Send More
            </button>
          </div>
        )}

        {mode === "receive" && (
          <div className="space-y-6">
            <div>
              <label className="block text-[#111827] font-semibold mb-2">
                Enter Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                placeholder="6-digit code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-xl text-[#111827] bg-white placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-[#111827] font-semibold mb-2">
                Enter Secret Word
              </label>
              <input
                type="text"
                value={secretWord}
                onChange={(e) => setSecretWord(e.target.value)}
                placeholder="Secret word"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#111827] bg-white placeholder-gray-400"
              />
            </div>
            <button
              onClick={handleDownload}
              disabled={!code || !secretWord || loading}
              className="w-full py-3 text-white font-bold bg-[#2563EB] hover:bg-[#1E40AF] rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Downloading..." : "Download File"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
