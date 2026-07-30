const express = require("express");
const router = express.Router();
const db = require("../config/database");

// ── Safe migrations: add columns that may not exist yet ───────────────────────
// errno 1060 = "Duplicate column name" — safe to ignore (column already exists)
const tableMigrations = [
  "CREATE TABLE IF NOT EXISTS `pi_from_addresses` (`id` INT NOT NULL AUTO_INCREMENT, `label` VARCHAR(100) NOT NULL, `address` TEXT NOT NULL, `is_default` TINYINT(1) DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB",
];
tableMigrations.forEach(sql => db.query(sql, (err) => {
  if (err) console.error("[pi_from_addresses migration]", err.message);
}));

const migrations = [
  "ALTER TABLE quotations ADD COLUMN reference_no VARCHAR(100) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN from_address_id INT DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN from_address_custom TEXT DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN client_company VARCHAR(200) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN client_address1 VARCHAR(255) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN client_address2 VARCHAR(255) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN client_city VARCHAR(100) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN client_state VARCHAR(100) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN client_pincode VARCHAR(20) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN client_country VARCHAR(100) DEFAULT 'India'",
  "ALTER TABLE quotations ADD COLUMN tax_type VARCHAR(20) DEFAULT 'GST18'",
  "ALTER TABLE quotations ADD COLUMN custom_tax DECIMAL(5,2) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN exec_name VARCHAR(150) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN exec_phone VARCHAR(20) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN exec_email VARCHAR(150) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN terms_general TINYINT(1) DEFAULT 0",
  "ALTER TABLE quotations ADD COLUMN terms_tax TINYINT(1) DEFAULT 0",
  "ALTER TABLE quotations ADD COLUMN terms_project_period VARCHAR(255) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN terms_validity TINYINT(1) DEFAULT 1",
  "ALTER TABLE quotations ADD COLUMN terms_separate_orders TEXT DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN terms_payment VARCHAR(100) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN terms_payment_custom VARCHAR(255) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN terms_warranty VARCHAR(100) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN validity VARCHAR(100) DEFAULT NULL",
  "ALTER TABLE quotations ADD COLUMN terms_json TEXT DEFAULT NULL",
  "ALTER TABLE quotation_items ADD COLUMN brand_model VARCHAR(200) DEFAULT NULL",
  "ALTER TABLE quotation_items ADD COLUMN uom VARCHAR(50) DEFAULT 'Nos'",
  "ALTER TABLE quotation_items ADD COLUMN hsn_code VARCHAR(50) DEFAULT NULL",
];
migrations.forEach(sql => db.query(sql, (err) => {
  // 1060 = Duplicate column (already exists) — silently skip
  if (err && err.errno !== 1060) console.error("[quotation migration]", err.message);
}));

// FROM ADDRESSES (shared table)
router.get("/from-addresses", (req, res) => {
  db.query("SELECT * FROM pi_from_addresses ORDER BY id ASC", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});
router.post("/from-addresses", (req, res) => {
  const { label, address } = req.body;
  if (!label || !address) return res.status(400).json({ message: "Label and address required" });
  db.query("INSERT INTO pi_from_addresses (label, address) VALUES (?,?)", [label, address], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ id: result.insertId, label, address });
  });
});
router.delete("/from-addresses/:id", (req, res) => {
  db.query("DELETE FROM pi_from_addresses WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Deleted" });
  });
});

router.get("/", (req, res) => {
  const sql = `
    SELECT q.id, q.quotation_date AS invoice_date, q.grand_total, q.reference_no,
           c.customer_name, c.mobile_number, c.location_city, c.email,
           MIN(qi.description) AS description
    FROM quotations q
    JOIN customers c ON c.id = q.customer_id
    LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
    GROUP BY q.id, q.quotation_date, q.grand_total, q.reference_no,
             c.customer_name, c.mobile_number, c.location_city, c.email
    ORDER BY q.id ASC`;
  db.query(sql, (err, rows) => {
    if (err) { console.error(err); return res.status(500).json(err); }
    res.json(rows);
  });
});



