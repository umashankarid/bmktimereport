import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../styles/QRCodePrinter.css';

function QRCodePrinter() {
  const trainerLoginUrl = `${window.location.origin}/login?type=trainer`;
  const volunteerLoginUrl = `${window.location.origin}/login?type=volunteer`;

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
        🖨️ Print QR Codes
      </button>

      <div className="qr-codes-grid print-section">
        {/* Trainer QR Code */}
        <div className="qr-code-card">
          <div className="qr-code-title">👥 Trainer Login</div>
          <div className="qr-code-wrapper">
            <QRCodeSVG 
              value={trainerLoginUrl}
              size={250}
              level="H"
              includeMargin={true}
            />
          </div>
          <div className="qr-code-url">
            <small>{trainerLoginUrl}</small>
          </div>
          <div className="qr-code-instructions">
            Scan to log in as a Trainer
          </div>
        </div>

        {/* Volunteer QR Code */}
        <div className="qr-code-card">
          <div className="qr-code-title">🤝 Volunteer Login</div>
          <div className="qr-code-wrapper">
            <QRCodeSVG 
              value={volunteerLoginUrl}
              size={250}
              level="H"
              includeMargin={true}
            />
          </div>
          <div className="qr-code-url">
            <small>{volunteerLoginUrl}</small>
          </div>
          <div className="qr-code-instructions">
            Scan to log in as a Volunteer
          </div>
        </div>
      </div>

      <div className="print-instructions">
        <h3>📋 Instructions:</h3>
        <ul>
          <li>Click "Print QR Codes" or press Ctrl+P</li>
          <li>Select your printer and print quality settings</li>
          <li>Adjust size as needed (recommend A4 or larger)</li>
          <li>Print on paper or vinyl stickers</li>
          <li>Display at entrance or check-in area</li>
          <li>Users scan with their phone camera</li>
        </ul>
      </div>
    </div>
  );
}

export default QRCodePrinter;
