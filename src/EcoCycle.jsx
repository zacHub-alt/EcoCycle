import React, { useState, useRef, useEffect, useCallback } from "react";
import { collection, addDoc, doc, setDoc, serverTimestamp, getDoc, updateDoc, increment } from "firebase/firestore";
import { db, auth } from "./firebase";
// Map is shown in MainApp; remove local import to avoid duplicate map
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import { useNavigate } from "react-router-dom";
import "@tensorflow/tfjs-backend-cpu";
import HowToRecycle from "./pages/HowToRecycle";
import { FaRecycle, FaCoins, FaMapMarkedAlt, FaCamera, FaStop } from "react-icons/fa";

const EcoCycle = () => {
  // Core States
  const [points, setPoints] = useState(0);
  const [cash, setCash] = useState(0);
  const [wallet, setWallet] = useState(0);
  const navigate = useNavigate();

  // Camera and Scanning States
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState(null);
  const [liveCount, setLiveCount] = useState({});
  const [detectedMaterial, setDetectedMaterial] = useState(null);
  const [detectedPricePerKg, setDetectedPricePerKg] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [activeMode, setActiveMode] = useState("live"); // 'live' or 'static'

  // UI States
  const [toast, setToast] = useState(null);
  const [speechLang, setSpeechLang] = useState("en-US");
  const [showModal, setShowModal] = useState(false);
  const [animateModal, setAnimateModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraAnimated, setCameraAnimated] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("environment"); // 'user' or 'environment'

  // Dump Report States
  const [dumpReportLoading, setDumpReportLoading] = useState(false);
  const [dumpReportSuccess, setDumpReportSuccess] = useState("");
  const [dumpLocation, setDumpLocation] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const liveModelRef = useRef(null);
  const mapRef = useRef(null);
  const cameraInitTimeoutRef = useRef(null);

  // --- Cooldown maps (keep only one declaration) ---
  const lastSpokenMap = useRef({}); // track speech cooldowns
  const lastWalletUpdate = useRef({}); // track wallet update cooldowns


  // --- Load Live Detection Model ---
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        liveModelRef.current = await cocoSsd.load();
        // don't auto-start camera here; user opens camera manually
      } catch (err) {
        setError("Failed to load detection model: " + err.message);
      }
    };
    loadModel();
  }, []);



const getCurrentLang = () => {
  return document.documentElement.lang || "en";
};

const speak = (text, materialType) => {
  const now = Date.now();
  const cooldown = 5000; // 5s per material

  if (lastSpokenMap.current[materialType] && now - lastSpokenMap.current[materialType] < cooldown) {
    return; // 🛑 skip if spoken recently
  }
  lastSpokenMap.current[materialType] = now;

  const utterance = new SpeechSynthesisUtterance(text);

  // Pick language from page
  const currentLang = getCurrentLang();

  // Map supported languages
  const langMap = {
    en: "en-US",
    yo: "yo-NG",
    ha: "ha-NG",
    ig: "ig-NG"
  };

  utterance.lang = langMap[currentLang] || "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;

  // Try to use matching voice if available
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(v => v.lang.startsWith(utterance.lang));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  window.speechSynthesis.speak(utterance);
};


// --- Determine if a label is recyclable and assign a type ---
const getRecyclableType = (label) => {
  const cls = label.toLowerCase();
  if (["bottle", "cup", "plastic", "can"].some((r) => cls.includes(r))) return "Plastic";
  if (["paper", "book", "newspaper", "cardboard"].some((r) => cls.includes(r))) return "Paper";
  if (["metal"].some((r) => cls.includes(r))) return "Metal";
  if (["glass", "wine"].some((r) => cls.includes(r))) return "Glass";
  return null; // null means non-recyclable
};

