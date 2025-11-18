import React, { useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  StandaloneSearchBox,
  useJsApiLoader,
} from "@react-google-maps/api";
import Pin from '../../assets/images/common/pin.png'; // your custom pin image

const libraries = ["places"];
const defaultCenter = { lat: 25.2048, lng: 55.2708 }; // Dubai center

const CustomMap = ({ onPlaceSelected, initialPosition }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyAO5eU8fxUEYC_tK4HR7b3cNQ1o20uddv0",
    libraries,
  });

  const mapRef = useRef(null);
  const searchBoxRef = useRef(null);

  const [markerPosition, setMarkerPosition] = useState(initialPosition || defaultCenter);
  const [manualAddress, setManualAddress] = useState("");
  const [detectedAddress, setDetectedAddress] = useState(null);
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Extract address components
const extractAddress = (place) => {
  let street = "", city = "", state = "", country = "";

  if (!place || !place.address_components) return { street, city, state, country };

  place.address_components.forEach((c) => {
    const types = c.types;
    if (types.includes("street_number")) street = c.long_name + " ";
    if (types.includes("route")) street += c.long_name;
    // Prioritize sublocality (area/neighborhood) over locality (city)
    if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
      city = c.long_name;
    } else if (types.includes("locality") && !city) {
      city = c.long_name;
    }
    if (types.includes("administrative_area_level_1")) state = c.long_name; // Changed to long_name for full state name
    if (types.includes("country")) country = c.long_name;
  });

  console.log('Extracted address from map:', { street, city, state, country });
  return { street, city, state, country };
};


  // SearchBox selection
  const handlePlaceChanged = () => {
    const places = searchBoxRef.current.getPlaces();
    if (!places || !places.length) return;
    const place = places[0];
    if (!place.geometry?.location) return;

    const pos = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
    setMarkerPosition(pos);
    mapRef.current?.panTo(pos);

    const address = extractAddress(place);
    setDetectedAddress({ ...address, lat: pos.lat, lng: pos.lng });
    setShowConfirmButton(true);
  };

  // Detect user location
const detectLocation = () => {
  if (!navigator.geolocation) return alert("Geolocation not supported");

  setIsLocating(true);
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
      setMarkerPosition(pos);
      mapRef.current?.panTo(pos);

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: pos }, (results, status) => {
        let address = { lat: pos.lat, lng: pos.lng };
        if (status === "OK" && results[0]) {
          address = { ...extractAddress(results[0]), lat: pos.lat, lng: pos.lng };
        }

        setDetectedAddress(address);
        setShowConfirmButton(true); // Show "Use this location" button
        setIsLocating(false);
      });
    },
    (error) => {
      alert("Unable to get your location. Please enable location services.");
      setIsLocating(false);
    }
  );
};



const handleConfirmAddress = () => {
  if (detectedAddress) {
    console.log('Confirming address:', detectedAddress);
    onPlaceSelected?.(detectedAddress);
    setShowConfirmButton(false);
  }
};


  const handleManualSubmit = () => {
    onPlaceSelected?.({
      street: manualAddress,
      city: "",
      state: "",
      country: "",
      lat: markerPosition?.lat || null,
      lng: markerPosition?.lng || null,
    });
    setManualAddress("");
  };

  if (!isLoaded) return <div style={{ textAlign: "center", padding: "20px" }}>Loading map...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Search Box */}
      <StandaloneSearchBox
        onLoad={ref => {
          if (ref && ref.input) {
            // Restrict to UAE
            const autocomplete = new window.google.maps.places.Autocomplete(ref.input, {
              componentRestrictions: { country: 'ae' }
            });
            searchBoxRef.current = autocomplete;
          } else {
            searchBoxRef.current = ref;
          }
        }}
        onPlacesChanged={handlePlaceChanged}
      >
        <input
          type="text"
          placeholder="Search your address..."
          style={{
            width: "100%",
            padding: "8px 12px", // smaller font / smaller input
            fontSize: "0.9rem",
            borderRadius: "12px",
            border: "1px solid #ddd",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            outline: "none",
          }}
        />
      </StandaloneSearchBox>

      {/* Use This Location Button - appears after search or map click */}
      {showConfirmButton && (
        <button
          onClick={handleConfirmAddress}
          style={{
            width: "100%",
            padding: "10px 16px",
            backgroundColor: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.95rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
            transition: "all 0.3s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          <span>✓</span> Use This Location
        </button>
      )}

      {/* Map */}
      <div style={{ width: '100%' }}>
        <style>{`
          @media (min-width: 900px) {
            .custom-map-responsive {
              height: 45vh !important;
              min-height: 300px !important;
              max-height: 300px !important;
            }
          }
          @media (max-width: 899px) {
            .custom-map-responsive {
              height: 250px !important;
            }
          }
        `}</style>
        <GoogleMap
          mapContainerClassName="custom-map-responsive"
          mapContainerStyle={{
            width: "100%",
            height: "320px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
          center={markerPosition || defaultCenter}
          zoom={markerPosition ? 16 : 11}
          onLoad={(map) => (mapRef.current = map)}
          onClick={(e) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setMarkerPosition({ lat, lng });

            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === "OK" && results[0]) {
                const address = extractAddress(results[0]);
                setDetectedAddress({ ...address, lat, lng });
              } else {
                setDetectedAddress({ lat, lng });
              }
              setShowConfirmButton(true);
            });
          }}
        >
        <Marker
          position={markerPosition}
          icon={{
            url: Pin,
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 40),
          }}
          draggable
          onDragEnd={(e) => {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              setMarkerPosition({ lat, lng });

              const geocoder = new window.google.maps.Geocoder();
              geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === "OK" && results[0]) {
                  const address = extractAddress(results[0]);
                  setDetectedAddress({ ...address, lat, lng });
                } else {
                  setDetectedAddress({ lat, lng });
                }
                setShowConfirmButton(true);
              });
            }}
          />
        </GoogleMap>
      </div>

      {/* Buttons (responsive) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "8px",
        }}
      >
        <button
          onClick={detectLocation}
          disabled={isLocating}
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: isLocating ? "#ccc" : "#ff5100",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: isLocating ? "not-allowed" : "pointer",
            transition: "all 0.3s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          {isLocating ? "Locating..." : <><span>📍</span> Locate Me</>}
        </button>
      </div>
    </div>
  );
};

export default CustomMap;
