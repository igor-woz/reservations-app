'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { servicesAPI } from '@/lib/api';
import { getToken } from '@/lib/auth';
import BookingForm from '@/components/BookingForm';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await servicesAPI.getAll();
      setServices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!getToken()) return null;

  return (
    <div className="page">
      <h1>Available Services</h1>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <p>Loading services...</p>
      ) : (
        <div className="services-grid">
          {services.map((service) => (
            <div key={service.id} className="service-card">
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <p className="price">${service.price}</p>
              <p className="duration">{service.duration} minutes</p>

              <button
                onClick={() => setSelectedService(service)}
                className="btn btn-primary"
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedService && (
        <BookingForm
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onSuccess={() => {
            setSelectedService(null);
            router.push('/bookings');
          }}
        />
      )}
    </div>
  );
}