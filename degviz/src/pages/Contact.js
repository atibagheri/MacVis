export default function Contact() {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold mb-4">Contact Us</h1>
  
        <p>
          This app was developed to support transcriptomic analysis and visualization. 
          Please reach out if you have questions, suggestions, or collaboration ideas.
        </p>
  
        {/* Emails */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Emails</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <a href="mailto:a.bagheri@vikes.csuohio.edu" className="text-blue-600 underline">
                a.bagheri@vikes.csuohio.edu
              </a>
            </li>
            <li>
              <a href="mailto:p.jiang@csuohio.edu" className="text-blue-600 underline">
                p.jiang@csuohio.edu
              </a>
            </li>
          </ul>
        </div>
  
        {/* Links */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Links</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <a href="https://github.com/atibagheri" target="_blank" className="text-blue-600 underline">
                GitHub Repository
              </a>
            </li>
            
          </ul>
        </div>
  
        {/* Acknowledgments */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Acknowledgments</h2>
          <p>
            We thank Cleveland State University and our collaborators for their support.
          </p>
        </div>
  
        {/* License / Disclaimer */}
        <div>
          <h2 className="text-xl font-semibold mb-2">License</h2>
          <p>
            This application is provided for academic and research purposes only.
          </p>
        </div>
      </div>
    );
  }
  