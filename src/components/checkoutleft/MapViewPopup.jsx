import React from 'react';
import Modal from 'react-modal';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import Pin from '../../assets/images/common/pin.png';

const libraries = ["places"];

const MapViewPopup = ({ isOpen, onClose, coordinates, address }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyAO5eU8fxUEYC_tK4HR7b3cNQ1o20uddv0",
    libraries,
  });

  if (!isLoaded) return null;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="map-view-modal"
      overlayClassName="map-view-overlay"
      ariaHideApp={false}
    >
      <div className="map-view-container">
        <div className="map-view-header">
          <h3>📍 Shipping Address Location</h3>
          <button onClick={onClose} className="map-view-close">✕</button>
        </div>
        
        <div className="map-view-address">
          <p>{address}</p>
        </div>

        <div className="map-view-map">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={coordinates}
            zoom={16}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
          >
            <Marker 
              position={coordinates}
              icon={{
                url: Pin,
                scaledSize: new window.google.maps.Size(40, 40),
              }}
            />
          </GoogleMap>
        </div>
      </div>
    </Modal>
  );
};

export default MapViewPopup;
