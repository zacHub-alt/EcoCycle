import React from 'react';
import { FaRecycle, FaCoins, FaUsers, FaMapMarkerAlt } from 'react-icons/fa';

const Impact = ({ dumpSites = 0, dropOffCenters = 0 }) => (
  <section className="py-16 sm:py-20 bg-[#0A0F0A]">
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2E7D32] mb-12 text-center">
        📊 EcoCycle Impact
      </h2>
      <div className="grid gap-8 sm:gap-10 md:grid-cols-4">
        
        <div className="bg-[#1B1F1B] p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center">
          <FaRecycle className="text-[#66BB6A] text-4xl mb-4" />
          <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
            Waste Management
          </h3>
          <p className="text-sm sm:text-base text-gray-300">
            Diverted over <strong>10,000 tons</strong> of waste from Ogun State, improving local environmental health.
          </p>
        </div>
        
        <div className="bg-[#1B1F1B] p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center">
          <FaCoins className="text-[#D4AF37] text-4xl mb-4" />
          <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
            Economic Contribution
          </h3>
          <p className="text-sm sm:text-base text-gray-300">
            Distributed over <strong>₦5 million</strong> in recycling rewards, benefiting more than <strong>5,000 residents</strong>.
          </p>
        </div>
        
        <div className="bg-[#1B1F1B] p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center">
          <FaUsers className="text-[#81C784] text-4xl mb-4" />
          <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
            Community Engagement
          </h3>
          <p className="text-sm sm:text-base text-gray-300">
            Engaged hundreds of volunteers and local organizations, fostering environmental awareness.
          </p>
        </div>

        <div className="bg-[#1B1F1B] p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center">
          <FaMapMarkerAlt className="text-[#FFD54F] text-4xl mb-4" />
          <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
            Dump Sites & Drop-Offs
          </h3>
          <p className="text-sm sm:text-base text-gray-300">
            <strong>{dumpSites}</strong> dump sites reported<br />
            <strong>{dropOffCenters}</strong> active drop-off centers
          </p>
          <button className="mt-4 bg-[#2E7D32] px-4 py-2 rounded-lg hover:bg-[#1B5E20] transition text-white">
            View on Map
          </button>
        </div>

      </div>
    </div>
  </section>
);

export default Impact;
