import React from 'react';

const Resources = () => (
  <section className="py-12 sm:py-16 bg-[#0B0B0B]">
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-[#A3C586] mb-8 text-center">
        📌 Project Resources
      </h2>
      <div className="text-base sm:text-lg text-[#CFCFCF] space-y-4">
        <p>
          <strong>Drop-off Locations:</strong> Abeokuta, Ijebu-Ode, Sango Ota, Ota, Ifo
        </p>
        <p>
          <strong>Support Contact:</strong>{' '}
          <a
            href="mailto:support@3mtt.gov.ng"
            className="text-[#9ACD32] hover:underline transition-colors"
            aria-label="Email 3MTT support"
          >
            support@3mtt.gov.ng
          </a>
        </p>
        <p>
          <strong>3MTT Portal:</strong>{' '}
          <a
            href="https://3mtt.gov.ng"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#9ACD32] hover:underline transition-colors"
            aria-label="Visit 3MTT website"
          >
            https://3mtt.gov.ng
          </a>
        </p>
        <p>
          <strong>Guidance:</strong> Maximize returns by selling plastics for <span className="text-[#A3C586] font-semibold">₦30/kg</span> to registered partners.
        </p>
      </div>
    </div>
  </section>
);

export default Resources;
