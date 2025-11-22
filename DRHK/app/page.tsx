"use client";

import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  LayoutDashboard,
  Building2,
  Wallet,
  PlusCircle,
  Search,
  MapPin,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Globe,
  LogOut,
  Lock,
  AlertCircle,
  Moon,
  Sun,
  ExternalLink,
  Edit2,
  Save,
  X,
  Filter,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Import from your supabase file
import { supabase } from "../supabase";

// --- CONSTANTS ---
const ETH_TO_USD = 3200;

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- UI COMPONENTS ---
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-xl border shadow-sm", className)}
    {...props}
  />
));
Card.displayName = "Card";

// --- TYPES ---
interface ChartDataPoint {
  value: number;
  month: string;
}

interface Property {
  id: string;
  title: string;
  location: string;
  price_per_share: number;
  yield: number;
  available_shares: number;
  total_shares: number;
  image_url: string;
  description?: string;
  seller_id?: string;
  history: ChartDataPoint[];
}

interface PortfolioItem {
  id: string;
  asset_id: string;
  title: string;
  shares: number;
  value: number;
  tx_hash?: string;
}

// --- HELPER FUNCTIONS ---
const getTheme = (id: string, isDark: boolean) => {
  if (isDark) {
    const darkColors = [
      { bg: "#1e1b4b", accent: "#818cf8", labelBg: "#312e81" },
      { bg: "#2e1065", accent: "#a78bfa", labelBg: "#4c1d95" },
      { bg: "#431407", accent: "#fb923c", labelBg: "#7c2d12" },
      { bg: "#064e3b", accent: "#34d399", labelBg: "#065f46" },
      { bg: "#164e63", accent: "#22d3ee", labelBg: "#155e75" },
      { bg: "#881337", accent: "#fb7185", labelBg: "#9f1239" },
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++)
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return darkColors[Math.abs(hash) % darkColors.length];
  } else {
    const lightColors = [
      { bg: "#EFF6FF", accent: "#3B82F6", labelBg: "#DBEAFE" },
      { bg: "#FAF5FF", accent: "#8B5CF6", labelBg: "#F3E8FF" },
      { bg: "#FFF7ED", accent: "#F97316", labelBg: "#FFEDD5" },
      { bg: "#ECFDF5", accent: "#10B981", labelBg: "#D1FAE5" },
      { bg: "#F0F9FF", accent: "#06B6D4", labelBg: "#CFFAFE" },
      { bg: "#FFF1F2", accent: "#F43F5E", labelBg: "#FFE4E6" },
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++)
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return lightColors[Math.abs(hash) % lightColors.length];
  }
};

const getWalletName = () => {
  // @ts-ignore
  if (typeof window !== "undefined" && window.ethereum) {
    // @ts-ignore
    if (window.ethereum.isMetaMask) return "MetaMask";
    // @ts-ignore
    if (window.ethereum.isCoinbaseWallet) return "Coinbase";
  }
  return "Wallet";
};

// Smart Type Classification
const getPropertyType = (title: string) => {
  const t = title.toLowerCase();
  if (
    t.includes("house") ||
    t.includes("villa") ||
    t.includes("apt") ||
    t.includes("condo") ||
    t.includes("home") ||
    t.includes("residence")
  )
    return "Residence";
  if (
    t.includes("building") ||
    t.includes("office") ||
    t.includes("mall") ||
    t.includes("shop") ||
    t.includes("store") ||
    t.includes("tower") ||
    t.includes("commercial") ||
    t.includes("school") ||
    t.includes("college")
  )
    return "Commercial";
  if (
    t.includes("land") ||
    t.includes("plot") ||
    t.includes("acre") ||
    t.includes("field") ||
    t.includes("site")
  )
    return "Land";
  return "Other";
};

// --- HELPER COMPONENTS ---

