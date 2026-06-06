import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Define the JobData interface to strongly type the props
export interface JobData {
  companyName: string
  clientName: string
  jobDate: string
  services: { description: string; price: number }[]
  totalPrice: number
}

// Create styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: '#18181b', // zinc-900
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7', // zinc-200
    paddingBottom: 20,
  },
  companyDetails: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#09090b',
    marginBottom: 4,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#71717a', // zinc-500
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  clientSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#71717a',
    marginBottom: 4,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  jobDate: {
    fontSize: 12,
    color: '#52525b',
  },
  table: {
    width: '100%',
    marginBottom: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#09090b',
    paddingBottom: 8,
    marginBottom: 12,
  },
  colDescription: {
    flex: 3,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#71717a',
  },
  colPrice: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#71717a',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5', // zinc-100
  },
  rowDescription: {
    flex: 3,
    fontSize: 12,
  },
  rowPrice: {
    flex: 1,
    fontSize: 12,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#09090b',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 24,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 10,
    color: '#71717a',
    lineHeight: 1.5,
  },
})

// The PDF Document Component
export const InvoicePDF = ({ jobData }: { jobData: JobData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.companyDetails}>
          <Text style={styles.companyName}>{jobData.companyName}</Text>
          <Text style={{ fontSize: 10, color: '#71717a' }}>Professional Cleaning Services</Text>
        </View>
        <Text style={styles.invoiceTitle}>Invoice</Text>
      </View>

      {/* Client Details */}
      <View style={styles.clientSection}>
        <Text style={styles.sectionTitle}>Bill To:</Text>
        <Text style={styles.clientName}>{jobData.clientName}</Text>
        <Text style={styles.jobDate}>Date of Service: {jobData.jobDate}</Text>
      </View>

      {/* Services Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colDescription}>Service Description</Text>
          <Text style={styles.colPrice}>Amount</Text>
        </View>
        
        {jobData.services.map((service, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.rowDescription}>{service.description}</Text>
            <Text style={styles.rowPrice}>${service.price.toFixed(2)}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Due:</Text>
          <Text style={styles.totalValue}>${jobData.totalPrice.toFixed(2)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Please pay via Zelle, Venmo, Check, or our secure payment link.
        </Text>
        <Text style={styles.footerText}>Thank you for your business!</Text>
      </View>
    </Page>
  </Document>
)
