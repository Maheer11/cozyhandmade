import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const BURGUNDY = "#8B2035";
const DEEP     = "#2C1810";
const TAUPE    = "#A89080";
const CREAM    = "#F8F0E8";

const s = StyleSheet.create({
  page:          { fontFamily: "Helvetica", fontSize: 9, color: DEEP, backgroundColor: "#FFFFFF", padding: "40 48 40 48" },

  /* header */
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  brandName:     { fontFamily: "Times-Italic", fontSize: 22, color: BURGUNDY, letterSpacing: 0.5 },
  brandTagline:  { fontSize: 8, color: TAUPE, marginTop: 2, letterSpacing: 1 },
  invoiceLabel:  { fontSize: 9, color: TAUPE, textAlign: "right", letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 },
  invoiceNum:    { fontSize: 18, fontFamily: "Helvetica-Bold", color: DEEP, textAlign: "right" },

  divider:       { borderBottomWidth: 1, borderBottomColor: CREAM, marginBottom: 20 },
  dividerDark:   { borderBottomWidth: 1, borderBottomColor: "#E8DDD5", marginBottom: 0 },

  /* meta row */
  metaRow:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  metaBlock:     { flex: 1 },
  metaRight:     { flex: 1, alignItems: "flex-end" },
  metaLabel:     { fontSize: 7, color: TAUPE, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  metaValue:     { fontSize: 9, color: DEEP, lineHeight: 1.5 },
  metaBold:      { fontFamily: "Helvetica-Bold", fontSize: 9, color: DEEP },

  statusBadge:   { backgroundColor: CREAM, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: "flex-start", marginTop: 2 },
  statusText:    { fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase" },

  /* table */
  tableHead:     { flexDirection: "row", backgroundColor: DEEP, paddingVertical: 7, paddingHorizontal: 10 },
  tableHeadText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 0.8, textTransform: "uppercase" },
  tableRow:      { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: CREAM },
  tableRowAlt:   { backgroundColor: "#FDFAF7" },
  colName:       { flex: 4 },
  colQty:        { flex: 1, textAlign: "center" },
  colPrice:      { flex: 2, textAlign: "right" },
  colTotal:      { flex: 2, textAlign: "right" },
  cellText:      { fontSize: 9, color: DEEP, lineHeight: 1.4 },
  cellBold:      { fontFamily: "Helvetica-Bold", fontSize: 9, color: DEEP },

  /* totals */
  totalsWrap:    { alignItems: "flex-end", marginTop: 16, marginBottom: 24 },
  totalRow:      { flexDirection: "row", justifyContent: "flex-end", marginBottom: 4 },
  totalLabel:    { fontSize: 8.5, color: TAUPE, width: 90, textAlign: "right", marginRight: 16 },
  totalValue:    { fontSize: 8.5, color: DEEP, width: 80, textAlign: "right" },
  grandLabel:    { fontSize: 10, fontFamily: "Helvetica-Bold", color: DEEP, width: 90, textAlign: "right", marginRight: 16 },
  grandValue:    { fontSize: 10, fontFamily: "Helvetica-Bold", color: BURGUNDY, width: 80, textAlign: "right" },

  /* footer */
  footer:        { marginTop: "auto", paddingTop: 20, borderTopWidth: 1, borderTopColor: CREAM },
  footerText:    { fontSize: 8, color: TAUPE, textAlign: "center", lineHeight: 1.6 },
  footerBold:    { fontFamily: "Helvetica-Bold", fontSize: 8, color: TAUPE, textAlign: "center" },
  footerThanks:  { fontFamily: "Times-Italic", fontSize: 12, color: BURGUNDY, textAlign: "center", marginBottom: 6 },
});

/* ─── helpers ─────────────────────────────────────── */
function ngn(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    paid:       "#1D4ED8",
    delivered:  "#059669",
    shipped:    "#0369A1",
    processing: "#7C3AED",
    cancelled:  "#DC2626",
    pending:    "#D97706",
  };
  return map[status] ?? TAUPE;
}

/* ─── types ───────────────────────────────────────── */
export interface InvoiceData {
  orderId:    string;
  createdAt:  string;
  status:     string;
  items: {
    product_name:  string;
    quantity:      number;
    unit_price:    number;
    subtotal:      number;
  }[];
  total_amount:      number;
  delivery_address:  Record<string, string> | null;
  payment_channel:   string | null;
  paystack_reference: string | null;
}

