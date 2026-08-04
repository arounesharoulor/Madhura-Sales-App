import React, { useEffect, useState } from "react";
import api from "../api/api";
import companyLogo from "../assets/Com_logo.png";
import signImage from "../assets/sign.png";

const COMPANY_ADDRESS = "18, 2nd Floor, Rangaswamy Road, Sukrawar Pettai, R.S. Puram, Coimbatore, Tamil Nadu 641002.";

const ReceiptTemplate = ({ receiptId, customData }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customData) {
      setData(customData);
      setLoading(false);
      return;
    }
    if (!receiptId) return;

    setLoading(true);
    api.get(`/payment-receipts/${receiptId}`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || err.message || "Failed to load receipt");
        setLoading(false);
      });
  }, [receiptId, customData]);

  if (error) return <p style={{ padding: "2rem", color: "red", textAlign: "center" }}>{error}</p>;
  if (loading || !data) return <p style={{ padding: "2rem", color: "#666", textAlign: "center" }}>Loading…</p>;

  const fmtD = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const fmtN = n => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{
      fontFamily: "'Segoe UI', Arial, sans-serif",
      width: "794px",
      height: "1123px",
      boxSizing: "border-box",
      padding: "30px 40px",
      background: "#fff",
      color: "#111",
      overflow: "hidden",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between"
    }}>
      <div>
        {/* Header section */}
        <div style={{ display: "table", width: "100%", borderBottom: "3px solid #002060", paddingBottom: "10px" }}>
          <div style={{ display: "table-cell", verticalAlign: "middle", width: "50%" }}>
            <img src={companyLogo} alt="Madhura Logo" style={{ height: "55px", objectFit: "contain" }} />
          </div>
          <div style={{ display: "table-cell", verticalAlign: "middle", width: "50%", textAlign: "right", fontSize: "7.5pt", color: "#333", lineHeight: "1.4" }}>
            <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#002060", borderRadius: "50%", color: "#fff", textAlign: "center", lineHeight: "12px", marginRight: "6px", fontSize: "6pt" }}>📍</span>
            <div style={{ display: "inline-block", verticalAlign: "top", textAlign: "left", width: "240px" }}>
              {COMPANY_ADDRESS}
            </div>
          </div>
        </div>

        {/* Date Row */}
        <div style={{ display: "table", width: "100%", marginTop: "12px" }}>
          <div style={{ display: "table-cell", fontSize: "16pt", fontWeight: "bold", fontFamily: "'Times New Roman', serif", color: "#002060" }}>
            Receipt
          </div>
          <div style={{ display: "table-cell", textAlign: "right", fontSize: "11pt", fontWeight: "bold", fontFamily: "'Times New Roman', serif", color: "#002060" }}>
            Date: {fmtD(data.receipt_date)}
          </div>
        </div>

        {/* Document Details Gold Band */}
        <div style={{ backgroundColor: "#f9b233", color: "#000", padding: "10px 16px", marginTop: "15px", borderRadius: "2px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ fontSize: "9pt", fontWeight: "bold", width: "50%", padding: "2px 0" }}>
                  INVOICE NO: {data.invoice_no}
                </td>
                <td style={{ fontSize: "9pt", fontWeight: "bold", width: "50%", textAlign: "right", padding: "2px 0" }}>
                  Payment Date: {fmtD(data.payment_date)}
                </td>
              </tr>
              <tr>
                <td style={{ fontSize: "9pt", fontWeight: "bold", padding: "2px 0" }} colSpan="2">
                  SERVICE NO: {data.service_no}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Details 3-column Grid */}
        <div style={{ display: "table", width: "100%", marginTop: "20px", tableLayout: "fixed" }}>
          {/* Bank Account Details */}
          <div style={{ display: "table-cell", width: "42%", paddingRight: "10px", fontSize: "7.5pt", lineHeight: "1.5" }}>
            <div style={{ fontWeight: "bold", fontSize: "8.5pt", color: "#002060", marginBottom: "4px" }}>Account Details</div>
            <div><strong>Account Name :</strong> {data.account_name || "Madhura Technologies Private Limited"}</div>
            <div><strong>Account Type :</strong> {data.account_type || "Current Account"}</div>
            <div><strong>Bank Name :</strong> {data.bank_name || "Axis Bank, Aruppukottai"}</div>
            <div><strong>Account number :</strong> {data.account_number || "925020029656189"}</div>
            <div><strong>IFSC Code :</strong> {data.ifsc_code || "UTIB0002029"}</div>
          </div>

          {/* Billed To */}
          <div style={{ display: "table-cell", width: "38%", paddingRight: "10px", fontSize: "7.5pt", lineHeight: "1.5" }}>
            <div style={{ fontWeight: "bold", fontSize: "8.5pt", color: "#002060", marginBottom: "4px" }}>Billed To</div>
            <div style={{ fontWeight: "bold", fontSize: "8.5pt", color: "#111" }}>{data.client_company}</div>
            {data.client_name && <div>{data.client_name}</div>}
            <div style={{ color: "#444" }}>{data.client_address}</div>
          </div>

          {/* Payment Method */}
          <div style={{ display: "table-cell", width: "20%", fontSize: "7.5pt", lineHeight: "1.5" }}>
            <div style={{ fontWeight: "bold", fontSize: "8.5pt", color: "#002060", marginBottom: "4px" }}>Payment Method</div>
            <div style={{ fontWeight: "bold", fontSize: "8.5pt", color: "#111" }}>{data.payment_method}</div>
          </div>
        </div>

        {/* Services Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "25px", border: "1px solid #ccc" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ccc", backgroundColor: "#f9f9f9" }}>
              <th style={{ padding: "8px 10px", fontSize: "8pt", fontWeight: "bold", textAlign: "center", borderRight: "1px solid #ccc", width: "8%" }}>NO.</th>
              <th style={{ padding: "8px 12px", fontSize: "8pt", fontWeight: "bold", textAlign: "left", borderRight: "1px solid #ccc", width: "42%" }}>Services</th>
              <th style={{ padding: "8px 12px", fontSize: "8pt", fontWeight: "bold", textAlign: "right", borderRight: "1px solid #ccc", width: "18%" }}>Total Amount</th>
              <th style={{ padding: "8px 12px", fontSize: "8pt", fontWeight: "bold", textAlign: "right", borderRight: "1px solid #ccc", width: "16%" }}>Advance amount</th>
              <th style={{ padding: "8px 12px", fontSize: "8pt", fontWeight: "bold", textAlign: "right", width: "16%" }}>Received amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #ccc" }}>
                <td style={{ padding: "12px 10px", fontSize: "8.5pt", textAlign: "center", borderRight: "1px solid #ccc", fontWeight: "bold" }}>{item.sl_no || idx + 1}.</td>
                <td style={{ padding: "12px 12px", fontSize: "8.5pt", borderRight: "1px solid #ccc", fontWeight: "bold" }}>{item.service_name}</td>
                <td style={{ padding: "12px 12px", fontSize: "8.5pt", textAlign: "right", borderRight: "1px solid #ccc" }}>{fmtN(item.total_amount)}</td>
                <td style={{ padding: "12px 12px", fontSize: "8.5pt", textAlign: "right", borderRight: "1px solid #ccc" }}>{fmtN(item.advance_amount)}</td>
                <td style={{ padding: "12px 12px", fontSize: "8.5pt", textAlign: "right", fontWeight: "bold" }}>{fmtN(item.received_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total Amount Box */}
        <div style={{ display: "table", width: "100%", marginTop: "15px" }}>
          <div style={{ display: "table-row" }}>
            <div style={{ display: "table-cell" }}></div>
            <div style={{ display: "table-cell", textAlign: "right", width: "240px" }}>
              <div style={{
                backgroundColor: "#f9b233",
                color: "#000",
                fontSize: "9.5pt",
                fontWeight: "bold",
                padding: "8px 16px",
                display: "inline-block",
                borderRadius: "2px"
              }}>
                Total amount: ₹{fmtN(data.total_amount)}
              </div>
            </div>
          </div>
        </div>

        {/* Note section */}
        <div style={{ marginTop: "20px", fontSize: "9pt", fontWeight: "bold", color: "#111" }}>
          Note: This receipt acknowledges the amount received.
        </div>
      </div>

      <div>
        {/* Seal and Signatory section */}
        <div style={{ display: "table", width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
          <div style={{ display: "table-cell", width: "55%" }}></div>
          <div style={{ display: "table-cell", width: "45%", textAlign: "center", position: "relative" }}>
            {/* Signature image with seal */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "65px", marginBottom: "5px" }}>
              <img src={signImage} alt="Authorized Seal & Signature" style={{ height: "65px", objectFit: "contain" }} />
            </div>
            {/* Underline signatory line */}
            <div style={{ fontSize: "7pt", color: "#666", borderTop: "1px solid #002060", width: "180px", margin: "0 auto", paddingTop: "4px" }}>
              Authorised Signatory
            </div>
            <div style={{ fontSize: "7.5pt", fontWeight: "bold", color: "#002060", marginTop: "2px" }}>
              For Madhura Technologies Pvt. Ltd.
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div style={{
          display: "table",
          width: "100%",
          backgroundColor: "#f9b233",
          borderRadius: "4px 4px 0 0",
          overflow: "hidden",
          fontFamily: "'Segoe UI', sans-serif",
          fontSize: "7.5pt",
          fontWeight: "bold",
          marginTop: "20px"
        }}>
          <div style={{ display: "table-row" }}>
            <div style={{ display: "table-cell", width: "30%", padding: "7px 10px", color: "#000", textAlign: "left", clipPath: "polygon(0 0, 92% 0, 100% 100%, 0% 100%)" }}>
              📞 +91 90036 63660
            </div>
            <div style={{ display: "table-cell", width: "38%", padding: "7px 10px", color: "#000", textAlign: "center" }}>
              🌐 www.madhuratech.com
            </div>
            <div style={{ display: "table-cell", width: "32%", padding: "7px 10px", color: "#000", textAlign: "right" }}>
              ✉ biz@madhuratech.com
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: "#002060", height: "14px", width: "100%" }}></div>
      </div>
    </div>
  );
};

export default ReceiptTemplate;