/* GET INVOICE */
router.get("/:id", (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT 
      q.id AS quotation_id,
      q.quotation_date AS invoice_date,
      q.subtotal, q.total_tax, q.total_cgst, q.total_sgst, q.total_discount, q.grand_total,
      q.reference_no, q.from_address_id, q.from_address_custom,
      COALESCE(q.from_address_custom, fa.address) AS resolved_from_address,
      q.client_company, q.client_address1, q.client_address2, q.client_city,
      q.client_state, q.client_pincode, q.client_country,
      q.tax_type, q.custom_tax, q.exec_name, q.exec_phone, q.exec_email,
      q.terms_general, q.terms_tax, q.terms_project_period, q.terms_validity,
      q.terms_separate_orders, q.terms_payment, q.terms_payment_custom, q.terms_warranty,
      q.validity, q.terms_json,
      c.customer_name, c.mobile_number, c.email, c.location_city,
      qi.product_number, qi.description, qi.brand_model, qi.uom,
      qi.price, qi.quantity, qi.tax, qi.discount, qi.subtotal AS item_subtotal, qi.hsn_code
    FROM quotations q
    JOIN customers c ON c.id = q.customer_id
    JOIN quotation_items qi ON qi.quotation_id = q.id
    LEFT JOIN pi_from_addresses fa ON fa.id = q.from_address_id
    WHERE q.id = ?
  `;
  db.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows.length) return res.status(404).json([]);
    res.json(rows);
  });
});

/* ================= CREATE QUOTATION ================= */

const validateQuotation = (body) => {
  if (!body || typeof body !== "object") return "Invalid request body";
  const { customer, quotation, invoice, items } = body;
  const q = quotation || invoice; // support both field names
  const c = customer || {};

  if (!c.customer_name) return "Customer name is required";
  if (!c.mobile_number) return "Mobile number is required";
  if (!q || !q.quotation_date && !q.invoice_date) return "Date is required";
  if (!items || items.length === 0) return "At least one item is required";

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.description) return `Item ${i + 1}: Description is required`;
    if (item.price === "" || item.price === null || item.price === undefined) return `Item ${i + 1}: Price is required`;
    if (!item.quantity || item.quantity <= 0) return `Item ${i + 1}: Quantity must be greater than 0`;
  }
  return null;
};


router.post("/create", (req, res) => {
  const error = validateQuotation(req.body);
  if (error) return res.status(400).json({ message: error });

  const { customer, quotation, invoice, items, extra } = req.body;
  const q = quotation || invoice; // unified form sends "invoice"
  const ex = extra || {};
  const refNo = `QT-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.floor(1000+Math.random()*9000)}`;
  const quotationDate = (q && (q.quotation_date || q.invoice_date)) || new Date().toISOString().slice(0,10);

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ message: "Transaction error" });

    // Save to customers table
    db.query(
      `INSERT INTO customers (customer_name, mobile_number, email, location_city) VALUES (?,?,?,?)`,
      [customer.customer_name, customer.mobile_number, customer.email, customer.location_city],
      (err, customerResult) => {
        if (err) return db.rollback(() => res.status(500).json(err));
        const customerId = customerResult.insertId;

        // Also save to clients table for cross-module reuse
        db.query(
          `INSERT INTO clients (name, company_name, email, phone) VALUES (?,?,?,?)`,
          [customer.customer_name, ex.client_company || customer.customer_name, customer.email, customer.mobile_number],
          () => {} // non-blocking, best effort
        );

        db.query(
          `INSERT INTO quotations
           (customer_id, quotation_date, total_cgst, total_sgst, subtotal, total_tax, total_discount, grand_total,
            reference_no, from_address_id, from_address_custom,
            client_company, client_address1, client_address2, client_city, client_state, client_pincode, client_country,
            tax_type, custom_tax, exec_name, exec_phone, exec_email,
            terms_general, terms_tax, terms_project_period, terms_validity, terms_separate_orders,
            terms_payment, terms_payment_custom, terms_warranty, validity, terms_json)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            customerId, quotationDate,
            q.total_cgst || 0, q.total_sgst || 0, q.subtotal || 0,
            (q.total_cgst || 0) + (q.total_sgst || 0), q.total_discount || 0, q.grand_total || 0,
            refNo, ex.from_address_id || null, ex.from_address_custom || null,
            ex.client_company || null, ex.client_address1 || null, ex.client_address2 || null,
            ex.client_city || null, ex.client_state || null, ex.client_pincode || null, ex.client_country || "India",
            ex.tax_type || "GST18", ex.custom_tax || null,
            ex.exec_name || null, ex.exec_phone || null, ex.exec_email || null,
            ex.terms_general ? 1 : 0, ex.terms_tax ? 1 : 0, ex.terms_project_period || null,
            ex.terms_validity ? 1 : 0, ex.terms_separate_orders ? JSON.stringify(ex.terms_separate_orders) : null,
            ex.terms_payment || null, ex.terms_payment_custom || null, ex.terms_warranty || null,
            ex.validity || null, ex.terms_json || null,
          ],
          (err, quotationResult) => {
            if (err) return db.rollback(() => res.status(500).json(err));
            const quotationId = quotationResult.insertId;
            const values = items.map((item, index) => [
              quotationId, index + 1, item.description, item.brand_model || null, item.uom || "Nos",
              item.price, item.quantity, item.tax, item.discount, item.subtotal, item.hsn_code || null
            ]);
            db.query(
              `INSERT INTO quotation_items (quotation_id, product_number, description, brand_model, uom, price, quantity, tax, discount, subtotal, hsn_code) VALUES ?`,
              [values],
              err => {
                if (err) return db.rollback(() => res.status(500).json(err));
                db.commit(err => {
                  if (err) return db.rollback(() => res.status(500).json(err));
                  res.status(201).json({ message: "Quotation Created Successfully", quotationId, reference_no: refNo });
                });
              }
            );
          }
        );
      }
    );
  });
});

