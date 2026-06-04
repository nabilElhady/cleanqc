import * as React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// Brutalist styles utilizing standard Courier monospace font
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Courier',
    fontSize: 9,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 12,
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 9,
    color: '#666666',
    textTransform: 'uppercase',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#000000',
  },
  metaCol: {
    width: '50%',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  metaLabel: {
    fontSize: 7,
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#000000',
    color: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginTop: 15,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 5,
    alignItems: 'center',
  },
  colLabel: {
    flex: 1,
    textTransform: 'uppercase',
  },
  colStatus: {
    width: 60,
    textAlign: 'center',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  colPhoto: {
    width: 80,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  passText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  failText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  photoSection: {
    marginTop: 25,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  photoCard: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#000000',
    padding: 4,
  },
  photoImage: {
    width: '100%',
    height: 140,
  },
  photoLabel: {
    fontSize: 7,
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
})

interface PDFReportProps {
  job: {
    id: string
    title: string
    location: string
    completed_at: string
    checklist_templates: {
      name: string
    } | null
  }
  orgName: string
  crewName: string
  sections: {
    name: string
    items: {
      id: string
      label: string
      requires_photo: boolean
      status: 'PASS' | 'FAIL'
      photoUrl: string | null
    }[]
  }[]
  photos: {
    label: string
    url: string
  }[]
}

export default function PDFReportTemplate({
  job,
  orgName,
  crewName,
  sections,
  photos,
}: PDFReportProps) {
  const formattedDate = job.completed_at
    ? new Date(job.completed_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : 'N/A'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Quality Control Report</Text>
          <Text style={styles.subtitle}>CleanQC Quality Assurance System</Text>
        </View>

        {/* Metadata Grid */}
        <View style={styles.metaGrid}>
          <View style={[styles.metaCol, { borderRightWidth: 1, borderRightColor: '#000000' }]}>
            <Text style={styles.metaLabel}>Organization</Text>
            <Text style={styles.metaValue}>{orgName}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Job Title</Text>
            <Text style={styles.metaValue}>{job.title}</Text>
          </View>
          <View style={[styles.metaCol, { borderRightWidth: 1, borderRightColor: '#000000', borderBottomWidth: 0 }]}>
            <Text style={styles.metaLabel}>Completed By</Text>
            <Text style={styles.metaValue}>{crewName}</Text>
          </View>
          <View style={[styles.metaCol, { borderBottomWidth: 0 }]}>
            <Text style={styles.metaLabel}>Completed At</Text>
            <Text style={styles.metaValue}>{formattedDate}</Text>
          </View>
        </View>

        {/* Checklist Results Sections */}
        {sections.map((section) => (
          <View key={section.name} style={{ marginTop: 10 }}>
            <Text style={styles.sectionTitle}>{section.name}</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.colLabel}>Checklist Item Description</Text>
              <Text style={styles.colStatus}>Status</Text>
              <Text style={styles.colPhoto}>Photo Proof</Text>
            </View>
            {section.items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.colLabel}>{item.label}</Text>
                <Text
                  style={[
                    styles.colStatus,
                    item.status === 'PASS' ? styles.passText : styles.failText,
                  ]}
                >
                  {item.status}
                </Text>
                <Text style={styles.colPhoto}>
                  {item.requires_photo ? (item.photoUrl ? 'YES' : 'MISSING') : 'N/A'}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {/* Photos Appendix */}
        {photos.length > 0 && (
          <View style={styles.photoSection} break>
            <Text style={[styles.sectionTitle, { backgroundColor: '#000000' }]}>
              Appendix: Inspection Photos
            </Text>
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoCard}>
                  <Image src={photo.url} style={styles.photoImage} />
                  <Text style={styles.photoLabel}>{photo.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  )
}
