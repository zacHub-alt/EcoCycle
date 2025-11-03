import React from "react";
import { useNavigate } from "react-router-dom";

const HowToRecycle = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 bg-gray-900 text-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-12">
        <h1 className="text-4xl font-extrabold text-green-500 text-center">
          Turn Waste into Wealth
        </h1>

        {/* Ogun State Waste Management Initiatives */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-green-400">Ogun State Initiatives</h2>
          <p>
            Ogun State has launched the "Plastic for Cash" and "Blue Box" programs to combat plastic pollution and promote recycling.
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Plastic for Cash:</strong> Residents can exchange sorted plastic waste for cash or goods, creating income opportunities for youth, women, and informal waste collectors.
            </li>
            <li>
              <strong>Blue Box:</strong> A house-to-house waste segregation model introduced by the Ogun State Waste Management Authority (OGWAMA) to enhance recycling efforts.
            </li>
          </ul>
          <iframe
            width="100%"
            height="250"
            src="https://www.youtube.com/embed/jaTWRu4ieso"
            title="Ogun State Waste Management Initiatives"
            frameBorder="0"
            allowFullScreen
          />
        </div>

        {/* Plastic Waste */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-green-400">Plastic Waste</h2>
          <p>
            Plastic waste is a significant environmental challenge. Recycling plastics reduces pollution and conserves resources.
          </p>
          <ul className="list-disc pl-5">
            <li>Collect clean plastic bottles, containers, and packaging.</li>
            <li>Sort plastics by type using recycling codes.</li>
            <li>Rinse containers to remove residues.</li>
            <li>Participate in Ogun State's "Plastic for Cash" program by exchanging sorted plastics for rewards.</li>
          </ul>
          <iframe
            width="100%"
            height="250"
            src="https://www.youtube.com/embed/zO3jFKiqmHo"
            title="Plastic Recycling"
            frameBorder="0"
            allowFullScreen
          />
        </div>

        {/* Paper Waste */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-green-400">Paper Waste</h2>
          <p>
            Paper recycling reduces deforestation and saves energy. Collect clean paper and cardboard for recycling.
          </p>
          <ul className="list-disc pl-5">
            <li>Separate newspaper, cardboard, and office paper.</li>
            <li>Remove any contaminants like tape or food residue.</li>
            <li>Take to paper recycling centers or bins.</li>
          </ul>
          <iframe
            width="100%"
            height="250"
            src="https://www.youtube.com/embed/K_0TjtK1HBI"
            title="Paper Recycling"
            frameBorder="0"
            allowFullScreen
          />
        </div>

        {/* Metal Waste */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-green-400">Metal Waste</h2>
          <p>
            Recycling metals conserves natural resources and reduces energy consumption.
          </p>
          <ul className="list-disc pl-5">
            <li>Collect cans, foil, and scrap metal.</li>
            <li>Separate ferrous (magnetic) and non-ferrous metals.</li>
            <li>Remove non-metal parts and contaminants.</li>
            <li>Take to scrap yards or recycling centers.</li>
          </ul>
          <iframe
            width="100%"
            height="250"
            src="https://www.youtube.com/embed/x3-gwTK9lOc"
            title="Metal Recycling"
            frameBorder="0"
            allowFullScreen
          />
        </div>

        {/* Glass Waste */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-green-400">Glass Waste</h2>
          <p>
            Glass is 100% recyclable and can be recycled indefinitely without losing quality.
          </p>
          <ul className="list-disc pl-5">
            <li>Collect glass bottles and jars.</li>
            <li>Rinse containers to remove residues.</li>
            <li>Sort by color if required by local recycling programs.</li>
            <li>Drop off in designated recycling bins.</li>
          </ul>
          <iframe
            width="100%"
            height="250"
            src="https://www.youtube.com/embed/18oxQkP4qQ0"
            title="Glass Recycling"
            frameBorder="0"
            allowFullScreen
          />
        </div>

        {/* Organic Waste */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-green-400">Organic Waste (Composting)</h2>
          <p>
            Organic waste can be turned into nutrient-rich compost for gardens, reducing landfill use.
          </p>
          <ul className="list-disc pl-5">
            <li>Collect food scraps like fruit peels, vegetable ends, and coffee grounds.</li>
            <li>Include yard waste such as leaves, grass clippings, and small branches.</li>
            <li>Layer greens (wet) and browns (dry) for proper composting.</li>
            <li>Turn the compost regularly to aerate and speed decomposition.</li>
            <li>Use finished compost in your garden to enrich the soil.</li>
          </ul>
          <iframe
            width="100%"
            height="250"
            src="https://www.youtube.com/embed/wH6IRVKs_pQ"
            title="Organic Waste Composting"
            frameBorder="0"
            allowFullScreen
          />
        </div>

        {/* Creative Upcycling */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-green-400">Creative Upcycling</h2>
          <p>
            Turn waste into useful or artistic items to generate income or beautify your space.
          </p>
          <ul className="list-disc pl-5">
            <li>Plastic bottles → planters or bird feeders</li>
            <li>Old newspapers → crafts or compost</li>
            <li>Glass jars → storage containers or decorations</li>
          </ul>
          <iframe
            width="100%"
            height="250"
            src="https://www.youtube.com/embed/FpsXvO5LsTY"
            title="Upcycling Ideas"
            frameBorder="0"
            allowFullScreen
          />
        </div>

         {/* Private Service Providers */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-green-400">Engage with Private Service Providers (PSPs)</h2>
          <p>
            Contact Private Service Providers (PSPs) for regular waste collection services to ensure proper waste management in your locality.
          </p>
          <ul className="list-disc pl-5">
            <li>Identify PSPs operating in your locality.</li>
            <li>Contact them to schedule regular waste collection.</li>
            <li>Ensure proper segregation of waste to facilitate recycling.</li>
          </ul>
          <iframe
            width="100%"
            height="250"
            src="https://www.youtube.com/embed/5sEwbtV4LPQ"
            title="Engage with Private Service Providers"
            frameBorder="0"
            allowFullScreen
          />
        </div>

        {/* Community Clean-Up Campaigns */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-green-400">Participate in Community Clean-Up Campaigns</h2>
          <p>
            Join local initiatives to collect waste, raise awareness, and promote environmental stewardship in your community.
          </p>
          <ul className="list-disc pl-5">
            <li>Join local community groups focused on environmental conservation.</li>
            <li>Participate in scheduled clean-up events.</li>
            <li>Encourage neighbors and friends to get involved.</li>
          </ul>
          <iframe
            width="100%"
            height="250"
            src="https://www.youtube.com/embed/5sEwbtV4LPQ"
            title="Community Clean-Up Campaigns"
            frameBorder="0"
            allowFullScreen
          />
        </div>

          {/* Waste-to-Wealth Ideas */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-green-400">Waste-to-Wealth Ideas</h2>
          <p>Learn how to transform different types of waste into income-generating products.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Organics → Compost Fertilizer:</strong> Collect food scraps, crop residues, leaves. Layer with soil/ash + water in a pit or drum. Turn every 1–2 weeks. Ready in 2–3 months. <br />
              💰 1 ton ≈ ₦50,000
            </li>
            <li>
              <strong>Plastics → Eco-Bricks / Tiles:</strong> Clean and shred plastics, mix with sand (~30:70), heat, and mold. Used for paving or sold to construction projects.
            </li>
            <li>
              <strong>Glass & Rubble → Building Material:</strong> Crush bottles, tiles, rubble, mix with cement/tar. Use for road patching, blocks, drainage. Cuts cement cost by 20–30%.
            </li>
            <li>
              <strong>Textiles → Insulation or Crafts:</strong> Sort old cloth, make rags, cushions, rugs, bags, or use as insulation in walls/roofs. Extra income for artisans.
            </li>
            <li>
              <strong>E-waste → Repair & Parts Resale:</strong> Collect phones, laptops, radios. Refurbish or salvage parts to sell to repair shops. Phones & laptops have high resale value.
            </li>
            <li>
              <strong>Community Cleanups → Carbon & CSR:</strong> Organize cleanup days, collect waste data, partner with NGOs/companies for sponsorship or carbon credits. Earn while helping the environment.
            </li>
          </ul>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="bg-green-500 px-6 py-2 rounded-lg hover:bg-green-600 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowToRecycle;