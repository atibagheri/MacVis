export default function Contact() {
  return (
    <div className="p-6">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-2">Contact Us</h1>

      {/* Intro */}
      <p className="m-0 leading-tight">
        MacVis was developed to support transcriptomic analysis and visualization for
        research in gene regulation and translation.
      </p>
      <p className="m-0 leading-tight mb-4">
        Please reach out for questions, suggestions, or collaboration opportunities.
      </p>

      {/* Contact Section */}
      <div className="space-y-8">
        {/* Atefeh Bagheri */}
        <div>
          <h2 className="text-xl font-semibold mt-4 mb-1">Atefeh Bagheri</h2>
          
          <p className="m-0 leading-tight italic">PhD Candidate; App Developer</p>
          <p className="m-0 leading-tight">Center for Gene Regulation in Health and Disease (GRHD)</p>
          <p className="m-0 leading-tight">Department of Biological, Geological and Environmental Sciences (BGES)</p>
          <p className="m-0 leading-tight">Cleveland State University</p>
          <p className="m-0 leading-tight">2121 Euclid Ave, Cleveland, OH 44115</p>
          <p className="m-0 leading-tight">
            Email:{' '}
            <a href="mailto:a.bagheri@vikes.csuohio.edu" className="text-blue-600 underline">
              a.bagheri@vikes.csuohio.edu
            </a>
          </p>
           {/* GitHub link directly under the name */}
           <p className="m-0 leading-tight">
           Source Code:{' '}
            <a
              href="https://github.com/atibagheri/MacVis"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-600"
            >
              GitHub Repository
            </a>
          </p>
        </div>

       
        
      </div>
    </div>
  );
}