// Update

router.put("/:id", (req, res) => {

   const error = validateQuotation(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }
  
  const { id } = req.params;
  const { customer, quotation, invoice, items, extra } = req.body;
  const q = quotation || invoice;
  const ex = extra || {};
  const quotationDate = (q && (q.quotation_date || q.invoice_date)) || new Date().toISOString().slice(0,10);

  db.beginTransaction(err => {
    if (err) return res.status(500).json(err);

    db.query(
      `UPDATE customers SET customer_name=?, mobile_number=?, email=?, location_city=?
       WHERE id = (SELECT customer_id FROM quotations WHERE id=?)`,
      [customer.customer_name, customer.mobile_number, customer.email, customer.location_city, id],
      err => {
        if (err) return db.rollback(() => res.status(500).json(err));

        db.query(
          `UPDATE quotations SET
           quotation_date=?, subtotal=?, total_cgst=?, total_sgst=?, total_tax=?, total_discount=?, grand_total=?,
           from_address_id=?, from_address_custom=?,
           client_company=?, client_address1=?, client_address2=?, client_city=?, client_state=?, client_pincode=?, client_country=?,
           tax_type=?, custom_tax=?, exec_name=?, exec_phone=?, exec_email=?,
           terms_general=?, terms_tax=?, terms_project_period=?, terms_validity=?, terms_separate_orders=?,
           terms_payment=?, terms_payment_custom=?, terms_warranty=?, validity=?, terms_json=?
           WHERE id=?`,
          [
            quotationDate, q.subtotal || 0, q.total_cgst || 0, q.total_sgst || 0,
            (q.total_cgst || 0) + (q.total_sgst || 0), q.total_discount || 0, q.grand_total || 0,
            ex.from_address_id || null, ex.from_address_custom || null,
            ex.client_company || null, ex.client_address1 || null, ex.client_address2 || null,
            ex.client_city || null, ex.client_state || null, ex.client_pincode || null, ex.client_country || "India",
            ex.tax_type || "GST18", ex.custom_tax || null,
            ex.exec_name || null, ex.exec_phone || null, ex.exec_email || null,
            ex.terms_general ? 1 : 0, ex.terms_tax ? 1 : 0, ex.terms_project_period || null,
            ex.terms_validity ? 1 : 0, ex.terms_separate_orders ? JSON.stringify(ex.terms_separate_orders) : null,
            ex.terms_payment || null, ex.terms_payment_custom || null, ex.terms_warranty || null,
            ex.validity || null, ex.terms_json || null,
            id
          ],
          err => {
            if (err) return db.rollback(() => res.status(500).json(err));

            db.query(`DELETE FROM quotation_items WHERE quotation_id=?`, [id], err => {
              if (err) return db.rollback(() => res.status(500).json(err));

              const values = items.map((item, index) => [
                id, index + 1, item.description, item.brand_model || null, item.uom || "Nos",
                item.price, item.quantity, item.tax, item.discount, item.subtotal, item.hsn_code || null
              ]);

              db.query(
                `INSERT INTO quotation_items (quotation_id, product_number, description, brand_model, uom, price, quantity, tax, discount, subtotal, hsn_code) VALUES ?`,
                [values],
                err => {
                  if (err) return db.rollback(() => res.status(500).json(err));
                  db.commit(err => {
                    if (err) return db.rollback(() => res.status(500).json(err));
                    res.json({ message: "Quotation updated successfully" });
                  });
                }
              );
            });
          }
        );
      }
    );
  });
});



