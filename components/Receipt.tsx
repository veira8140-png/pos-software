
import React from 'react';
import { Sale, BusinessConfig } from '../types';

interface ReceiptProps {
  sale: Sale;
  business: BusinessConfig;
  customerName?: string;
  customerPin?: string;
}

const Receipt: React.FC<ReceiptProps> = ({ sale, business, customerName, customerPin }) => {
  const dateObj = new Date(sale.timestamp);
  const dateStr = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-');
  const timeStr = dateObj.toLocaleTimeString('en-GB', { hour12: false });
  
  // Dynamic QR code URL based on the unique E-TIMS control number
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(sale.etimsControlNumber)}`;

  const containerStyle: React.CSSProperties = {
    fontFamily: '"Courier New", Courier, monospace',
    width: '100%',
    maxWidth: '320px',
    margin: '0 auto',
    padding: '20px 10px',
    color: '#000',
    fontSize: '11px',
    lineHeight: '1.4',
    backgroundColor: '#fff',
    position: 'relative'
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '10px'
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between'
  };

  const boldStyle: React.CSSProperties = {
    fontWeight: 'bold'
  };

  const voidOverlay: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    border: '4px solid red',
    color: 'red',
    fontSize: '40px',
    fontWeight: 'bold',
    padding: '10px',
    opacity: 0.3,
    pointerEvents: 'none',
    zIndex: 10
  };

  // Mocking some eTIMS specific fields for authenticity
  const scuId = "KRACU0100072001";
  const internalData = "GYEZ-TWHM-BCBB-A6B4-TWC4-BSMP-JI";
  const receiptSignature = "DGUX-7DYU-M040-DYAS";
  const receiptNumber = `${sale.id.split('-')[1] || '943'}/${sale.id.split('-')[1] || '943'}NS`;

  return (
    <div style={containerStyle} className="receipt-container">
      {sale.status === 'voided' && <div style={voidOverlay}>VOIDED</div>}
      
      {/* Header */}
      <div style={sectionStyle}>
        <div style={boldStyle}>{(business.name || 'VEIRA POS').toUpperCase()}</div>
        <div>{business.address || 'Nairobi, Kenya'}</div>
        <div>TEL: {business.whatsappNumber || '254...'}</div>
        {business.email && <div>EMAIL: {business.email.toUpperCase()}</div>}
        <div>PIN: {business.kraPin || 'P000000000X'}</div>
        <div>CASHIER: 1 ({sale.staffId.slice(0, 5)})</div>
      </div>

      {/* Client Info */}
      <div style={sectionStyle}>
        <div>CLIENT PIN: {customerPin || 'N/A'}</div>
        <div>CLIENT NAME: {customerName || 'WALK-IN CUSTOMER'}</div>
      </div>

      {/* Items */}
      <div style={sectionStyle}>
        {sale.items.map((item, idx) => (
          <div key={idx} style={{ marginBottom: '8px' }}>
            <div style={boldStyle}>{item.name.toUpperCase()}</div>
            <div>{item.code || 'KE2BKXL0000001'}</div>
            <div style={rowStyle}>
              <span>{item.price.toFixed(2)} x {item.quantity}</span>
              <span>{item.total.toFixed(2)} B-16%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals Breakdown */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <span style={boldStyle}>TOTAL</span>
          <span style={boldStyle}>{sale.total.toFixed(2)}</span>
        </div>
        <div style={rowStyle}>
          <span>TOTAL A-EX</span>
          <span>0.00</span>
        </div>
        <div style={rowStyle}>
          <span>TOTAL B-16%</span>
          <span>{sale.total.toFixed(2)}</span>
        </div>
        <div style={rowStyle}>
          <span>TOTAL TAX-B</span>
          <span>{(sale.tax).toFixed(2)}</span>
        </div>
        <div style={rowStyle}>
          <span>TOTAL E-8%</span>
          <span>0.00</span>
        </div>
        <div style={rowStyle}>
          <span>TOTAL TAX-E</span>
          <span>0.00</span>
        </div>
        <div style={rowStyle}>
          <span style={boldStyle}>TOTAL TAX</span>
          <span style={boldStyle}>{(sale.tax).toFixed(2)}</span>
        </div>
      </div>

      {/* Payment */}
      <div style={{ ...sectionStyle, borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '4px 0' }}>
        <div style={rowStyle}>
          <span style={boldStyle}>{sale.paymentMethod.toUpperCase()}</span>
          <span style={boldStyle}>{sale.total.toFixed(2)}</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div>ITEM NUMBER : {sale.items.length}</div>
      </div>

      {/* SCU Information */}
      <div style={{ ...sectionStyle, textAlign: 'center' }}>
        <div style={boldStyle}>SCU INFORMATION</div>
        <div style={rowStyle}>
          <span>Date: {dateStr}</span>
          <span>Time: {timeStr}</span>
        </div>
        <div style={rowStyle}>
          <span>SCU ID:</span>
          <span>{scuId}</span>
        </div>
        <div style={rowStyle}>
          <span>RECEIPT NUMBER :</span>
          <span>{receiptNumber}</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <div>Internal Data :</div>
          <div style={{ fontSize: '9px' }}>{internalData}</div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <div>Receipt Signature :</div>
          <div style={{ fontSize: '9px' }}>{receiptSignature}</div>
        </div>
      </div>

      {/* Invoice Info */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <span>INVOICE NUMBER :</span>
          <span style={{ fontSize: '9px' }}>{scuId} / {sale.id.split('-')[1] || '1056'}</span>
        </div>
        <div style={rowStyle}>
          <span>Date: {dateStr}</span>
          <span>Time: {timeStr}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        <div>End of Legal Receipt</div>
        <div>Powered by Veira POS & eTIMS</div>
      </div>

      {/* QR Code */}
      <div style={{ textAlign: 'center', marginTop: '15px' }}>
        <div style={{ width: '120px', height: '120px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src={qrCodeUrl} 
            alt="E-TIMS QR Code" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      </div>
    </div>
  );
};

export default Receipt;
