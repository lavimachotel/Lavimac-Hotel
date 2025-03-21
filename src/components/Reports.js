import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useTheme } from '../context/ThemeContext';
import { useRoomReservation } from '../context/RoomReservationContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subDays, parseISO, isToday, isAfter, isBefore, addDays } from 'date-fns';
import * as XLSX from 'xlsx';
import supabase from '../supabaseClient';
import { FaFilePdf, FaFileExcel, FaFileCsv, FaEye, FaShareAlt, FaDownload, FaEnvelope, FaLink, FaTimesCircle } from 'react-icons/fa';

// Simple Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const bgColor = type === 'success' ? 'bg-green-500' : 
                  type === 'error' ? 'bg-red-500' : 
                  'bg-blue-500';
                  
  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white p-3 rounded-lg shadow-lg flex items-center min-w-[300px]`}>
      <div className="flex-1">{message}</div>
      <button onClick={onClose} className="ml-3 text-white hover:text-gray-200">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

// Modal component for previewing and sharing reports
const ReportModal = ({ isOpen, onClose, title, content, reportData, reportType, isDarkMode, initialTab = 'preview' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [shareEmail, setShareEmail] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  
  // Generate a shareable link when modal opens
  useEffect(() => {
    if (isOpen && reportData) {
      // In a real app, this would generate a unique, secure link
      // possibly storing the report in a database or cloud storage
      const dummyLink = `https://mikjane-hotel.example.com/share/${reportData.id}`;
      setShareLink(dummyLink);
    }
  }, [isOpen, reportData]);
  
  // Early return if modal is not open
  if (!isOpen) return null;
  
  const handleEmailShare = (e) => {
    e.preventDefault();
    
    // In a real app, this would call an API to send the email with the report
    // For now, we'll just open a mailto link
    if (shareEmail) {
      const subject = encodeURIComponent(`Mikjane Hotel Report: ${reportData?.name || 'Report'}`);
      const body = encodeURIComponent(`Here is the ${reportData?.name || 'report'} you requested. Access it at: ${shareLink}`);
      window.open(`mailto:${shareEmail}?subject=${subject}&body=${body}`);
      setShareEmail('');
    }
  };
  
  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
    });
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className={`relative ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} w-11/12 max-w-5xl rounded-lg shadow-lg p-6 m-4`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimesCircle size={20} />
          </button>
        </div>
        
        {/* Tab navigation */}
        <div className="flex border-b mb-4">
          <button 
            className={`py-2 px-4 ${activeTab === 'preview' ? 
              `font-bold border-b-2 ${isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-500'}` : 
              'text-gray-500'}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
          <button 
            className={`py-2 px-4 ${activeTab === 'share' ? 
              `font-bold border-b-2 ${isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-500'}` : 
              'text-gray-500'}`}
            onClick={() => setActiveTab('share')}
          >
            Share
          </button>
        </div>
        
        {/* Preview tab */}
        {activeTab === 'preview' && (
          <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
            {reportType === 'PDF' && reportData?.fileContent ? (
              <iframe 
                src={reportData.fileContent} 
                className="w-full h-[70vh] border" 
                title="PDF Preview"
              ></iframe>
            ) : reportType === 'EXCEL' || reportType === 'CSV' ? (
              <div className={`overflow-auto ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} p-4 rounded`}>
                <table className={`min-w-full border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  {reportData?.previewData?.headers && (
                    <thead>
                      <tr className={`${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-200 border-gray-300'} border-b`}>
                        {reportData.previewData.headers.map((header, idx) => (
                          <th key={idx} className="py-2 px-4 text-left">{header}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {reportData?.previewData?.rows && reportData.previewData.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className={`${rowIdx % 2 === 0 ? (isDarkMode ? 'bg-gray-700' : 'bg-white') : (isDarkMode ? 'bg-gray-750' : 'bg-gray-50')} border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="py-2 px-4">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[70vh]">
                <p>Preview not available</p>
              </div>
            )}
          </div>
        )}
        
        {/* Share tab */}
        {activeTab === 'share' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Share via Email</h3>
              <form onSubmit={handleEmailShare} className="flex items-center gap-2">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter recipient's email"
                  className={`flex-1 p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                  required
                />
                <button 
                  type="submit" 
                  className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                >
                  <FaEnvelope className="mr-2 inline" /> Send
                </button>
              </form>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Share via Link</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className={`flex-1 p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                />
                <button 
                  onClick={copyLinkToClipboard}
                  className={`p-2 rounded ${isLinkCopied ? 'bg-green-500' : 'bg-blue-500'} text-white hover:opacity-90`}
                >
                  <FaLink className="mr-2 inline" /> {isLinkCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                <i className="fas fa-info-circle mr-1"></i> Anyone with this link can view this report.
              </p>
            </div>
          </div>
        )}
        
        <div className="flex justify-end mt-6">
          <button 
            onClick={onClose}
            className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const Reports = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { rooms, reservations, revenue } = useRoomReservation();
  
  // Toast notification state
  const [toast, setToast] = useState(null);
  
  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };
  
  // Hide toast notification
  const hideToast = () => {
    setToast(null);
  };
  
  // Refs for charts
  const revenueChartRef = useRef(null);
  const revenueChartInstance = useRef(null);
  const occupancyChartRef = useRef(null);
  const occupancyChartInstance = useRef(null);
  
  // State for report parameters
  const [dateRange, setDateRange] = useState('7days');
  const [reportType, setReportType] = useState('summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [revenueData, setRevenueData] = useState({ dates: [], values: [] });
  const [occupancyData, setOccupancyData] = useState({ dates: [], values: [] });
  const [isLoading, setIsLoading] = useState(true);
  
  // New state variables for different report types
  const [guestData, setGuestData] = useState([]);
  const [financialData, setFinancialData] = useState([]);
  const [housekeepingData, setHousekeepingData] = useState([]);
  const [monthlyPerformanceData, setMonthlyPerformanceData] = useState({});
  
  // State for selected report type
  const [selectedReportType, setSelectedReportType] = useState('summary');
  
  // State for report history
  const [reportHistory, setReportHistory] = useState([]);
  
  // State for preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Load report history from localStorage when component mounts
  useEffect(() => {
    const savedHistory = localStorage.getItem('reportHistory');
    if (savedHistory) {
      try {
        setReportHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error parsing saved report history:', error);
      }
    }
  }, []);
  
  // Save report history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('reportHistory', JSON.stringify(reportHistory));
  }, [reportHistory]);
  
  // Delete a report from history
  const deleteReport = (reportId) => {
    setReportHistory(prevHistory => prevHistory.filter(report => report.id !== reportId));
  };
  
  // Open preview modal
  const openPreviewModal = (report, tab = 'preview') => {
    setSelectedReport(report);
    setPreviewModalOpen(true);
  };
  
  // Open share modal
  const openShareModal = (report) => {
    setSelectedReport(report);
    setPreviewModalOpen(true);
  };
  
  // Report type options
  const reportTypeOptions = [
    { value: 'summary', label: 'Summary Report' },
    { value: 'guests', label: 'Guest Report' },
    { value: 'financial', label: 'Financial Report' },
    { value: 'housekeeping', label: 'Housekeeping Report' },
    { value: 'occupancy', label: 'Occupancy Report' },
    { value: 'monthly', label: 'Monthly Report' }
  ];

  // Handle report type change
  const handleReportTypeChange = (e) => {
    setSelectedReportType(e.target.value);
  };
  
  // Load data from Dashboard and Billing pages
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Get date range based on selection
        let days = 7;
        let startDate = new Date();
        
        switch(dateRange) {
          case '30days':
            days = 30;
            break;
          case '90days':
            days = 90;
            break;
          case '12months':
            days = 365;
            break;
          default:
            days = 7;
        }
        
        const fromDate = subDays(startDate, days);
        
        // 1. Fetch invoice data for financial reports
        let { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('*');
        
        if (invoicesError) {
          console.error('Error fetching invoices data:', invoicesError);
          invoicesData = [];
        }
        
        // Store full invoice data for financial reports
        setFinancialData(invoicesData || []);
        
        // Filter for pending invoices within date range
        const pendingInvoices = invoicesData.filter(invoice => {
          if (invoice.status !== 'Pending') return false;
          if (!invoice.created_at) return false;
          
          const invoiceDate = parseISO(invoice.created_at);
          return isAfter(invoiceDate, fromDate) && isBefore(invoiceDate, addDays(startDate, 1));
        });
        
        // Calculate total pending payments from invoices
        const totalPendingAmount = pendingInvoices.reduce((sum, invoice) => {
          return sum + (parseFloat(invoice.amount) || 0);
        }, 0);
        
        setPendingPayments(totalPendingAmount);
        setPendingInvoices(pendingInvoices);
        
        // 2. Fetch guest data for guest reports
        let { data: guestsData, error: guestsError } = await supabase
          .from('guests')
          .select('*');
          
        if (guestsError) {
          console.error('Error fetching guests data:', guestsError);
          guestsData = [];
        }
        
        setGuestData(guestsData || []);
        
        // 3. Fetch housekeeping data
        let { data: housekeepingTasks, error: housekeepingError } = await supabase
          .from('tasks')
          .select('*')
          .eq('type', 'Housekeeping');
          
        if (housekeepingError) {
          console.error('Error fetching housekeeping data:', housekeepingError);
          housekeepingTasks = [];
        }
        
        setHousekeepingData(housekeepingTasks || []);
        
        // 4. Prepare monthly performance data
        // Group financial data by month
        const monthlyData = {};
        
        if (invoicesData && invoicesData.length > 0) {
          invoicesData.forEach(invoice => {
            if (!invoice.created_at) return;
            
            const invoiceDate = parseISO(invoice.created_at);
            const monthYear = format(invoiceDate, 'MMM yyyy');
            
            if (!monthlyData[monthYear]) {
              monthlyData[monthYear] = {
                revenue: 0,
                pendingAmount: 0,
                invoiceCount: 0,
                paidCount: 0,
                pendingCount: 0
              };
            }
            
            monthlyData[monthYear].invoiceCount += 1;
            
            if (invoice.status === 'Paid') {
              monthlyData[monthYear].revenue += parseFloat(invoice.amount) || 0;
              monthlyData[monthYear].paidCount += 1;
            } else if (invoice.status === 'Pending') {
              monthlyData[monthYear].pendingAmount += parseFloat(invoice.amount) || 0;
              monthlyData[monthYear].pendingCount += 1;
            }
          });
        }
        
        setMonthlyPerformanceData(monthlyData);
        
        // 5. Prepare data for revenue and occupancy charts
        // Prepare date labels for x-axis
        const dateLabels = [];
        const revenueValues = [];
        const occupancyValues = [];
        
        // Initialize arrays with zeros
        for (let i = days; i >= 0; i--) {
          const currentDate = subDays(startDate, i);
          const formattedDate = format(currentDate, 'MMM dd');
          dateLabels.push(formattedDate);
          revenueValues.push(0);
          
          // Calculate occupancy for this date based on room data
          // First, get all rooms that were occupied or reserved on this date
          const roomsOccupiedOnDate = rooms.filter(room => {
            // For the current date (today), use the current room status
            if (format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
              return room.status === 'Occupied' || room.status === 'Reserved';
            }
            
            // For past or future dates, check against check-in and check-out dates
            // Get check-in and check-out dates for this room
            if (!room.checkIn) return false;
            
            const checkInDate = parseISO(room.checkIn);
            const checkOutDate = room.checkOut ? parseISO(room.checkOut) : addDays(startDate, 1);
            
            // Check if the current date falls within the check-in and check-out period
            return (isAfter(currentDate, checkInDate) || format(currentDate, 'yyyy-MM-dd') === format(checkInDate, 'yyyy-MM-dd')) && 
                  (isBefore(currentDate, checkOutDate) || format(currentDate, 'yyyy-MM-dd') === format(checkOutDate, 'yyyy-MM-dd'));
          });
          
          // Calculate occupancy rate: (occupied rooms / total rooms) * 100
          const occupancyRate = rooms.length > 0 ? Math.round((roomsOccupiedOnDate.length / rooms.length) * 100) : 0;
          occupancyValues.push(occupancyRate);
        }
        
        // Use paid invoices for revenue calculation (similar to BillingPage approach)
        if (invoicesData && invoicesData.length > 0) {
          const paidInvoices = invoicesData.filter(invoice => invoice.status === 'Paid');
          
          paidInvoices.forEach(invoice => {
            if (!invoice.created_at || !invoice.amount) return;
            
            const invoiceDate = parseISO(invoice.created_at);
            if (isBefore(invoiceDate, fromDate) || isAfter(invoiceDate, startDate)) return;
            
            // Find the index for this date
            const dateStr = format(invoiceDate, 'MMM dd');
            const dateIndex = dateLabels.indexOf(dateStr);
            
            if (dateIndex !== -1) {
              revenueValues[dateIndex] += parseFloat(invoice.amount);
            }
          });
        }
        
        // If we have revenue from context, use that as well for backward compatibility
        if (revenue && Array.isArray(revenue)) {
          revenue.forEach(rev => {
            if (!rev.date || !rev.amount) return;
            
            const revDate = typeof rev.date === 'string' ? parseISO(rev.date) : rev.date;
            if (isBefore(revDate, fromDate) || isAfter(revDate, startDate)) return;
            
            // Find the index for this date
            const dateStr = format(revDate, 'MMM dd');
            const dateIndex = dateLabels.indexOf(dateStr);
            
            if (dateIndex !== -1) {
              revenueValues[dateIndex] += rev.amount;
            }
          });
        }
        
        // Set chart data
        setRevenueData({
          dates: dateLabels,
          values: revenueValues
        });
        
        setOccupancyData({
          dates: dateLabels,
          values: occupancyValues
        });
      } catch (error) {
        console.error('Error loading report data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [dateRange, rooms, reservations, revenue]);
  
  // Initialize charts when data is loaded and on theme changes
  useEffect(() => {
    if (!isLoading && 
        revenueData && revenueData.dates && revenueData.values && 
        Array.isArray(revenueData.dates) && revenueData.dates.length > 0 && 
        Array.isArray(revenueData.values) && revenueData.values.length > 0) {
      initializeRevenueChart();
      initializeOccupancyChart();
    }
  }, [isLoading, theme, revenueData, occupancyData]);

  // Initialize revenue chart
  const initializeRevenueChart = () => {
    if (!revenueChartRef.current || !revenueData || !revenueData.dates || !revenueData.values ||
        !Array.isArray(revenueData.dates) || !revenueData.dates.length ||
        !Array.isArray(revenueData.values) || !revenueData.values.length) {
      return;
    }

    // Dispose previous chart instance if it exists
    if (revenueChartInstance.current) {
      revenueChartInstance.current.dispose();
    }
    
    // Initialize new chart
    revenueChartInstance.current = echarts.init(revenueChartRef.current);
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        },
        formatter: function(params) {
          // Make sure we're working with the correct data point
          if (!params || !params[0]) return '';
          
          const revenueValue = params[0].value;
          const dateStr = params[0].name;
          
          // Calculate percentage of total revenue
          const percentOfTotal = totalRevenue > 0 ? ((revenueValue / totalRevenue) * 100).toFixed(1) : 0;
          
          // Format the revenue with Ghana Cedis symbol
          const formattedRevenue = `GH₵${revenueValue.toLocaleString()}`;
          
          // Return a completely custom tooltip with no default formatting
          return `<div style="padding: 8px;">
                    <div style="margin-bottom: 5px;"><strong>Date:</strong> ${dateStr}</div>
                    <div style="margin-bottom: 5px;"><strong>Revenue:</strong> ${formattedRevenue}</div>
                    <div><strong>Percentage of Total:</strong> ${percentOfTotal}%</div>
                  </div>`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: revenueData.dates,
        axisLabel: {
          color: isDarkMode ? '#ccc' : '#333'
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: 'GH₵{value}',
          color: isDarkMode ? '#ccc' : '#333'
        }
      },
      series: [
        {
          name: 'Revenue',
          type: 'line',
          stack: 'Total',
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: isDarkMode ? 'rgba(58, 123, 213, 0.8)' : 'rgba(58, 123, 213, 0.8)' },
              { offset: 1, color: isDarkMode ? 'rgba(58, 123, 213, 0.1)' : 'rgba(58, 123, 213, 0.1)' }
            ])
          },
          emphasis: {
            focus: 'series'
          },
          itemStyle: {
            color: '#3a7bd5'
          },
          smooth: true,
          data: revenueData.values
        }
      ],
      backgroundColor: isDarkMode ? '#1f2937' : '#fff'
    };
    
    revenueChartInstance.current.setOption(option);
  };

  // Initialize occupancy chart
  const initializeOccupancyChart = () => {
    if (!occupancyChartRef.current || !occupancyData || !occupancyData.dates || !occupancyData.values ||
        !Array.isArray(occupancyData.dates) || !occupancyData.dates.length ||
        !Array.isArray(occupancyData.values) || !occupancyData.values.length) {
      return;
    }

    // Dispose previous chart instance if it exists
    if (occupancyChartInstance.current) {
      occupancyChartInstance.current.dispose();
    }
    
    // Initialize new chart
    occupancyChartInstance.current = echarts.init(occupancyChartRef.current);
    
    // Calculate average revenue per occupied room for tooltip
    const avgRevenuePerRoom = totalRevenue / (occupancyData.values.reduce((sum, occ) => sum + occ, 0) || 1);
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          // Make sure we're working with the correct data point
          if (!params || !params[0]) return '';
          
          const occupancyValue = params[0].value;
          const dateStr = params[0].name;
          
          // Calculate the number of rooms occupied on this date based on the occupancy percentage
          const occupiedRooms = Math.round((occupancyValue / 100) * rooms.length);
          
          // Estimate revenue based on occupancy percentage and average revenue
          const estimatedRevenue = (occupancyValue / 100) * avgRevenuePerRoom * rooms.length;
          
          // Format the revenue with Ghana Cedis symbol
          const formattedRevenue = `GH₵${Math.round(estimatedRevenue).toLocaleString()}`;
          
          // Return a completely custom tooltip with no default formatting
          return `<div style="padding: 8px;">
                    <div style="margin-bottom: 5px;"><strong>Date:</strong> ${dateStr}</div>
                    <div style="margin-bottom: 5px;"><strong>Occupancy:</strong> ${occupancyValue}%</div>
                    <div style="margin-bottom: 5px;"><strong>Rooms Occupied:</strong> ${occupiedRooms} of ${rooms.length}</div>
                    <div><strong>Est. Revenue:</strong> ${formattedRevenue}</div>
                  </div>`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: true,
        data: occupancyData.dates,
        axisLabel: {
          color: isDarkMode ? '#ccc' : '#333'
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value}%',
          color: isDarkMode ? '#ccc' : '#333'
        }
      },
      series: [
        {
          name: 'Occupancy',
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#00c6fb' },
              { offset: 1, color: '#005bea' }
            ])
          },
          emphasis: {
            focus: 'series'
          },
          data: occupancyData.values
        }
      ],
      backgroundColor: isDarkMode ? '#1f2937' : '#fff'
    };
    
    occupancyChartInstance.current.setOption(option);
  };

  // Calculate total revenue (sum of all daily revenues)
  const totalRevenue = (() => {
    if (revenueData && revenueData.values && Array.isArray(revenueData.values) && revenueData.values.length > 0) {
      return revenueData.values.reduce((sum, current) => sum + current, 0);
    }
    return 0;
  })();

  // Calculate average occupancy
  const avgOccupancy = (() => {
    if (occupancyData && occupancyData.values && Array.isArray(occupancyData.values) && occupancyData.values.length > 0) {
      return Math.round(occupancyData.values.reduce((sum, current) => sum + current, 0) / occupancyData.values.length);
    }
    return 0;
  })();
  
  // Calculate total room bookings from actual reservation data
  const totalRoomBookings = (() => {
    if (reservations && Array.isArray(reservations)) {
      // Filter reservations based on the selected date range
      let days = 7;
      switch(dateRange) {
        case '30days':
          days = 30;
          break;
        case '90days':
          days = 90;
          break;
        case '12months':
          days = 365;
          break;
        default:
          days = 7;
      }
      
      const fromDate = subDays(new Date(), days);
      
      // Count reservations within the date range
      return reservations.filter(reservation => {
        if (!reservation.check_in_date) return false;
        const reservationDate = parseISO(reservation.check_in_date);
        return isAfter(reservationDate, fromDate) || format(reservationDate, 'yyyy-MM-dd') === format(fromDate, 'yyyy-MM-dd');
      }).length;
    }
    return 0;
  })();

  // Generate and download reports
  const generateReport = async (format) => {
    setIsGenerating(true);
    
    try {
      let filename = '';
      let fileContent = null;
      let previewData = null;
      
      switch(format) {
        case 'pdf':
          const result = generatePdfReport(selectedReportType);
          filename = result.filename;
          fileContent = result.fileContent;
          break;
        case 'excel':
          const excelResult = generateExcelReport(selectedReportType);
          filename = excelResult.filename;
          fileContent = excelResult.fileContent;
          previewData = excelResult.previewData;
          break;
        case 'csv':
          const csvResult = generateCsvReport(selectedReportType);
          filename = csvResult.filename;
          fileContent = csvResult.fileContent;
          previewData = csvResult.previewData;
          break;
      }

      if (!filename) {
        showToast('Failed to generate report. Please try again.', 'error');
        return;
      }

      // Add to report history
      const newReport = {
        id: Date.now(), // Using timestamp as a simple unique ID
        name: filename.replace('.pdf', '').replace('.xlsx', '').replace('.csv', '').replace('Mikjane_Hotel_', '').replaceAll('_', ' '),
        date: format(new Date(), 'MMM dd, yyyy'),
        type: format.toUpperCase(),
        generatedBy: 'User', // This could be enhanced with actual user info if available
        filename: filename,
        fileContent: fileContent, // Store the actual file content
        previewData: previewData // For Excel/CSV data preview
      };
      
      setReportHistory(prevHistory => [newReport, ...prevHistory]);
      
      // Show success notification
      showToast(`${format.toUpperCase()} report generated successfully!`);
    } catch (error) {
      console.error('Error generating report:', error);
      showToast(`Error generating ${format.toUpperCase()} report: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate PDF report with jsPDF
  const generatePdfReport = (reportType = 'summary') => {
    // Check if data is available
    if (!revenueData || !revenueData.dates || !revenueData.values || 
        !Array.isArray(revenueData.dates) || !revenueData.dates.length || 
        !Array.isArray(revenueData.values) || !revenueData.values.length) {
      console.error('Data not available for PDF generation');
      return { filename: '', fileContent: null };
    }
    
    // Create a new PDF document (A4 format in portrait)
    const doc = new jsPDF();
    
    // Set default font to Inter-like sans-serif
    doc.setFont('helvetica');
    
    // Add custom styling for a professional look
    const styles = {
      title: { fontSize: 22, fontStyle: 'bold', textColor: [0, 51, 102] },
      subtitle: { fontSize: 12, textColor: [100, 100, 100] },
      heading: { fontSize: 16, fontStyle: 'bold', textColor: [0, 0, 0] },
      normal: { fontSize: 10, textColor: [0, 0, 0] },
      tableHeader: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      tableRow: { fontSize: 9 },
      tableRowAlternate: { fillColor: [240, 240, 240] },
      footer: { fontSize: 8, textColor: [100, 100, 100] }
    };

    // Add a professional header with logo placeholder
    const addHeader = () => {
      // Draw a colored header bar
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 15, 'F');
      
      // Add logo placeholder
      doc.setFillColor(255, 255, 255);
      doc.circle(15, 8, 5, 'F');
      
      // Add hotel name in header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text('MIKJANE HOTEL', 25, 9);
      
      // Add right-aligned date
      const today = format(new Date(), 'MMM dd, yyyy');
      doc.text(today, 195, 9, { align: 'right' });
    };
    
    // Add footer with page number
    const addFooter = (pageNumber) => {
      const totalPages = doc.getNumberOfPages();
      doc.setPage(pageNumber);
      doc.setFontSize(styles.footer.fontSize);
      doc.setTextColor(...styles.footer.textColor);
      doc.text(`Page ${pageNumber} of ${totalPages}`, 195, 285, { align: 'right' });
      doc.text('Mikjane Hotel Management System', 15, 285);
    };
    
    // Apply header to all pages
    const addHeaderFooterToAllPages = () => {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addHeader();
        addFooter(i);
      }
    };
    
    // Generate current date string for filename
    const currentDate = new Date();
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    let filename = `Mikjane_Hotel_Report_${formattedDate}.pdf`;
    
    // Add title and content based on report type
    switch(reportType) {
      case 'guests':
        generateGuestsPdfReport(doc, styles);
        filename = `Mikjane_Hotel_Guest_Report_${formattedDate}.pdf`;
        break;
      case 'financial':
        generateFinancialPdfReport(doc, styles);
        filename = `Mikjane_Hotel_Financial_Report_${formattedDate}.pdf`;
        break;
      case 'housekeeping':
        generateHousekeepingPdfReport(doc, styles);
        filename = `Mikjane_Hotel_Housekeeping_Report_${formattedDate}.pdf`;
        break;
      case 'occupancy':
        generateOccupancyPdfReport(doc, styles);
        filename = `Mikjane_Hotel_Occupancy_Report_${formattedDate}.pdf`;
        break;
      case 'monthly':
        generateMonthlyPdfReport(doc, styles);
        filename = `Mikjane_Hotel_Monthly_Report_${formattedDate}.pdf`;
        break;
      default:
        generateSummaryPdfReport(doc, styles);
        filename = `Mikjane_Hotel_Summary_Report_${formattedDate}.pdf`;
    }
    
    // Apply headers and footers to all pages
    addHeaderFooterToAllPages();
    
    // Get PDF as data URL for preview
    const fileContent = doc.output('datauristring');
    
    // Save the PDF with formatted date
    doc.save(filename);
    
    return { filename, fileContent };
  };
  
  // Generate summary PDF report (Performance Summary)
  const generateSummaryPdfReport = (doc, styles) => {
    // Add title
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.text('Performance Summary Report', 15, 30);
    
    // Add date range
    doc.setFontSize(styles.subtitle.fontSize);
    doc.setTextColor(...styles.subtitle.textColor);
    doc.text(`Date Range: ${revenueData.dates[0]} - ${revenueData.dates[revenueData.dates.length - 1]}`, 15, 40);
    
    // Add statistics
    doc.setFontSize(styles.heading.fontSize);
    doc.setTextColor(...styles.heading.textColor);
    doc.text('Key Performance Metrics', 15, 55);
    
    // Add metrics in a visually appealing box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 40, 3, 3, 'FD');
    
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Revenue: GH₵${totalRevenue.toLocaleString()}`, 25, 70);
    doc.text(`Pending Payments: GH₵${pendingPayments.toLocaleString()}`, 25, 80);
    doc.text(`Average Occupancy Rate: ${avgOccupancy}%`, 105, 70);
    doc.text(`Total Room Bookings: ${totalRoomBookings}`, 105, 80);
    
    // Add daily data table
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Daily Performance', 15, 115);
    
    const tableColumn = ["Date", "Revenue (GH₵)", "Occupancy (%)"];
    const tableRows = [];
    
    for(let i = 0; i < revenueData.dates.length; i++) {
      const rowData = [
        revenueData.dates[i],
        revenueData.values[i].toLocaleString(),
        occupancyData.values[i]
      ];
      tableRows.push(rowData);
    }
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 120,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: styles.tableRow.fontSize,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: styles.tableHeader.fillColor,
        textColor: styles.tableHeader.textColor,
        fontStyle: styles.tableHeader.fontStyle,
        fontSize: styles.tableHeader.fontSize
      },
      alternateRowStyles: {
        fillColor: styles.tableRowAlternate.fillColor
      }
    });
  };
  
  // Generate guests PDF report
  const generateGuestsPdfReport = (doc, styles) => {
    // Check if data is available
    if (!guestData || !Array.isArray(guestData) || !guestData.length) {
      console.error('Guest data not available for PDF generation');
      return;
    }
    
    // Add title
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.text('Guest Report', 15, 30);
    
    // Add date
    doc.setFontSize(styles.subtitle.fontSize);
    doc.setTextColor(...styles.subtitle.textColor);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 15, 40);
    
    // Add statistics
    doc.setFontSize(styles.heading.fontSize);
    doc.setTextColor(...styles.heading.textColor);
    doc.text('Guest Overview', 15, 55);
    
    // Add metrics in a visually appealing box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 25, 3, 3, 'FD');
    
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Guests: ${guestData.length}`, 25, 70);
    
    // Add guests table
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Guest Details', 15, 95);
    
    const tableColumn = ["Name", "Email", "Phone", "Room", "Check-In", "Check-Out", "Status"];
    const tableRows = [];
    
    guestData.forEach(guest => {
      const rowData = [
        guest.name || guest.guest_name || "N/A",
        guest.email || "N/A",
        guest.phone || "N/A",
        guest.room_id || guest.room || "N/A",
        guest.checkIn || guest.check_in || "N/A",
        guest.checkOut || guest.check_out || "N/A",
        guest.status || "N/A"
      ];
      tableRows.push(rowData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 100,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: styles.tableRow.fontSize,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: styles.tableHeader.fillColor,
        textColor: styles.tableHeader.textColor,
        fontStyle: styles.tableHeader.fontStyle,
        fontSize: styles.tableHeader.fontSize
      },
      alternateRowStyles: {
        fillColor: styles.tableRowAlternate.fillColor
      },
      columnStyles: {
        0: { cellWidth: 30 }, // Name
        1: { cellWidth: 40 }, // Email
        2: { cellWidth: 25 }, // Phone
        3: { cellWidth: 15 }, // Room
        4: { cellWidth: 25 }, // Check-In
        5: { cellWidth: 25 }, // Check-Out
        6: { cellWidth: 20 } // Status
      }
    });
  };
  
  // Generate financial PDF report
  const generateFinancialPdfReport = (doc, styles) => {
    // Check if data is available
    if (!financialData || !Array.isArray(financialData) || !financialData.length) {
      console.error('Financial data not available for PDF generation');
      return;
    }
    
    // Add title
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.text('Financial Report', 15, 30);
    
    // Add date
    doc.setFontSize(styles.subtitle.fontSize);
    doc.setTextColor(...styles.subtitle.textColor);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 15, 40);
    
    // Calculate financial summary
    const totalAmount = financialData.reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);
    const paidAmount = financialData.filter(invoice => invoice.status === 'Paid')
                        .reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);
    const pendingAmount = financialData.filter(invoice => invoice.status === 'Pending')
                          .reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);
    const paidCount = financialData.filter(invoice => invoice.status === 'Paid').length;
    const pendingCount = financialData.filter(invoice => invoice.status === 'Pending').length;
    
    // Add financial summary
    doc.setFontSize(styles.heading.fontSize);
    doc.setTextColor(...styles.heading.textColor);
    doc.text('Financial Overview', 15, 55);
    
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Invoices: ${financialData.length}`, 25, 70);
    doc.text(`Total Amount: GH₵${totalAmount.toLocaleString()}`, 25, 80);
    doc.text(`Paid Amount: GH₵${paidAmount.toLocaleString()} (${paidCount} invoices)`, 25, 90);
    doc.text(`Pending Amount: GH₵${pendingAmount.toLocaleString()} (${pendingCount} invoices)`, 25, 100);
    
    // Add invoice table
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Invoice Details', 15, 120);
    
    const tableColumn = ["Invoice #", "Guest", "Room", "Amount (GH₵)", "Date", "Status"];
    const tableRows = [];
    
    financialData.forEach(invoice => {
      const rowData = [
        invoice.invoice_number || invoice.id || "N/A",
        invoice.guest_name || "N/A",
        invoice.room_id || invoice.room || "N/A",
        parseFloat(invoice.amount).toLocaleString() || "0",
        invoice.created_at ? format(parseISO(invoice.created_at), 'MMM dd, yyyy') : "N/A",
        invoice.status || "N/A"
      ];
      tableRows.push(rowData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 130,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: styles.tableRow.fontSize,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: styles.tableHeader.fillColor,
        textColor: styles.tableHeader.textColor,
        fontStyle: styles.tableHeader.fontStyle,
        fontSize: styles.tableHeader.fontSize
      },
      alternateRowStyles: {
        fillColor: styles.tableRowAlternate.fillColor
      }
    });
  };
  
  // Generate housekeeping PDF report
  const generateHousekeepingPdfReport = (doc, styles) => {
    // Check if data is available
    if (!housekeepingData || !Array.isArray(housekeepingData)) {
      console.error('Housekeeping data not available for PDF generation');
      return;
    }
    
    // Add title
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.text('Housekeeping Report', 15, 30);
    
    // Add date
    doc.setFontSize(styles.subtitle.fontSize);
    doc.setTextColor(...styles.subtitle.textColor);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 15, 40);
    
    // Calculate housekeeping summary
    const pendingTasks = housekeepingData.filter(task => task.status === 'Pending').length;
    const completedTasks = housekeepingData.filter(task => task.status === 'Completed').length;
    const highPriorityTasks = housekeepingData.filter(task => task.priority === 'High').length;
    
    // Add housekeeping summary
    doc.setFontSize(styles.heading.fontSize);
    doc.setTextColor(...styles.heading.textColor);
    doc.text('Housekeeping Overview', 15, 55);
    
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Tasks: ${housekeepingData.length}`, 25, 70);
    doc.text(`Pending Tasks: ${pendingTasks}`, 25, 80);
    doc.text(`Completed Tasks: ${completedTasks}`, 25, 90);
    doc.text(`High Priority Tasks: ${highPriorityTasks}`, 25, 100);
    
    // Add tasks table
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Task Details', 15, 120);
    
    const tableColumn = ["Room", "Description", "Assignee", "Priority", "Status", "Due Date"];
    const tableRows = [];
    
    housekeepingData.forEach(task => {
      const rowData = [
        task.room || "N/A",
        task.description || "N/A",
        task.assignee || "N/A",
        task.priority || "N/A",
        task.status || "N/A",
        task.due_date ? format(parseISO(task.due_date), 'MMM dd, yyyy') : "N/A"
      ];
      tableRows.push(rowData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 130,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: styles.tableRow.fontSize,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: styles.tableHeader.fillColor,
        textColor: styles.tableHeader.textColor,
        fontStyle: styles.tableHeader.fontStyle,
        fontSize: styles.tableHeader.fontSize
      },
      alternateRowStyles: {
        fillColor: styles.tableRowAlternate.fillColor
      }
    });
  };
  
  // Generate occupancy PDF report
  const generateOccupancyPdfReport = (doc, styles) => {
    // Check if data is available
    if (!occupancyData || !occupancyData.dates || !occupancyData.values ||
        !Array.isArray(occupancyData.dates) || !occupancyData.dates.length ||
        !Array.isArray(occupancyData.values) || !occupancyData.values.length) {
      console.error('Occupancy data not available for PDF generation');
      return;
    }
    
    // Add title
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.text('Room Occupancy Report', 15, 30);
    
    // Add date range
    doc.setFontSize(styles.subtitle.fontSize);
    doc.setTextColor(...styles.subtitle.textColor);
    doc.text(`Date Range: ${occupancyData.dates[0]} - ${occupancyData.dates[occupancyData.dates.length - 1]}`, 15, 40);
    
    // Calculate room statistics
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(room => room.status === 'Occupied').length;
    const reservedRooms = rooms.filter(room => room.status === 'Reserved').length;
    const availableRooms = rooms.filter(room => room.status === 'Available').length;
    const maintenanceRooms = rooms.filter(room => room.status === 'Maintenance').length;
    
    // Add room statistics
    doc.setFontSize(styles.heading.fontSize);
    doc.setTextColor(...styles.heading.textColor);
    doc.text('Room Statistics', 15, 55);
    
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Rooms: ${totalRooms}`, 25, 70);
    doc.text(`Occupied Rooms: ${occupiedRooms} (${Math.round((occupiedRooms/totalRooms)*100)}%)`, 25, 80);
    doc.text(`Reserved Rooms: ${reservedRooms} (${Math.round((reservedRooms/totalRooms)*100)}%)`, 25, 90);
    doc.text(`Available Rooms: ${availableRooms} (${Math.round((availableRooms/totalRooms)*100)}%)`, 25, 100);
    doc.text(`Maintenance Rooms: ${maintenanceRooms} (${Math.round((maintenanceRooms/totalRooms)*100)}%)`, 25, 110);
    doc.text(`Average Occupancy Rate: ${avgOccupancy}%`, 105, 70);
    
    // Add daily occupancy table
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Daily Occupancy', 15, 125);
    
    const tableColumn = ["Date", "Occupancy Rate (%)", "Est. Rooms Occupied"];
    const tableRows = [];
    
    for(let i = 0; i < occupancyData.dates.length; i++) {
      const estRoomsOccupied = Math.round((occupancyData.values[i] / 100) * totalRooms);
      const rowData = [
        occupancyData.dates[i],
        occupancyData.values[i],
        estRoomsOccupied
      ];
      tableRows.push(rowData);
    }
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 135,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: styles.tableRow.fontSize,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: styles.tableHeader.fillColor,
        textColor: styles.tableHeader.textColor,
        fontStyle: styles.tableHeader.fontStyle,
        fontSize: styles.tableHeader.fontSize
      },
      alternateRowStyles: {
        fillColor: styles.tableRowAlternate.fillColor
      }
    });
    
    // Add room status details on a new page
    doc.addPage();
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.text('Current Room Status Details', 15, 20);
    
    // Add room status table
    const roomTableColumn = ["Room #", "Type", "Status", "Guest", "Check-In", "Check-Out", "Price (GH₵)"];
    const roomTableRows = [];
    
    rooms.forEach(room => {
      const rowData = [
        room.id || room.room_number || "N/A",
        room.type || "Standard",
        room.status || "N/A",
        room.guest || "N/A",
        room.checkIn ? format(parseISO(room.checkIn), 'MMM dd, yyyy') : "N/A",
        room.checkOut ? format(parseISO(room.checkOut), 'MMM dd, yyyy') : "N/A",
        room.price ? room.price.toLocaleString() : "N/A"
      ];
      roomTableRows.push(rowData);
    });
    
    autoTable(doc, {
      head: [roomTableColumn],
      body: roomTableRows,
      startY: 30,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: styles.normal.fontSize,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: styles.tableHeader.fillColor,
        textColor: styles.tableHeader.textColor,
        fontStyle: styles.tableHeader.fontStyle,
        fontSize: styles.tableHeader.fontSize
      },
      alternateRowStyles: {
        fillColor: styles.tableRowAlternate.fillColor
      }
    });
  };
  
  // Generate monthly performance PDF report
  const generateMonthlyPdfReport = (doc, styles) => {
    // Check if data is available
    if (!monthlyPerformanceData || Object.keys(monthlyPerformanceData).length === 0) {
      console.error('Monthly performance data not available for PDF generation');
      return;
    }
    
    // Add title
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.text('Monthly Accounting Performance', 15, 30);
    
    // Add date
    doc.setFontSize(styles.subtitle.fontSize);
    doc.setTextColor(...styles.subtitle.textColor);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 15, 40);
    
    // Sort months chronologically
    const months = Object.keys(monthlyPerformanceData).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA - dateB;
    });
    
    // Calculate totals
    const totalRevenue = months.reduce((sum, month) => sum + monthlyPerformanceData[month].revenue, 0);
    const totalPending = months.reduce((sum, month) => sum + monthlyPerformanceData[month].pendingAmount, 0);
    const totalInvoices = months.reduce((sum, month) => sum + monthlyPerformanceData[month].invoiceCount, 0);
    
    // Add monthly summary
    doc.setFontSize(styles.heading.fontSize);
    doc.setTextColor(...styles.heading.textColor);
    doc.text('Monthly Performance', 15, 55);
    
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Revenue: GH₵${totalRevenue.toLocaleString()}`, 25, 70);
    doc.text(`Total Pending: GH₵${totalPending.toLocaleString()}`, 25, 80);
    doc.text(`Total Invoices: ${totalInvoices}`, 25, 90);
    
    // Add monthly table
    const tableColumn = ["Month", "Revenue (GH₵)", "Pending (GH₵)", "Invoices", "Paid", "Pending"];
    const tableRows = [];
    
    months.forEach(month => {
      const data = monthlyPerformanceData[month];
      const rowData = [
        month,
        data.revenue.toLocaleString(),
        data.pendingAmount.toLocaleString(),
        data.invoiceCount,
        data.paidCount,
        data.pendingCount
      ];
      tableRows.push(rowData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 75,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: styles.tableRow.fontSize,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: styles.tableHeader.fillColor,
        textColor: styles.tableHeader.textColor,
        fontStyle: styles.tableHeader.fontStyle,
        fontSize: styles.tableHeader.fontSize
      },
      alternateRowStyles: {
        fillColor: styles.tableRowAlternate.fillColor
      }
    });
  };

  // Generate Excel report
  const generateExcelReport = (reportType = 'summary') => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Generate current date string for filename
    const currentDate = new Date();
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    let filename = `Mikjane_Hotel_Report_${formattedDate}.xlsx`;
    
    // Check if data is available
    if (!revenueData || !revenueData.dates || !revenueData.values || 
        !Array.isArray(revenueData.dates) || !revenueData.dates.length || 
        !Array.isArray(revenueData.values) || !revenueData.values.length) {
      console.error('Data not available for Excel generation');
      return { filename: '', fileContent: null, previewData: null };
    }
    
    // Variables for preview data
    let previewData = {
      headers: [],
      rows: []
    };
    
    // Based on report type, create appropriate data and filename
    switch(reportType) {
      case 'guests':
        // Guest report
        if (!guestData || !Array.isArray(guestData) || !guestData.length) {
          console.error('Guest data not available for Excel generation');
          return { filename: '', fileContent: null, previewData: null };
        }
        
        // Create summary data
        const guestSummaryData = [
          ['Mikjane Hotel - Guest Report'],
          [`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`],
          [''],
          ['Summary Metrics'],
          ['Total Guests', guestData.length],
          ['']
        ];
        
        // Create guests data
        const guestsData = [
          ['Name', 'Email', 'Phone', 'Room', 'Check-In', 'Check-Out', 'Status']
        ];
        
        guestData.forEach(guest => {
          guestsData.push([
            guest.name || guest.guest_name || "N/A",
            guest.email || "N/A",
            guest.phone || "N/A",
            guest.room_id || guest.room || "N/A",
            guest.checkIn || guest.check_in || "N/A",
            guest.checkOut || guest.check_out || "N/A",
            guest.status || "N/A"
          ]);
        });
        
        // Add summary worksheet
        const guestSummaryWs = XLSX.utils.aoa_to_sheet(guestSummaryData);
        XLSX.utils.book_append_sheet(wb, guestSummaryWs, 'Summary');
        
        // Add guests data worksheet
        const guestsWs = XLSX.utils.aoa_to_sheet(guestsData);
        XLSX.utils.book_append_sheet(wb, guestsWs, 'Guest Data');
        
        filename = `Mikjane_Hotel_Guest_Report_${formattedDate}.xlsx`;
        previewData.headers = guestsData[0];
        previewData.rows = guestsData.slice(1, 11); // First 10 rows for preview
        break;
        
      case 'financial':
        // Financial report
        if (!financialData || !Array.isArray(financialData) || !financialData.length) {
          console.error('Financial data not available for Excel generation');
          return { filename: '', fileContent: null, previewData: null };
        }
        
        // Calculate financial summary
        const totalAmount = financialData.reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);
        const paidAmount = financialData.filter(invoice => invoice.status === 'Paid')
                          .reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);
        const pendingAmount = financialData.filter(invoice => invoice.status === 'Pending')
                            .reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);
        const paidCount = financialData.filter(invoice => invoice.status === 'Paid').length;
        const pendingCount = financialData.filter(invoice => invoice.status === 'Pending').length;
        
        // Create summary data
        const financialSummaryData = [
          ['Mikjane Hotel - Financial Report'],
          [`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`],
          [''],
          ['Summary Metrics'],
          ['Total Invoices', financialData.length],
          ['Total Amount', `GH₵${totalAmount.toLocaleString()}`],
          ['Paid Amount', `GH₵${paidAmount.toLocaleString()}`, `(${paidCount} invoices)`],
          ['Pending Amount', `GH₵${pendingAmount.toLocaleString()}`, `(${pendingCount} invoices)`],
          ['']
        ];
        
        // Create invoice data
        const invoiceData = [
          ['Invoice #', 'Guest', 'Room', 'Amount (GH₵)', 'Date', 'Status']
        ];
        
        financialData.forEach(invoice => {
          invoiceData.push([
            invoice.invoice_number || invoice.id || "N/A",
            invoice.guest_name || "N/A",
            invoice.room_id || invoice.room || "N/A",
            parseFloat(invoice.amount) || 0,
            invoice.created_at ? format(parseISO(invoice.created_at), 'MMM dd, yyyy') : "N/A",
            invoice.status || "N/A"
          ]);
        });
        
        // Add summary worksheet
        const financialSummaryWs = XLSX.utils.aoa_to_sheet(financialSummaryData);
        XLSX.utils.book_append_sheet(wb, financialSummaryWs, 'Summary');
        
        // Add invoice data worksheet
        const invoiceWs = XLSX.utils.aoa_to_sheet(invoiceData);
        XLSX.utils.book_append_sheet(wb, invoiceWs, 'Invoice Data');
        
        filename = `Mikjane_Hotel_Financial_Report_${formattedDate}.xlsx`;
        previewData.headers = invoiceData[0];
        previewData.rows = invoiceData.slice(1, 11); // First 10 rows for preview
        break;
        
      case 'occupancy':
        // Occupancy report
        // Calculate room statistics
        const totalRooms = rooms.length;
        const occupiedRooms = rooms.filter(room => room.status === 'Occupied').length;
        const reservedRooms = rooms.filter(room => room.status === 'Reserved').length;
        const availableRooms = rooms.filter(room => room.status === 'Available').length;
        const maintenanceRooms = rooms.filter(room => room.status === 'Maintenance').length;
        
        // Create summary data
        const occupancySummaryData = [
          ['Mikjane Hotel - Room Occupancy Report'],
          [`Date Range: ${occupancyData.dates[0]} - ${occupancyData.dates[occupancyData.dates.length - 1]}`],
          [''],
          ['Room Statistics'],
          ['Total Rooms', totalRooms],
          ['Occupied Rooms', occupiedRooms, `${Math.round((occupiedRooms/totalRooms)*100)}%`],
          ['Reserved Rooms', reservedRooms, `${Math.round((reservedRooms/totalRooms)*100)}%`],
          ['Available Rooms', availableRooms, `${Math.round((availableRooms/totalRooms)*100)}%`],
          ['Maintenance Rooms', maintenanceRooms, `${Math.round((maintenanceRooms/totalRooms)*100)}%`],
          ['Average Occupancy Rate', `${avgOccupancy}%`],
          ['']
        ];
        
        // Create daily occupancy data
        const dailyOccupancyData = [
          ['Date', 'Occupancy Rate (%)', 'Est. Rooms Occupied']
        ];
        
        for(let i = 0; i < occupancyData.dates.length; i++) {
          const estRoomsOccupied = Math.round((occupancyData.values[i] / 100) * totalRooms);
          dailyOccupancyData.push([
            occupancyData.dates[i],
            occupancyData.values[i],
            estRoomsOccupied
          ]);
        }
        
        // Create room status data
        const roomData = [
          ['Room #', 'Type', 'Status', 'Guest', 'Check-In', 'Check-Out', 'Price (GH₵)']
        ];
        
        rooms.forEach(room => {
          roomData.push([
            room.id || room.room_number || "N/A",
            room.type || "Standard",
            room.status || "N/A",
            room.guest || "N/A",
            room.checkIn || "N/A",
            room.checkOut || "N/A",
            room.price || "N/A"
          ]);
        });
        
        // Add summary worksheet
        const occupancySummaryWs = XLSX.utils.aoa_to_sheet(occupancySummaryData);
        XLSX.utils.book_append_sheet(wb, occupancySummaryWs, 'Summary');
        
        // Add daily data worksheet
        const dailyOccupancyWs = XLSX.utils.aoa_to_sheet(dailyOccupancyData);
        XLSX.utils.book_append_sheet(wb, dailyOccupancyWs, 'Daily Occupancy');
        
        // Add room data worksheet
        const roomWs = XLSX.utils.aoa_to_sheet(roomData);
        XLSX.utils.book_append_sheet(wb, roomWs, 'Room Status');
        
        filename = `Mikjane_Hotel_Occupancy_Report_${formattedDate}.xlsx`;
        previewData.headers = dailyOccupancyData[0];
        previewData.rows = dailyOccupancyData.slice(1, 11); // First 10 rows for preview
        break;
        
      case 'housekeeping':
        // Housekeeping report
        if (!housekeepingData || !Array.isArray(housekeepingData)) {
          console.error('Housekeeping data not available for Excel generation');
          return { filename: '', fileContent: null, previewData: null };
        }
        
        // Calculate housekeeping summary
        const pendingTasks = housekeepingData.filter(task => task.status === 'Pending').length;
        const completedTasks = housekeepingData.filter(task => task.status === 'Completed').length;
        const highPriorityTasks = housekeepingData.filter(task => task.priority === 'High').length;
        
        // Create summary data
        const housekeepingSummaryData = [
          ['Mikjane Hotel - Housekeeping Report'],
          [`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`],
          [''],
          ['Summary Metrics'],
          ['Total Tasks', housekeepingData.length],
          ['Pending Tasks', pendingTasks],
          ['Completed Tasks', completedTasks],
          ['High Priority Tasks', highPriorityTasks],
          ['']
        ];
        
        // Create tasks data
        const tasksData = [
          ['Room', 'Description', 'Assignee', 'Priority', 'Status', 'Due Date']
        ];
        
        housekeepingData.forEach(task => {
          tasksData.push([
            task.room || "N/A",
            task.description || "N/A",
            task.assignee || "N/A",
            task.priority || "N/A",
            task.status || "N/A",
            task.due_date ? format(parseISO(task.due_date), 'MMM dd, yyyy') : "N/A"
          ]);
        });
        
        // Add summary worksheet
        const housekeepingSummaryWs = XLSX.utils.aoa_to_sheet(housekeepingSummaryData);
        XLSX.utils.book_append_sheet(wb, housekeepingSummaryWs, 'Summary');
        
        // Add tasks data worksheet
        const tasksWs = XLSX.utils.aoa_to_sheet(tasksData);
        XLSX.utils.book_append_sheet(wb, tasksWs, 'Task Data');
        
        filename = `Mikjane_Hotel_Housekeeping_Report_${formattedDate}.xlsx`;
        previewData.headers = tasksData[0];
        previewData.rows = tasksData.slice(1, 11); // First 10 rows for preview
        break;
        
      case 'monthly':
        // Monthly report
        if (!monthlyPerformanceData || Object.keys(monthlyPerformanceData).length === 0) {
          console.error('Monthly performance data not available for Excel generation');
          return { filename: '', fileContent: null, previewData: null };
        }
        
        // Sort months chronologically
        const months = Object.keys(monthlyPerformanceData).sort((a, b) => {
          const dateA = new Date(a);
          const dateB = new Date(b);
          return dateA - dateB;
        });
        
        // Calculate totals
        const totalRevMon = months.reduce((sum, month) => sum + monthlyPerformanceData[month].revenue, 0);
        const totalPendingMon = months.reduce((sum, month) => sum + monthlyPerformanceData[month].pendingAmount, 0);
        const totalInvoicesMon = months.reduce((sum, month) => sum + monthlyPerformanceData[month].invoiceCount, 0);
        
        // Create summary data
        const monthlySummaryData = [
          ['Mikjane Hotel - Monthly Accounting Performance'],
          [`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`],
          [''],
          ['Summary Metrics'],
          ['Total Revenue', `GH₵${totalRevMon.toLocaleString()}`],
          ['Total Pending', `GH₵${totalPendingMon.toLocaleString()}`],
          ['Total Invoices', totalInvoicesMon],
          ['']
        ];
        
        // Create monthly data
        const monthlyData = [
          ['Month', 'Revenue (GH₵)', 'Pending (GH₵)', 'Invoices', 'Paid', 'Pending']
        ];
        
        months.forEach(month => {
          const data = monthlyPerformanceData[month];
          monthlyData.push([
            month,
            data.revenue,
            data.pendingAmount,
            data.invoiceCount,
            data.paidCount,
            data.pendingCount
          ]);
        });
        
        // Add summary worksheet
        const monthlySummaryWs = XLSX.utils.aoa_to_sheet(monthlySummaryData);
        XLSX.utils.book_append_sheet(wb, monthlySummaryWs, 'Summary');
        
        // Add monthly data worksheet
        const monthlyWs = XLSX.utils.aoa_to_sheet(monthlyData);
        XLSX.utils.book_append_sheet(wb, monthlyWs, 'Monthly Data');
        
        filename = `Mikjane_Hotel_Monthly_Report_${formattedDate}.xlsx`;
        previewData.headers = monthlyData[0];
        previewData.rows = monthlyData.slice(1); // All monthly data for preview
        break;
        
      default:
        // Default summary report
        // Create summary data
        const summaryData = [
          ['Mikjane Hotel - Performance Report'],
          [`Date Range: ${revenueData.dates[0]} - ${revenueData.dates[revenueData.dates.length - 1]}`],
          [''],
          ['Summary Metrics'],
          ['Total Revenue', `GH₵${totalRevenue.toLocaleString()}`],
          ['Pending Payments', `GH₵${pendingPayments.toLocaleString()}`],
          ['Average Occupancy Rate', `${avgOccupancy}%`],
          ['Total Room Bookings', `${totalRoomBookings}`],
          ['']
        ];
        
        // Create daily data
        const dailyData = [
          ['Date', 'Revenue (GH₵)', 'Occupancy Rate (%)']
        ];
        
        for (let i = 0; i < revenueData.dates.length; i++) {
          dailyData.push([
            revenueData.dates[i], 
            revenueData.values[i],
            `${occupancyData.values[i]}`
          ]);
        }
        
        // Add summary worksheet
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
        
        // Add daily data worksheet
        const dailyWs = XLSX.utils.aoa_to_sheet(dailyData);
        XLSX.utils.book_append_sheet(wb, dailyWs, 'Daily Data');
        
        filename = `Mikjane_Hotel_Summary_Report_${formattedDate}.xlsx`;
        previewData.headers = dailyData[0];
        previewData.rows = dailyData.slice(1); // All daily data for preview
    }
    
    // Convert workbook to binary string for storage
    const binaryString = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i) & 0xFF;
    }
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileContent = URL.createObjectURL(blob);
    
    // Generate Excel file and download
    XLSX.writeFile(wb, filename);
    
    return { filename, fileContent, previewData };
  };

  // Generate CSV report
  const generateCsvReport = (reportType = 'summary') => {
    // Generate current date string for filename
    const currentDate = new Date();
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    let filename = `Mikjane_Hotel_Report_${formattedDate}.csv`;
    
    // Initialize CSV data
    let csvData = [];
    
    // Based on report type, create appropriate data and filename
    switch(reportType) {
      case 'guests':
        // Guest report
        if (!guestData || !Array.isArray(guestData) || !guestData.length) {
          console.error('Guest data not available for CSV generation');
          return { filename: '', fileContent: null };
        }
        
        // Create header row
        csvData = [
          ['Name', 'Email', 'Phone', 'Room', 'Check-In', 'Check-Out', 'Status']
        ];
        
        // Add data rows
        guestData.forEach(guest => {
          csvData.push([
            guest.name || guest.guest_name || "N/A",
            guest.email || "N/A",
            guest.phone || "N/A",
            guest.room_id || guest.room || "N/A",
            guest.checkIn || guest.check_in || "N/A",
            guest.checkOut || guest.check_out || "N/A",
            guest.status || "N/A"
          ]);
        });
        
        filename = `Mikjane_Hotel_Guest_Report_${formattedDate}.csv`;
        break;
        
      case 'financial':
        // Financial report
        if (!financialData || !Array.isArray(financialData) || !financialData.length) {
          console.error('Financial data not available for CSV generation');
          return { filename: '', fileContent: null };
        }
        
        // Create header row
        csvData = [
          ['Invoice #', 'Guest', 'Room', 'Amount (GH₵)', 'Date', 'Status']
        ];
        
        // Add data rows
        financialData.forEach(invoice => {
          csvData.push([
            invoice.invoice_number || invoice.id || "N/A",
            invoice.guest_name || "N/A",
            invoice.room_id || invoice.room || "N/A",
            parseFloat(invoice.amount) || 0,
            invoice.created_at ? format(parseISO(invoice.created_at), 'MMM dd, yyyy') : "N/A",
            invoice.status || "N/A"
          ]);
        });
        
        filename = `Mikjane_Hotel_Financial_Report_${formattedDate}.csv`;
        break;
        
      case 'housekeeping':
        // Housekeeping report
        if (!housekeepingData || !Array.isArray(housekeepingData)) {
          console.error('Housekeeping data not available for CSV generation');
          return { filename: '', fileContent: null };
        }
        
        // Create header row
        csvData = [
          ['Room', 'Description', 'Assignee', 'Priority', 'Status', 'Due Date']
        ];
        
        // Add data rows
        housekeepingData.forEach(task => {
          csvData.push([
            task.room || "N/A",
            task.description || "N/A",
            task.assignee || "N/A",
            task.priority || "N/A",
            task.status || "N/A",
            task.due_date ? format(parseISO(task.due_date), 'MMM dd, yyyy') : "N/A"
          ]);
        });
        
        filename = `Mikjane_Hotel_Housekeeping_Report_${formattedDate}.csv`;
        break;
        
      case 'occupancy':
        // Occupancy report
        if (!occupancyData || !occupancyData.dates || !occupancyData.values ||
            !Array.isArray(occupancyData.dates) || !occupancyData.dates.length ||
            !Array.isArray(occupancyData.values) || !occupancyData.values.length) {
          console.error('Occupancy data not available for CSV generation');
          return { filename: '', fileContent: null };
        }
        
        // Create header row
        csvData = [
          ['Date', 'Occupancy Rate (%)', 'Est. Rooms Occupied']
        ];
        
        // Add data rows
        const totalRooms = rooms.length;
        for(let i = 0; i < occupancyData.dates.length; i++) {
          const estRoomsOccupied = Math.round((occupancyData.values[i] / 100) * totalRooms);
          csvData.push([
            occupancyData.dates[i],
            occupancyData.values[i],
            estRoomsOccupied
          ]);
        }
        
        filename = `Mikjane_Hotel_Occupancy_Report_${formattedDate}.csv`;
        break;
        
      case 'monthly':
        // Monthly report
        if (!monthlyPerformanceData || Object.keys(monthlyPerformanceData).length === 0) {
          console.error('Monthly performance data not available for CSV generation');
          return { filename: '', fileContent: null };
        }
        
        // Create header row
        csvData = [
          ['Month', 'Revenue (GH₵)', 'Pending (GH₵)', 'Invoices', 'Paid', 'Pending']
        ];
        
        // Sort months chronologically
        const months = Object.keys(monthlyPerformanceData).sort((a, b) => {
          const dateA = new Date(a);
          const dateB = new Date(b);
          return dateA - dateB;
        });
        
        // Add data rows
        months.forEach(month => {
          const data = monthlyPerformanceData[month];
          csvData.push([
            month,
            data.revenue,
            data.pendingAmount,
            data.invoiceCount,
            data.paidCount,
            data.pendingCount
          ]);
        });
        
        filename = `Mikjane_Hotel_Monthly_Report_${formattedDate}.csv`;
        break;
        
      default:
        // Default summary report
        // Create header row
        csvData = [
          ['Date', 'Revenue (GH₵)', 'Occupancy Rate (%)']
        ];
        
        // Add data rows
        for (let i = 0; i < revenueData.dates.length; i++) {
          csvData.push([
            revenueData.dates[i], 
            revenueData.values[i],
            occupancyData.values[i]
          ]);
        }
        
        filename = `Mikjane_Hotel_Summary_Report_${formattedDate}.csv`;
    }
    
    // Convert to CSV string
    let csvContent = csvData.map(row => row.join(',')).join('\n');
    
    // Create blob and URL for file content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const fileContent = URL.createObjectURL(blob);
    
    // Extract preview data
    const previewData = {
      headers: csvData.length > 0 ? csvData[0] : [],
      rows: csvData.slice(1, 11) // First 10 rows for preview
    };
    
    // Download CSV file
    saveAs(blob, filename);
    
    return { filename, fileContent, previewData };
  };

  // Add a cleanup effect to dispose of charts when component unmounts
  useEffect(() => {
    return () => {
      if (revenueChartInstance.current) {
        revenueChartInstance.current.dispose();
      }
      if (occupancyChartInstance.current) {
        occupancyChartInstance.current.dispose();
      }
      
      // Remove any event listeners added by charts
      window.removeEventListener('resize', handleRevenueChartResize);
      window.removeEventListener('resize', handleOccupancyChartResize);
    };
  }, []);
  
  // Handlers for chart resize
  const handleRevenueChartResize = () => {
    revenueChartInstance.current?.resize();
  };
  
  const handleOccupancyChartResize = () => {
    occupancyChartInstance.current?.resize();
  };
  
  // Add resize event listeners
  useEffect(() => {
    window.addEventListener('resize', handleRevenueChartResize);
    window.addEventListener('resize', handleOccupancyChartResize);
    
    return () => {
      window.removeEventListener('resize', handleRevenueChartResize);
      window.removeEventListener('resize', handleOccupancyChartResize);
    };
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar activeLink="Reports" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Reports" />
        
        {/* Toast notification */}
        {toast && (
          <Toast 
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
        
        {/* Report Preview and Share Modal */}
        <ReportModal 
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title={selectedReport?.name || 'Report Preview'}
          reportData={selectedReport}
          reportType={selectedReport?.type || 'PDF'}
          isDarkMode={isDarkMode}
          initialTab={selectedReport?.activeTab || 'preview'}
        />
        
        <div className={`flex-1 overflow-y-auto p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
          {/* Report Controls */}
          <div className={`mb-6 p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block mb-1 text-sm font-medium">Date Range</label>
                <select 
                  value={dateRange} 
                  onChange={(e) => setDateRange(e.target.value)}
                  className={`rounded p-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 3 Months</option>
                  <option value="12months">Last 12 Months</option>
                </select>
              </div>
              
              <div className="ml-auto flex gap-2">
                <div className="text-sm text-gray-500 italic flex items-center">
                  <i className="fas fa-arrow-down mr-1"></i> Use the Report Generation section below
                </div>
              </div>
            </div>
          </div>
          
          {/* Report Type Selector */}
          <div className={`mb-6 p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-medium mb-4">Report Generation</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="w-full md:w-1/3">
                <label className="block mb-1 text-sm font-medium">Report Type</label>
                <select 
                  value={selectedReportType} 
                  onChange={handleReportTypeChange}
                  className={`w-full rounded p-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                >
                  {reportTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-500">
                  Select the type of report you want to generate
                </p>
              </div>
              
              <div className="w-full md:w-2/3 flex gap-4 mt-4 md:mt-0 justify-end items-end">
                <button 
                  onClick={() => {
                    generatePdfReport(selectedReportType);
                  }}
                  disabled={isGenerating}
                  className={`px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 flex items-center ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FaFilePdf className="mr-2" /> PDF Report
                </button>
                
                <button 
                  onClick={() => generateExcelReport(selectedReportType)}
                  disabled={isGenerating}
                  className={`px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 flex items-center ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FaFileExcel className="mr-2" /> Excel Report
                </button>
                
                <button 
                  onClick={() => generateCsvReport(selectedReportType)}
                  disabled={isGenerating}
                  className={`px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 flex items-center ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FaFileCsv className="mr-2" /> CSV Report
                </button>
              </div>
            </div>
          </div>
          
          {/* Show loading state when data isn't ready */}
          {(!revenueData.values || !revenueData.values.length || !occupancyData.values || !occupancyData.values.length) ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="flex space-x-2 animate-pulse mb-4">
                  <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                </div>
                <p className="text-lg">Loading report data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Revenue Card */}
                <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Revenue (Completed Payments)</p>
                      <h3 className="text-2xl font-bold mt-1">GH₵{totalRevenue.toLocaleString()}</h3>
                    </div>
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-900' : 'bg-blue-100'}`}>
                      <i className={`fas fa-money-bill-wave text-xl ${isDarkMode ? 'text-blue-300' : 'text-blue-500'}`}></i>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-medium">
                    <span className="text-gray-500 flex items-center">
                      <i className="fas fa-info-circle mr-1"></i> From all paid bills
                    </span>
                  </div>
                </div>
                
                {/* Pending Payments Card */}
                <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Pending Payments</p>
                      <h3 className="text-2xl font-bold mt-1">GH₵{pendingPayments.toLocaleString()}</h3>
                    </div>
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-yellow-900' : 'bg-yellow-100'}`}>
                      <i className={`fas fa-clock text-xl ${isDarkMode ? 'text-yellow-300' : 'text-yellow-500'}`}></i>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-medium">
                    <span className="text-red-500 flex items-center">
                      <i className="fas fa-arrow-up mr-1"></i> 5.7% 
                      <span className="text-gray-500 ml-1">from last period</span>
                    </span>
                  </div>
                </div>
                
                {/* Average Occupancy Card */}
                <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Average Occupancy</p>
                      <h3 className="text-2xl font-bold mt-1">{avgOccupancy}%</h3>
                    </div>
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-green-900' : 'bg-green-100'}`}>
                      <i className={`fas fa-bed text-xl ${isDarkMode ? 'text-green-300' : 'text-green-500'}`}></i>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-medium">
                    <span className="text-green-500 flex items-center">
                      <i className="fas fa-arrow-up mr-1"></i> 3.2% 
                      <span className="text-gray-500 ml-1">from last period</span>
                    </span>
                  </div>
                </div>
                
                {/* Room Bookings Card */}
                <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Room Bookings</p>
                      <h3 className="text-2xl font-bold mt-1">{totalRoomBookings}</h3>
                    </div>
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-purple-900' : 'bg-purple-100'}`}>
                      <i className={`fas fa-calendar-check text-xl ${isDarkMode ? 'text-purple-300' : 'text-purple-500'}`}></i>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-medium">
                    <span className="text-green-500 flex items-center">
                      <i className="fas fa-arrow-up mr-1"></i> 8.7% 
                      <span className="text-gray-500 ml-1">from last period</span>
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Revenue Chart */}
                <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className="text-lg font-medium mb-4">Revenue Trend</h3>
                  <div ref={revenueChartRef} style={{ height: '300px' }}></div>
                </div>
                
                {/* Occupancy Chart */}
                <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className="text-lg font-medium mb-4">Occupancy Rate</h3>
                  <div ref={occupancyChartRef} style={{ height: '300px' }}></div>
                </div>
              </div>
              
              {/* Performance Analysis */}
              <div className={`p-4 rounded-lg shadow-md mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className="text-lg font-medium mb-4">Performance Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Revenue Insights</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <i className="fas fa-check-circle text-green-500 mt-1 mr-2"></i>
                        <span>Revenue is tracked from all completed payments in the Billing system.</span>
                      </li>
                      <li className="flex items-start">
                        <i className="fas fa-exclamation-circle text-yellow-500 mt-1 mr-2"></i>
                        <span>Weekend revenue peaks are higher than previous periods by 15%.</span>
                      </li>
                      <li className="flex items-start">
                        <i className="fas fa-info-circle text-blue-500 mt-1 mr-2"></i>
                        <span>Average daily revenue: GH₵{(totalRevenue / (revenueData.dates.length || 1)).toFixed(2).toLocaleString()}</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Occupancy Insights</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <i className="fas fa-check-circle text-green-500 mt-1 mr-2"></i>
                        <span>Occupancy rate is calculated from the Rooms data, based on room status and check-in/check-out dates.</span>
                      </li>
                      <li className="flex items-start">
                        <i className="fas fa-exclamation-circle text-yellow-500 mt-1 mr-2"></i>
                        <span>Average occupancy rate is {avgOccupancy}% over the selected period.</span>
                      </li>
                      <li className="flex items-start">
                        <i className="fas fa-info-circle text-blue-500 mt-1 mr-2"></i>
                        <span>Estimated revenue per occupied room: GH₵{(totalRevenue / (rooms.filter(r => r.status === 'Occupied').length || 1)).toFixed(2).toLocaleString()}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Report History */}
              <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className="text-lg font-medium mb-4">Report History</h3>
                <div className="overflow-x-auto">
                  <table className={`min-w-full ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <thead>
                      <tr className={`${isDarkMode ? 'border-gray-700' : 'border-gray-300'} border-b`}>
                        <th className="py-3 px-4 text-left">Report Name</th>
                        <th className="py-3 px-4 text-left">Date Generated</th>
                        <th className="py-3 px-4 text-left">Type</th>
                        <th className="py-3 px-4 text-left">Generated By</th>
                        <th className="py-3 px-4 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportHistory.length > 0 ? (
                        reportHistory.map(report => (
                          <tr key={report.id} className={`${isDarkMode ? 'border-gray-700' : 'border-gray-300'} border-b`}>
                            <td className="py-3 px-4">{report.name}</td>
                            <td className="py-3 px-4">{report.date}</td>
                            <td className="py-3 px-4">{report.type}</td>
                            <td className="py-3 px-4">{report.generatedBy}</td>
                            <td className="py-3 px-4 space-x-2">
                              {report.fileContent ? (
                                <>
                                  <button 
                                    className="text-blue-500 hover:underline"
                                    onClick={() => {
                                      // Direct download using the stored file content
                                      if (report.type === 'PDF') {
                                        // Create a link to download the PDF
                                        const link = document.createElement('a');
                                        link.href = report.fileContent;
                                        link.download = report.filename;
                                        link.click();
                                      } else if (report.type === 'EXCEL' || report.type === 'CSV') {
                                        // For Excel and CSV, create a download link
                                        const link = document.createElement('a');
                                        link.href = report.fileContent;
                                        link.download = report.filename;
                                        link.click();
                                      }
                                    }}
                                  >
                                    <FaDownload className="inline mr-1" /> Download
                                  </button>
                                  <button 
                                    className="text-green-500 hover:underline"
                                    onClick={() => openPreviewModal(report)}
                                  >
                                    <FaEye className="inline mr-1" /> Preview
                                  </button>
                                  <button 
                                    className="text-purple-500 hover:underline"
                                    onClick={() => {
                                      setSelectedReport({...report, activeTab: 'share'});
                                      setPreviewModalOpen(true);
                                    }}
                                  >
                                    <FaShareAlt className="inline mr-1" /> Share
                                  </button>
                                </>
                              ) : (
                                // Fallback for older reports without stored content
                                <button 
                                  className="text-blue-500 hover:underline"
                                  onClick={() => {
                                    // Regenerate the report
                                    switch(report.type) {
                                      case 'PDF':
                                        generatePdfReport(report.name.toLowerCase().includes('summary') ? 'summary' : 
                                                         report.name.toLowerCase().includes('guest') ? 'guests' :
                                                         report.name.toLowerCase().includes('financial') ? 'financial' :
                                                         report.name.toLowerCase().includes('housekeeping') ? 'housekeeping' :
                                                         report.name.toLowerCase().includes('occupancy') ? 'occupancy' :
                                                         report.name.toLowerCase().includes('monthly') ? 'monthly' : 'summary');
                                        break;
                                      case 'EXCEL':
                                        generateExcelReport(report.name.toLowerCase().includes('summary') ? 'summary' : 
                                                          report.name.toLowerCase().includes('guest') ? 'guests' :
                                                          report.name.toLowerCase().includes('financial') ? 'financial' :
                                                          report.name.toLowerCase().includes('housekeeping') ? 'housekeeping' :
                                                          report.name.toLowerCase().includes('occupancy') ? 'occupancy' :
                                                          report.name.toLowerCase().includes('monthly') ? 'monthly' : 'summary');
                                        break;
                                      case 'CSV':
                                        generateCsvReport(report.name.toLowerCase().includes('summary') ? 'summary' : 
                                                         report.name.toLowerCase().includes('guest') ? 'guests' :
                                                         report.name.toLowerCase().includes('financial') ? 'financial' :
                                                         report.name.toLowerCase().includes('housekeeping') ? 'housekeeping' :
                                                         report.name.toLowerCase().includes('occupancy') ? 'occupancy' :
                                                         report.name.toLowerCase().includes('monthly') ? 'monthly' : 'summary');
                                        break;
                                    }
                                  }}
                                >
                                  <FaDownload className="inline mr-1" /> Download
                                </button>
                              )}
                              <button 
                                className="text-red-500 hover:underline ml-2"
                                onClick={() => deleteReport(report.id)}
                              >
                                <i className="fas fa-trash mr-1"></i> Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-4 px-4 text-center text-gray-500">
                            No reports have been generated yet. Use the Report Generation section above to create reports.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;