
import React from 'react';
import { Sale, BusinessConfig } from '../types';

interface ReceiptProps {
  sale: Sale;
  business: BusinessConfig;
}

const Receipt: React.FC<ReceiptProps> = ({ sale, business }) => {
  const dateStr = new Date(sale.timestamp).toLocaleString('en-KE');
  // Dynamic QR code URL based on the unique E-TIMS control number
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(sale.etimsControlNumber)}`;

  const containerStyle: React.CSSProperties = {
    fontFamily: 'Courier, monospace',
    width: '100%',
    maxWidth: '300px',
    margin: '0 auto',
    padding: '10px',
    color: '#000',
    fontSize: '12px',
    lineHeight: '1.2',
    position: 'relative'
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '15px'
  };

  const dividerStyle: React.CSSProperties = {
    borderTop: '1px dashed #000',
    margin: '8px 0'
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

  return (
    <div style={containerStyle}>
      {sale.status === 'voided' && <div style={voidOverlay}>VOIDED</div>}
      
      <div style={headerStyle}>
        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>{business.name.toUpperCase()}</div>
        <div style={{ fontSize: '10px' }}>{business.address}</div>
        <div style={{ fontSize: '10px' }}>PIN: {business.kraPin}</div>
        <div style={{ fontSize: '10px' }}>TEL: {business.whatsappNumber}</div>
      </div>

      <div style={dividerStyle} />
      
      <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
        <span>DATE:</span>
        <span>{dateStr}</span>
      </div>
      <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
        <span>STAFF:</span>
        <span>{sale.staffName.toUpperCase()}</span>
      </div>
      <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
        <span>TXN NO:</span>
        <span>#{sale.id}</span>
      </div>

      <div style={dividerStyle} />

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'left', paddingBottom: '4px' }}>ITEM</th>
            <th style={{ textAlign: 'center', paddingBottom: '4px' }}>QTY</th>
            <th style={{ textAlign: 'right', paddingBottom: '4px' }}>VAL</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ paddingTop: '4px' }}>{item.name.toUpperCase()}</td>
              <td style={{ textAlign: 'center', paddingTop: '4px' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right', paddingTop: '4px' }}>{item.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={dividerStyle} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
        <span>GROSS TOTAL:</span>
        <span>{sale.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      
      {sale.discount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#000' }}>
          <span>DISCOUNT:</span>
          <span>-{sale.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
        <span>VAT (16%):</span>
        <span>{sale.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '4px' }}>
        <span>TOTAL:</span>
        <span>KES {sale.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>

      <div style={dividerStyle} />

      <div style={{ fontSize: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>METHOD:</span>
          <span>{sale.paymentMethod.toUpperCase()}</span>
        </div>
        
        {sale.paymentMethod === 'Split' && sale.paymentDetails && (
          <div style={{ fontSize: '9px', marginLeft: '10px', color: '#333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span> - CASH:</span>
              <span>{sale.paymentDetails.cash.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span> - M-PESA:</span>
              <span>{sale.paymentDetails.mpesa.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div style={{ marginTop: '10px', fontWeight: 'bold' }}>E-TIMS CTRL:</div>
        <div style={{ fontSize: '9px', wordBreak: 'break-all' }}>{sale.etimsControlNumber}</div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px' }}>
        <div style={{ width: '100px', height: '100px', margin: '0 auto 10px', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img 
            src={qrCodeUrl} 
            alt="E-TIMS QR Code" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
        <div style={{ fontWeight: 'bold' }}>THANK YOU FOR SHOPPING!</div>
        <div style={{ fontSize: '8px', color: '#666' }}>Powered by Veira POS</div>
      </div>
    </div>
  );
};

export default Receipt;
