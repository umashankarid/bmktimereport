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
          <div className="page-title-section">
            <h1>🏸 TRAINER LOGIN</h1>
            <p className="page-subtitle">Badminton Activity Logger</p>
          </div>

          <div className="trainer-description">
            <h2>For: Assistant Coaches & Junior Trainers</h2>
            <div className="description-text">
              <p>Use this QR code to access your trainer dashboard where you can:</p>
              <ul>
                <li>✓ Log daily badminton activities and sessions</li>
                <li>✓ Track training hours and participant progress</li>
                <li>✓ Manage tournament registrations</li>
                <li>✓ View activity reports and statistics</li>
              </ul>
            </div>
          </div>

          <div className="qr-code-card trainer-card">
            <div className="qr-code-wrapper">
              <QRCodeSVG 
                value={trainerLoginUrl}
                size={280}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="qr-scan-instruction">
              📱 Scan with your phone camera
            </div>
            <div className="qr-code-url">
              <small>{trainerLoginUrl}</small>
            </div>
          </div>

          <div className="page-footer trainer-footer">
            <p>Display at trainer entrance or check-in area</p>
          </div>
        </div>
      </div>

      {/* Page 2: Volunteer QR Code + Guidelines */}
      <div className="print-page page-2">
        <div className="page-content volunteer-page">
          <div className="page-title-section">
            <h1>🤝 VOLUNTEER REGISTRATION</h1>
            <p className="page-subtitle">Badminton Activity Logger</p>
          </div>

          <div className="volunteer-section">
            {/* Left: QR Code */}
            <div className="qr-section">
              <h2>Scan to Register</h2>
              <div className="qr-code-card volunteer-card">
                <div className="qr-code-wrapper">
                  <QRCodeSVG 
                    value={volunteerLoginUrl}
                    size={260}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="qr-scan-instruction">
                  📱 Scan to register as a volunteer
                </div>
                <div className="qr-code-url">
                  <small>{volunteerLoginUrl}</small>
                </div>
              </div>
            </div>

            {/* Right: Guidelines */}
            <div className="guidelines-section">
              <h2>Expectations & Responsibilities</h2>
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

          <div className="page-footer volunteer-footer">
            <p>🙌 Thank you for volunteering! Your contribution makes a difference.</p>
          </div>
        </div>
      </div>

      <div className="print-instructions">
        <h3>📋 How to Print:</h3>
        <ul>
          <li>Click "Print QR Codes (2 Pages)" or press Ctrl+P</li>
          <li>Select your printer and configure settings</li>
          <li><strong>Enable "Print Background Graphics"</strong> for better visibility</li>
          <li><strong>Page 1:</strong> Trainer login QR code - Display at trainer entrance</li>
          <li><strong>Page 2:</strong> Volunteer QR code with expectations - Display at volunteer check-in</li>
          <li>Recommended: Print on A4 paper or laminated vinyl stickers</li>
          <li>Users scan with their smartphone camera to access login forms</li>
        </ul>
      </div>
    </div>
  );
}

export default QRCodePrinter;
