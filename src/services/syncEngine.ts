/**
 * Veira Integration Sync Engine
 * 
 * This service handles the transformation and synchronization of Veira POS data
 * to external accounting and reporting platforms.
 */

export interface SyncConfig {
  googleEnabled: boolean;
  zohoEnabled: boolean;
  qboEnabled: boolean;
}

export const SyncEngine = {
  /**
   * Transforms a Veira Sale into a Zoho Books Invoice structure
   */
  transformToZohoInvoice(sale: any) {
    return {
      customer_id: sale.customerId || "WALK-IN",
      date: new Date(sale.timestamp).toISOString().split('T')[0],
      invoice_number: `INV-${sale.id}`,
      line_items: sale.items.map((item: any) => ({
        name: item.name,
        rate: item.price,
        quantity: item.quantity,
        description: `SKU: ${item.code || 'N/A'}`
      })),
      payment_options: {
        payment_gateways: [
          {
            gateway_name: sale.paymentMethod
          }
        ]
      }
    };
  },

  /**
   * Transforms a Veira Sale into a QuickBooks SalesReceipt structure
   */
  transformToQBOReceipt(sale: any) {
    return {
      Line: sale.items.map((item: any, index: number) => ({
        Description: item.name,
        Amount: item.total,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: {
            name: item.name,
            value: item.productId
          },
          UnitPrice: item.price,
          Qty: item.quantity
        }
      })),
      CustomerRef: {
        value: sale.customerId || "1" // Default customer ID
      },
      PaymentMethodRef: {
        value: sale.paymentMethod
      },
      TotalAmt: sale.total
    };
  },

  /**
   * Prepares data for Google Sheets Append
   */
  prepareSheetRow(sale: any) {
    return [
      sale.id,
      new Date(sale.timestamp).toLocaleString(),
      sale.customerName || 'Walk-in',
      sale.total,
      sale.paymentMethod,
      sale.staffName,
      sale.items.length,
      sale.status
    ];
  }
};

/**
 * Technical Documentation & Schema Mappings
 * 
 * 1. ARCHITECTURE:
 *    - Source: Veira POS (Client-side state + LocalStorage)
 *    - Middleware: Express.js Server (Sync Engine)
 *    - Destinations: Zoho Books API, QBO API, Google Sheets API, Google Drive API
 * 
 * 2. IDEMPOTENCY:
 *    - Every transaction uses the Veira Sale ID as the 'External ID' in Zoho/QBO.
 *    - Before pushing, the system queries the destination for the External ID.
 * 
 * 3. SECURITY:
 *    - OAuth 2.0 with PKCE for all integrations.
 *    - Tokens stored in HttpOnly cookies or secure server-side storage.
 */
