import React, { useState, useEffect, useRef } from 'react';
import { format, subDays } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { supabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';

// Hotel Configuration - Centralized branding
const HOTEL_CONFIG = {
  name: 'Nhyiraba Hotel',
  tagline: 'Luxury & Excellence Redefined',
  address: 'Wassa Nkonya',
  phone: '+233 59 856 9016',
  email: 'Nhyirabahotel@gmail.com',
  website: 'www.nhyirabahotel.com',
  logo: '/logo.jpg',
  colors: {
    primary: '#1e40af',      // Blue
    secondary: '#059669',     // Green
    accent: '#dc2626',        // Red
    gold: '#d97706',         // Gold
    dark: '#1f2937',         // Dark gray
    light: '#f8fafc'         // Light gray
  },
  theme: {
    // Professional gradient colors for reports
    gradient: {
      primary: ['#1e3a8a', '#3b82f6'],
      secondary: ['#059669', '#10b981'],
      accent: ['#dc2626', '#ef4444']
    }
  }
};

const EnhancedReports = () => {
  const { user } = useUser();
  const { theme } = useTheme();
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState('7days');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  
  // Real-time data states
  const [hotelData, setHotelData] = useState({
    revenue: { dates: [], values: [] },
    occupancy: { dates: [], values: [] },
    rooms: [],
    reservations: [],
    guests: [],
    invoices: [],
    tasks: [],
    staff: []
  });

  // Load real-time data from database
  useEffect(() => {
    fetchRealTimeData();
  }, [dateRange]);

  const fetchRealTimeData = async () => {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = subDays(endDate, getDaysFromRange(dateRange));

      // Fetch all required data in parallel
      const [
        roomsData,
        reservationsData,
        guestsData,
        invoicesData,
        tasksData
      ] = await Promise.all([
        supabase.from('rooms').select('*'),
        supabase.from('reservations').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('guests').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('invoices').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('tasks').select('*').gte('created_at', startDate.toISOString())
      ]);

      // Process and calculate metrics
      const processedData = {
        rooms: roomsData.data || [],
        reservations: reservationsData.data || [],
        guests: guestsData.data || [],
        invoices: invoicesData.data || [],
        tasks: tasksData.data || [],
        revenue: calculateRevenueData(invoicesData.data || [], startDate, endDate),
        occupancy: calculateOccupancyData(reservationsData.data || [], roomsData.data || [], startDate, endDate)
      };

      setHotelData(processedData);
    } catch (error) {
      console.error('Error fetching real-time data:', error);
      toast.error('Failed to load real-time data');
    }
  };

  const getDaysFromRange = (range) => {
    switch(range) {
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      case '12months': return 365;
      default: return 7;
    }
  };

  const calculateRevenueData = (invoices, startDate, endDate) => {
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const dates = [];
    const values = [];

    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, days - i - 1);
      const dateStr = format(date, 'MMM dd');
      dates.push(dateStr);

      const dayRevenue = invoices
        .filter(invoice => {
          const invoiceDate = new Date(invoice.created_at);
          return invoiceDate.toDateString() === date.toDateString();
        })
        .reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);

      values.push(dayRevenue);
    }

    return { dates, values };
  };

  const calculateOccupancyData = (reservations, rooms, startDate, endDate) => {
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const dates = [];
    const values = [];
    const totalRooms = rooms.length || 1;

    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, days - i - 1);
      const dateStr = format(date, 'MMM dd');
      dates.push(dateStr);

      const occupiedRooms = reservations.filter(reservation => {
        const checkIn = new Date(reservation.check_in_date);
        const checkOut = new Date(reservation.check_out_date);
        return date >= checkIn && date <= checkOut && 
               (reservation.status === 'confirmed' || reservation.status === 'checked_in');
      }).length;

      const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);
      values.push(occupancyRate);
    }

    return { dates, values };
  };

  // Enhanced PDF generation with beautiful branding
  const generateBrandedPDF = async (reportType) => {
    return new Promise((resolve, reject) => {
      try {
        const doc = new jsPDF();
        
        // Add custom header with branding
        addBrandedHeader(doc);
        
        // Generate content based on report type
        let yPosition = 80; // Start content after header
        
        switch(reportType) {
          case 'summary':
            yPosition = generateSummaryContent(doc, yPosition);
            break;
          case 'financial':
            yPosition = generateFinancialContent(doc, yPosition);
            break;
          case 'occupancy':
            yPosition = generateOccupancyContent(doc, yPosition);
            break;
          case 'guests':
            yPosition = generateGuestsContent(doc, yPosition);
            break;
          case 'housekeeping':
            yPosition = generateHousekeepingContent(doc, yPosition);
            break;
          default:
            yPosition = generateSummaryContent(doc, yPosition);
        }
        
        // Add branded footer
        addBrandedFooter(doc);
        
        // Add page numbers
        addPageNumbers(doc);
        
        const pdfOutput = doc.output('datauristring');
        resolve({
          filename: `${HOTEL_CONFIG.name.replace(/\s+/g, '_')}_${reportType}_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
          fileContent: pdfOutput
        });
        
      } catch (error) {
        reject(error);
      }
    });
  };

  // Beautiful branded header
  const addBrandedHeader = (doc) => {
    const pageWidth = doc.internal.pageSize.width;
    
    // Header background gradient effect
    doc.setFillColor(...hexToRgb(HOTEL_CONFIG.colors.primary));
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    // Add a subtle gradient effect with overlays
    doc.setFillColor(255, 255, 255, 0.1);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    // Hotel logo placeholder (would need actual logo implementation)
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 30, 12, 'F');
    doc.setTextColor(HOTEL_CONFIG.colors.primary);
    doc.setFontSize(8);
    doc.text('LOGO', 22, 32);
    
    // Hotel name and tagline
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(HOTEL_CONFIG.name, 45, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(HOTEL_CONFIG.tagline, 45, 35);
    
    // Date and time
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 45, 45);
    
    // Decorative line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(15, 55, pageWidth - 15, 55);
  };

  // Enhanced summary content with real-time metrics
  const generateSummaryContent = (doc, yPos) => {
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setTextColor(HOTEL_CONFIG.colors.dark);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary Report', 15, yPos);
    yPos += 15;
    
    // Date range
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${getDateRangeText()}`, 15, yPos);
    yPos += 20;
    
    // Key metrics in beautiful boxes
    const metrics = [
      {
        title: 'Total Revenue',
        value: `GH₵${hotelData.revenue.values.reduce((sum, val) => sum + val, 0).toLocaleString()}`,
        color: HOTEL_CONFIG.colors.secondary,
        icon: '💰'
      },
      {
        title: 'Occupancy Rate',
        value: `${Math.round(hotelData.occupancy.values.reduce((sum, val) => sum + val, 0) / hotelData.occupancy.values.length) || 0}%`,
        color: HOTEL_CONFIG.colors.primary,
        icon: '🏨'
      },
      {
        title: 'Active Guests',
        value: hotelData.guests.length.toString(),
        color: HOTEL_CONFIG.colors.accent,
        icon: '👥'
      },
      {
        title: 'Total Bookings',
        value: hotelData.reservations.length.toString(),
        color: HOTEL_CONFIG.colors.gold,
        icon: '📅'
      }
    ];
    
    // Draw metric boxes
    const boxWidth = (pageWidth - 60) / 2;
    const boxHeight = 30;
    
    metrics.forEach((metric, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 15 + col * (boxWidth + 15);
      const y = yPos + row * (boxHeight + 10);
      
      // Box background
      doc.setFillColor(...hexToRgb(metric.color), 0.1);
      doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'F');
      
      // Box border
      doc.setDrawColor(...hexToRgb(metric.color));
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'S');
      
      // Metric content
      doc.setTextColor(...hexToRgb(metric.color));
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(metric.value, x + 10, y + 12);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(metric.title, x + 10, y + 22);
    });
    
    yPos += 80;
    
    // Revenue chart section
    if (hotelData.revenue.values.length > 0) {
      yPos = addRevenueChart(doc, yPos);
    }
    
    // Recent activities section
    yPos = addRecentActivities(doc, yPos);
    
    return yPos;
  };

  // Add revenue chart with enhanced styling
  const addRevenueChart = (doc, yPos) => {
    const pageWidth = doc.internal.pageSize.width;
    
    // Chart title
    doc.setTextColor(HOTEL_CONFIG.colors.dark);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Revenue Trend', 15, yPos);
    yPos += 15;
    
    // Chart background
    const chartX = 15;
    const chartY = yPos;
    const chartWidth = pageWidth - 30;
    const chartHeight = 60;
    
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'FD');
    
    // Simple bar chart
    const maxRevenue = Math.max(...hotelData.revenue.values);
    const barWidth = (chartWidth - 20) / hotelData.revenue.values.length;
    
    hotelData.revenue.values.forEach((value, index) => {
      const barHeight = (value / maxRevenue) * (chartHeight - 20);
      const x = chartX + 10 + index * barWidth;
      const y = chartY + chartHeight - 10 - barHeight;
      
      doc.setFillColor(...hexToRgb(HOTEL_CONFIG.colors.primary));
      doc.rect(x, y, barWidth - 2, barHeight, 'F');
    });
    
    return yPos + chartHeight + 15;
  };

  // Add recent activities section
  const addRecentActivities = (doc, yPos) => {
    // Recent check-ins
    doc.setTextColor(HOTEL_CONFIG.colors.dark);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Activities', 15, yPos);
    yPos += 15;
    
    const recentCheckIns = hotelData.reservations
      .filter(res => res.status === 'checked_in')
      .slice(0, 5);
    
    if (recentCheckIns.length > 0) {
      // Table for recent activities
      const tableData = recentCheckIns.map(res => [
        res.guest_name || 'N/A',
        res.room_id || 'N/A',
        format(new Date(res.check_in_date), 'MMM dd, HH:mm'),
        res.status || 'N/A'
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Guest', 'Room', 'Check-in', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: hexToRgb(HOTEL_CONFIG.colors.primary),
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: 50
        },
        margin: { left: 15, right: 15 }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    return yPos;
  };

  // Enhanced financial content
  const generateFinancialContent = (doc, yPos) => {
    // Title
    doc.setTextColor(HOTEL_CONFIG.colors.dark);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Report', 15, yPos);
    yPos += 20;
    
    // Financial summary
    const totalRevenue = hotelData.invoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
    const paidInvoices = hotelData.invoices.filter(inv => inv.status === 'paid');
    const pendingAmount = hotelData.invoices
      .filter(inv => inv.status === 'pending')
      .reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
    
    // Financial metrics
    const financialMetrics = [
      ['Total Revenue', `GH₵${totalRevenue.toLocaleString()}`],
      ['Paid Invoices', paidInvoices.length.toString()],
      ['Pending Amount', `GH₵${pendingAmount.toLocaleString()}`],
      ['Collection Rate', `${Math.round((paidInvoices.length / hotelData.invoices.length) * 100) || 0}%`]
    ];
    
    doc.autoTable({
      startY: yPos,
      body: financialMetrics,
      theme: 'plain',
      styles: {
        fontSize: 12,
        cellPadding: 5
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { textColor: hexToRgb(HOTEL_CONFIG.colors.secondary) }
      },
      margin: { left: 15 }
    });
    
    yPos = doc.lastAutoTable.finalY + 20;
    
    // Detailed invoice table
    if (hotelData.invoices.length > 0) {
      const invoiceData = hotelData.invoices.slice(0, 15).map(inv => [
        inv.invoice_number || 'N/A',
        inv.guest_name || 'N/A',
        `GH₵${parseFloat(inv.amount || 0).toLocaleString()}`,
        format(new Date(inv.created_at), 'MMM dd'),
        inv.status || 'pending'
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Invoice #', 'Guest', 'Amount', 'Date', 'Status']],
        body: invoiceData,
        theme: 'striped',
        headStyles: {
          fillColor: hexToRgb(HOTEL_CONFIG.colors.secondary),
          textColor: 255,
          fontStyle: 'bold'
        },
        margin: { left: 15, right: 15 }
      });
    }
    
    return doc.lastAutoTable?.finalY || yPos;
  };

  // Enhanced occupancy content
  const generateOccupancyContent = (doc, yPos) => {
    // Title
    doc.setTextColor(HOTEL_CONFIG.colors.dark);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Occupancy Report', 15, yPos);
    yPos += 20;
    
    // Room status summary
    const roomStatusCounts = hotelData.rooms.reduce((acc, room) => {
      acc[room.status] = (acc[room.status] || 0) + 1;
      return acc;
    }, {});
    
    // Occupancy metrics
    const occupancyMetrics = Object.entries(roomStatusCounts).map(([status, count]) => [
      status.charAt(0).toUpperCase() + status.slice(1),
      count.toString(),
      `${Math.round((count / hotelData.rooms.length) * 100) || 0}%`
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['Room Status', 'Count', 'Percentage']],
      body: occupancyMetrics,
      theme: 'grid',
      headStyles: {
        fillColor: hexToRgb(HOTEL_CONFIG.colors.primary),
        textColor: 255,
        fontStyle: 'bold'
      },
      margin: { left: 15, right: 15 }
    });
    
    return doc.lastAutoTable?.finalY || yPos;
  };

  // Enhanced guests content
  const generateGuestsContent = (doc, yPos) => {
    // Title
    doc.setTextColor(HOTEL_CONFIG.colors.dark);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Guest Report', 15, yPos);
    yPos += 20;
    
    // Guest statistics
    const guestStats = [
      ['Total Guests', hotelData.guests.length.toString()],
      ['New Guests (This Period)', hotelData.guests.filter(g => new Date(g.created_at) > subDays(new Date(), getDaysFromRange(dateRange))).length.toString()],
      ['Active Reservations', hotelData.reservations.filter(r => r.status === 'confirmed' || r.status === 'checked_in').length.toString()]
    ];
    
    doc.autoTable({
      startY: yPos,
      body: guestStats,
      theme: 'plain',
      styles: { fontSize: 12, cellPadding: 5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { textColor: hexToRgb(HOTEL_CONFIG.colors.accent) }
      },
      margin: { left: 15 }
    });
    
    yPos = doc.lastAutoTable.finalY + 20;
    
    // Recent guests table
    if (hotelData.guests.length > 0) {
      const guestData = hotelData.guests.slice(0, 10).map(guest => [
        guest.full_name || 'N/A',
        guest.email || 'N/A',
        guest.phone_number || 'N/A',
        format(new Date(guest.created_at), 'MMM dd')
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Name', 'Email', 'Phone', 'Added']],
        body: guestData,
        theme: 'striped',
        headStyles: {
          fillColor: hexToRgb(HOTEL_CONFIG.colors.accent),
          textColor: 255,
          fontStyle: 'bold'
        },
        margin: { left: 15, right: 15 }
      });
    }
    
    return doc.lastAutoTable?.finalY || yPos;
  };

  // Enhanced housekeeping content
  const generateHousekeepingContent = (doc, yPos) => {
    // Title
    doc.setTextColor(HOTEL_CONFIG.colors.dark);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Housekeeping Report', 15, yPos);
    yPos += 20;
    
    // Task status summary
    const taskStatusCounts = hotelData.tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});
    
    // Task metrics
    const taskMetrics = Object.entries(taskStatusCounts).map(([status, count]) => [
      status.charAt(0).toUpperCase() + status.slice(1),
      count.toString()
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['Task Status', 'Count']],
      body: taskMetrics,
      theme: 'grid',
      headStyles: {
        fillColor: hexToRgb(HOTEL_CONFIG.colors.gold),
        textColor: 255,
        fontStyle: 'bold'
      },
      margin: { left: 15, right: 15 }
    });
    
    yPos = doc.lastAutoTable?.finalY + 20;
    
    // Recent tasks
    if (hotelData.tasks.length > 0) {
      const taskData = hotelData.tasks.slice(0, 10).map(task => [
        task.title || 'N/A',
        task.assigned_to || 'Unassigned',
        task.status || 'pending',
        task.priority || 'normal',
        task.due_date ? format(new Date(task.due_date), 'MMM dd') : 'No deadline'
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Task', 'Assigned To', 'Status', 'Priority', 'Due Date']],
        body: taskData,
        theme: 'striped',
        headStyles: {
          fillColor: hexToRgb(HOTEL_CONFIG.colors.gold),
          textColor: 255,
          fontStyle: 'bold'
        },
        margin: { left: 15, right: 15 }
      });
    }
    
    return doc.lastAutoTable?.finalY || yPos;
  };

  // Beautiful branded footer
  const addBrandedFooter = (doc) => {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    // Footer background
    doc.setFillColor(...hexToRgb(HOTEL_CONFIG.colors.dark));
    doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
    
    // Contact information
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    const footerText = `${HOTEL_CONFIG.address} | ${HOTEL_CONFIG.phone} | ${HOTEL_CONFIG.email} | ${HOTEL_CONFIG.website}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: 'center' });
    
    // Copyright
    doc.setFontSize(7);
    doc.text(`© ${new Date().getFullYear()} ${HOTEL_CONFIG.name}. All rights reserved.`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  };

  // Add page numbers
  const addPageNumbers = (doc) => {
    const pageCount = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 30, { align: 'right' });
    }
  };

  // Utility functions
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  const getDateRangeText = () => {
    const endDate = new Date();
    const startDate = subDays(endDate, getDaysFromRange(dateRange));
    return `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
  };

  // Main generate report function
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Refresh data before generating report
      await fetchRealTimeData();
      
      // Generate the PDF
      const pdfResult = await generateBrandedPDF(reportType);
      
      // Create report record
      const newReport = {
        id: crypto.randomUUID(),
        name: `${HOTEL_CONFIG.name} - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        date: new Date().toISOString(),
        type: reportType,
        format: 'pdf',
        generatedBy: user?.fullName || 'System',
        filename: pdfResult.filename,
        fileContent: pdfResult.fileContent,
        previewData: `Real-time ${reportType} report for ${getDateRangeText()}`
      };
      
      // Save to database
      await saveReportToSupabase(newReport);
      
      // Update state
      setReportHistory(prev => [newReport, ...prev]);
      
      toast.success('Beautiful branded report generated successfully!');
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveReportToSupabase = async (report) => {
    const { data, error } = await supabase
      .from('reports')
      .insert([report])
      .select();
      
    if (error) throw error;
    return data;
  };

  return (
    <div className={`enhanced-reports p-6 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <img 
              src={HOTEL_CONFIG.logo} 
              alt={`${HOTEL_CONFIG.name} Logo`}
              className="w-12 h-12 rounded-full border-2 border-blue-500"
            />
            <div>
              <h1 className="text-3xl font-bold text-blue-600">{HOTEL_CONFIG.name}</h1>
              <p className="text-gray-500">{HOTEL_CONFIG.tagline}</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold">Enhanced Report Generation</h2>
          <p className="text-gray-600">Generate beautiful, branded reports with real-time data</p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">Report Type</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="summary">Executive Summary</option>
              <option value="financial">Financial Report</option>
              <option value="occupancy">Occupancy Analysis</option>
              <option value="guests">Guest Report</option>
              <option value="housekeeping">Housekeeping Report</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date Range</label>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="12months">Last 12 Months</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 font-medium transition-all duration-200"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </span>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>
        </div>

        {/* Real-time Stats Preview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
            <h3 className="text-sm font-medium opacity-90">Total Revenue</h3>
            <p className="text-2xl font-bold">
              GH₵{hotelData.revenue.values.reduce((sum, val) => sum + val, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
            <h3 className="text-sm font-medium opacity-90">Avg Occupancy</h3>
            <p className="text-2xl font-bold">
              {Math.round(hotelData.occupancy.values.reduce((sum, val) => sum + val, 0) / hotelData.occupancy.values.length) || 0}%
            </p>
          </div>
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg">
            <h3 className="text-sm font-medium opacity-90">Active Guests</h3>
            <p className="text-2xl font-bold">{hotelData.guests.length}</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4 rounded-lg">
            <h3 className="text-sm font-medium opacity-90">Total Bookings</h3>
            <p className="text-2xl font-bold">{hotelData.reservations.length}</p>
          </div>
        </div>

        {/* Features showcase */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-8">
          <h3 className="text-lg font-semibold mb-4">✨ Enhanced Report Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">🏨</div>
              <span>Beautiful Hotel Branding</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">📊</div>
              <span>Real-time Data Integration</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm">🎨</div>
              <span>Professional Design</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm">📈</div>
              <span>Interactive Charts</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm">🔒</div>
              <span>Secure PDF Generation</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm">⚡</div>
              <span>Fast Performance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedReports;