// 1. FIXED IMAGE COMPONENT
const PropertyImage = ({
  src,
  alt,
  className,
  style,
  isDark,
}: {
  src?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  isDark?: boolean;
}) => {
  const [hasError, setHasError] = useState(false);
  const isInvalidSource = !src || src.trim() === "";

  if (isInvalidSource || hasError) {
    return (
      <div
        className={cn("flex flex-col items-center justify-center", className)}
        style={style}
      >
        <div
          className={`absolute inset-0 ${
            isDark ? "bg-gray-800" : "bg-gray-200"
          } -z-10`}
        />
        <Building2
          size={48}
          className={`mb-2 opacity-50 ${
            isDark ? "text-gray-600" : "text-gray-400"
          }`}
        />
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? "text-gray-500" : "text-gray-400"
          }`}
        >
          No Image
        </span>
      </div>
    );
  }
  return (
    <img
      key={src}
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setHasError(true)}
    />
  );
};

// 2. ASSET CARD
const AssetCard = ({
  asset,
  onClick,
  isDark,
  displayMode = "market",
  userShares = 0,
}: {
  asset: Property;
  onClick: () => void;
  isDark: boolean;
  displayMode?: "market" | "portfolio";
  userShares?: number;
}) => {
  const mockType = getPropertyType(asset.title);
  const theme = getTheme(asset.title + asset.id, isDark);
  const mainStatNumber =
    displayMode === "portfolio" ? userShares : asset.available_shares;
  const mainStatLabel =
    displayMode === "portfolio" ? "Tokens Owned" : "Tokens Left";

  return (
    <Card
      className={`group overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-0 relative h-[420px] flex flex-col ${
        isDark ? "text-white" : "text-gray-900"
      }`}
      onClick={onClick}
      style={{ backgroundColor: theme.bg }}
    >
      <div className="relative flex-1 flex flex-col p-6">
        <div className="flex justify-between items-start mb-4 relative z-20">
          <div
            className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
            style={{
              backgroundColor: theme.labelBg,
              color: isDark ? "white" : theme.accent,
            }}
          >
            {mockType}
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 backdrop-blur-sm ${
              isDark ? "bg-black/30" : "bg-white/50"
            }`}
          >
            <ArrowUpRight
              className="w-4 h-4"
              style={{ color: isDark ? "white" : theme.accent }}
            />
          </div>
        </div>
        <div className="mb-auto relative z-20">
          <h3
            className={`text-3xl mb-2 leading-tight max-w-[200px] font-extrabold tracking-tight ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {asset.title}
          </h3>
          <div
            className={`flex items-start gap-1.5 text-sm mb-4 font-medium max-w-[170px] ${
              isDark ? "text-gray-300" : "text-gray-500"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 mt-1 shrink-0" />
            <span className="leading-snug">{asset.location.split(",")[0]}</span>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 w-[65%] h-[75%] z-10">
          <PropertyImage
            src={asset.image_url}
            alt={asset.title}
            isDark={isDark}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            style={{
              clipPath: "polygon(25% 0, 100% 0, 100% 100%, 0 100%)",
              borderTopLeftRadius: "40px",
            }}
          />
          <div
            className={`absolute inset-0 pointer-events-none ${
              isDark
                ? "bg-gradient-to-t from-black/40"
                : "bg-gradient-to-t from-black/10"
            } to-transparent`}
            style={{ clipPath: "polygon(25% 0, 100% 0, 100% 100%, 0 100%)" }}
          />
        </div>
        <div className="relative z-20 mt-auto">
          <div>
            <div
              className="text-4xl font-black mb-1"
              style={{ color: theme.accent }}
            >
              {mainStatNumber.toLocaleString()}
            </div>
            <div
              className={`text-[10px] font-bold uppercase tracking-widest ${
                isDark ? "text-gray-400" : "text-gray-400"
              }`}
            >
              {mainStatLabel}
            </div>
          </div>
        </div>
      </div>
      <div
        className={`px-6 py-5 border-t relative z-30 backdrop-blur-md ${
          isDark ? "bg-black/40 border-white/10" : "bg-white/50"
        }`}
        style={{
          borderColor: isDark ? "rgba(255,255,255,0.1)" : theme.labelBg,
        }}
      >
        <div className="flex justify-between items-center text-sm">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
              Price (ETH)
            </div>
            <div
              className={`font-bold text-lg ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Ξ {asset.price_per_share}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
              Yield
            </div>
            <div className="font-bold text-lg" style={{ color: theme.accent }}>
              +{asset.yield}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
              Available
            </div>
            <div
              className={`font-bold text-lg ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {Math.round((asset.available_shares / asset.total_shares) * 100)}%
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// 3. PORTFOLIO PIE CHART
const PortfolioPieChart = ({
  portfolio,
  properties,
  isDark,
}: {
  portfolio: PortfolioItem[];
  properties: Property[];
  isDark: boolean;
}) => {
  const data = portfolio
    .map((item) => {
      const prop = properties.find((p) => p.id === item.asset_id);
      const theme = prop
        ? getTheme(prop.title + prop.id, isDark)
        : { accent: "#ccc" };
      const currentValue = item.shares * (prop?.price_per_share || 0);
      return {
        name: item.title,
        value: currentValue,
        color: theme.accent,
        hash: item.tx_hash,
      };
    })
    .filter((item) => item.value > 0);
  const totalValue = data.reduce((acc, item) => acc + item.value, 0);
  if (data.length === 0) return null;
  return (
    <div
      className={`rounded-3xl p-8 shadow-xl border h-full flex flex-col ${
        isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
      }`}
    >
      <h3
        className={`text-xl font-bold mb-2 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        Allocation
      </h3>
      <p className="text-sm text-gray-500 mb-8">By Asset Value (USD)</p>
      <div className="relative h-[250px] w-full mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `$${value.toLocaleString()}`}
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                backgroundColor: isDark ? "#1f2937" : "white",
                color: isDark ? "white" : "black",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Total
          </span>
          <span
            className={`text-2xl font-black ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            ${totalValue.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3 mt-auto">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="flex flex-col">
                <span
                  className={`font-medium truncate ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {item.name}
                </span>
                {item.hash && (
                  <a
                    href={`https://mumbai.polygonscan.com/tx/${item.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1"
                  >
                    View on Chain <ExternalLink size={8} />
                  </a>
                )}
              </div>
            </div>
            <span
              className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {Math.round((item.value / totalValue) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. VALUE CHART
const ValueTrendChart = ({
  data,
  color = "#4F46E5",
  isDark,
}: {
  data: ChartDataPoint[];
  color?: string;
  isDark: boolean;
}) => {
  if (!data || data.length === 0)
    return (
      <div className="h-32 bg-gray-50 rounded flex items-center justify-center text-xs text-gray-400">
        No Data
      </div>
    );
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d.value - min) / (max - min || 1)) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div className="w-full h-48 relative overflow-hidden">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        <line
          x1="0"
          y1="25"
          x2="100"
          y2="25"
          stroke={isDark ? "#374151" : "#e5e7eb"}
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke={isDark ? "#374151" : "#e5e7eb"}
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="0"
          y1="75"
          x2="100"
          y2="75"
          stroke={isDark ? "#374151" : "#e5e7eb"}
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          points={points}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={color}
          opacity="0.1"
        />
      </svg>
      <div
        className={`absolute top-0 right-0 text-xs font-bold px-1 rounded ${
          isDark ? "text-gray-400 bg-gray-800" : "text-gray-500 bg-white/80"
        }`}
      >
        Ξ {max.toLocaleString()}
      </div>
      <div
        className={`absolute bottom-0 right-0 text-xs font-bold px-1 rounded ${
          isDark ? "text-gray-400 bg-gray-800" : "text-gray-500 bg-white/80"
        }`}
      >
        Ξ {min.toLocaleString()}
      </div>
    </div>
  );
};

// 5. OLA MAPS COMPONENT
const OlaMap3D = ({ location }: { location: string }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const API_KEY = "nm3s2kDfB9reqUrRRX9HfaDFGwcjRSFkProAtSD0";
    let isMounted = true;
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.includes && args[0].includes('Source layer "3d_model"'))
        return;
      originalError(...args);
    };
    const initMap = async () => {
      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
        const geoRes = await fetch(
          `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(
            location
          )}&api_key=${API_KEY}`
        );
        const geoData = await geoRes.json();
        const result = geoData?.geocodingResults?.[0]?.geometry?.location;
        if (!result || !isMounted) return;
        const center = [result.lng, result.lat];
        if (!(window as any).OlaMaps) {
          const script = document.createElement("script");
          script.src =
            "https://www.unpkg.com/olamaps-web-sdk@latest/dist/olamaps-web-sdk.umd.js";
          script.async = true;
          document.body.appendChild(script);
          await new Promise((resolve) => (script.onload = resolve));
        }
        const OlaMaps = (window as any).OlaMaps;
        if (OlaMaps && mapContainerRef.current) {
          const olaMaps = new OlaMaps({ apiKey: API_KEY });
          mapInstanceRef.current = olaMaps.init({
            style:
              "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
            container: mapContainerRef.current,
            center: center,
            zoom: 16,
            pitch: 50,
            bearing: -10,
          });
          if (mapInstanceRef.current.addControl) {
            const nav = new OlaMaps.NavigationControl();
            mapInstanceRef.current.addControl(nav, "top-right");
          }
        }
        if (isMounted) setLoading(false);
      } catch (e) {
        if (isMounted) setLoading(false);
      }
    };
    initMap();
    return () => {
      isMounted = false;
      console.error = originalError;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location]);
  return (
    <div className="w-full h-full relative bg-gray-100">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-100 text-gray-500 text-xs">
          <Loader2 className="animate-spin mr-2" size={16} /> Loading Map...
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

// 6. PAYMENT MODAL
const FakePaymentGateway = ({
  isOpen,
  onClose,
  amount,
  onSuccess,
  isDark,
}: {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onSuccess: (hash: string) => void;
  isDark: boolean;
}) => {
  const [step, setStep] = useState<
    "input" | "processing" | "success" | "error"
  >("input");
  const [hash, setHash] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handlePay = async () => {
    setStep("processing");
    setErrorMessage("");
    try {
      // @ts-ignore
      if (!window.ethereum) throw new Error("No Crypto Wallet Found");
      // @ts-ignore
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(11155111)) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }],
          });
        } catch (err) {
          alert("Please switch to Sepolia Network in MetaMask.");
          throw new Error("Wrong Network");
        }
      }
      const balance = await provider.getBalance(signer.address);
      if (balance === BigInt(0)) throw new Error("Your wallet has 0 ETH.");
      const treasuryAddress = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

      // Use ETH amount directly
      const txValue = ethers.parseEther(amount.toString());

      const feeData = await provider.getFeeData();
      const tx = await signer.sendTransaction({
        to: treasuryAddress,
        value: txValue,
        gasLimit: 100000,
        gasPrice: feeData.gasPrice,
      });
      console.log("Transaction Sent:", tx.hash);
      setHash(tx.hash);
      await tx.wait();
      setStep("success");
      setTimeout(() => {
        onSuccess(tx.hash);
        onClose();
        setStep("input");
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Transaction Failed");
      setStep("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
          isDark
            ? "bg-gray-900 border-gray-700 text-white"
            : "bg-white border-gray-200 text-gray-900"
        }`}
      >
        <div
          className={`p-4 flex justify-between items-center border-b ${
            isDark ? "bg-black border-gray-800" : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-green-400" size={20} />
            <span className="font-mono font-bold">WEB3_GATEWAY</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            &times;
          </button>
        </div>
        <div className="p-6">
          {step === "input" && (
            <>
              <div className="text-center mb-6">
                <p className="text-gray-400 text-xs uppercase tracking-widest">
                  Sign with MetaMask
                </p>
                <h2 className="text-4xl font-mono font-bold mt-2">
                  Ξ {amount.toLocaleString()}
                </h2>
                <p className="text-xs text-indigo-400 mt-2">
                  ≈ ${(amount * ETH_TO_USD).toLocaleString()} USD
                </p>
              </div>
              <button
                onClick={handlePay}
                className="w-full mt-4 bg-indigo-600 text-white h-12 rounded-lg font-bold hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
              >
                <Wallet size={18} /> Pay with Crypto
              </button>
            </>
          )}
          {step === "processing" && (
            <div className="text-center py-10">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
              Verify in Wallet...
            </div>
          )}
          {step === "success" && (
            <div className="text-center py-10">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              Transaction Confirmed
            </div>
          )}
          {step === "error" && (
            <div className="text-center py-8">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">Payment Failed</h3>
              <p className="text-sm text-red-400 px-4">{errorMessage}</p>
              <button
                onClick={() => setStep("input")}
                className="mt-6 text-sm underline text-gray-500 hover:text-white"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LoginPage = ({ onConnect }: { onConnect: (address: string) => void }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // @ts-ignore
    setHasMetaMask(typeof window !== "undefined" && !!window.ethereum);
  }, []);
  const handleMainAction = () => {
    if (hasMetaMask) connectWallet();
    else setError("MetaMask not detected. Please install it.");
  };
  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    // @ts-ignore
    if (typeof window.ethereum !== "undefined") {
      try {
        // @ts-ignore
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("wallet_requestPermissions", [
          { eth_accounts: {} },
        ]);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts.length > 0) onConnect(accounts[0]);
      } catch (error: any) {
        setError("Connection rejected.");
      }
    } else {
      setError("MetaMask not found.");
    }
    setIsConnecting(false);
  };
  const demoLogin = () => {
    onConnect("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black text-white">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob"
          style={{ animation: "blob 10s infinite" }}
        ></div>
        <div
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob animation-delay-2000"
          style={{ animation: "blob 10s infinite 2s" }}
        ></div>
        <div
          className="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] bg-pink-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob animation-delay-4000"
          style={{ animation: "blob 10s infinite 4s" }}
        ></div>
      </div>
      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
      `}</style>
      {hasMetaMask && (
        <div className="absolute top-6 right-6 z-20">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-white/90 tracking-wide">
              {getWalletName()} Detected
            </span>
          </div>
        </div>
      )}
      <div className="z-10 text-center max-w-md w-full space-y-8 relative">
        <div className="mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-purple-500/40 mb-6 transform hover:scale-105 transition-transform duration-500">
            <Building2 size={48} className="text-white" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            TokenEstate
          </h1>
          <p className="text-gray-400 text-lg font-medium">
            The Future of Real Estate is On-Chain.
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl space-y-4 ring-1 ring-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-200 text-sm flex items-center gap-2 mb-2 text-left">
              <AlertCircle size={16} className="shrink-0" />{" "}
              <span>{error}</span>
            </div>
          )}
          <button
            onClick={handleMainAction}
            disabled={isConnecting}
            className={`w-full h-14 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg group relative z-10 ${
              hasMetaMask
                ? "bg-[#F6851B] hover:bg-[#e2761b] text-white shadow-orange-900/20"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20 opacity-50 cursor-not-allowed"
            }`}
          >
            {isConnecting ? (
              <Loader2 className="animate-spin" />
            ) : hasMetaMask ? (
              <>
                <Wallet className="group-hover:scale-110 transition-transform" />{" "}
                Connect MetaMask
              </>
            ) : (
              "Wallet Not Found"
            )}
          </button>
          {!hasMetaMask && (
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-gray-400 hover:text-white text-sm mt-4 underline"
            >
              Download MetaMask Extension
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [view, setView] = useState<"landing" | "market" | "asset" | "seller">(
    "landing"
  );
  const [properties, setProperties] = useState<Property[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [isDark, setIsDark] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [filterType, setFilterType] = useState("All Types");
  const [mintForm, setMintForm] = useState({
    title: "",
    location: "",
    price_per_share: 0.01,
    total_shares: 1000,
    yield: 6.5,
    image_url: "",
  });

  useEffect(() => {
    const savedAccount = localStorage.getItem("walletConnected");
    const savedTheme = localStorage.getItem("theme");
    if (savedAccount) handleLoginSuccess(savedAccount);
    if (savedTheme === "dark") setIsDark(true);
  }, []);
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };
  const handleLoginSuccess = (address: string) => {
    setAccount(address);
    localStorage.setItem("walletConnected", address);
    fetchData(address);
  };
  const handleLogout = () => {
    setAccount(null);
    localStorage.removeItem("walletConnected");
    setPortfolio([]);
  };
  const fetchData = async (address: string) => {
    setLoading(true);
    const { data: props } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: port } = await supabase
      .from("portfolio")
      .select("*")
      .eq("user_id", address);
    if (props) setProperties(props as Property[]);
    if (port) setPortfolio(port as PortfolioItem[]);
    setLoading(false);
  };
  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    const mockHistory = Array.from({ length: 6 }, (_, i) => ({
      month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i],
      value: mintForm.price_per_share * (1 + (Math.random() * 0.2 - 0.05)),
    }));
    const { error } = await supabase
      .from("properties")
      .insert({
        ...mintForm,
        available_shares: mintForm.total_shares,
        history: mockHistory,
        seller_id: account,
      });
    if (error) alert("Error minting: " + error.message);
    else {
      alert("Asset Tokenized!");
      setView("market");
      fetchData(account);
    }
  };
  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    const { error } = await supabase
      .from("properties")
      .update({
        price_per_share: editingProperty.price_per_share,
        total_shares: editingProperty.total_shares,
      })
      .eq("id", editingProperty.id);
    if (error) {
      alert("Failed to update: " + error.message);
    } else {
      alert("Property Updated Successfully!");
      setEditingProperty(null);
      fetchData(account!);
    }
  };
  const executePurchase = async (txHash: string) => {
    if (!selectedAsset || !account) return;
    const { error } = await supabase.rpc("buy_shares", {
      p_asset_id: selectedAsset.id,
      p_user_id: account,
      p_quantity: buyQuantity,
      p_total_price: buyQuantity * selectedAsset.price_per_share,
    });
    if (error) {
      alert("Transaction Failed in DB: " + error.message);
    } else {
      console.log("Blockchain Proof:", txHash);
      alert("Purchase Success! Proof: " + txHash.slice(0, 10) + "...");
      fetchData(account);
      setView("landing");
    }
  };
  if (!account) return <LoginPage onConnect={handleLoginSuccess} />;
  const netWorthEth = portfolio.reduce((sum, item) => {
    const prop = properties.find((p) => p.id === item.asset_id);
    return sum + item.shares * (prop?.price_per_share || 0);
  }, 0);
  const netWorthUsd = netWorthEth * ETH_TO_USD;
  const displayWalletName =
    account?.toLowerCase() === "0x71c7656ec7ab88b098defb751b7401b5f6d8976f"
      ? "Kalash"
      : "Investor";

  // UPDATED FILTER LOGIC
  const filteredProperties = properties
    .filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase());
      const pType = getPropertyType(p.title);
      const matchesType = filterType === "All Types" || pType === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortOption === "price-asc")
        return a.price_per_share - b.price_per_share;
      if (sortOption === "price-desc")
        return b.price_per_share - a.price_per_share;
      if (sortOption === "yield-asc") return a.yield - b.yield;
      return 0;
    });

  return (
    <div
      className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-black text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      <aside
        className={`relative z-30 flex flex-col justify-between transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${
          isSidebarOpen ? "w-64 border-r" : "w-5 hover:w-5"
        } ${
          isDark
            ? "bg-gray-900/90 border-gray-800"
            : "bg-white/90 border-gray-200"
        } backdrop-blur-xl`}
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
      >
        <div
          className={`flex flex-col h-full transition-opacity duration-200 ${
            isSidebarOpen ? "opacity-100" : "opacity-0 invisible"
          }`}
        >
          <div>
            <div
              className={`h-16 flex items-center justify-start px-6 border-b ${
                isDark ? "border-gray-800" : "border-gray-100"
              }`}
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                <Building2 size={20} strokeWidth={2.5} />
              </div>
              <span
                className={`ml-3 font-bold text-xl tracking-tight whitespace-nowrap ${
                  isDark ? "text-white" : "text-gray-800"
                }`}
              >
                TokenEstate
              </span>
            </div>
            <nav className="p-4 space-y-2">
              {[
                { id: "landing", label: "Dashboard", icon: LayoutDashboard },
                { id: "market", label: "Marketplace", icon: Globe },
                { id: "seller", label: "Seller Hub", icon: PlusCircle },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as any)}
                  className={`w-full flex items-center p-3 rounded-xl transition-all whitespace-nowrap ${
                    view === item.id
                      ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-900/20"
                      : `hover:bg-gray-100 ${
                          isDark
                            ? "hover:bg-gray-800 text-gray-400 hover:text-white"
                            : "text-gray-500 hover:text-gray-900"
                        }`
                  }`}
                >
                  <item.icon size={22} className="shrink-0" />
                  <span className="ml-3">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div
            className={`p-4 border-t ${
              isDark ? "border-gray-800" : "border-gray-100"
            }`}
          >
            <div
              className={`rounded-xl p-4 mb-3 ${
                isDark ? "bg-gray-800 text-white" : "bg-gray-900 text-white"
              }`}
            >
              <div className="flex items-center gap-2 mb-1 opacity-70">
                <Wallet size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {displayWalletName}
                </span>
              </div>
              <p className="text-xs font-mono truncate mb-3" title={account}>
                {account}
              </p>
              <div className="h-px bg-white/10 w-full mb-3"></div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                Net Worth
              </p>
              <p className="text-lg font-bold truncate">
                ${netWorthUsd.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors ${
                  isDark
                    ? "bg-gray-800 text-yellow-400 hover:bg-gray-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={handleLogout}
                className={`flex-1 flex items-center justify-center gap-2 p-2 text-red-500 rounded-lg text-sm font-bold transition-colors ${
                  isDark
                    ? "bg-gray-800 hover:bg-gray-700"
                    : "bg-red-50 hover:bg-red-100"
                }`}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
        {!isSidebarOpen && (
          <div className="absolute inset-y-0 left-0 w-full flex flex-col items-center py-6 gap-4">
            <div className="w-1 h-8 bg-gray-300 rounded-full"></div>
            <div className="w-1 h-8 bg-gray-300 rounded-full"></div>
            <div className="w-1 h-8 bg-gray-300 rounded-full"></div>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-y-auto relative w-full">
        <header
          className={`h-16 border-b flex items-center justify-between px-8 sticky top-0 z-10 transition-colors duration-300 ${
            isDark ? "bg-black border-gray-800" : "bg-white border-gray-200"
          }`}
        >
          <h2
            className={`text-lg font-semibold capitalize ${
              isDark ? "text-white" : "text-gray-700"
            }`}
          >
            {view === "asset" ? "Asset Details" : view}
          </h2>
          <div className="relative group cursor-pointer">
            <div
              className={`px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm animate-in fade-in flex items-center gap-2 ${
                isDark
                  ? "bg-gray-900 border-gray-700 text-white"
                  : "bg-white border-gray-200 text-gray-800"
              }`}
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              {displayWalletName}
            </div>
            <div className="absolute right-0 top-full mt-2 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
              <div
                className={`rounded-xl p-5 shadow-2xl border backdrop-blur-xl ${
                  isDark
                    ? "bg-gray-900/95 border-gray-700 text-white"
                    : "bg-white/95 border-gray-200 text-gray-900"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {displayWalletName[0]}
                  </div>
                  <div>
                    <p className="font-bold">{displayWalletName}</p>
                    <p className="text-xs opacity-50 font-mono truncate w-32">
                      {account}
                    </p>
                  </div>
                </div>
                <div
                  className={`h-px w-full mb-4 ${
                    isDark ? "bg-white/10" : "bg-gray-200"
                  }`}
                ></div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-60">
                      Net Worth
                    </p>
                    <p className="text-xl font-black">
                      ${netWorthUsd.toLocaleString()}
                    </p>
                  </div>
                  <Wallet className="opacity-20 mb-1" />
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {loading && (
            <div
              className={`absolute inset-0 z-50 flex items-center justify-center ${
                isDark ? "bg-black/50" : "bg-white/50"
              }`}
            >
              <Loader2 className="animate-spin text-indigo-600" />
            </div>
          )}
          {view === "landing" && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-gradient-to-r from-indigo-900 to-gray-900 rounded-3xl p-8 text-white flex justify-between items-center shadow-2xl">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Welcome, {displayWalletName}.
                  </h1>
                  <p className="text-indigo-200 font-mono text-sm">
                    Wallet: {account}
                  </p>
                </div>
                <button
                  onClick={() => setView("market")}
                  className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
                >
                  Explore Market
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  label="Net Worth"
                  value={`$${netWorthUsd.toLocaleString()}`}
                  icon={Wallet}
                  color="bg-blue-500"
                  isDark={isDark}
                  theme={"blue"}
                />
                <StatCard
                  label="Properties"
                  value={portfolio.length}
                  icon={Building2}
                  color="bg-indigo-500"
                  isDark={isDark}
                  theme={"indigo"}
                />
                <StatCard
                  label="Total Shares"
                  value={portfolio.reduce((acc, i) => acc + i.shares, 0)}
                  icon={Lock}
                  color="bg-purple-500"
                  isDark={isDark}
                  theme={"purple"}
                />
              </div>
              <div>
                <h3
                  className={`text-2xl font-bold mb-6 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Your Portfolio
                </h3>
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="lg:w-2/3">
                    {portfolio.length === 0 ? (
                      <div
                        className={`text-center py-20 rounded-2xl border-2 border-dashed ${
                          isDark
                            ? "bg-gray-900 border-gray-800"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <p className="text-gray-500 mb-4">
                          You haven't purchased any assets yet.
                        </p>
                        <button
                          onClick={() => setView("market")}
                          className="text-indigo-600 font-bold hover:underline"
                        >
                          Go to Marketplace
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {portfolio.map((item) => {
                          const prop = properties.find(
                            (p) => p.id === item.asset_id
                          );
                          if (!prop) return null;
                          return (
                            <AssetCard
                              key={item.id}
                              asset={prop}
                              onClick={() => {
                                setSelectedAsset(prop);
                                setBuyQuantity(1);
                                setView("asset");
                              }}
                              isDark={isDark}
                              displayMode="portfolio"
                              userShares={item.shares}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="lg:w-1/3">
                    {portfolio.length > 0 && (
                      <PortfolioPieChart
                        portfolio={portfolio}
                        properties={properties}
                        isDark={isDark}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {view === "market" && (
            <div className="space-y-6 animate-in fade-in">
              <div
                className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 items-center shadow-sm ${
                  isDark
                    ? "bg-gray-900 border-gray-800"
                    : "bg-white border-gray-100"
                }`}
              >
                <div
                  className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border w-full ${
                    isDark
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-gray-50 border-gray-200 text-gray-900"
                  }`}
                >
                  <Search size={20} className="opacity-50" />
                  <input
                    type="text"
                    placeholder="Search by location or asset name..."
                    className="bg-transparent outline-none w-full text-sm font-medium placeholder:text-gray-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <div className="relative group min-w-[140px]">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className={`w-full appearance-none px-4 py-3 rounded-xl border cursor-pointer outline-none font-medium text-sm ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-white"
                          : "bg-gray-50 border-gray-200 text-gray-900"
                      }`}
                    >
                      <option value="All Types">All Types</option>
                      <option value="Residence">Residence</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Land">Land</option>
                      <option value="Other">Other</option>{" "}
                      {/* Added 'Other' Option */}
                    </select>
                    <ChevronDown
                      size={16}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    />
                  </div>
                  <div className="relative group min-w-[160px]">
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className={`w-full appearance-none px-4 py-3 rounded-xl border cursor-pointer outline-none font-medium text-sm ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-white"
                          : "bg-gray-50 border-gray-200 text-gray-900"
                      }`}
                    >
                      <option value="default">Sort By: Featured</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="yield-asc">Yield: Low to High</option>
                    </select>
                    <ArrowUpDown
                      size={16}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredProperties.map((prop) => (
                  <AssetCard
                    key={prop.id}
                    asset={prop}
                    onClick={() => {
                      setSelectedAsset(prop);
                      setBuyQuantity(1);
                      setView("asset");
                    }}
                    isDark={isDark}
                    displayMode="market"
                  />
                ))}
                {filteredProperties.length === 0 && (
                  <div className="col-span-full text-center py-20 opacity-50">
                    <p>No assets found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {view === "asset" && selectedAsset && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in zoom-in-95">
              <div className="lg:col-span-2 space-y-8">
                <button
                  onClick={() => setView("market")}
                  className={`flex items-center mb-4 ${
                    isDark
                      ? "text-gray-400 hover:text-white"
                      : "text-gray-500 hover:text-black"
                  }`}
                >
                  <ArrowLeft size={16} className="mr-2" /> Back to Market
                </button>
                <div className="rounded-3xl overflow-hidden h-96 relative shadow-xl">
                  <PropertyImage
                    src={selectedAsset.image_url}
                    alt={selectedAsset.title}
                    isDark={isDark}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm p-6 text-white">
                    <h1 className="text-4xl font-bold">
                      {selectedAsset.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-gray-300">
                      <MapPin size={16} /> {selectedAsset.location}
                    </div>
                  </div>
                </div>
                <div
                  className={`rounded-2xl p-6 border ${
                    isDark
                      ? "bg-gray-900 border-gray-800"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <h3
                    className={`font-bold mb-4 text-lg ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Intrinsic Value
                  </h3>
                  <ValueTrendChart
                    data={selectedAsset.history}
                    isDark={isDark}
                  />
                </div>
                <div
                  className={`rounded-2xl overflow-hidden border shadow-sm h-64 relative ${
                    isDark ? "border-gray-800" : "border-gray-200"
                  }`}
                >
                  <OlaMap3D location={selectedAsset.location} />
                </div>
              </div>
              <div
                className={`rounded-2xl p-6 border shadow-lg h-fit sticky top-24 ${
                  isDark
                    ? "bg-gray-900 border-gray-800"
                    : "bg-white border-gray-200"
                }`}
              >
                <h2
                  className={`text-3xl font-black mb-1 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Ξ {selectedAsset.price_per_share}
                </h2>
                <p className="text-gray-500 mb-6">per share</p>
                <div
                  className={`p-4 rounded-xl mb-6 border ${
                    isDark
                      ? "bg-gray-800 border-gray-700"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div
                    className={`flex justify-between mb-2 text-sm ${
                      isDark ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    <span>Quantity</span>
                    <strong>{buyQuantity}</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={100}
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div
                    className={`flex justify-between mt-4 pt-4 border-t ${
                      isDark ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <span>Total</span>
                    <strong className="text-indigo-600 text-xl">
                      Ξ{" "}
                      {(
                        buyQuantity * selectedAsset.price_per_share
                      ).toLocaleString()}
                    </strong>
                  </div>
                </div>
                <button
                  onClick={() => setShowPayModal(true)}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  Buy Shares
                </button>
                <div className="mt-4 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                  <Lock size={12} /> Secured by Ethereum
                </div>
              </div>
            </div>
          )}
          {view === "seller" && (
            <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-8">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1
                    className={`text-3xl font-bold mb-2 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Seller Hub
                  </h1>
                  <p className="text-gray-500">
                    Manage your tokenized real estate assets.
                  </p>
                </div>
              </div>
              <div
                className={`p-8 rounded-3xl border shadow-xl mb-12 ${
                  isDark
                    ? "bg-gray-900 border-gray-800"
                    : "bg-white border-gray-200"
                }`}
              >
                <h2
                  className={`text-lg font-bold mb-6 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Mint New Asset
                </h2>
                <form onSubmit={handleMint} className="space-y-5">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label
                        className={`text-sm font-bold ${
                          isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Property Title
                      </label>
                      <input
                        required
                        className={`w-full p-3 mt-1 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-white"
                            : "bg-gray-50 border-gray-200"
                        }`}
                        value={mintForm.title}
                        onChange={(e) =>
                          setMintForm({ ...mintForm, title: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label
                        className={`text-sm font-bold ${
                          isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Location
                      </label>
                      <input
                        required
                        className={`w-full p-3 mt-1 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-white"
                            : "bg-gray-50 border-gray-200"
                        }`}
                        value={mintForm.location}
                        onChange={(e) =>
                          setMintForm({ ...mintForm, location: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      className={`text-sm font-bold ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Image URL
                    </label>
                    <input
                      className={`w-full p-3 mt-1 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-white"
                          : "bg-gray-50 border-gray-200"
                      }`}
                      value={mintForm.image_url}
                      onChange={(e) =>
                        setMintForm({ ...mintForm, image_url: e.target.value })
                      }
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Use a public link or local file in /public folder
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label
                        className={`text-sm font-bold ${
                          isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Shares
                      </label>
                      <input
                        required
                        type="number"
                        className={`w-full p-3 mt-1 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-white"
                            : "bg-gray-50 border-gray-200"
                        }`}
                        value={mintForm.total_shares}
                        onChange={(e) =>
                          setMintForm({
                            ...mintForm,
                            total_shares: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label
                        className={`text-sm font-bold ${
                          isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Price (ETH)
                      </label>
                      <input
                        required
                        type="number"
                        className={`w-full p-3 mt-1 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-white"
                            : "bg-gray-50 border-gray-200"
                        }`}
                        value={mintForm.price_per_share}
                        onChange={(e) =>
                          setMintForm({
                            ...mintForm,
                            price_per_share: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label
                        className={`text-sm font-bold ${
                          isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Yield (%)
                      </label>
                      <input
                        required
                        type="number"
                        className={`w-full p-3 mt-1 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-white"
                            : "bg-gray-50 border-gray-200"
                        }`}
                        value={mintForm.yield}
                        onChange={(e) =>
                          setMintForm({
                            ...mintForm,
                            yield: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className={`w-full py-4 rounded-xl font-bold transition-colors mt-4 ${
                      isDark
                        ? "bg-indigo-600 text-white hover:bg-indigo-500"
                        : "bg-gray-900 text-white hover:bg-black"
                    }`}
                  >
                    Issue Tokens
                  </button>
                </form>
              </div>
              <div>
                <h2
                  className={`text-lg font-bold mb-6 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Your Active Listings
                </h2>
                <div className="space-y-4">
                  {properties
                    .filter((p) => p.seller_id === account)
                    .map((prop) => (
                      <div
                        key={prop.id}
                        className={`p-4 rounded-xl border flex items-center justify-between ${
                          isDark
                            ? "bg-gray-800 border-gray-700"
                            : "bg-white border-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden">
                            <PropertyImage
                              src={prop.image_url}
                              alt={prop.title}
                              className="w-full h-full object-cover"
                              isDark={isDark}
                            />
                          </div>
                          <div>
                            <h3
                              className={`font-bold ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {prop.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Ξ {prop.price_per_share} / share •{" "}
                              {prop.total_shares} total
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setEditingProperty(prop)}
                          className={`p-2 rounded-lg transition-colors ${
                            isDark
                              ? "bg-gray-700 hover:bg-gray-600 text-white"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                          }`}
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
          {editingProperty && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div
                className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl ${
                  isDark
                    ? "bg-gray-900 border-gray-700 text-white"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-xl">Edit Asset</h3>
                  <button onClick={() => setEditingProperty(null)}>
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleUpdateProperty} className="space-y-4">
                  <div>
                    <label className="text-sm font-bold mb-1 block opacity-70">
                      Price per Share (ETH)
                    </label>
                    <input
                      type="number"
                      className={`w-full p-3 rounded-lg border outline-none ${
                        isDark
                          ? "bg-black border-gray-700"
                          : "bg-gray-50 border-gray-200"
                      }`}
                      value={editingProperty.price_per_share}
                      onChange={(e) =>
                        setEditingProperty({
                          ...editingProperty,
                          price_per_share: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold mb-1 block opacity-70">
                      Total Shares
                    </label>
                    <input
                      type="number"
                      className={`w-full p-3 rounded-lg border outline-none ${
                        isDark
                          ? "bg-black border-gray-700"
                          : "bg-gray-50 border-gray-200"
                      }`}
                      value={editingProperty.total_shares}
                      onChange={(e) =>
                        setEditingProperty({
                          ...editingProperty,
                          total_shares: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-4 flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> Save Changes
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
        <FakePaymentGateway
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          amount={
            selectedAsset ? selectedAsset.price_per_share * buyQuantity : 0
          }
          onSuccess={executePurchase}
          isDark={isDark}
        />
      </main>
    </div>
  );
}

// --- UTILS ---
const StatCard = ({ label, value, icon: Icon, color, isDark, theme }: any) => {
  const themeColors: Record<string, string> = {
    blue: isDark
      ? "bg-blue-950/30 text-blue-400 border-blue-900/20"
      : "bg-blue-50 text-blue-600 border-blue-100",
    indigo: isDark
      ? "bg-indigo-950/30 text-indigo-400 border-indigo-900/20"
      : "bg-indigo-50 text-indigo-600 border-indigo-100",
    purple: isDark
      ? "bg-purple-950/30 text-purple-400 border-purple-900/20"
      : "bg-purple-50 text-purple-600 border-purple-100",
  };
  const colors =
    themeColors[theme] ||
    (isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900");
  return (
    <div
      className={`p-6 rounded-2xl border shadow-sm flex items-center gap-4 ${colors}`}
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
          isDark ? "bg-white/5" : "bg-white"
        }`}
      >
        <Icon size={24} className="opacity-90" />
      </div>
      <div>
        <p className="text-sm font-medium opacity-70">{label}</p>
        <h3 className="text-2xl font-bold">{value}</h3>
      </div>
    </div>
  );
};
