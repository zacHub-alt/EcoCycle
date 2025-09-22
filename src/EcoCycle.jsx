import React, { useState, useRef, useEffect, useCallback } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import Map from "./components/Map";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import { useNavigate } from "react-router-dom";
import "@tensorflow/tfjs-backend-cpu";
import HowToRecycle from "././HowToRecycle";

const EcoCycle = () => {
  const [points, setPoints] = useState(0);
  const [cash, setCash] = useState(0);
  const [scanResult, setScanResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState(null);
  const [liveCount, setLiveCount] = useState({});
  const [dumpReportLoading, setDumpReportLoading] = useState(false);
  const [dumpReportSuccess, setDumpReportSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [animateModal, setAnimateModal] = useState(false);
  const navigate = useNavigate();
  const [cameraLoading, setCameraLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [speechLang, setSpeechLang] = useState("en-US");



  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const liveModelRef = useRef(null);
  const mapRef = useRef(null);

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
        startCamera();
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

  if (lastSpokenMap[materialType] && now - lastSpokenMap[materialType] < cooldown) {
    return; // 🛑 skip if spoken recently
  }
  lastSpokenMap[materialType] = now;

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
const updateWalletFromDetection = async (label) => {
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

  const weight = 1; // default weight, you can extend to dynamic input
  const newPoints = points + 10 * weight;
  const newCash = cash + (pricePerKgMap[materialType] || 0) * weight;

  setPoints(newPoints);
  setCash(newCash);

  setToast(`+₦${pricePerKgMap[materialType] * weight} & +${10 * weight} points (${materialType})`);
  setTimeout(() => setToast(null), 3000);

  try {
    await addDoc(collection(db, "users"), {
      name: "User",
      type: materialType,
      weight,
      points: newPoints,
      cash: newCash,
      pricePerKg: pricePerKgMap[materialType] || 0,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Database error:", error);
    setError("Failed to update wallet. Try again.");
  }
};



const startCamera = () => {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      // Try to attach immediately if ref exists, otherwise retry for a short while
      let attached = false;
      const tryAttach = () => {
        if (videoRef.current) {
          try {
            videoRef.current.srcObject = stream;
            // Use oncanplay to be robust across browsers
            videoRef.current.oncanplay = () => {
              // play() can return a promise
              videoRef.current.play().catch(() => {});
              setCameraLoading(false);
              // start detection loop
              detectFrame();
            };
            attached = true;
          } catch (e) {
            console.warn("Failed to attach stream, will retry:", e);
          }
        }
      };

      tryAttach();

      // If not yet attached, retry up to ~2 seconds (every 200ms)
      if (!attached) {
        let tries = 0;
        const interval = setInterval(() => {
          tries += 1;
          tryAttach();
          if (attached || tries >= 10) {
            clearInterval(interval);
            if (!attached) {
              // If still not attached, give a helpful error
              setCameraLoading(false);
              setError("Could not initialize camera element. Try refreshing the page.");
            }
          }
        }, 200);
      }

      // fallback: if camera doesn't become ready in 10s show an error
      setTimeout(() => {
        if (cameraLoading) {
          setCameraLoading(false);
          setError(
            "⚠️ Camera not starting. Please allow permissions or check if another app is using it."
          );
        }
      }, 10000);
    })
    .catch((err) => {
      setCameraLoading(false);
      setError("Cannot access camera: " + err.message);
    });
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
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

      const response = await fetch(`${API_BASE_URL}/classify`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to classify image");
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
      } else {
        setScanResult(`${materialClass}: ₦${price_per_kg}/kg (Confidence: ${confidencePercent}%)`);
      }
    } catch (err) {
      console.error("Classification error:", err);
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

    const materialType = scanResult.split(":")[0];
    const priceMatch = scanResult.match(/₦(\d+)\/kg/);
    const pricePerKg = priceMatch ? parseInt(priceMatch[1]) : 0;

    const weight = parseFloat(prompt("Enter weight in kg:")) || 1;
    const newPoints = points + 10 * weight;
    const newCash = cash + pricePerKg * weight;

    setPoints(newPoints);
    setCash(newCash);

    try {
      await addDoc(collection(db, "users"), {
        name: "User",
        type: materialType,
        weight,
        points: newPoints,
        cash: newCash,
        pricePerKg,
        timestamp: new Date(),
      });
      setScanResult("");
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
    <section className="py-16 sm:py-20 bg-gray-900 text-white text-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
        <h1 className="text-4xl font-extrabold text-green-600">

           {/* --- MODAL --- */}
      {showModal && (
  <div className={`fixed inset-0 bg-black flex items-center justify-center z-50
                   transition-opacity duration-300 ${animateModal ? "bg-opacity-50" : "bg-opacity-0"}`}>
    <div className={`bg-gray-800 text-white p-6 rounded-xl shadow-lg max-w-md mx-auto text-center space-y-4
                     transform transition-all duration-300
                     ${animateModal ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
      <h2 className="text-2xl font-bold text-green-400">
        Turn Waste into Wealth!
      </h2>
      <p>Do you know you could also do something about these dump sites?</p>
      <div className="space-x-4 mt-4">
        <button
          onClick={() => {
            setAnimateModal(false);
            setTimeout(() => {
              setShowModal(false);
              navigate("/how-to-recycle");
            }, 300);
          }}
          className="bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          Yes
        </button>
        <button
          onClick={() => {
            setAnimateModal(false);
            setTimeout(() => setShowModal(false), 300);
          }}
          className="bg-gray-600 px-4 py-2 rounded-lg hover:bg-gray-700 transition"
        >
          No
        </button>
      </div>
    </div>
  </div>
)}

          EcoCycle: Transforming Ogun State Waste
        </h1>

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
            className="bg-green-600 w-full py-2 rounded-lg hover:bg-green-700 transition"
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
                    className="bg-green-500 w-full py-2 rounded-lg hover:bg-green-600 transition"
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
<div className="bg-gray-800 p-4 rounded-xl shadow-lg relative mx-auto w-[360px] h-[330px]">
  <h2 className="text-xl font-bold text-green-500 mb-2">Live Detection</h2>

  {/* Always render video + canvas so refs are available */}
  <div className="relative w-[360px] h-[270px] mx-auto rounded-lg overflow-hidden">
    <video
      ref={videoRef}
      width="360"
      height="270"
      autoPlay
      muted
      playsInline
      className="w-full h-full object-cover border border-gray-700 rounded-lg"
      style={{ display: cameraLoading ? "none" : "block" }} // hide visually while loading
    />
    <canvas
      ref={canvasRef}
      width="360"
      height="270"
      className="absolute left-0 top-0 w-full h-full pointer-events-none"
      style={{ display: cameraLoading ? "none" : "block" }}
    />

    {/* Overlay loading state while camera initializes */}
    {cameraLoading && (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-70 text-gray-300">
        <div className="animate-pulse text-green-300">📷 Initializing camera...</div>
        <div className="text-sm mt-2 text-gray-400">Please allow camera access if prompted.</div>
      </div>
    )}
  </div>

  <div className="mt-3 text-left space-y-1">
    {Object.keys(liveCount).length === 0 ? (
      <p className="text-sm text-gray-400">No objects detected yet</p>
    ) : (
      Object.keys(liveCount).map((cls) => (
        <p key={cls} className="font-semibold text-green-400">
          {cls}: {liveCount[cls]}
        </p>
      ))
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
            className="bg-green-600 w-full py-2 rounded-lg hover:bg-green-700 transition"
          >
            {dumpReportLoading ? "Reporting..." : "Submit Report"}
          </button>
          {dumpReportSuccess && (
            <p className="text-green-400 font-semibold">{dumpReportSuccess}</p>
          )}
        </form>

        {/* Wallet & Points */}
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg space-y-2">
          <h2 className="text-xl font-bold text-green-500">Wallet & Points</h2>
          <p className="font-semibold text-green-300">Points: {points}</p>
          <p className="font-semibold text-green-300">Cash: ₦{cash}</p>
        </div>

        {/* Map */}
        <div ref={mapRef} className="bg-gray-800 p-4 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-green-500 mb-2">Drop-Off Centers & Dump Sites</h2>
          <Map />
        </div>
{/* --- TOAST --- */}
{toast && (
  <div
    className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg z-50 transition
                ${toast.includes("⚠️") ? "bg-red-600" : "bg-green-600"} text-white`}
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
