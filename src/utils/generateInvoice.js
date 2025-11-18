import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import LogoIcon from '../assets/images/logo.webp';

export const generateInvoicePDF = async (order) => {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const paymentStatus = order.status === 'completed' ? 'Paid' : 'Not Paid';

  const invoiceElement = document.createElement('div');
  invoiceElement.style.width = '800px';
  invoiceElement.style.padding = '30px';
  invoiceElement.style.fontFamily = 'Montserrat, sans-serif';
  invoiceElement.style.background = '#fff';
  invoiceElement.style.color = '#333';
  invoiceElement.style.fontSize = '14px';
  invoiceElement.style.lineHeight = '1.4';

  invoiceElement.innerHTML = `
    <!-- Header: Company Info Left, Logo Right -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px;">
      <div style="font-size:13px; color:#555; line-height:1.6;">
        <strong style="font-size:16px; color:#333;">Store1920</strong><br/>
        DIFC - Dubai, UAE<br/>
        Phone: +971 50 409 6028<br/>
        Email: support@store1920.com
      </div>
      <div>
        <img src="${LogoIcon}" style="max-width:100px;" />
      </div>
    </div>

    <!-- Invoice Title -->
    <h1 style="text-align:center; font-size:26px; color:#FF5100; margin-bottom:25px; font-weight:600;">INVOICE</h1>

    <!-- Order Info -->
    <div style="margin-bottom:25px; background:#f8f9fa; padding:15px; border-radius:6px;">
      <strong>Order ID:</strong> #${order.id}<br/>
      <strong>Date & Time:</strong> ${new Date(order.date_created).toLocaleString()}<br/>
      <strong>Payment Method:</strong> ${order.payment_method_title || order.payment_method}<br/>
      <strong>Payment Status:</strong> <span style="color:${paymentStatus === 'Paid' ? '#28a745' : '#dc3545'}; font-weight:600;">${paymentStatus}</span><br/>
      <strong>Email:</strong> ${order.billing.email}
    </div>

    <!-- Shipping Address -->
    <div style="margin-bottom:25px;">
      <h3 style="margin-bottom:10px; color:#FF5100; font-size:16px;">Shipping & Billing Address</h3>
      <div style="background:#f8f9fa; padding:15px; border-radius:6px; border-left:4px solid #FF5100;">
        ${order.shipping.first_name} ${order.shipping.last_name}<br/>
        ${order.shipping.address_1}<br/>
        ${order.shipping.address_2 ? order.shipping.address_2 + '<br/>' : ''}
        ${order.shipping.city}, ${order.shipping.state} ${order.shipping.postcode}<br/>
        ${order.shipping.country}<br/>
        <strong>Phone:</strong> ${order.shipping.phone}
      </div>
    </div>

    <!-- Product Table -->
    <table style="width:100%; border-collapse: collapse; font-size:13px; margin-bottom:20px;">
      <thead style="background:#FF5100; color:#fff;">
        <tr>
          <th style="padding:12px; border:1px solid #dee2e6; text-align:left;">Product</th>
          <th style="padding:12px; border:1px solid #dee2e6; text-align:center;">Qty</th>
          <th style="padding:12px; border:1px solid #dee2e6; text-align:right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${order.line_items.map((item, index) => `
          <tr style="background:${index % 2 === 0 ? '#ffffff' : '#f8f9fa'}">
            <td style="border:1px solid #dee2e6; padding:10px;">${item.name}</td>
            <td style="border:1px solid #dee2e6; padding:10px; text-align:center;">${item.quantity}</td>
            <td style="border:1px solid #dee2e6; padding:10px; text-align:right;">${order.currency} ${item.price}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Total -->
    <div style="text-align:right; margin-top:20px;">
      <div style="display:inline-block; background:#FF5100; color:#fff; padding:12px 25px; border-radius:6px; font-size:18px; font-weight:bold;">
        Total: ${order.currency} ${order.total}
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top:50px; text-align:center; font-size:13px; color:#6c757d; border-top:1px solid #dee2e6; padding-top:20px;">
      Thank you for shopping with Store1920! We hope you enjoy your purchase. 🌟
    </div>
  `;

  document.body.appendChild(invoiceElement);

  const canvas = await html2canvas(invoiceElement, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');

  const imgProps = doc.getImageProperties(imgData);
  const pdfWidth = pageWidth - 40;
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  doc.addImage(imgData, 'PNG', 20, 20, pdfWidth, pdfHeight);
  doc.save(`Invoice_${order.id}.pdf`);

  document.body.removeChild(invoiceElement);
};
