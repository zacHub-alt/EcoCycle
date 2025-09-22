import React from 'react';

const teamMembers = [
  {
    name: "Damilola",
    role: "Web Developer",
    bio: "Handles front-end development and builds user-friendly web interfaces."
  },
  {
    name: "Enoch",
    role: "Team Lead",
    bio: "Leads the team, reviewing and enhancing all works to ensure quality and coherence. Focuses on AI-powered waste scanning and machine learning solutions for EcoCycle."
  },
  {
    name: "Precious",
    role: "Proposal & Documentation",
    bio: "Responsible for writing project proposals, documentation, and supporting materials."
  },
];

const Team = () => (
  <section className="py-12 sm:py-16 bg-[#0B0B0B]">
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-[#228B22] mb-12 text-center">
        EcoCycle Development Team
      </h1>
      <div className="grid gap-8 sm:gap-10 md:grid-cols-3">
        {teamMembers.map((member) => (
          <div
            key={member.name}
            className="bg-gray-900 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-[#A3C586] mb-2">
  {member.name}
</h2>
<h3 className="text-lg sm:text-xl font-semibold text-[#9ACD32] mb-4">
  {member.role}
</h3>

            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              {member.bio}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Team;