/// DELETE QUOTATION (SAFE)
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.beginTransaction(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Transaction failed" });
    }

    // delete items first
    db.query(
      "DELETE FROM quotation_items WHERE quotation_id = ?",
      [id],
      err => {
        if (err) {
          console.error(err);
          return db.rollback(() =>
            res.status(500).json({ error: "Item delete failed" })
          );
        }

        // delete quotation
        db.query(
          "DELETE FROM quotations WHERE id = ?",
          [id],
          err => {
            if (err) {
              console.error(err);
              return db.rollback(() =>
                res.status(500).json({ error: "Quotation delete failed" })
              );
            }

            db.commit(err => {
              if (err) {
                console.error(err);
                return db.rollback(() =>
                  res.status(500).json({ error: "Commit failed" })
                );
              }

              res.json({ message: "Quotation deleted successfully" });
            });
          }
        );
      }
    );
  });
});



const nodemailer = require("nodemailer");
const { generateInvoicePdf } = require("../backendutil/generateInvoicePdf");

router.post("/send-email/:id", (req, res) => {
  const { id } = req.params;
  const { to, subject } = req.body;

  const headerSql = `
    SELECT q.*, c.email, c.customer_name, c.mobile_number, c.location_city,
           q.grand_total, q.quotation_date, q.subtotal, q.total_cgst, q.total_sgst, q.total_discount
    FROM quotations q
    JOIN customers c ON q.customer_id = c.id
    WHERE q.id = ?`;

  const itemsSql = `
    SELECT product_number, description, price, quantity, subtotal
    FROM quotation_items WHERE quotation_id = ? ORDER BY product_number`;

  db.query(headerSql, [id], (err, headerRows) => {
    if (err) return res.status(500).json(err);
    if (!headerRows.length) return res.status(404).json({ message: "Quotation not found" });

    const quotation = headerRows[0];
    // normalize field name so generateInvoicePdf can use invoice_date
    quotation.invoice_date = quotation.quotation_date;

    const recipientEmail = to || quotation.email;
    if (!recipientEmail) return res.status(400).json({ message: "No email address provided" });

    db.query(itemsSql, [id], async (err, items) => {
      if (err) return res.status(500).json(err);

      const year = new Date(quotation.quotation_date).getFullYear();
      const qtNumber = `QT-${year}-${String(quotation.id).padStart(3, "0")}`;

      try {
        // Generate PDF with exact same design as the app
        const pdfBuffer = await generateInvoicePdf({ invoice: quotation, items, type: "quotation" });

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });

        await transporter.sendMail({
          from: `"Achme Communication" <${process.env.EMAIL_USER}>`,
          to: recipientEmail,
          subject: subject || `Quotation ${qtNumber}`,
          html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto;">
            <p style="font-size:16px;color:#1e293b;">Dear Customer,</p>
            <p style="font-size:14px;color:#374151;margin-top:12px;">Please find your <strong>Quotation ${qtNumber}</strong> attached to this email.</p>
            <p style="font-size:14px;color:#374151;margin-top:8px;">Thank you for your business.</p>
            <p style="font-size:14px;color:#374151;margin-top:16px;">Regards,<br/><strong>Achme Communication</strong></p>
          </div>`,
          attachments: [
            {
              filename: `Quotation_${qtNumber}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });

        res.json({ message: "Email sent successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to send email", error: err.message });
      }
    });
  });
});

module.exports = router;
