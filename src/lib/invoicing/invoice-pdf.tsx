import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { PDF_FONT_FAMILY } from "./register-pdf-fonts";
import { invoiceNumberToVariableSymbol } from "./invoice-number";

/**
 * Data pro PDF fakturu.
 * ARES se doplní později; zatím customer* přijdou z objednávky / manuálně.
 */
export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  description: string;
  amount: number;
  issuerName: string;
  issuerAddress: string;
  issuerIco: string;
  issuerNote: string;
  issuerBankAccount: string;
  customerName: string;
  customerIco: string;
  customerAddress: string;
  qrCodeDataUrl?: string;
  logoDataUrl?: string;
  paymentMethod?: string;
  footerNote?: string;
  dueDateLabel?: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 52,
    fontSize: 9,
    fontFamily: PDF_FONT_FAMILY,
    color: "#222",
    lineHeight: 1.45,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 36,
  },
  logo: {
    width: 66,
    height: 48,
  },
  headerBlock: {
    height: 48,
    justifyContent: "center",
    alignItems: "flex-end",
    position: "relative",
  },
  headerLine: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 72,
    borderBottomWidth: 2,
    borderBottomColor: "#222",
  },
  headerTitle: {
    fontSize: 20,
    textAlign: "right",
    lineHeight: 1,
  },
  headerTitleBold: {
    fontWeight: "bold",
    color: "#222",
  },
  headerTitleNumber: {
    fontWeight: "normal",
    color: "#888",
  },
  columns: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 40,
    marginBottom: 48,
  },
  column: {
    width: "46%",
  },
  sectionLine: {
    width: 42,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 7.5,
    color: "#888",
    letterSpacing: 1,
    marginBottom: 10,
  },
  partyName: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 9,
    marginBottom: 1,
  },
  kvBlock: {
    marginTop: 14,
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  kvRowFull: {
    marginBottom: 3,
  },
  kvLabel: {
    fontSize: 9,
    color: "#444",
  },
  kvValue: {
    fontSize: 9,
    textAlign: "right",
  },
  kvValueLeft: {
    fontSize: 9,
    textAlign: "left",
  },
  itemsSection: {
    marginBottom: 24,
  },
  itemsHeaderLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    paddingBottom: 4,
  },
  itemsHeader: {
    fontSize: 7.5,
    color: "#888",
    letterSpacing: 1,
    textAlign: "right",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  itemDescription: {
    fontSize: 10,
    width: "68%",
  },
  itemAmount: {
    fontSize: 10,
    width: "30%",
    textAlign: "right",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 8,
  },
  totalBlock: {
    alignItems: "flex-end",
  },
  totalLine: {
    width: 120,
    borderBottomWidth: 2,
    borderBottomColor: "#222",
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
  },
  qrBlock: {
    alignItems: "center",
    width: 110,
  },
  qrImage: {
    width: 96,
    height: 96,
  },
  qrLabel: {
    fontSize: 9,
    color: "#888",
    marginTop: 6,
    letterSpacing: 0.5,
  },
  footerNote: {
    marginTop: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    fontSize: 9,
    color: "#666",
    textAlign: "center",
  },
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}. ${month}. ${year}`;
}

function formatMoney(amount: number): string {
  const formatted = new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} Kč`;
}

function splitAddress(address: string): { line1: string; line2: string } {
  if (!address.trim()) return { line1: "", line2: "" };

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const line1 = parts[0];
    const rest = parts.slice(1).join(", ");
    const line2 = rest.replace(/^(\d{3})(\d{2})\s*/, "$1 $2 ");
    return { line1, line2 };
  }

  return { line1: address, line2: "" };
}

function PartyDetails({
  label,
  name,
  address,
  rows,
}: {
  label: string;
  name: string;
  address: string;
  rows: Array<{ label: string; value: string }>;
}) {
  const addressLines = splitAddress(address);

  return (
    <View style={styles.column}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.partyName}>{name}</Text>
      {addressLines.line1 ? (
        <Text style={styles.addressLine}>{addressLines.line1}</Text>
      ) : null}
      {addressLines.line2 ? (
        <Text style={styles.addressLine}>{addressLines.line2}</Text>
      ) : null}
      <View style={styles.kvBlock}>
        {rows.map((row) =>
          row.label ? (
            <View key={`${row.label}-${row.value}`} style={styles.kvRow}>
              <Text style={styles.kvLabel}>{row.label}</Text>
              <Text style={styles.kvValue}>{row.value}</Text>
            </View>
          ) : (
            <View key={`full-${row.value}`} style={styles.kvRowFull}>
              <Text style={styles.kvValueLeft}>{row.value}</Text>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  const variableSymbol = invoiceNumberToVariableSymbol(data.invoiceNumber);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {data.logoDataUrl ? (
            <Image src={data.logoDataUrl} style={styles.logo} />
          ) : (
            <View />
          )}
          <View style={styles.headerBlock}>
            <View style={styles.headerLine} />
            <Text style={styles.headerTitle}>
              <Text style={styles.headerTitleBold}>Faktura </Text>
              <Text style={styles.headerTitleNumber}>{data.invoiceNumber}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.columns}>
          <PartyDetails
            label="DODAVATEL"
            name={data.issuerName}
            address={data.issuerAddress}
            rows={[
              { label: "IČO", value: data.issuerIco },
              { label: "", value: data.issuerNote },
              { label: "Bankovní účet", value: data.issuerBankAccount },
              { label: "Variabilní symbol", value: variableSymbol },
              {
                label: "Způsob platby",
                value: data.paymentMethod ?? "Převodem",
              },
            ]}
          />

          <PartyDetails
            label="ODBĚRATEL"
            name={data.customerName}
            address={data.customerAddress}
            rows={[
              { label: "IČO", value: data.customerIco },
              { label: "Datum vystavení", value: formatDate(data.issueDate) },
              {
                label: data.dueDateLabel ?? "Datum splatnosti",
                value: formatDate(data.dueDate),
              },
            ]}
          />
        </View>

        <View style={styles.itemsSection}>
          <View style={styles.itemsHeaderLine}>
            <Text style={styles.itemsHeader}>CENA</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.itemDescription}>{data.description}</Text>
            <Text style={styles.itemAmount}>{formatMoney(data.amount)}</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          {data.qrCodeDataUrl ? (
            <View style={styles.qrBlock}>
              <Image src={data.qrCodeDataUrl} style={styles.qrImage} />
              <Text style={styles.qrLabel}>QR Platba</Text>
            </View>
          ) : (
            <View />
          )}
          <View style={styles.totalBlock}>
            <View style={styles.totalLine} />
            <Text style={styles.totalAmount}>{formatMoney(data.amount)}</Text>
          </View>
        </View>

        {data.footerNote ? (
          <Text style={styles.footerNote}>{data.footerNote}</Text>
        ) : null}
      </Page>
    </Document>
  );
}
