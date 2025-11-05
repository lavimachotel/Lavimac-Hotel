import React, { useState, useEffect, useRef } from 'react';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import supabase from '../supabaseClient';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

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
  }
};

const EnhancedReportsWithRealData = () => {
  const { user } = useUser();
  const { theme } = useTheme();
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState('7days');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  
  // Real-time data states
  const [realTimeData, setRealTimeData] = useState({
    revenue: { dates: [], values: [], total: 0 },
    occupancy: { dates: [], values: [], average: 0 },
    rooms: [],
    reservations: [],
    guests: [],
    invoices: [],
    tasks: [],
    roomRevenue: 0,
    serviceRevenue: 0,
    totalBookings: 0,
    averageRate: 0,
    guestSatisfaction: 0,
    operationalStats: {}
  });

  // Enhanced data fetching with comprehensive hotel metrics
  const fetchRealTimeHotelData = async () => {
    try {
      console.log('🔄 Fetching real-time hotel data...');
      setIsGenerating(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = getStartDateFromRange(dateRange);
      
      console.log(`📅 Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

      // Fetch all data in parallel for better performance
      const [
        roomsResult,
        reservationsResult, 
        guestsResult,
        invoicesResult,
        tasksResult,
        servicesResult
      ] = await Promise.all([
        supabase.from('rooms').select('*'),
        supabase.from('reservations').select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase.from('guests').select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase.from('invoices').select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase.from('tasks').select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase.from('service_requests').select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      // Extract data
      const rooms = roomsResult.data || [];
      const reservations = reservationsResult.data || [];
      const guests = guestsResult.data || [];
      const invoices = invoicesResult.data || [];
      const tasks = tasksResult.data || [];
      const services = servicesResult.data || [];

      console.log('📊 Raw data fetched:', {
        rooms: rooms.length,
        reservations: reservations.length,
        guests: guests.length,
        invoices: invoices.length,
        tasks: tasks.length,
        services: services.length
      });

      // Calculate comprehensive metrics
      const processedData = calculateComprehensiveMetrics(
        rooms, reservations, guests, invoices, tasks, services, startDate, endDate
      );

      console.log('✅ Processed hotel data:', processedData);
      setRealTimeData(processedData);
      
    } catch (error) {
      console.error('❌ Error fetching real-time data:', error);
      toast.error('Failed to load real-time hotel data');
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate comprehensive hotel metrics
  const calculateComprehensiveMetrics = (rooms, reservations, guests, invoices, tasks, services, startDate, endDate) => {
    // Revenue calculations
    const totalRevenue = invoices.reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);
    const roomRevenue = invoices
      .filter(inv => inv.type === 'room' || !inv.type)
      .reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
    const serviceRevenue = invoices
      .filter(inv => inv.type === 'service')
      .reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);

    // Daily revenue breakdown
    const dailyRevenue = calculateDailyMetrics(invoices, startDate, endDate, 'amount');
    
    // Occupancy calculations
    const totalRooms = rooms.length || 1;
    const occupiedRooms = reservations.filter(res => 
      res.status === 'confirmed' || res.status === 'checked_in'
    ).length;
    const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);
    
    // Daily occupancy breakdown
    const dailyOccupancy = calculateDailyOccupancy(reservations, rooms, startDate, endDate);

    // Guest metrics
    const totalGuests = guests.length;
    const newGuests = guests.filter(g => 
      new Date(g.created_at) >= startDate && new Date(g.created_at) <= endDate
    ).length;

    // Booking metrics
    const totalBookings = reservations.length;
    const confirmedBookings = reservations.filter(r => r.status === 'confirmed').length;
    const checkedInBookings = reservations.filter(r => r.status === 'checked_in').length;

    // Average daily rate
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const averageRate = paidInvoices.length > 0 
      ? Math.round(totalRevenue / Math.max(confirmedBookings, 1))
      : 0;

    // Average length of stay (in days)
    const stays = reservations
      .filter(r => r.check_in_date && r.check_out_date)
      .map(r => {
        const inDate = new Date(r.check_in_date);
        const outDate = new Date(r.check_out_date);
        const diffDays = Math.max(1, Math.round((outDate - inDate) / (1000 * 60 * 60 * 24)));
        return isFinite(diffDays) ? diffDays : 0;
      });
    const averageLengthOfStayDays = stays.length > 0
      ? Math.round((stays.reduce((a, b) => a + b, 0) / stays.length) * 10) / 10
      : 0;

    // Pending amount from invoices
    const pendingAmount = invoices
      .filter(inv => (inv.status || '').toLowerCase() === 'pending' || (inv.status || '').toLowerCase() === 'unpaid')
      .reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);

    // Operational metrics
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;

    // Room status breakdown
    const roomStatusCounts = rooms.reduce((acc, room) => {
      acc[room.status] = (acc[room.status] || 0) + 1;
      return acc;
    }, {});

    // Guest satisfaction (simulated based on service completion rate)
    const serviceCompletionRate = services.length > 0 
      ? (services.filter(s => s.status === 'completed').length / services.length) * 100
      : 95; // Default high satisfaction

    return {
      revenue: {
        dates: dailyRevenue.dates,
        values: dailyRevenue.values,
        total: totalRevenue
      },
      occupancy: {
        dates: dailyOccupancy.dates,
        values: dailyOccupancy.values,
        average: occupancyRate
      },
      rooms,
      reservations,
      guests,
      invoices,
      tasks,
      services,
      roomRevenue,
      serviceRevenue,
      totalBookings,
      totalGuests,
      newGuests,
      confirmedBookings,
      checkedInBookings,
      averageRate,
      averageLengthOfStayDays,
      pendingAmount,
      guestSatisfaction: Math.round(serviceCompletionRate),
      operationalStats: {
        completedTasks,
        pendingTasks,
        maintenanceRooms,
        roomStatusCounts,
        totalRooms,
        occupiedRooms
      }
    };
  };

  // Calculate daily metrics for any field
  const calculateDailyMetrics = (data, startDate, endDate, field) => {
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const dates = [];
    const values = [];

    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, days - i - 1);
      const dateStr = format(date, 'MMM dd');
      dates.push(dateStr);

      const dayValue = data
        .filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate.toDateString() === date.toDateString();
        })
        .reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);

      values.push(dayValue);
    }

    return { dates, values };
  };

  // Calculate daily occupancy rates
  const calculateDailyOccupancy = (reservations, rooms, startDate, endDate) => {
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

  // Get start date from range selection
  const getStartDateFromRange = (range) => {
    const now = new Date();
    switch(range) {
      case '7days': return subDays(now, 7);
      case '30days': return subDays(now, 30);
      case '90days': return subDays(now, 90);
      case '12months': return subDays(now, 365);
      default: return subDays(now, 7);
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

  // Enhanced PDF generation with real data
  const generateEnhancedPDF = async (reportType) => {
    console.log('[Reports] generateEnhancedPDF called with type:', reportType);
    const doc = new jsPDF();
    // Load logo if not already cached
    let logo = logoDataUrl;
    if (!logo) {
      try {
        logo = await loadImageDataUrl(HOTEL_CONFIG.logo);
        setLogoDataUrl(logo);
      } catch (e) {
        // Ignore logo load errors; proceed without logo
      }
    }

    // Add header (financial uses a clean template header)
    if (reportType === 'financial') {
      console.log('[Reports] Using financial header template');
      addFinancialHeader(doc, logo);
    } else {
      console.log('[Reports] Using standard branded header');
      addProfessionalHeader(doc, logo);
    }

    // Generate content based on type with real data
    let yPosition = reportType === 'financial' ? 70 : 80;
    switch(reportType) {
      case 'summary':
        yPosition = generateRealSummaryReport(doc, yPosition);
        break;
      case 'financial':
        console.log('[Reports] Generating Financial body');
        yPosition = generateRealFinancialReport(doc, yPosition);
        break;
      case 'occupancy':
        yPosition = generateRealOccupancyReport(doc, yPosition);
        break;
      case 'monthly':
        yPosition = generateRealMonthlyReport(doc, yPosition);
        break;
      default:
        yPosition = generateRealSummaryReport(doc, yPosition);
    }

    // Add professional footer and page numbers
    addProfessionalFooter(doc);
    addPageNumbers(doc);
    console.log('[Reports] PDF pages:', doc.internal.getNumberOfPages());

    const pdfOutput = doc.output('datauristring');
    return {
      filename: `${HOTEL_CONFIG.name.replace(/\s+/g, '_')}_${reportType}_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`,
      fileContent: pdfOutput
    };
  };

  // Professional header with real hotel branding
  const addProfessionalHeader = (doc, logo) => {
    const pageWidth = doc.internal.pageSize.width;
    
    // Gradient background effect
    doc.setFillColor(...hexToRgb(HOTEL_CONFIG.colors.primary));
    doc.rect(0, 0, pageWidth, 65, 'F');
    
    // Add overlay for depth
    doc.setFillColor(255, 255, 255, 0.15);
    doc.rect(0, 0, pageWidth, 32, 'F');
    
    // Hotel logo
    if (logo) {
      try {
        doc.addImage(logo, 'JPEG', 15, 18, 30, 30);
      } catch (_) {
        // Fallback to simple circle if image embedding fails
        doc.setFillColor(255, 255, 255);
        doc.circle(28, 32, 15, 'F');
      }
    } else {
      doc.setFillColor(255, 255, 255);
      doc.circle(28, 32, 15, 'F');
    }
    
    // Hotel name and tagline
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(HOTEL_CONFIG.name, 50, 28);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(HOTEL_CONFIG.tagline, 50, 38);
    
    // Report generation info
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 50, 48);
    doc.text(`Prepared by: ${user?.fullName || user?.username || 'System'}`, 50, 55);
    
    // Decorative elements
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1);
    doc.line(15, 62, pageWidth - 15, 62);
  };

  // Clean financial header to match the provided template
  const addFinancialHeader = (doc, logo) => {
    const pageWidth = doc.internal.pageSize.width;
    // White header with logo at left and contact at right
    if (logo) {
      try { doc.addImage(logo, 'JPEG', 20, 12, 28, 28); } catch (_) {}
    }
    // Right contact info (use hotel contact)
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const rightX = pageWidth - 25;
    const lines = [
      HOTEL_CONFIG.address,
      HOTEL_CONFIG.email,
      HOTEL_CONFIG.phone,
      HOTEL_CONFIG.website
    ];
    lines.forEach((t, i) => doc.text(t, rightX, 16 + i * 5, { align: 'right' }));
    // Gold accent line
    const gold = hexToRgb(HOTEL_CONFIG.colors.gold);
    doc.setDrawColor(...gold);
    doc.setLineWidth(1.5);
    doc.line(20, 42, pageWidth - 20, 42);
  };

  // Helper to load an image URL to data URL for jsPDF
  const loadImageDataUrl = (url) => new Promise((resolve, reject) => {
    try {
      fetch(url)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    } catch (e) {
      reject(e);
    }
  });

  // Generate real summary report with actual data
  const generateRealSummaryReport = (doc, yPos) => {
    const pageWidth = doc.internal.pageSize.width;
    
    // Report title
    doc.setTextColor(...hexToRgb(HOTEL_CONFIG.colors.dark));
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary Report', 15, yPos);
    yPos += 20;
    
    // Period information
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const periodText = `Reporting Period: ${getDateRangeText()} | Real-time Data as of ${format(new Date(), 'MMM dd, yyyy HH:mm')}`;
    doc.text(periodText, 15, yPos);
    yPos += 25;
    
    // Key Performance Indicators
    doc.setTextColor(...hexToRgb(HOTEL_CONFIG.colors.dark));
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Indicators', 15, yPos);
    yPos += 15;
    
    // KPI boxes with real data
    const kpis = [
      {
        title: 'Total Revenue',
        value: `GH₵${realTimeData.revenue.total.toLocaleString()}`,
        subtitle: `From ${realTimeData.invoices.length} transactions`,
        color: HOTEL_CONFIG.colors.secondary
      },
      {
        title: 'Occupancy Rate', 
        value: `${realTimeData.occupancy.average}%`,
        subtitle: `${realTimeData.operationalStats.occupiedRooms}/${realTimeData.operationalStats.totalRooms} rooms occupied`,
        color: HOTEL_CONFIG.colors.primary
      },
      {
        title: 'Total Bookings',
        value: realTimeData.totalBookings.toString(),
        subtitle: `${realTimeData.confirmedBookings} confirmed, ${realTimeData.checkedInBookings} checked in`,
        color: HOTEL_CONFIG.colors.accent
      },
      {
        title: 'Guest Satisfaction',
        value: `${realTimeData.guestSatisfaction}%`,
        subtitle: `Based on ${realTimeData.services.length} service requests`,
        color: HOTEL_CONFIG.colors.gold
      }
    ];
    
    // Draw KPI boxes
    const boxWidth = (pageWidth - 60) / 2;
    const boxHeight = 35;
    
    kpis.forEach((kpi, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 15 + col * (boxWidth + 15);
      const y = yPos + row * (boxHeight + 10);
      
      // Box with gradient effect
      doc.setFillColor(...hexToRgb(kpi.color), 0.1);
      doc.roundedRect(x, y, boxWidth, boxHeight, 4, 4, 'F');
      
      doc.setDrawColor(...hexToRgb(kpi.color));
      doc.setLineWidth(1);
      doc.roundedRect(x, y, boxWidth, boxHeight, 4, 4, 'S');
      
      // KPI content
      doc.setTextColor(...hexToRgb(kpi.color));
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.value, x + 10, y + 15);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...hexToRgb(HOTEL_CONFIG.colors.dark));
      doc.text(kpi.title, x + 10, y + 25);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(kpi.subtitle, x + 10, y + 32);
    });
    
    yPos += 90;
    
    // Revenue breakdown section
    if (realTimeData.revenue.total > 0) {
      yPos = addRevenueBreakdown(doc, yPos);
    }
    
    // Recent activity section
    yPos = addRecentActivity(doc, yPos);
    
    return yPos;
  };

  // Add revenue breakdown with real data
  const addRevenueBreakdown = (doc, yPos) => {
    doc.setTextColor(...hexToRgb(HOTEL_CONFIG.colors.dark));
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Revenue Breakdown', 15, yPos);
    yPos += 15;
    
    // Revenue breakdown data
    const otherRevenue = realTimeData.revenue.total - realTimeData.roomRevenue - realTimeData.serviceRevenue;
    
    const revenueData = [
      ['Room Revenue', `GH₵${realTimeData.roomRevenue.toLocaleString()}`, `${Math.round((realTimeData.roomRevenue / realTimeData.revenue.total) * 100)}%`],
      ['Service Revenue', `GH₵${realTimeData.serviceRevenue.toLocaleString()}`, `${Math.round((realTimeData.serviceRevenue / realTimeData.revenue.total) * 100)}%`],
      ['Other Revenue', `GH₵${otherRevenue.toLocaleString()}`, `${Math.round((otherRevenue / realTimeData.revenue.total) * 100)}%`],
      ['Total Revenue', `GH₵${realTimeData.revenue.total.toLocaleString()}`, '100%']
    ];
    
    doc.autoTable({
      startY: yPos,
      head: [['Revenue Source', 'Amount', 'Percentage']],
      body: revenueData,
      theme: 'grid',
      headStyles: {
        fillColor: hexToRgb(HOTEL_CONFIG.colors.secondary),
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 11
      },
      bodyStyles: {
        fontSize: 10
      },
      margin: { left: 15, right: 15 }
    });
    
    return doc.lastAutoTable?.finalY + 15 || yPos + 50;
  };

  // Add recent activity with real data
  const addRecentActivity = (doc, yPos) => {
    doc.setTextColor(...hexToRgb(HOTEL_CONFIG.colors.dark));
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Activity', 15, yPos);
    yPos += 15;
    
    // Recent reservations
    const recentReservations = realTimeData.reservations
      .slice(0, 5)
      .map(res => [
        res.guest_name || 'N/A',
        res.room_id || 'N/A', 
        format(new Date(res.check_in_date), 'MMM dd'),
        res.status || 'pending'
      ]);
    
    if (recentReservations.length > 0) {
      doc.autoTable({
        startY: yPos,
        head: [['Guest', 'Room', 'Check-in', 'Status']],
        body: recentReservations,
        theme: 'striped',
        headStyles: {
          fillColor: hexToRgb(HOTEL_CONFIG.colors.primary),
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        margin: { left: 15, right: 15 }
      });
      
      return doc.lastAutoTable?.finalY + 15 || yPos + 40;
    }
    
    return yPos;
  };

  // Financial report using real data
  const generateRealFinancialReport = (doc, yPos) => {
    // Title centered
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    const pageWidth = doc.internal.pageSize.width;
    doc.text('Hotel Financial Statement', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Intro paragraph
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const intro = `This Financial Statement provides a detailed financial overview of ${HOTEL_CONFIG.name} for the selected period. ` +
      `It includes insights into the hotel's financial performance, financial position, and cash flows during the period.`;
    const introLines = doc.splitTextToSize(intro, pageWidth - 60);
    doc.text(introLines, 30, yPos);
    yPos += introLines.length * 5 + 10;

    // Summary metrics
    const totalRevenue = realTimeData.revenue.total;
    const pendingAmount = realTimeData.pendingAmount || 0;
    const paidInvoices = realTimeData.invoices.filter(inv => (inv.status || '').toLowerCase() === 'paid').length;
    const collectionRate = realTimeData.invoices.length > 0
      ? Math.round((paidInvoices / realTimeData.invoices.length) * 100)
      : 0;

    // Prepared/Company/Date table
    doc.autoTable({
      startY: yPos,
      theme: 'grid',
      head: [['Prepared by:', (user?.fullName || user?.username || 'System'), 'Company:', HOTEL_CONFIG.name]],
      body: [['Date:', format(new Date(), 'PPP'), 'Email:', HOTEL_CONFIG.email]],
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [245, 247, 250], textColor: 60 },
      columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } },
      margin: { left: 20, right: 20 }
    });
    yPos = doc.lastAutoTable?.finalY + 12 || yPos + 28;

    // Summary table: Total Revenue, Net Profit, Total Expenses, EBITDA
    const gold = hexToRgb(HOTEL_CONFIG.colors.gold);
    const netProfit = totalRevenue - pendingAmount; // placeholder until expenses exist
    const totalExpenses = 0; // if expenses table exists, compute; else 0
    const ebitda = netProfit; // without expenses, treat as net
    doc.autoTable({
      startY: yPos,
      theme: 'grid',
      head: [['Total Revenue', `GH₵${totalRevenue.toLocaleString()}`]],
      body: [
        ['Net Profit', `GH₵${netProfit.toLocaleString()}`],
        ['Total Expenses', `GH₵${totalExpenses.toLocaleString()}`],
        ['EBITDA', `GH₵${ebitda.toLocaleString()}`]
      ],
      styles: { fontSize: 11, cellPadding: 5 },
      headStyles: { fillColor: [248, 250, 252], textColor: 60, fontStyle: 'bold' },
      bodyStyles: { textColor: 50 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { textColor: gold } },
      margin: { left: 20, right: 20 }
    });

    yPos = doc.lastAutoTable?.finalY + 15 || yPos + 40;

    // A. Income Statement heading
    doc.setTextColor(25, 25, 25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('A. Income Statement', 20, yPos);
    yPos += 8;

    // Income statement table with revenue breakdown
    const otherRevenue = Math.max(0, totalRevenue - realTimeData.roomRevenue - realTimeData.serviceRevenue);
    const incomeRows = [
      ['Room Revenue', `GH₵${realTimeData.roomRevenue.toLocaleString()}`],
      ['Food and Beverage Revenue', `GH₵${realTimeData.serviceRevenue.toLocaleString()}`],
      ['Other Revenue', `GH₵${otherRevenue.toLocaleString()}`],
      ['Total Revenue', `GH₵${totalRevenue.toLocaleString()}`]
    ];
    doc.autoTable({
      startY: yPos,
      head: [['Revenue', 'Amount (GH₵)']],
      body: incomeRows,
      theme: 'grid',
      headStyles: { fillColor: [240, 243, 247], textColor: 60, fontStyle: 'bold' },
      bodyStyles: { fontSize: 11 },
      margin: { left: 20, right: 20 }
    });

    yPos = doc.lastAutoTable?.finalY + 12 || yPos + 40;

    // Optional: collection rate note
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Collection rate: ${collectionRate}% • Paid invoices: ${paidInvoices} • Pending: GH₵${pendingAmount.toLocaleString()}`, 20, yPos);
    yPos += 6;

    return yPos;
  };

  // Occupancy report using real data
  const generateRealOccupancyReport = (doc, yPos) => {
    doc.setTextColor(...hexToRgb(HOTEL_CONFIG.colors.dark));
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Occupancy Analysis', 15, yPos);
    yPos += 20;

    const stats = realTimeData.operationalStats;
    const occupancyMetrics = [
      ['Total Rooms', `${stats.totalRooms}`],
      ['Occupied Rooms', `${stats.occupiedRooms}`],
      ['Average Occupancy', `${realTimeData.occupancy.average}%`],
      ['Average Length of Stay', realTimeData.averageLengthOfStayDays > 0 ? `${realTimeData.averageLengthOfStayDays} days` : 'N/A']
    ];

    doc.autoTable({
      startY: yPos,
      body: occupancyMetrics,
      theme: 'plain',
      styles: { fontSize: 12, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
      margin: { left: 15 }
    });

    yPos = doc.lastAutoTable?.finalY + 15 || yPos + 40;

    // Room status breakdown table
    const statusEntries = Object.entries(stats.roomStatusCounts || {});
    if (statusEntries.length > 0) {
      const rows = statusEntries.map(([status, count]) => [
        status ? status.toString().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown',
        `${count}`,
        `${Math.round((count / Math.max(stats.totalRooms, 1)) * 100)}%`
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['Status', 'Count', 'Percentage']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: hexToRgb(HOTEL_CONFIG.colors.primary), textColor: 255, fontStyle: 'bold' },
        margin: { left: 15, right: 15 }
      });

      yPos = doc.lastAutoTable?.finalY + 15 || yPos + 40;
    }

    // Recent reservations
    const recent = realTimeData.reservations.slice(0, 12).map(r => [
      r.guest_name || '—',
      r.room_id || '—',
      `${format(new Date(r.check_in_date), 'MMM dd')} - ${format(new Date(r.check_out_date), 'MMM dd')}`,
      (r.status || 'pending').toString()
    ]);

    if (recent.length > 0) {
      doc.autoTable({
        startY: yPos,
        head: [['Guest', 'Room', 'Stay', 'Status']],
        body: recent,
        margin: { left: 15, right: 15 }
      });
      yPos = doc.lastAutoTable?.finalY + 15 || yPos + 40;
    }

    return yPos;
  };

  // Generate real monthly report
  const generateRealMonthlyReport = (doc, yPos) => {
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setTextColor(...hexToRgb(HOTEL_CONFIG.colors.dark));
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Hotel Monthly Report', 15, yPos);
    yPos += 25;
    
    // Executive Summary
    doc.setFontSize(16);
    doc.text('I. Executive Summary', 15, yPos);
    yPos += 15;
    
    // Overview section with real data
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('A. Overview', 15, yPos);
    yPos += 10;
    
    const overviewText = `In ${format(new Date(), 'MMMM yyyy')}, ${HOTEL_CONFIG.name} achieved significant operational metrics with ` +
      `an average occupancy rate of ${realTimeData.occupancy.average}%, generating total revenue of GH₵${realTimeData.revenue.total.toLocaleString()}. ` +
      `The hotel served ${realTimeData.totalGuests} guests across ${realTimeData.totalBookings} bookings, maintaining ` +
      `a guest satisfaction score of ${realTimeData.guestSatisfaction}%. Operational efficiency was demonstrated through ` +
      `${realTimeData.operationalStats.completedTasks} completed tasks and ${realTimeData.services.filter(s => s.status === 'completed').length} ` +
      `fulfilled service requests.`;
    
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(overviewText, pageWidth - 30);
    doc.text(splitText, 15, yPos);
    yPos += splitText.length * 5 + 10;
    
    // Key Highlights
    doc.setFont('helvetica', 'bold');
    doc.text('B. Key Highlights', 15, yPos);
    yPos += 10;
    
    const highlights = [
      `1. Occupancy Rate: Achieved an average occupancy rate of ${realTimeData.occupancy.average}%, with ${realTimeData.operationalStats.occupiedRooms} rooms currently occupied.`,
      `2. Revenue: Generated total revenue of GH₵${realTimeData.revenue.total.toLocaleString()}, with room revenue accounting for GH₵${realTimeData.roomRevenue.toLocaleString()}.`,
      `3. Guest Satisfaction: Maintained a high guest satisfaction score of ${realTimeData.guestSatisfaction}% based on service completion rates.`
    ];
    
    doc.setFont('helvetica', 'normal');
    highlights.forEach(highlight => {
      const splitHighlight = doc.splitTextToSize(highlight, pageWidth - 30);
      doc.text(splitHighlight, 15, yPos);
      yPos += splitHighlight.length * 5 + 5;
    });
    
    yPos += 10;
    
    // Financial Performance
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('II. Financial Performance', 15, yPos);
    yPos += 15;
    
    doc.setFontSize(12);
    doc.text('A. Revenue Analysis', 15, yPos);
    yPos += 10;
    
    // Room Revenue section
    doc.text('1. Room Revenue:', 15, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`• Total Room Revenue: GH₵${realTimeData.roomRevenue.toLocaleString()}`, 20, yPos);
    yPos += 6;
    doc.text(`• Average Daily Rate (ADR): GH₵${realTimeData.averageRate.toLocaleString()}`, 20, yPos);
    yPos += 10;
    
    // Service Revenue section
    doc.setFont('helvetica', 'bold');
    doc.text('2. Service Revenue:', 15, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`• Service Revenue: GH₵${realTimeData.serviceRevenue.toLocaleString()}`, 20, yPos);
    yPos += 6;
    
    const otherRevenue = realTimeData.revenue.total - realTimeData.roomRevenue - realTimeData.serviceRevenue;
    doc.text(`• Other Revenue: GH₵${otherRevenue.toLocaleString()}`, 20, yPos);
    yPos += 15;
    
    // Monthly Details Table
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Details', 15, yPos);
    yPos += 10;
    
    const monthlyData = [
      [
        format(new Date(), 'MMM yyyy'),
        realTimeData.revenue.total.toLocaleString(),
        (realTimeData.pendingAmount || 0).toLocaleString(),
        realTimeData.invoices.length,
        realTimeData.invoices.filter(inv => inv.status === 'paid').length,
        realTimeData.invoices.filter(inv => inv.status === 'pending').length
      ]
    ];
    
    doc.autoTable({
      startY: yPos,
      head: [['Month', 'Revenue (GH₵)', 'Pending (GH₵)', 'Invoices', 'Paid', 'Pending']],
      body: monthlyData,
      theme: 'grid',
      headStyles: {
        fillColor: hexToRgb(HOTEL_CONFIG.colors.primary),
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 10,
        halign: 'center'
      },
      margin: { left: 15, right: 15 }
    });
    
    yPos = doc.lastAutoTable?.finalY + 15;
    
    // Operational Performance
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('III. Operational Performance', 15, yPos);
    yPos += 15;
    
    doc.setFontSize(12);
    doc.text('A. Occupancy and Room Statistics', 15, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`1. Total Available Rooms: ${realTimeData.operationalStats.totalRooms}`, 15, yPos);
    yPos += 8;
    doc.text(`2. Occupied Rooms: ${realTimeData.occupancy.average}%`, 15, yPos);
    yPos += 8;
    doc.text(`3. Average Length of Stay: ${realTimeData.averageLengthOfStayDays > 0 ? `${realTimeData.averageLengthOfStayDays} days` : 'N/A'}` , 15, yPos);
    
    return yPos;
  };

  // Professional footer
  const addProfessionalFooter = (doc) => {
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

  const getDateRangeText = () => {
    const endDate = new Date();
    const startDate = getStartDateFromRange(dateRange);
    return `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
  };

  // Main generate report function
  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      
      // First fetch real-time data
      await fetchRealTimeHotelData();
      
      // Generate the PDF with real data
      const pdfResult = await generateEnhancedPDF(reportType);
      
      // Create report record
      const newReport = {
        id: uuidv4(),
        name: `${HOTEL_CONFIG.name} - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        date: new Date().toISOString(),
        type: reportType.toUpperCase(),
        format: 'pdf',
        generatedBy: user?.fullName || user?.username || 'System',
        filename: pdfResult.filename,
        fileContent: pdfResult.fileContent,
        previewData: `Real-time ${reportType} report with actual hotel data for ${getDateRangeText()}`
      };
      
      // Save to database
      await saveReportToSupabase(newReport);
      
      // Update state
      setReportHistory(prev => [newReport, ...prev]);
      
      toast.success('Professional report generated with real-time data!');
      
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

  // Load data on component mount and when dateRange changes
  useEffect(() => {
    fetchRealTimeHotelData();
  }, [dateRange]);

  return (
    <div className={`enhanced-reports p-6 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <img 
              src={HOTEL_CONFIG.logo} 
              alt={`${HOTEL_CONFIG.name} Logo`}
              className="w-16 h-16 rounded-full border-4 border-blue-500 shadow-lg"
            />
            <div>
              <h1 className="text-4xl font-bold text-blue-600">{HOTEL_CONFIG.name}</h1>
              <p className="text-gray-500 text-lg">{HOTEL_CONFIG.tagline}</p>
              <p className="text-sm text-gray-400">Professional Report Generation with Real-Time Data</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">Report Type</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="summary">Executive Summary</option>
              <option value="financial">Financial Report</option>
              <option value="occupancy">Occupancy Analysis</option>
              <option value="monthly">Monthly Performance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date Range</label>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 font-medium transition-all duration-200 shadow-lg"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating Real-Time Report...
                </span>
              ) : (
                'Generate Professional Report'
              )}
            </button>
          </div>
        </div>

        {/* Real-time Stats Preview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
            <h3 className="text-sm font-medium opacity-90">Total Revenue</h3>
            <p className="text-3xl font-bold">GH₵{realTimeData.revenue.total.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-1">From {realTimeData.invoices.length} transactions</p>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
            <h3 className="text-sm font-medium opacity-90">Occupancy Rate</h3>
            <p className="text-3xl font-bold">{realTimeData.occupancy.average}%</p>
            <p className="text-xs opacity-75 mt-1">{realTimeData.operationalStats.occupiedRooms}/{realTimeData.operationalStats.totalRooms} rooms occupied</p>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
            <h3 className="text-sm font-medium opacity-90">Total Bookings</h3>
            <p className="text-3xl font-bold">{realTimeData.totalBookings}</p>
            <p className="text-xs opacity-75 mt-1">{realTimeData.confirmedBookings} confirmed</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 rounded-lg shadow-lg">
            <h3 className="text-sm font-medium opacity-90">Guest Satisfaction</h3>
            <p className="text-3xl font-bold">{realTimeData.guestSatisfaction}%</p>
            <p className="text-xs opacity-75 mt-1">Based on service completion</p>
          </div>
        </div>

        {/* Features showcase */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow-inner">
          <h3 className="text-lg font-semibold mb-4 text-blue-800">✨ Professional Report Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center">📊</div>
              <span>Real-Time Hotel Data</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center">🏨</div>
              <span>Professional Branding</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center">📈</div>
              <span>Comprehensive Analytics</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center">🎨</div>
              <span>Beautiful Design</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500 text-white rounded-full flex items-center justify-center">⚡</div>
              <span>Instant Generation</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center">🔒</div>
              <span>Secure & Reliable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedReportsWithRealData;