// --- Update Wallet Dynamically ---
// label: detected/classified label
// pricePerKgOverride: optional value from server/classifier
// weightOverride: optional weight (kg)
const updateWalletFromDetection = async (label, pricePerKgOverride = null, weightOverride = 1) => {
  const materialType = getRecyclableType(label);
  if (!materialType) {
    setToast("⚠️ Non-recyclable item detected, no reward.");
    setTimeout(() => setToast(null), 3000);
    return;
  }

  const pricePerKgMap = {
    Plastic: 50,
    Paper: 30,
    Metal: 100,
    Glass: 70,
  };

  const weight = weightOverride || 1; // kg
  const pricePerKg = pricePerKgOverride ?? (pricePerKgMap[materialType] || 0);

  // Update local UI state (points & cash)
  setPoints((prev) => prev + 10 * weight);
  setCash((prev) => prev + pricePerKg * weight);

  const notifyText = `+₦${pricePerKg * weight} & +${10 * weight} points (${materialType})`;
  setToast(notifyText);
  setTimeout(() => setToast(null), 3000);

  // persist to the authenticated user's document if available (so MainApp realtime listener updates)
  try {
    console.debug('[EcoCycle] updateWalletFromDetection', { materialType, weight, pricePerKg });
    if (auth?.currentUser?.uid) {
      const uid = auth.currentUser.uid;
      const userRef = doc(db, "users", uid);
      try {
        // Atomically increment wallet and points so concurrent detections are handled safely
        await updateDoc(userRef, {
          wallet: increment(pricePerKg * weight),
          points: increment(10 * weight),
          lastActive: serverTimestamp(),
        });
      } catch (err) {
        // If the user document doesn't exist yet, create it with initial values
        console.debug('[EcoCycle] user doc update failed, creating doc', err);
        await setDoc(userRef, {
          wallet: pricePerKg * weight,
          points: 10 * weight,
          lastActive: serverTimestamp(),
        }, { merge: true });
      }
    } else {
      // no logged-in user — fallback to adding a report document
      await addDoc(collection(db, "users"), {
        name: "Anonymous",
        type: materialType,
        weight,
        timestamp: new Date(),
        pricePerKg: pricePerKg,
      });
    }
  } catch (error) {
    console.error("Database error while updating wallet:", error);
    setError("Failed to update wallet. Try again.");
  }
};



// Start camera with optional deviceId or facingMode
const startCamera = async ({ deviceId = null, facingMode = null } = {}) => {
  setCameraLoading(true);
  setError("");
  try {
    const constraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: facingMode || cameraFacing },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (videoRef.current) {
      videoRef.current.srcObject = stream;

      // clear any previous timeout before setting a new one
      if (cameraInitTimeoutRef.current) {
        clearTimeout(cameraInitTimeoutRef.current);
        cameraInitTimeoutRef.current = null;
      }

      // start a timeout that will stop the camera only if it truly isn't starting
      cameraInitTimeoutRef.current = setTimeout(() => {
        // If video element still hasn't reported canplay, treat as failure
        if (!videoRef.current || videoRef.current.readyState === 0) {
          setCameraLoading(false);
          setError("⚠️ Camera not starting. Please check permissions and try again.");
          stopCamera();
        }
        cameraInitTimeoutRef.current = null;
      }, 10000);

      videoRef.current.oncanplay = () => {
        // camera is ready — clear the init timeout and proceed
        if (cameraInitTimeoutRef.current) {
          clearTimeout(cameraInitTimeoutRef.current);
          cameraInitTimeoutRef.current = null;
        }
        videoRef.current.play().catch(() => {});
        setCameraLoading(false);
        detectFrame();
      };
    }
  } catch (err) {
    setCameraLoading(false);
    setError("Cannot access camera: " + err.message);
    setShowCamera(false);
    setCameraAnimated(false);
  }
};

const stopCamera = () => {
  // clear any pending init timeout
  if (cameraInitTimeoutRef.current) {
    clearTimeout(cameraInitTimeoutRef.current);
    cameraInitTimeoutRef.current = null;
  }

  if (videoRef.current?.srcObject) {
    const tracks = videoRef.current.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    videoRef.current.srcObject = null;
  }
  setLiveCount({});
  setCameraLoading(true);
};


