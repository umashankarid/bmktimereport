import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../styles/QRCodePrinter.css';

function QRCodePrinter() {
  const trainerLoginUrl = `${window.location.origin}/login?type=trainer`;
  const volunteerLoginUrl = `${window.location.origin}/login?type=volunteer`;

  const volunteerGuidelines = [
    { title: 'Availability', desc: 'Commit to the scheduled volunteer shifts and notify organizers of any changes in advance.' },
    { title: 'Punctuality', desc: 'Arrive 15 minutes early to your assigned role to receive instructions and prepare.' },
    { title: 'Professionalism', desc: 'Maintain a positive, helpful attitude and represent the organization with integrity.' },
    { title: 'Safety', desc: 'Follow all safety protocols and guidelines to ensure a safe environment for all participants.' },
    { title: 'Communication', desc: 'Stay in touch with organizers and other volunteers throughout the event.' },
    { title: 'Responsibility', desc: 'Complete assigned tasks thoroughly and report any issues to the coordinator.' }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="qr-code-printer-container">
      <div className="qr-printer-header">
        <h2>🏸 Printable QR Codes</h2>
        <p>Print these QR codes and display them at your sports facility for easy login access</p>
      </div>

      <button className="btn-print-page" onClick={handlePrint}>
        🖨️ Print QR Codes (2 Pages)
      </button>

      {/* Page 1: Trainer QR Code */}
      <div className="print-page page-1">
        <div className="page-content trainer-page">
          <div className="page-header">
            <h1>🏸 Badminton Activity Logger</h1>
            <h2>Trainer Login</h2>
          </div>

          <div className="qr-code-card trainer-card">
            <div className="qr-code-title">👥 Scan to Log In as Trainer</div>
            <div className="qr-code-wrapper">
              <QRCodeSVG 
                value={trainerLoginUrl}
                size={300}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="qr-code-url">
              <small>{trainerLoginUrl}</small>
            </div>
            <div className="qr-code-instructions">
              Scan this QR code to access the Trainer Dashboard
            </div>
          </div>

          <div className="page-footer">
            <p>📱 Use your smartphone camera or QR code reader</p>
          </div>
        </div>
      </div>

      {/* Page 2: Volunteer QR Code + Guidelines */}
      <div className="print-page page-2">
        <div className="page-content volunteer-page">
          <div className="page-header">
            <h1>🏸 Badminton Activity Logger</h1>
            <h2>Volunteer Registration & Guidelines</h2>
          </div>

          <div className="two-column-layout">
            {/* Left: QR Code */}
            <div className="column-left">
              <div className="qr-code-card volunteer-card">
                <div className="qr-code-title">🤝 Scan to Register as Volunteer</div>
                <div className="qr-code-wrapper">
                  <QRCodeSVG 
                    value={volunteerLoginUrl}
                    size={280}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="qr-code-url">
                  <small>{volunteerLoginUrl}</small>
                </div>
                <div className="qr-code-instructions">
                  Scan to register as a Volunteer
                </div>
              </div>
            </div>

            {/* Right: Guidelines */}
            <div className="column-right">
              <div className="volunteer-guidelines">
                <h3>📋 Volunteer Expectations & Responsibilities</h3>
                <div className="guidelines-list">
                  {volunteerGuidelines.map((guideline, idx) => (
                    <div key={idx} className="guideline-item">
                      <div className="guideline-title">{guideline.title}</div>
                      <div className="guideline-desc">{guideline.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="page-footer">
            <p>Thank you for volunteering! Your contribution makes a difference. 🙌</p>
          </div>
        </div>
      </div>

      <div className="print-instructions">
        <h3>📋 How to Print:</h3>
        <ul>
          <li>Click "Print QR Codes (2 Pages)" or press Ctrl+P</li>
          <li>Select your printer and configure print settings</li>
          <li>Ensure "Print Background Graphics" is enabled (for better visibility)</li>
          <li>Page 1: Trainer login QR code - Display at trainer entrance</li>
          <li>Page 2: Volunteer QR code with guidelines - Display at volunteer check-in area</li>
          <li>Print on A4 paper or vinyl stickers for durability</li>
          <li>Users scan with their phone camera to access login forms</li>
        </ul>
      </div>
    </div>
  );
}

export default QRCodePrinter;
