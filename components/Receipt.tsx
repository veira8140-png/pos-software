
import React from 'react';
import { Sale, BusinessConfig } from '../types';

interface ReceiptProps {
  sale: Sale;
  business: BusinessConfig;
}

const Receipt: React.FC<ReceiptProps> = ({ sale, business }) => {
  const dateStr = new Date(sale.timestamp).toLocaleString('en-KE');

  return (
    <div className="bg-white p-4 sm:p-8 max-w-[320px] mx-auto text-[12px] font-mono leading-tight print:p-0 print:max-w-none print:w-full">
      <div className="text-center mb-4 space-y-1">
        <h2 className="text-lg font-bold uppercase">{business.name}</h2>
        <p>{business.address}</p>
        <p>PIN: {business.kraPin}</p>
        <p>Tel: {business.whatsappNumber}</p>
      </div>

      <div className="border-t border-b border-dashed border-gray-400 py-2 my-2 space-y-1">
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{dateStr}</span>
        </div>
        <div className="flex justify-between">
          <span>Staff:</span>
          <span>{sale.staffName}</span>
        </div>
        <div className="flex justify-between">
          <span>TXN ID:</span>
          <span className="font-bold">{sale.id.toUpperCase()}</span>
        </div>
      </div>

      <div className="space-y-1 mb-4">
        <div className="flex font-bold border-b border-gray-200 pb-1 mb-1">
          <span className="flex-1">Description</span>
          <span className="w-10 text-center">Qty</span>
          <span className="w-20 text-right">Amount</span>
        </div>
        {sale.items.map((item, idx) => (
          <div key={idx} className="flex">
            <span className="flex-1 truncate pr-2">{item.name}</span>
            <span className="w-10 text-center">{item.quantity}</span>
            <span className="w-20 text-right">{item.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-400 pt-2 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{(sale.total - sale.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT (16%)</span>
          <span>{sale.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200 mt-1">
          <span>TOTAL KES</span>
          <span>{sale.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="mt-4 text-[10px] space-y-1">
        <div className="flex justify-between">
          <span>Payment Mode:</span>
          <span className="font-bold">{sale.paymentMethod}</span>
        </div>
        <p className="font-bold pt-1">E-TIMS Control Number:</p>
        <p className="break-all">{sale.etimsControlNumber}</p>
      </div>

      <div className="mt-6 text-center text-[10px] space-y-2">
        <div className="w-20 h-20 bg-gray-50 mx-auto flex items-center justify-center border border-gray-200 print:border-black">
            <span className="text-[8px] text-gray-400 print:text-black">KRA E-TIMS QR</span>
        </div>
        <p className="font-bold">Thank you for your business!</p>
        <p>Software by Veira POS</p>
        <p className="pt-2 text-[8px] opacity-50 italic">Issued subject to KRA regulations</p>
      </div>
    </div>
  );
};

export default Receipt;
