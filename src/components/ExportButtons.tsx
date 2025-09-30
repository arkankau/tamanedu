'use client'

import { useState } from 'react'
import { Download, FileText, BarChart3, Loader2 } from 'lucide-react'

interface ExportButtonsProps {
  sessionId: string
  sessionTitle: string
}

export function ExportButtons({ sessionId, sessionTitle }: ExportButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleExport = async (format: 'csv' | 'pdf', type: 'individual' | 'summary') => {
    const exportKey = `${format}-${type}`
    setLoading(exportKey)

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          format,
          type
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      if (format === 'csv') {
        // For CSV, the response is the file content
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${sessionTitle} - ${type === 'individual' ? 'Individual Results' : 'Class Summary'}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        // For PDF, we get JSON data to generate PDF on frontend
        const data = await response.json()
        await generatePDF(data.data, type)
      }

    } catch (error) {
      console.error('Export error:', error)
      alert(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setLoading(null)
    }
  }

  const generatePDF = async (data: any, type: 'individual' | 'summary') => {
    // Import jsPDF dynamically to avoid SSR issues
    const { jsPDF } = await import('jspdf')
    
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    let yPosition = 20

    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(data.session.title, 20, yPosition)
    yPosition += 10

    // Subtitle
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`${type === 'individual' ? 'Individual Results' : 'Class Summary'} Report`, 20, yPosition)
    yPosition += 5

    // Date
    doc.setFontSize(10)
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, yPosition)
    yPosition += 15

    if (type === 'summary') {
      // Class Summary Report
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Class Summary', 20, yPosition)
      yPosition += 10

      // Calculate class statistics
      const students = data.students
      const classAverage = students.length > 0 
        ? students.reduce((sum: number, student: any) => {
            const grades = student.grades || []
            const totalEarned = grades.reduce((s: number, g: any) => s + g.points_earned, 0)
            const totalPossible = grades.reduce((s: number, g: any) => s + g.points_possible, 0)
            return sum + (totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0)
          }, 0) / students.length
        : 0

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Students: ${students.length}`, 20, yPosition)
      yPosition += 5
      doc.text(`Class Average: ${Math.round(classAverage * 100) / 100}%`, 20, yPosition)
      yPosition += 15

      // Student list
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Student Results', 20, yPosition)
      yPosition += 10

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')

      // Table headers
      const headers = ['Student Name', 'Score', 'Percentage', 'Grade']
      const colWidths = [60, 30, 30, 25]
      let xPosition = 20

      doc.setFont('helvetica', 'bold')
      headers.forEach((header, index) => {
        doc.text(header, xPosition, yPosition)
        xPosition += colWidths[index]
      })
      yPosition += 7

      // Student rows
      doc.setFont('helvetica', 'normal')
      students.forEach((student: any) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage()
          yPosition = 20
        }

        const grades = student.grades || []
        const totalEarned = grades.reduce((sum: number, grade: any) => sum + grade.points_earned, 0)
        const totalPossible = grades.reduce((sum: number, grade: any) => sum + grade.points_possible, 0)
        const percentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0

        const getLetterGrade = (percentage: number): string => {
          if (percentage >= 97) return 'A+'
          if (percentage >= 93) return 'A'
          if (percentage >= 90) return 'A-'
          if (percentage >= 87) return 'B+'
          if (percentage >= 83) return 'B'
          if (percentage >= 80) return 'B-'
          if (percentage >= 77) return 'C+'
          if (percentage >= 73) return 'C'
          if (percentage >= 70) return 'C-'
          if (percentage >= 67) return 'D+'
          if (percentage >= 63) return 'D'
          if (percentage >= 60) return 'D-'
          return 'F'
        }

        xPosition = 20
        const rowData = [
          student.name,
          `${totalEarned}/${totalPossible}`,
          `${Math.round(percentage * 100) / 100}%`,
          getLetterGrade(percentage)
        ]

        rowData.forEach((data, index) => {
          doc.text(data, xPosition, yPosition)
          xPosition += colWidths[index]
        })
        yPosition += 6
      })

    } else {
      // Individual Results Report
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Individual Results', 20, yPosition)
      yPosition += 15

      // For individual results, show detailed breakdown
      data.students.forEach((student: any, studentIndex: number) => {
        if (yPosition > pageHeight - 50 || studentIndex > 0) {
          doc.addPage()
          yPosition = 20
        }

        // Student name
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(`Student: ${student.name}`, 20, yPosition)
        yPosition += 10

        // Question details
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')

        const responses = student.responses || []
        const grades = student.grades || []

        data.answerKeys.forEach((answerKey: any) => {
          const response = responses.find((r: any) => r.question_number === answerKey.question_number)
          const grade = grades.find((g: any) => g.question_number === answerKey.question_number)

          doc.text(`Q${answerKey.question_number}: ${response?.raw_answer || 'No answer'}`, 25, yPosition)
          yPosition += 4
          doc.text(`   Correct: ${answerKey.correct_answer}`, 25, yPosition)
          yPosition += 4
          doc.text(`   Result: ${grade?.is_correct ? 'Correct' : 'Incorrect'} (${grade?.points_earned || 0}/${grade?.points_possible || answerKey.points} pts)`, 25, yPosition)
          yPosition += 8
        })

        // Student total
        const totalEarned = grades.reduce((sum: number, grade: any) => sum + grade.points_earned, 0)
        const totalPossible = grades.reduce((sum: number, grade: any) => sum + grade.points_possible, 0)
        const percentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0

        yPosition += 5
        doc.setFont('helvetica', 'bold')
        doc.text(`Total Score: ${totalEarned}/${totalPossible} (${Math.round(percentage * 100) / 100}%)`, 25, yPosition)
        yPosition += 15
      })
    }

    // Save the PDF
    doc.save(`${sessionTitle} - ${type === 'individual' ? 'Individual Results' : 'Class Summary'}.pdf`)
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Simple export buttons for now */}
      <button
        onClick={() => handleExport('csv', 'individual')}
        disabled={loading === 'csv-individual'}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {loading === 'csv-individual' ? (
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        Individual CSV
      </button>
      
      <button
        onClick={() => handleExport('csv', 'summary')}
        disabled={loading === 'csv-summary'}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {loading === 'csv-summary' ? (
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
        ) : (
          <BarChart3 className="h-4 w-4 mr-2" />
        )}
        Summary CSV
      </button>
      
      <button
        onClick={() => handleExport('pdf', 'summary')}
        disabled={loading === 'pdf-summary'}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {loading === 'pdf-summary' ? (
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        PDF Report
      </button>
    </div>
  )
}