/* ─── document ────────────────────────────────────── */
export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const addr    = data.delivery_address ?? {};
  const dateStr = new Date(data.createdAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const ref = data.orderId.slice(0, 8).toUpperCase();

  return (
    <Document
      title={`Invoice ${ref} — Woven With Love`}
      author="Woven With Love"
      subject="Order Invoice"
    >
      <Page size="A4" style={s.page}>

        {/* HEADER */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>Woven With Love</Text>
            <Text style={s.brandTagline}>HANDCRAFTED WITH HEART</Text>
          </View>
          <View>
            <Text style={s.invoiceLabel}>Invoice</Text>
            <Text style={s.invoiceNum}>#{ref}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* META */}
        <View style={s.metaRow}>
          {/* Bill to */}
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Bill To</Text>
            {addr.name  && <Text style={s.metaBold}>{addr.name}</Text>}
            {addr.email && <Text style={s.metaValue}>{addr.email}</Text>}
            {addr.phone && <Text style={s.metaValue}>{addr.phone}</Text>}
            {addr.address && <Text style={s.metaValue}>{addr.address}</Text>}
            {(addr.city || addr.state) && (
              <Text style={s.metaValue}>
                {[addr.city, addr.state].filter(Boolean).join(", ")}
              </Text>
            )}
            {addr.country && <Text style={s.metaValue}>{addr.country}</Text>}
            {!addr.name && !addr.email && (
              <Text style={s.metaValue}>Guest Customer</Text>
            )}
          </View>

          {/* Order details */}
          <View style={s.metaRight}>
            <Text style={s.metaLabel}>Order Details</Text>
            <Text style={s.metaValue}>Date: {dateStr}</Text>
            <Text style={s.metaValue}>Order: #{ref}</Text>
            {data.paystack_reference && data.paystack_reference !== data.orderId && (
              <Text style={s.metaValue}>Ref: {data.paystack_reference.slice(-10)}</Text>
            )}
            {data.payment_channel && (
              <Text style={s.metaValue}>
                Via: {data.payment_channel.replace(/_/g, " ")}
              </Text>
            )}
            <View style={[s.statusBadge, { backgroundColor: statusColor(data.status) + "18" }]}>
              <Text style={[s.statusText, { color: statusColor(data.status) }]}>
                {data.status}
              </Text>
            </View>
          </View>
        </View>

        {/* ITEMS TABLE */}
        <View style={s.dividerDark} />
        <View style={s.tableHead}>
          <Text style={[s.tableHeadText, s.colName]}>Item</Text>
          <Text style={[s.tableHeadText, s.colQty]}>Qty</Text>
          <Text style={[s.tableHeadText, s.colPrice]}>Unit Price</Text>
          <Text style={[s.tableHeadText, s.colTotal]}>Total</Text>
        </View>

        {data.items.map((item, i) => (
          <View key={i} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
            <Text style={[s.cellText, s.colName]}>{item.product_name}</Text>
            <Text style={[s.cellText, s.colQty]}>{item.quantity}</Text>
            <Text style={[s.cellText, s.colPrice]}>{ngn(item.unit_price)}</Text>
            <Text style={[s.cellBold, s.colTotal]}>{ngn(item.subtotal)}</Text>
          </View>
        ))}

        {/* TOTALS */}
        <View style={s.totalsWrap}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{ngn(data.total_amount)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Delivery</Text>
            <Text style={s.totalValue}>—</Text>
          </View>
          <View style={[s.totalRow, { marginTop: 6, borderTopWidth: 1, borderTopColor: CREAM, paddingTop: 8 }]}>
            <Text style={s.grandLabel}>Total</Text>
            <Text style={s.grandValue}>{ngn(data.total_amount)}</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={s.footer}>
          <Text style={s.footerThanks}>Thank you for your order!</Text>
          <Text style={s.footerText}>
            Questions? Reach us at mahhir09@gmail.com or via WhatsApp.
          </Text>
          <Text style={s.footerText}>
            This is a computer-generated invoice and requires no signature.
          </Text>
        </View>

      </Page>
    </Document>
  );
}