const COOLDOWN_MS = 5000; // 5 seconds cooldown per material

// --- Live Detection Loop (Direct Model Labels) ---
const detectFrame = async () => {
  if (!liveModelRef.current || !videoRef.current) return;

  const video = videoRef.current;

  if (video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
    requestAnimationFrame(detectFrame);
    return;
  }

  if (canvasRef.current.width !== video.videoWidth) {
    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;
  }

  const predictions = await liveModelRef.current.detect(video);
  const counts = {};
  const detectedThisFrame = {};
  const now = Date.now();

  predictions.forEach((pred) => {
    const rawLabel = pred.class; // raw model label
    const labelLower = rawLabel.toLowerCase();

    // Check if it's a recyclable type
    const isRecyclable = ["bottle","can","cup","plastic","metal","glass","paper","cardboard"].some(r => labelLower.includes(r));
    const displayLabel = isRecyclable ? rawLabel : "Non-recyclable";

    counts[displayLabel] = (counts[displayLabel] || 0) + 1;

    if (!detectedThisFrame[displayLabel]) {
      detectedThisFrame[displayLabel] = true;

      // 🔊 Speak only if cooldown passed
      if (!lastSpokenMap.current[displayLabel] || now - lastSpokenMap.current[displayLabel] > COOLDOWN_MS) {
        speak(`${displayLabel} detected`, displayLabel);
        lastSpokenMap.current[displayLabel] = now;
      }

      // 💰 Optional: reward only if recyclable
      if (isRecyclable && (!lastWalletUpdate.current[rawLabel] || now - lastWalletUpdate.current[rawLabel] > COOLDOWN_MS)) {
        updateWalletFromDetection(rawLabel);
        lastWalletUpdate.current[rawLabel] = now;
      }
    }
  });

  setLiveCount(counts);

  const ctx = canvasRef.current.getContext("2d");
  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  ctx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);

  predictions.forEach((pred) => {
    const rawLabel = pred.class;
    const labelLower = rawLabel.toLowerCase();
    const isRecyclable = ["bottle","can","cup","plastic","metal","glass","paper","cardboard"].some(r => labelLower.includes(r));
    const displayLabel = isRecyclable ? rawLabel : "Non-recyclable";

    let color = "#FFD700"; // default
    if (["bottle","cup","plastic"].some(r => labelLower.includes(r))) color = "#1E90FF";
    else if (["paper","book","newspaper","cardboard"].some(r => labelLower.includes(r))) color = "#32CD32";
    else if (["can","metal"].some(r => labelLower.includes(r))) color = "#C0C0C0";
    else if (["glass","wine"].some(r => labelLower.includes(r))) color = "#00CED1";
    else color = "#FF4500"; // non-recyclable

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(pred.bbox[0], pred.bbox[1], pred.bbox[2], pred.bbox[3]);
    ctx.fillStyle = color;
    ctx.font = "16px Arial";
    ctx.fillText(displayLabel, pred.bbox[0], pred.bbox[1] - 5);
  });

  requestAnimationFrame(detectFrame);
};


  // --- Classify Waste ---
  const classifyWaste = async () => {
    if (!image) {
      setError("Please upload an image!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", image);
      const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || "http://127.0.0.1:8000";

<<<<<<< HEAD
const response = await fetch(`${API_BASE_URL}/classify`, {
  method: "POST",
  body: formData,
});
=======
      const url = `${API_BASE_URL}/classify`;
      console.debug("[EcoCycle] classifyWaste ->", url);
      // Debug: list formData keys (won't print file content)
      for (const key of formData.keys()) console.debug("[EcoCycle] formData key:", key);

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });
>>>>>>> restored-wip

      if (!response.ok) {
        // Try to read text for better debugging
        let text = "";
        try {
          text = await response.text();
        } catch (e) {
          text = `<failed to read response body: ${e.message}>`;
        }
        console.error("[EcoCycle] classify failed:", response.status, text);
        // try parse json to extract error field
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || "Failed to classify image");
        } catch (_) {
          throw new Error(`Failed to classify image (status ${response.status}): ${text}`);
        }
      }

      const data = await response.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      const { class: materialClass, confidence, recyclable, price_per_kg } = data;
      const confidencePercent = confidence ? (confidence * 100).toFixed(1) : 0;

      if (!recyclable || materialClass === "Non-recyclable") {
        setScanResult("Non-recyclable item detected");
        setDetectedMaterial(null);
        setDetectedPricePerKg(null);
      } else {
        const display = `${materialClass}: ₦${price_per_kg}/kg (Confidence: ${confidencePercent}%)`;
        setScanResult(display);
        // store detected values but DO NOT auto-prompt or auto-apply reward for static scans
        setDetectedMaterial(materialClass);
        setDetectedPricePerKg(price_per_kg);
      }
    } catch (err) {
      console.error("[EcoCycle] Classification error:", err);
      setError(`Failed to classify image: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Update Wallet ---
  const updateWallet = async () => {
    if (!scanResult || scanResult.includes("Non-recyclable")) {
      setError("Scan a recyclable item first!");
      return;
    }

    // Prefer stored detected metadata (from classify) instead of parsing scanResult
    const materialType = detectedMaterial || scanResult.split(":")[0];
    const pricePerKg = detectedPricePerKg || (() => {
      const priceMatch = scanResult.match(/₦(\d+)\/kg/);
      return priceMatch ? parseInt(priceMatch[1]) : 0;
    })();

    const weight = parseFloat(prompt("Enter weight in kg:")) || 1;

    // update local UI immediately
    setPoints((prev) => prev + 10 * weight);
    setCash((prev) => prev + pricePerKg * weight);

    try {
      if (auth?.currentUser?.uid) {
        const uid = auth.currentUser.uid;
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
          wallet: increment(pricePerKg * weight),
          points: increment(10 * weight),
          lastActive: serverTimestamp(),
        });
        setScanResult("");
        setDetectedMaterial(null);
        setDetectedPricePerKg(null);
      } else {
        // fallback: create an anonymous record
        await addDoc(collection(db, "users"), {
          name: "User",
          type: materialType,
          weight,
          points: 10 * weight,
          cash: pricePerKg * weight,
          pricePerKg,
          timestamp: new Date(),
        });
        setScanResult("");
        setDetectedMaterial(null);
        setDetectedPricePerKg(null);
      }
    } catch (error) {
      console.error("Database error:", error);
      setError("Failed to update wallet. Try again.");
    }
  };

  // --- Scroll to Map ---
  const goToDropoff = () => {
    if (mapRef.current) {
      mapRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // --- Report Dump Site ---
  const reportDumpSite = async (e) => {
    e.preventDefault();
    setDumpReportLoading(true);
    setDumpReportSuccess("");
    const file = e.target.dumpImage.files[0];
    const description = e.target.description.value;

    if (!file || !description) {
      setError("Image and description required");
      setDumpReportLoading(false);
      return;
    }

  navigator.geolocation.getCurrentPosition(
  async (pos) => {
    try {
      const { latitude, longitude } = pos.coords;
      const file = e.target.dumpImage.files[0];
      const fakeURL = URL.createObjectURL(file);
      const wasteType = e.target.wasteType.value || "Unknown"; // new line

      await addDoc(collection(db, "dump_sites"), {
        description: e.target.description.value,
        wasteType, // save it
        imageURL: fakeURL,
        lat: latitude,
        lng: longitude,
        timestamp: new Date(),
      });
      setDumpReportSuccess("Dump site reported successfully!");
      setDumpReportLoading(false);
      setShowModal(true); 
      setTimeout(() => setAnimateModal(true), 50); 
    } catch {
      setError("Failed to report dump site");
      setDumpReportLoading(false);
    }
  },
  () => {
    setError("Location access denied");
    setDumpReportLoading(false);
  }
);
  };

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-gray-900 to-gray-800 text-white text-center">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
        {/* Hero Section */}
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold text-green-400">Scan & Earn</h2>

          {/* --- MODAL --- */}
          {showModal && (
            <div className={`fixed inset-0 bg-black flex items-center justify-center z-50
                         transition-opacity duration-300 ${animateModal ? "bg-opacity-50" : "bg-opacity-0"}`}>
              <div className={`bg-gray-800 text-white p-6 rounded-xl shadow-lg max-w-md mx-auto text-center space-y-4
                           transform transition-all duration-300
                           ${animateModal ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
                <h2 className="text-2xl font-bold text-green-400">
                  Turn Waste into Wealth
                </h2>
                <p className="text-gray-300">Did you know that common dump sites can be transformed into sources of income and community value? Small actions add up — here are a few ways:</p>

                <ul className="text-left list-disc list-inside text-sm text-gray-300 space-y-2 px-4">
                  <li>Collect and sort recyclables to sell to local aggregators.</li>
                  <li>Upcycle materials into crafts or practical items for sale.</li>
                  <li>Organize community drop-offs or connect with recycling centers.</li>
                </ul>

                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={() => {
                      setAnimateModal(false);
                      setTimeout(() => {
                        setShowModal(false);
                        navigate("/how-to-recycle");
                      }, 300);
                    }}
                    className="bg-primary px-5 py-2 rounded-lg hover:bg-accent transition font-medium"
                  >
                    Show me how
                  </button>
                  <button
                    onClick={() => {
                      setAnimateModal(false);
                      setTimeout(() => setShowModal(false), 300);
                    }}
                    className="bg-gray-600 px-4 py-2 rounded-lg hover:bg-gray-700 transition text-sm"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Static Image Upload */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-xl font-bold text-green-500">Scan Waste Item</h2>
          {image && (
            <img
              src={URL.createObjectURL(image)}
              alt="preview"
              className="w-40 h-40 object-cover rounded-lg mx-auto shadow-md"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            className="w-full p-2 rounded-lg bg-gray-700 text-white"
          />
          <button
            onClick={classifyWaste}
            disabled={loading}
            className="bg-primary w-full py-2 rounded-lg hover:bg-accent transition"
          >
            {loading ? "Scanning..." : "Scan Waste"}
          </button>
          {scanResult && (
            <div className="space-y-2">
              <p className="mt-2 text-green-400 font-semibold">{scanResult}</p>
              {!scanResult.includes("Non-recyclable") && (
                <>
                  <button
                    onClick={updateWallet}
                    className="bg-primary/90 w-full py-2 rounded-lg hover:bg-accent transition"
                  >
                    Update Wallet
                  </button>
                  <button
                    onClick={goToDropoff}
                    className="bg-blue-500 w-full py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Go to Drop-Off Site
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Language Selector */}
<div className="bg-gray-800 p-4 rounded-xl shadow-lg space-y-2">
  <h2 className="text-xl font-bold text-green-500">Speech Language</h2>
  <select
    value={speechLang}
    onChange={(e) => setSpeechLang(e.target.value)}
    className="w-full p-2 rounded-lg bg-gray-700 text-white"
  >
    <option value="en-US">English</option>
    <option value="yo-NG">Yoruba</option>
    <option value="ha-NG">Hausa</option>
    <option value="ig-NG">Igbo</option>
  </select>
</div>


        {/* Live Detection */}
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 p-6 rounded-2xl shadow-lg backdrop-blur relative overflow-hidden border border-gray-700/50">
          <h2 className="text-2xl font-bold text-green-400 mb-4 flex items-center justify-between">
            <span>Live Detection</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!showCamera) {
                    setShowCamera(true);
                    // start camera with current facing preference
                    startCamera({ facingMode: cameraFacing });
                    setTimeout(() => setCameraAnimated(true), 100);
                  } else {
                    setCameraAnimated(false);
                    setTimeout(() => {
                      setShowCamera(false);
                      stopCamera();
                    }, 300);
                  }
                }}
                className="px-4 py-2 bg-primary/90 hover:bg-accent rounded-lg transition-all duration-300 flex items-center gap-2"
              >
                {showCamera ? (
                  <>
                    <span className="text-sm">Close Camera</span>
                    <FaStop className="text-sm" />
                  </>
                ) : (
                  <>
                    <span className="text-sm">Open Camera</span>
                    <FaCamera className="text-sm" />
                  </>
                )}
              </button>

              {/* Switch front/back camera */}
              <button
                onClick={() => {
                  const next = cameraFacing === "environment" ? "user" : "environment";
                  setCameraFacing(next);
                  // if camera already open, restart with new facing
                  if (showCamera) {
                    stopCamera();
                    setTimeout(() => startCamera({ facingMode: next }), 200);
                  }
                }}
                title="Switch camera"
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm"
              >
                {cameraFacing === "environment" ? "Back" : "Front"}
              </button>
            </div>
          </h2>

          <div className={`transition-all duration-500 ease-in-out transform ${
            showCamera ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}>
            {showCamera && (
              <div className="relative rounded-xl overflow-hidden bg-gray-800/50">
                <div className={`transition-all duration-500 transform ${
                  cameraAnimated ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-[400px] object-cover"
                    style={{ display: cameraLoading ? "none" : "block" }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ display: cameraLoading ? "none" : "block" }}
                  />
                  {cameraLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-gray-300">
                      <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full mb-2"></div>
                      <div className="text-sm">Initializing camera...</div>
                      <div className="text-xs text-gray-400 mt-1">Please allow camera access if prompted</div>
                    </div>
                  )}
                </div>

                <div className={`mt-4 space-y-2 transition-all duration-300 ${
                  cameraAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}>
                  {Object.keys(liveCount).length === 0 ? (
                    <div className="text-center py-3 bg-gray-800/30 rounded-lg">
                      <p className="text-gray-400 text-sm">No objects detected yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(liveCount).map(([cls, count]) => (
                        <div key={cls} 
                          className="flex items-center justify-between bg-gray-700/30 p-2 rounded-lg border border-gray-600/30">
                          <span className="text-gray-300 text-sm">{cls}</span>
                          <span className="text-green-400 font-bold">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Dump Site Reporting */}
        <form
          onSubmit={reportDumpSite}
          className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-2"
        >
          <h2 className="text-xl font-bold text-green-500">Report Dump Site</h2>
          <input
            type="file"
            name="dumpImage"
            accept="image/*"
            className="w-full p-2 rounded-lg bg-gray-700 text-white"
          />
          <input
            type="text"
            name="description"
            placeholder="Description"
            className="w-full p-2 rounded-lg bg-gray-700 text-white"
          />

            {/* NEW: Waste Type Input */}
  <input
    type="text"
    name="wasteType"
    placeholder="Waste Type (e.g., Plastic, Organic)"
    className="w-full p-2 rounded-lg bg-gray-700 text-white"
  />
          <button
            type="submit"
            disabled={dumpReportLoading}
            className="bg-primary w-full py-2 rounded-lg hover:bg-accent transition"
          >
            {dumpReportLoading ? "Reporting..." : "Submit Report"}
          </button>
          {dumpReportSuccess && (
            <p className="text-green-400 font-semibold">{dumpReportSuccess}</p>
          )}
        </form>

        {/* Wallet removed - display handled in MainApp */}

        {/* Map removed from EcoCycle to avoid duplicate maps (MainApp shows the map) */}
{/* --- TOAST --- */}
{toast && (
  <div
    className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg z-50 transition
                ${toast.includes("⚠️") ? "bg-red-600" : "bg-primary"} text-white`}
  >
    {toast}
  </div>
)}
        {error && <p className="text-red-500 font-semibold mt-4">{error}</p>}
      </div>
    </section>
  );
};

export default EcoCycle;
