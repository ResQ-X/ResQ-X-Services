/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Copy } from "lucide-react";

// Configure Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
});

// LocationMarker component
const LocationMarker = ({ position, setPosition }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 13);
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
};

// MapComponent
const MapComponent = ({ position, setPosition, defaultCenter }) => {
  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: "300px" }}
      className="rounded-lg"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker position={position} setPosition={setPosition} />
    </MapContainer>
  );
};

// Payment Modal Component
const PaymentModal = ({ result, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-[#3B3835]">
          Service Details
        </h2>
        <div className="space-y-3">
          <p className="text-[#3B3835]">
            <span className="font-semibold">Distance:</span> {result.distance}{" "}
            km
          </p>
          <p className="text-[#3B3835]">
            <span className="font-semibold">Estimated Time:</span>{" "}
            {result.durationInMinutes} minutes
          </p>
          <p className="text-[#3B3835]">
            <span className="font-semibold">Total Price:</span> ₦
            {result.normal_price?.toLocaleString()}
          </p>
          {result.paymentDetails?.data?.authorization_url && (
            <a
              href={result.paymentDetails.data.authorization_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 bg-[#FF8500] text-white py-2 px-4 rounded-md hover:bg-[#FF8500]/90 transition-colors"
            >
              Proceed to Payment
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-6 text-sm text-gray-600 hover:text-gray-900"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Direct Payment Modal Component
const DirectPaymentModal = ({ result, onClose }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-[#3B3835]">
          Payment Details
        </h2>
        <div className="space-y-3">
          <p className="text-[#3B3835]">
            <span className="font-semibold">Amount:</span> ₦
            {result.amount?.toLocaleString()}
          </p>

          {result.paymentDetails?.data?.authorization_url && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600 truncate flex-1">
                  {result.paymentDetails.data.authorization_url}
                </p>
                <button
                  onClick={() =>
                    copyToClipboard(
                      result.paymentDetails.data.authorization_url
                    )
                  }
                  className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <Copy size={16} />
                  {copySuccess && (
                    <span className="ml-2 text-xs text-green-600">Copied!</span>
                  )}
                </button>
              </div>
              <a
                href={result.paymentDetails.data.authorization_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#FF8500] text-white py-2 px-4 rounded-md hover:bg-[#FF8500]/90 transition-colors"
              >
                Proceed to Payment
              </a>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-6 text-sm text-gray-600 hover:text-gray-900"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Main component
const LocationService = () => {
  const [startPosition, setStartPosition] = useState(null);
  const [endPosition, setEndPosition] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [defaultCenter, setDefaultCenter] = useState([6.5244, 3.3792]);
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isSUV, setIsSUV] = useState(false);
  const [isFlatbed, setIsFlatbed] = useState(false);
  const [suggestions, setSuggestions] = useState({ start: [], end: [] });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [directPaymentAmount, setDirectPaymentAmount] = useState("");
  const [directPaymentResult, setDirectPaymentResult] = useState(null);
  const [showDirectPaymentModal, setShowDirectPaymentModal] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    }&libraries=places`;
    script.async = true;
    script.onload = () => console.log("Google Maps loaded");
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Handle address predictions
  const getPredictions = async (input, type) => {
    if (!window.google || !input.trim()) {
      setSuggestions((prev) => ({ ...prev, [type]: [] }));
      return;
    }

    try {
      const service = new window.google.maps.places.AutocompleteService();
      const predictions = await new Promise((resolve, reject) => {
        service.getPlacePredictions(
          { input, componentRestrictions: { country: "ng" } },
          (results, status) =>
            status === "OK" ? resolve(results) : reject(status)
        );
      });
      setSuggestions((prev) => ({ ...prev, [type]: predictions }));
    } catch (error) {
      console.error("Prediction error:", error);
      setSuggestions((prev) => ({ ...prev, [type]: [] }));
    }
  };

  // Handle address selection
  const handleAddressSelect = async (address, type) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const results = await new Promise((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) =>
          status === "OK" ? resolve(results) : reject(status)
        );
      });

      if (results && results[0]) {
        const location = results[0].geometry.location;
        const position = { lat: location.lat(), lng: location.lng() };

        if (type === "start") {
          setStartPosition(position);
          setStartAddress(results[0].formatted_address);
        } else {
          setEndPosition(position);
          setEndAddress(results[0].formatted_address);
        }
        setSuggestions((prev) => ({ ...prev, [type]: [] }));
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startPosition || !endPosition || !userName || !userEmail) {
      alert("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    const payload = {
      dropoff_longitude: endPosition.lng.toString(),
      dropoff_latitude: endPosition.lat.toString(),
      pickup_latitude: startPosition.lat.toString(),
      pickup_longitude: startPosition.lng.toString(),
      is_SUV: isSUV,
      is_FLATBED: isFlatbed,
      order_type: "TOW_TRUCK",
      user_name: userName,
      user_email: userEmail,
    };

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_API_URL}/admin/offlineOrderDetails`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_AUTH_TOKEN}`,
            "x-resqx-key": import.meta.env.VITE_RESQX_KEY,
          },
        }
      );

      if (response.data.success) {
        setResult(response.data.data);
        setShowPaymentModal(true);
      }
    } catch (error) {
      console.error("API Error:", error);
      alert("Error submitting request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!userName || !userEmail || !directPaymentAmount) {
      alert("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.get(
        `${
          import.meta.env.VITE_BACKEND_API_URL
        }/admin/offline_get_payment_Link`,
        {
          params: {
            user_name: userName,
            user_email: userEmail,
            amount: directPaymentAmount,
          },
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_AUTH_TOKEN}`,
            "x-resqx-key": import.meta.env.VITE_RESQX_KEY,
          },
        }
      );

      if (response.data.success) {
        setDirectPaymentResult(response.data.data);
        setShowDirectPaymentModal(true);
      }
    } catch (error) {
      console.error("API Error:", error);
      alert("Error submitting request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff] p-8 md:p-16 overflow-x-hidden">
      <h1 className="text-4xl md:text-5xl text-black lg:text-6xl text-center font-bold mb-8 leading-tight">
        ResQ-X Service Request
      </h1>

      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="location" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="location">Location Service</TabsTrigger>
            <TabsTrigger value="direct">Direct Payment</TabsTrigger>
          </TabsList>

          <TabsContent
            value="location"
            className="bg-[#332414] p-6 md:p-8 rounded-lg shadow-lg"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Start Location Section */}
              <div className="space-y-4 relative">
                <label className="block text-sm font-medium text-white">
                  Start Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={startAddress}
                    onChange={(e) => {
                      setStartAddress(e.target.value);
                      getPredictions(e.target.value, "start");
                    }}
                    placeholder="Enter start address"
                    className="w-full px-3 py-2 bg-[#FAF8F5] text-[#3B3835] rounded-md"
                  />
                  {suggestions.start.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white shadow-lg rounded-md max-h-60 overflow-y-auto">
                      {suggestions.start.map((item, index) => (
                        <div
                          key={index}
                          className="p-2 hover:bg-gray-100 cursor-pointer text-black"
                          onClick={() =>
                            handleAddressSelect(item.description, "start")
                          }
                        >
                          {item.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative z-10">
                  <MapComponent
                    position={startPosition}
                    setPosition={setStartPosition}
                    defaultCenter={defaultCenter}
                  />
                </div>
                {startPosition && (
                  <p className="text-sm text-gray-300">
                    Coordinates: {startPosition.lat.toFixed(6)},{" "}
                    {startPosition.lng.toFixed(6)}
                  </p>
                )}
              </div>

              {/* End Location Section */}
              <div className="space-y-4 relative">
                <label className="block text-sm font-medium text-white">
                  End Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={endAddress}
                    onChange={(e) => {
                      setEndAddress(e.target.value);
                      getPredictions(e.target.value, "end");
                    }}
                    placeholder="Enter end address"
                    className="w-full px-3 py-2 bg-[#FAF8F5] text-[#3B3835] rounded-md"
                  />
                  {suggestions.end.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white shadow-lg rounded-md max-h-60 overflow-y-auto">
                      {suggestions.end.map((item, index) => (
                        <div
                          key={index}
                          className="p-2 hover:bg-gray-100 cursor-pointer text-black"
                          onClick={() =>
                            handleAddressSelect(item.description, "end")
                          }
                        >
                          {item.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative z-10">
                  <MapComponent
                    position={endPosition}
                    setPosition={setEndPosition}
                    defaultCenter={defaultCenter}
                  />
                </div>
                {endPosition && (
                  <p className="text-sm text-gray-300">
                    Coordinates: {endPosition.lat.toFixed(6)},{" "}
                    {endPosition.lng.toFixed(6)}
                  </p>
                )}
              </div>

              {/* User Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    User Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 bg-[#FAF8F5] text-[#3B3835] rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    User Email
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Enter email"
                    className="w-full px-3 py-2 bg-[#FAF8F5] text-[#3B3835] rounded-md"
                  />
                </div>
              </div>

              {/* SUV Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="suv"
                  checked={isSUV}
                  onChange={(e) => setIsSUV(e.target.checked)}
                  className="h-4 w-4 text-[#FF8500] focus:ring-[#FF8500]"
                />
                <label htmlFor="suv" className="text-sm font-medium text-white">
                  Is this for an SUV?
                </label>
              </div>

              {/* Flatbed Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="flatbed"
                  checked={isFlatbed}
                  onChange={(e) => setIsFlatbed(e.target.checked)}
                  className="h-4 w-4 text-[#FF8500] focus:ring-[#FF8500]"
                />
                <label
                  htmlFor="flatbed"
                  className="text-sm font-medium text-white"
                >
                  Is this a Flatbed?
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-[#FF8500] text-white py-3 px-4 rounded-md hover:bg-[#FF8500]/90 transition-all disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-3"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </div>
                ) : (
                  "Get Service Details"
                )}
              </button>
            </form>
          </TabsContent>

          <TabsContent
            value="direct"
            className="bg-[#332414] p-6 md:p-8 rounded-lg shadow-lg"
          >
            <form onSubmit={handleDirectPaymentSubmit} className="space-y-6">
              {/* User Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    User Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 bg-[#FAF8F5] text-[#3B3835] rounded-md"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    User Email
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Enter email"
                    className="w-full px-3 py-2 bg-[#FAF8F5] text-[#3B3835] rounded-md"
                    required
                  />
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  value={directPaymentAmount}
                  onChange={(e) => setDirectPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 bg-[#FAF8F5] text-[#3B3835] rounded-md"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-[#FF8500] text-white py-3 px-4 rounded-md hover:bg-[#FF8500]/90 transition-all disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-3"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </div>
                ) : (
                  "Get Payment Link"
                )}
              </button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && result && (
        <PaymentModal
          result={result}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* Direct Payment Modal */}
      {showDirectPaymentModal && directPaymentResult && (
        <DirectPaymentModal
          result={directPaymentResult}
          onClose={() => setShowDirectPaymentModal(false)}
        />
      )}
    </div>
  );
};

export default LocationService;
