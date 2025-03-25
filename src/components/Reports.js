import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useTheme } from '../context/ThemeContext';
import { useRoomReservation } from '../context/RoomReservationContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subDays, parseISO, isToday, isAfter, isBefore, addDays, differenceInDays } from 'date-fns';
import * as XLSX from 'xlsx';
import supabase from '../supabaseClient';
import { FaFilePdf, FaFileExcel, FaFileCsv, FaEye, FaShareAlt, FaDownload, FaEnvelope, FaLink, FaTimesCircle } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useUser } from '../context/UserContext';

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
const ReportModal = ({ isOpen, onClose, title, content, reportData, reportType, darkMode, initialTab = 'preview' }) => {
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
      <div className={`relative ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} w-11/12 max-w-5xl rounded-lg shadow-lg p-6 m-4`}>
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
              `font-bold border-b-2 ${darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-500'}` : 
              'text-gray-500'}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
          <button 
            className={`py-2 px-4 ${activeTab === 'share' ? 
              `font-bold border-b-2 ${darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-500'}` : 
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
              <div className={`overflow-auto ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-4 rounded`}>
                <table className={`min-w-full border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  {reportData?.previewData?.headers && (
                    <thead>
                      <tr className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-200 border-gray-300'} border-b`}>
                        {reportData.previewData.headers.map((header, idx) => (
                          <th key={idx} className="py-2 px-4 text-left">{header}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {reportData?.previewData?.rows && reportData.previewData.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className={`${rowIdx % 2 === 0 ? (darkMode ? 'bg-gray-700' : 'bg-white') : (darkMode ? 'bg-gray-750' : 'bg-gray-50')} border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
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
                  className={`flex-1 p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
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
                  className={`flex-1 p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
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
            className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Preview Modal Component
const PreviewModal = ({ isOpen, onClose, report }) => {
  const { theme } = useTheme();
  const darkMode = theme === 'dark';
  
  if (!isOpen || !report) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-6xl max-h-[90vh] overflow-auto ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-xl p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{report.name}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <p><strong>Date:</strong> {new Date(report.date).toLocaleString()}</p>
          <p><strong>Type:</strong> {report.type}</p>
          <p><strong>Format:</strong> {(report.format || report.type || 'Unknown').toUpperCase()}</p>
          <p><strong>Generated By:</strong> {report.generatedBy}</p>
        </div>
        
        {report.previewData && (report.format === 'pdf' || report.type === 'PDF') && (
          <div className="w-full h-[70vh] border border-gray-300 rounded overflow-hidden">
            <object 
              data={report.previewData} 
              type="application/pdf" 
              width="100%" 
              height="100%"
              className="w-full h-full"
            >
              <p>It appears your browser doesn't support embedded PDFs. 
                <a href={report.previewData} target="_blank" rel="noopener noreferrer">Click here to download the PDF</a>.
              </p>
            </object>
          </div>
        )}
        
        <div className="flex justify-end mt-4 space-x-2">
          <button 
            onClick={() => {
              // Download the report
              const link = document.createElement('a');
              link.href = report.previewData;
              link.download = report.filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className={`px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md`}
          >
            Download
          </button>
          <button 
            onClick={onClose}
            className={`px-4 py-2 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-md`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const Reports = () => {
  const { user } = useUser();
  const { theme } = useTheme();
  const darkMode = theme === 'dark';
  
  // Chart refs
  const revenueChartInstance = useRef(null);
  const occupancyChartInstance = useRef(null);
  const occupancyChartRef = useRef(null);
  const revenueChartRef = useRef(null);
  
  // State for report parameters
  const [dateRange, setDateRange] = useState('7days');
  const [reportType, setReportType] = useState('summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [revenueData, setRevenueData] = useState({ dates: [], values: [] });
  const [occupancyData, setOccupancyData] = useState({ dates: [], values: [] });
  const [isLoading, setIsLoading] = useState(true);
  
  // State for different data types
  const [guestData, setGuestData] = useState([]);
  const [financialData, setFinancialData] = useState([]);
  const [housekeepingData, setHousekeepingData] = useState([]);
  const [monthlyPerformanceData, setMonthlyPerformanceData] = useState({});
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [revenue, setRevenue] = useState({});
  
  // State for selected report type
  const [selectedReportType, setSelectedReportType] = useState('summary');
  
  // State for report history
  const [reportHistory, setReportHistory] = useState([]);
  
  // State for preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Calculated fields for use in components and charts
  const totalRevenue = revenueData?.values?.reduce((sum, value) => sum + value, 0) || 0;
  const avgOccupancy = occupancyData?.values?.length ? 
    Math.round(occupancyData.values.reduce((sum, value) => sum + value, 0) / occupancyData.values.length) : 0;
  const totalRoomBookings = reservations?.filter(reservation => 
    reservation?.status === 'Checked In' || reservation?.status === 'Checked Out').length || 0;
  
  // Map database report to component format
  const mapDbReportToComponentFormat = (dbReport) => {
    return {
      id: dbReport.id,
      name: dbReport.name,
      date: dbReport.date,
      type: dbReport.type,
      format: dbReport.format || dbReport.type?.toLowerCase(),
      generatedBy: dbReport.generated_by,
      filename: dbReport.filename,
      fileContent: dbReport.file_content,
      previewData: dbReport.preview_data
    };
  };

  // Load report history from Supabase when component mounts
  useEffect(() => {
    const fetchReportHistory = async () => {
      try {
        // Get reports from Supabase
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching report history:', error);
          return;
        }
        
        if (data) {
          // Map database format to component format
          const formattedReports = data.map(mapDbReportToComponentFormat);
          setReportHistory(formattedReports);
        }
      } catch (error) {
        console.error('Error fetching report history:', error);
      }
    };
    
    fetchReportHistory();
  }, []);
  
  // Save report history to Supabase when it changes
  const saveReportToSupabase = async (newReport) => {
    try {
      console.log(`Attempting to save report to Supabase: ${newReport.name}, ID: ${newReport.id}, Format: ${newReport.format}`);
      
      // Verify the report data before saving
      if (!newReport.id || !newReport.name || !newReport.fileContent) {
        console.error('Invalid report data:', newReport);
        throw new Error('Invalid report data for saving to Supabase');
      }
      
      const { data, error } = await supabase
        .from('reports')
        .insert([{
          id: newReport.id,
          name: newReport.name,
          date: newReport.date,
          type: newReport.type,
          format: newReport.format || newReport.type?.toLowerCase(),
          generated_by: newReport.generatedBy,
          filename: newReport.filename,
          file_content: newReport.fileContent,
          preview_data: newReport.previewData,
          created_at: new Date().toISOString()
        }]);
        
      if (error) {
        console.error('Supabase error saving report:', error);
        throw error;
      }
      
      console.log(`Successfully saved report to Supabase, data:`, data ? `Received data with ${data.length} records` : 'No data returned');
      return data;
    } catch (error) {
      console.error('Error saving report to Supabase:', error);
      throw error;
    }
  };
  
  // Delete a report from history
  const deleteReport = async (reportId) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);
        
      if (error) {
        console.error('Error deleting report:', error);
        throw error;
      }
      
      // Update local state after successful deletion
      setReportHistory(prevHistory => prevHistory.filter(report => report.id !== reportId));
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report. Please try again.');
    }
  };
  
  // Open preview modal
  const openPreviewModal = (report) => {
    setSelectedReport(report);
    setShowPreviewModal(true);
  };
  
  // Open share modal
  const openShareModal = (report) => {
    setSelectedReport(report);
    setShowPreviewModal(true);
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
          .select('*');
          // Removed filtering by type since the column doesn't exist
          
        if (housekeepingError) {
          console.error('Error fetching housekeeping data:', housekeepingError);
          housekeepingTasks = [];
        }
        
        // If needed, filter housekeeping tasks after fetching
        const filteredHousekeepingTasks = housekeepingTasks?.filter(task => 
          task.category === 'Housekeeping' || 
          task.task_type === 'Housekeeping' || 
          task.department === 'Housekeeping'
        ) || [];
        
        setHousekeepingData(filteredHousekeepingTasks);
        
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
  
  // Ensure charts are reinitialized when dark mode changes
  useEffect(() => {
    if (!revenueChartRef.current || !occupancyChartRef.current || isLoading) return;
    
    // Dispose of existing chart instances
    if (revenueChartInstance.current) {
      revenueChartInstance.current.dispose();
    }
    
    if (occupancyChartInstance.current) {
      occupancyChartInstance.current.dispose();
    }
    
    // Create new chart instances with the correct theme
    revenueChartInstance.current = echarts.init(revenueChartRef.current, darkMode ? 'dark' : null);
    occupancyChartInstance.current = echarts.init(occupancyChartRef.current, darkMode ? 'dark' : null);
    
    // Render charts with the current data
    renderRevenueChart();
    renderOccupancyChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode, isLoading]);
  
  // Create and initialize charts when data is available
  useEffect(() => {
    if (isLoading || !revenueChartRef.current || !occupancyChartRef.current) return;
    
    // Initialize ECharts instances
    if (revenueChartInstance.current) {
      revenueChartInstance.current.dispose();
    }
    
    if (occupancyChartInstance.current) {
      occupancyChartInstance.current.dispose();
    }
    
    // Create new chart instances with proper theme
    revenueChartInstance.current = echarts.init(revenueChartRef.current, darkMode ? 'dark' : null);
    occupancyChartInstance.current = echarts.init(occupancyChartRef.current, darkMode ? 'dark' : null);
    
    renderRevenueChart();
    renderOccupancyChart();
    
    // Add resize event listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      revenueChartInstance.current?.dispose();
      occupancyChartInstance.current?.dispose();
    };
  }, [isLoading, revenueData, occupancyData, rooms, darkMode]);
  
  // Handle window resize
  const handleResize = () => {
    revenueChartInstance.current?.resize();
    occupancyChartInstance.current?.resize();
  };
  
  // Render revenue chart
  const renderRevenueChart = () => {
    if (!revenueChartInstance.current || !revenueData.dates || !revenueData.values) return;
    
    const option = {
      title: {
        text: 'Daily Revenue',
        textStyle: {
          color: darkMode ? '#ccc' : '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const dateStr = params[0].axisValue;
          const revenueValue = params[0].value;
          const formattedRevenue = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(revenueValue);
          
          // Return a completely custom tooltip with no default formatting
          return `<div style="padding: 8px;">
                    <div style="margin-bottom: 5px;"><strong>Date:</strong> ${dateStr}</div>
                    <div><strong>Revenue:</strong> ${formattedRevenue}</div>
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
        data: revenueData.dates,
        axisLabel: {
          color: darkMode ? '#ccc' : '#333'
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: darkMode ? '#ccc' : '#333'
        }
      },
      series: [
        {
          name: 'Revenue',
          type: 'line',
          smooth: true,
          lineStyle: {
            width: 3,
            color: '#3a7bd5'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: darkMode ? 'rgba(58, 123, 213, 0.8)' : 'rgba(58, 123, 213, 0.8)' },
              { offset: 1, color: darkMode ? 'rgba(58, 123, 213, 0.1)' : 'rgba(58, 123, 213, 0.1)' }
            ])
          },
          emphasis: {
            focus: 'series'
          },
          data: revenueData.values
        }
      ],
      backgroundColor: darkMode ? '#1f2937' : '#fff'
    };
    
    revenueChartInstance.current.setOption(option);
  };
  
  // Render occupancy chart
  const renderOccupancyChart = () => {
    if (!occupancyChartInstance.current || !occupancyData.dates || !occupancyData.values) return;
    
    const option = {
      title: {
        text: 'Daily Occupancy',
        textStyle: {
          color: darkMode ? '#ccc' : '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const dateStr = params[0].axisValue;
          const occupancyValue = params[0].value;
          const occupiedRooms = Math.round((occupancyValue / 100) * rooms.length);
          const formattedRevenue = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(occupiedRooms * 150); // Assuming average revenue per room
          
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
          color: darkMode ? '#ccc' : '#333'
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value}%',
          color: darkMode ? '#ccc' : '#333'
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
      backgroundColor: darkMode ? '#1f2937' : '#fff'
    };
    
    occupancyChartInstance.current.setOption(option);
  };

  // Function to generate a report
  const generateReport = async (reportType = 'summary', reportFormat = 'pdf') => {
    setIsGenerating(true);
    
    try {
      // Generate a filename based on current date
      const currentDate = new Date();
      const formattedDate = format(currentDate, 'yyyy-MM-dd');
      const reportName = `Mikjane_Hotel_${reportType.charAt(0).toUpperCase() + reportType.slice(1)}_Report`;
      let fileName = `${reportName}_${formattedDate}`;
      let fileContent = null;
      
      console.log(`Generating ${reportType} report in ${reportFormat} format...`);
      
      // Generate the appropriate report based on format
      let reportPromise;
      
      switch(reportFormat) {
        case 'pdf':
          // PDF reports
          fileName += '.pdf';
          console.log(`Creating PDF report: ${fileName}, type: ${reportType}`);
          reportPromise = generatePdfReport(reportType, fileName);
          break;
          
        case 'excel':
          // Excel reports
          fileName += '.xlsx';
          console.log(`Creating Excel report: ${fileName}, type: ${reportType}`);
          reportPromise = generateExcelReport(reportType, fileName);
          break;
          
        case 'csv':
          // CSV reports
          fileName += '.csv';
          console.log(`Creating CSV report: ${fileName}, type: ${reportType}`);
          reportPromise = generateCsvReport(reportType, fileName);
          break;
          
        default:
          // Default to PDF
          fileName += '.pdf';
          console.log(`Creating default PDF report: ${fileName}, type: ${reportType}`);
          reportPromise = generatePdfReport(reportType, fileName);
      }
      
      // Wait for the report to be generated
      console.log(`Waiting for ${reportFormat} report generation to complete...`);
      const result = await reportPromise;
      console.log(`Report generation completed, result:`, result ? 'Result received' : 'No result');
      
      fileName = result.filename;
      fileContent = result.fileContent;
      
      if (!fileContent) {
        console.error(`Generated report has no content for type: ${reportType}`);
        throw new Error('Report generation failed: Empty content');
      }
      
      // Show success message
      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully!`);
      
      // Create a new report object
      const newReport = {
        id: uuidv4(),
        name: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        date: new Date().toISOString(),
        type: reportFormat.toUpperCase(),
        generatedBy: user?.username || 'Admin',
        filename: fileName,
        fileContent: fileContent,
        previewData: fileContent,
        format: reportFormat
      };
      
      console.log(`Saving report to Supabase: ${newReport.name}, Format: ${reportFormat}, Type: ${reportType}, ID: ${newReport.id}`);
      
      // Add the new report to Supabase and update local state
      try {
        const savedData = await saveReportToSupabase(newReport);
        console.log(`Successfully saved report to Supabase:`, savedData ? 'Data returned' : 'No data returned');
        
        // Update the UI with the new report
        setReportHistory(prevHistory => {
          const updatedHistory = [newReport, ...prevHistory];
          console.log(`Updated report history in UI: ${updatedHistory.length} total reports`);
          return updatedHistory;
        });
      } catch (saveError) {
        console.error('Error saving report to Supabase:', saveError);
        toast.error('Report generated but could not be saved to database. Using local memory instead.');
        
        // Still update UI even if save fails
        setReportHistory(prevHistory => {
          const updatedHistory = [newReport, ...prevHistory];
          console.log(`Updated report history in UI memory only due to save error: ${updatedHistory.length} total reports`);
          return updatedHistory;
        });
      }
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate PDF report based on type
  const generatePdfReport = async (reportType, filename) => {
    return new Promise((resolve, reject) => {
      try {
        // Create new PDF document
        const doc = new jsPDF();
        
        // Define styles for different text elements
        const styles = {
          title: {
            fontSize: 18,
            textColor: [0, 0, 0]
          },
          subtitle: {
            fontSize: 12,
            textColor: [100, 100, 100]
          },
          heading: {
            fontSize: 14,
            textColor: [0, 0, 0]
          },
          normal: {
            fontSize: 10,
            textColor: [0, 0, 0]
          },
          tableHeader: {
            fontSize: 10,
            textColor: [255, 255, 255],
            fillColor: [41, 128, 185],
            fontStyle: 'bold'
          },
          tableRow: {
            fontSize: 9,
            textColor: [0, 0, 0]
          },
          tableRowAlternate: {
            fillColor: [240, 240, 240]
          }
        };
        
        // Generate appropriate report based on type
        switch(reportType) {
          case 'summary':
            generateSummaryPdfReport(doc, styles);
            break;
          case 'financial':
            generateFinancialPdfReport(doc, styles);
            break;
          case 'occupancy':
            generateOccupancyPdfReport(doc, styles);
            break;
          case 'guests':
            generateGuestPdfReport(doc, styles);
            break;
          case 'housekeeping':
            generateHousekeepingPdfReport(doc, styles);
            break;
          case 'monthly':
            generateMonthlyPdfReport(doc, styles);
            break;
          default:
            generateSummaryPdfReport(doc, styles);
        }
        
        // Add page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          const pageSize = doc.internal.pageSize;
          const pageWidth = pageSize.width || pageSize.getWidth();
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, doc.internal.pageSize.height - 10);
        }
        
        // Save the PDF
        const pdfOutput = doc.output('datauristring');
        
        // Resolve with the result
        resolve({
          filename: filename,
          fileContent: pdfOutput
        });
      } catch (error) {
        console.error('Error generating PDF report:', error);
        reject(error);
      }
    });
  };
  
  // Basic Excel report generation
  const generateExcelReport = async (reportType, filename) => {
    return new Promise((resolve, reject) => {
      try {
        // Placeholder for Excel report generation
        // In a real implementation, you would create an Excel file using xlsx library
        const workbook = XLSX.utils.book_new();
        let data = [];
        let headers = [];
        
        switch(reportType) {
          case 'summary':
            headers = ['Date', 'Revenue', 'Occupancy Rate'];
            console.log("Generating summary Excel report with revenue data:", revenueData ? `Available (${revenueData.dates.length} dates)` : "Not available");
            console.log("Occupancy data:", occupancyData ? `Available (${occupancyData.values.length} values)` : "Not available");
            
            if (!revenueData || !revenueData.dates || !revenueData.dates.length || 
                !occupancyData || !occupancyData.values || !occupancyData.values.length) {
              console.error("Missing required data for summary Excel report");
              
              // Create fallback data with current date if data is missing
              const currentDate = format(new Date(), 'MMM dd');
              data.push([currentDate, 0, '0%']);
            } else {
              // Add data from revenue and occupancy arrays
              for (let i = 0; i < revenueData.dates.length; i++) {
                data.push([
                  revenueData.dates[i],
                  revenueData.values[i],
                  (occupancyData.values[i] || 0) + '%'
                ]);
              }
            }
            break;
          
          case 'financial':
            // Financial report data
            headers = ['Invoice #', 'Guest', 'Room', 'Amount', 'Date', 'Status'];
            data = financialData.map(invoice => [
              invoice.invoice_number || 'N/A',
              invoice.guest_name || 'N/A',
              invoice.room_id || 'N/A',
              invoice.amount || '0',
              invoice.created_at || 'N/A',
              invoice.status || 'N/A'
            ]);
            break;
          
          case 'housekeeping':
            // Housekeeping report data
            headers = ['Task ID', 'Description', 'Room', 'Status', 'Assigned To', 'Due Date'];
            data = housekeepingData.map(task => [
              task.id || 'N/A',
              task.description || task.task_description || 'N/A',
              task.room_id || task.room || 'N/A',
              task.status || 'N/A',
              task.assigned_to || 'N/A',
              task.due_date || task.created_at || 'N/A'
            ]);
            break;
            
          case 'monthly':
            // Monthly report data
            headers = ['Month', 'Revenue', 'Pending Amount', 'Invoice Count', 'Paid Count', 'Pending Count'];
            data = Object.entries(monthlyPerformanceData).map(([month, data]) => [
              month,
              data.revenue || 0,
              data.pendingAmount || 0,
              data.invoiceCount || 0,
              data.paidCount || 0,
              data.pendingCount || 0
            ]);
            break;
            
          case 'guests':
            // Guest report data
            headers = ['Name', 'Email', 'Phone', 'Room', 'Check-In', 'Check-Out', 'Status'];
            data = guestData.map(guest => [
              guest.name || guest.guest_name || 'N/A',
              guest.email || 'N/A',
              guest.phone || 'N/A',
              guest.room_id || guest.room || 'N/A',
              guest.checkIn || guest.check_in || 'N/A',
              guest.checkOut || guest.check_out || 'N/A',
              guest.status || 'N/A'
            ]);
            break;
            
          default:
            headers = ['Date', 'Revenue', 'Occupancy Rate'];
            console.log("Generating default Excel/CSV report with revenue data:", revenueData ? `Available (${revenueData.dates.length} dates)` : "Not available");
            console.log("Occupancy data:", occupancyData ? `Available (${occupancyData.values.length} values)` : "Not available");
            
            if (!revenueData || !revenueData.dates || !revenueData.dates.length || 
                !occupancyData || !occupancyData.values || !occupancyData.values.length) {
              console.error("Missing required data for default report");
              
              // Create fallback data with current date if data is missing
              const currentDate = format(new Date(), 'MMM dd');
              data.push([currentDate, 0, '0%']);
            } else {
              // Add data from revenue and occupancy arrays
              for (let i = 0; i < revenueData.dates.length; i++) {
                data.push([
                  revenueData.dates[i],
                  revenueData.values[i],
                  (occupancyData.values[i] || 0) + '%'
                ]);
              }
            }
        }
        
        // Create worksheet and add to workbook
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
        XLSX.utils.book_append_sheet(workbook, worksheet, reportType.charAt(0).toUpperCase() + reportType.slice(1));
        
        // Convert workbook to binary string
        const excelOutput = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
        
        // Create a preview for display
        const previewData = {
          headers: headers,
          rows: data.slice(0, 10) // Limit preview to first 10 rows
        };
        
        // Resolve with the result
        resolve({
          filename: filename,
          fileContent: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelOutput}`,
          previewData: previewData
        });
      } catch (error) {
        console.error('Error generating Excel report:', error);
        reject(error);
      }
    });
  };
  
  // Basic CSV report generation
  const generateCsvReport = async (reportType, filename) => {
    return new Promise((resolve, reject) => {
      try {
        // Placeholder for CSV report generation
        let csvContent = '';
        let headers = [];
        let data = [];
        
        switch(reportType) {
          case 'summary':
            headers = ['Date', 'Revenue', 'Occupancy Rate'];
            console.log("Generating summary CSV report with revenue data:", revenueData ? `Available (${revenueData.dates.length} dates)` : "Not available");
            console.log("Occupancy data:", occupancyData ? `Available (${occupancyData.values.length} values)` : "Not available");
            
            if (!revenueData || !revenueData.dates || !revenueData.dates.length || 
                !occupancyData || !occupancyData.values || !occupancyData.values.length) {
              console.error("Missing required data for summary CSV report");
              
              // Create fallback data with current date if data is missing
              const currentDate = format(new Date(), 'MMM dd');
              data.push([currentDate, 0, '0%']);
            } else {
              // Add data from revenue and occupancy arrays
              for (let i = 0; i < revenueData.dates.length; i++) {
                data.push([
                  revenueData.dates[i],
                  revenueData.values[i],
                  (occupancyData.values[i] || 0) + '%'
                ]);
              }
            }
            break;
          
          case 'financial':
            // Financial report data
            headers = ['Invoice #', 'Guest', 'Room', 'Amount', 'Date', 'Status'];
            data = financialData.map(invoice => [
              invoice.invoice_number || 'N/A',
              invoice.guest_name || 'N/A',
              invoice.room_id || 'N/A',
              invoice.amount || '0',
              invoice.created_at || 'N/A',
              invoice.status || 'N/A'
            ]);
            break;
          
          case 'housekeeping':
            // Housekeeping report data
            headers = ['Task ID', 'Description', 'Room', 'Status', 'Assigned To', 'Due Date'];
            data = housekeepingData.map(task => [
              task.id || 'N/A',
              task.description || task.task_description || 'N/A',
              task.room_id || task.room || 'N/A',
              task.status || 'N/A',
              task.assigned_to || 'N/A',
              task.due_date || task.created_at || 'N/A'
            ]);
            break;
            
          case 'monthly':
            // Monthly report data
            headers = ['Month', 'Revenue', 'Pending Amount', 'Invoice Count', 'Paid Count', 'Pending Count'];
            data = Object.entries(monthlyPerformanceData).map(([month, data]) => [
              month,
              data.revenue || 0,
              data.pendingAmount || 0,
              data.invoiceCount || 0,
              data.paidCount || 0,
              data.pendingCount || 0
            ]);
            break;
            
          case 'guests':
            // Guest report data
            headers = ['Name', 'Email', 'Phone', 'Room', 'Check-In', 'Check-Out', 'Status'];
            data = guestData.map(guest => [
              guest.name || guest.guest_name || 'N/A',
              guest.email || 'N/A',
              guest.phone || 'N/A',
              guest.room_id || guest.room || 'N/A',
              guest.checkIn || guest.check_in || 'N/A',
              guest.checkOut || guest.check_out || 'N/A',
              guest.status || 'N/A'
            ]);
            break;
            
          default:
            headers = ['Date', 'Revenue', 'Occupancy Rate'];
            for (let i = 0; i < revenueData.dates.length; i++) {
              data.push([
                revenueData.dates[i],
                revenueData.values[i],
                occupancyData.values[i] + '%'
              ]);
            }
        }
        
        // Add headers to CSV
        csvContent += headers.join(',') + '\r\n';
        
        // Add data rows to CSV
        data.forEach(row => {
          csvContent += row.join(',') + '\r\n';
        });
        
        // Create a preview for display
        const previewData = {
          headers: headers,
          rows: data.slice(0, 10) // Limit preview to first 10 rows
        };
        
        // Convert to base64
        const csvBase64 = btoa(csvContent);
        
        // Resolve with the result
        resolve({
          filename: filename,
          fileContent: `data:text/csv;base64,${csvBase64}`,
          previewData: previewData
        });
      } catch (error) {
        console.error('Error generating CSV report:', error);
        reject(error);
      }
    });
  };

  // Generate Summary PDF report
  const generateSummaryPdfReport = (doc, styles) => {
    try {
      console.log("Starting to generate Summary PDF report");
      console.log("Revenue data:", revenueData ? `Available (${revenueData.dates.length} data points)` : "Not available");
      console.log("Occupancy data:", occupancyData ? `Available (${occupancyData.values.length} data points)` : "Not available");
      
      // Add title and date
      doc.setFontSize(styles.title.fontSize);
      doc.setTextColor(...styles.title.textColor);
      doc.text('Mikjane Hotel - Summary Report', 15, 30);
      console.log("Added title to PDF");
      
      // Add date range
      doc.setFontSize(styles.subtitle.fontSize);
      doc.setTextColor(...styles.subtitle.textColor);
      if (revenueData && revenueData.dates && revenueData.dates.length > 0) {
        doc.text(`Date Range: ${revenueData.dates[0]} - ${revenueData.dates[revenueData.dates.length - 1]}`, 15, 40);
      } else {
        doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 15, 40);
      }
      console.log("Added date range to PDF");
      
      // Add key metrics section
      doc.setFontSize(styles.heading.fontSize);
      doc.setTextColor(...styles.heading.textColor);
      doc.text('Key Performance Metrics', 15, 55);
      
      // Add metrics in a visually appealing box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(15, 60, 180, 50, 3, 3, 'FD');
      
      doc.setFontSize(styles.normal.fontSize);
      doc.text(`Total Revenue: GH₵${totalRevenue.toLocaleString()}`, 25, 70);
      doc.text(`Average Occupancy: ${avgOccupancy}%`, 25, 80);
      doc.text(`Total Room Bookings: ${totalRoomBookings}`, 25, 90);
      doc.text(`Pending Payments: GH₵${pendingPayments.toLocaleString()}`, 25, 100);
      console.log("Added key metrics to PDF");
      
      // Revenue Analysis
      doc.setFontSize(styles.heading.fontSize);
      doc.text('Revenue Analysis', 15, 125);
      
      // Calculate revenue trend
      let revenueTrend = "stable";
      if (revenueData && revenueData.values && revenueData.values.length > 1) {
        const firstHalf = revenueData.values.slice(0, Math.floor(revenueData.values.length / 2));
        const secondHalf = revenueData.values.slice(Math.floor(revenueData.values.length / 2));
        const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
        
        if (secondHalfAvg > firstHalfAvg * 1.1) {
          revenueTrend = "increasing";
        } else if (secondHalfAvg < firstHalfAvg * 0.9) {
          revenueTrend = "decreasing";
        }
      }
      
      // Calculate peak revenue day
      let peakRevenueDay = "";
      let peakRevenueAmount = 0;
      if (revenueData && revenueData.values && revenueData.values.length > 0) {
        for (let i = 0; i < revenueData.values.length; i++) {
          if (revenueData.values[i] > peakRevenueAmount) {
            peakRevenueAmount = revenueData.values[i];
            peakRevenueDay = revenueData.dates[i];
          }
        }
      }
      console.log("Calculated revenue trends");
      
      // Create multiline text for revenue insights
      const revenueInsights = [
        `Total revenue generated is GH₵${totalRevenue.toLocaleString()}.`,
        `Revenue trend is ${revenueTrend} over the reporting period.`,
        peakRevenueDay ? `Peak revenue of GH₵${peakRevenueAmount.toLocaleString()} was recorded on ${peakRevenueDay}.` : '',
        `Pending payments account for GH₵${pendingPayments.toLocaleString()}, which is ${totalRevenue > 0 ? ((pendingPayments / totalRevenue) * 100).toFixed(1) : 0}% of total revenue.`
      ].filter(Boolean);
      
      // Add the multiline text
      revenueInsights.forEach((insight, index) => {
        doc.text(insight, 20, 135 + (index * 7));
      });
      console.log("Added revenue insights to PDF");
      
      // Add chart image for revenue if available
      if (revenueChartInstance && revenueChartInstance.current) {
        try {
          console.log("Attempting to add revenue chart to PDF");
          // Create a temporary canvas for the chart
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 500;
          tempCanvas.height = 300;
          document.body.appendChild(tempCanvas);
          
          // Create a temporary chart instance
          const tempChart = echarts.init(tempCanvas);
          const option = revenueChartInstance.current.getOption();
          tempChart.setOption(option);
          
          // Get the chart as an image
          const dataURL = tempChart.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff'
          });
          
          // Add the image to the PDF
          doc.text('Revenue Trend Chart', 15, 165);
          doc.addImage(dataURL, 'PNG', 15, 170, 180, 100);
          
          // Clean up
          tempChart.dispose();
          document.body.removeChild(tempCanvas);
          console.log("Successfully added revenue chart to PDF");
        } catch (err) {
          console.error('Error adding revenue chart to PDF:', err);
          // Continue without the chart if there's an error
          doc.text('Revenue chart could not be generated', 15, 165);
        }
      } else {
        console.log("Revenue chart not available, skipping");
        doc.text('Revenue chart not available', 15, 165);
      }
      
      // Add a new page for occupancy data
      doc.addPage();
      console.log("Added new page for occupancy data");
      
      // Add title
      doc.setFontSize(styles.title.fontSize);
      doc.text('Occupancy Insights', 15, 30);
      
      // Occupancy Analysis
      doc.setFontSize(styles.heading.fontSize);
      doc.text('Occupancy Analysis', 15, 45);
      
      // Calculate occupancy trend
      let occupancyTrend = "stable";
      
      try {
        if (occupancyData && occupancyData.values && occupancyData.values.length > 1) {
          const firstHalf = occupancyData.values.slice(0, Math.floor(occupancyData.values.length / 2));
          const secondHalf = occupancyData.values.slice(Math.floor(occupancyData.values.length / 2));
          const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
          const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
          
          if (secondHalfAvg > firstHalfAvg * 1.1) {
            occupancyTrend = "increasing";
          } else if (secondHalfAvg < firstHalfAvg * 0.9) {
            occupancyTrend = "decreasing";
          }
        }
        
        // Calculate peak occupancy day
        let peakOccupancyDay = "";
        let peakOccupancyRate = 0;
        if (occupancyData && occupancyData.values && occupancyData.values.length > 0) {
          for (let i = 0; i < occupancyData.values.length; i++) {
            if (occupancyData.values[i] > peakOccupancyRate) {
              peakOccupancyRate = occupancyData.values[i];
              peakOccupancyDay = occupancyData.dates[i];
            }
          }
        }
        console.log("Calculated occupancy trends");
        
        // Create multiline text for occupancy insights
        const occupancyInsights = [
          `Average occupancy rate is ${avgOccupancy}%.`,
          `Occupancy trend is ${occupancyTrend} over the reporting period.`,
          peakOccupancyDay ? `Peak occupancy of ${peakOccupancyRate}% was recorded on ${peakOccupancyDay}.` : '',
          `Estimated revenue per occupied room: GH₵${(totalRevenue / (avgOccupancy > 0 ? avgOccupancy / 100 : 1) / (rooms.length || 1)).toFixed(2)}`
        ].filter(Boolean);
        
        // Add the multiline text
        occupancyInsights.forEach((insight, index) => {
          doc.text(insight, 20, 55 + (index * 7));
        });
        console.log("Added occupancy insights to PDF");
        
        // Add chart image for occupancy if available
        if (occupancyChartInstance && occupancyChartInstance.current) {
          try {
            console.log("Attempting to add occupancy chart to PDF");
            // Create a temporary canvas for the chart
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 500;
            tempCanvas.height = 300;
            document.body.appendChild(tempCanvas);
            
            // Create a temporary chart instance
            const tempChart = echarts.init(tempCanvas);
            const option = occupancyChartInstance.current.getOption();
            tempChart.setOption(option);
            
            // Get the chart as an image
            const dataURL = tempChart.getDataURL({
              type: 'png',
              pixelRatio: 2,
              backgroundColor: '#fff'
            });
            
            // Add the image to the PDF
            doc.text('Occupancy Trend Chart', 15, 90);
            doc.addImage(dataURL, 'PNG', 15, 95, 180, 100);
            
            // Clean up
            tempChart.dispose();
            document.body.removeChild(tempCanvas);
            console.log("Successfully added occupancy chart to PDF");
          } catch (err) {
            console.error('Error adding occupancy chart to PDF:', err);
            // Continue without the chart if there's an error
            doc.text('Occupancy chart could not be generated', 15, 90);
          }
        } else {
          console.log("Occupancy chart not available, skipping");
          doc.text('Occupancy chart not available', 15, 90);
        }
        
        // Add a new page for guest demographics
        doc.addPage();
        console.log("Added new page for guest demographics");
        
        // Add title
        doc.setFontSize(styles.title.fontSize);
        doc.text('Guest Demographics', 15, 30);
        
        // Check if guest data is available
        if (guestData && Array.isArray(guestData) && guestData.length > 0) {
          try {
            console.log("Processing guest data for demographics");
            // Count by status
            const statusCounts = guestData.reduce((acc, guest) => {
              const status = guest.status || 'Unknown';
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {});
            
            // Calculate average stay duration (in days)
            const stayDurations = guestData
              .filter(guest => guest.checkIn && guest.checkOut)
              .map(guest => {
                try {
                  const checkIn = parseISO(guest.checkIn);
                  const checkOut = parseISO(guest.checkOut);
                  return differenceInDays(checkOut, checkIn);
                } catch (e) {
                  return 0;
                }
              })
              .filter(days => days > 0);
            
            const avgStayDuration = stayDurations.length > 0
              ? stayDurations.reduce((sum, days) => sum + days, 0) / stayDurations.length
              : 0;
            
            // Calculate returning guests percentage
            const returningGuests = guestData.filter(guest => guest.visits && guest.visits > 1).length;
            const returningGuestsPercentage = (returningGuests / guestData.length) * 100;
            
            // Add guest demographics in a visually appealing box
            doc.setFontSize(styles.heading.fontSize);
            doc.text('Guest Statistics', 15, 45);
            
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(229, 231, 235);
            doc.roundedRect(15, 50, 180, 50, 3, 3, 'FD');
            
            doc.setFontSize(styles.normal.fontSize);
            doc.text(`Total Guests: ${guestData.length}`, 25, 60);
            
            // Display status counts
            let yPos = 70;
            Object.entries(statusCounts).forEach(([status, count]) => {
              const percentage = ((count / guestData.length) * 100).toFixed(1);
              doc.text(`${status}: ${count} guests (${percentage}%)`, 25, yPos);
              yPos += 7;
            });
            
            // Add guest insights
            doc.setFontSize(styles.heading.fontSize);
            doc.text('Guest Insights', 15, 115);
            
            // Create multiline text for guest insights
            const guestInsights = [
              `Average stay duration: ${avgStayDuration.toFixed(1)} days.`,
              `Returning guests: ${returningGuestsPercentage.toFixed(1)}% of total guests.`,
              `Most common guest status: ${Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0][0]}`
            ];
            
            // Add the multiline text
            guestInsights.forEach((insight, index) => {
              doc.text(insight, 20, 125 + (index * 7));
            });
            
            // Add recommendations based on insights
            doc.setFontSize(styles.heading.fontSize);
            doc.text('Recommendations', 15, 150);
            
            // Create recommendations based on data analysis
            const recommendations = [];
            
            if (occupancyTrend === 'decreasing') {
              recommendations.push('Consider promotional rates to improve declining occupancy.');
            }
            
            if (avgOccupancy < 60) {
              recommendations.push('Implement marketing campaign to increase low occupancy rate.');
            }
            
            if (returningGuestsPercentage < 20) {
              recommendations.push('Develop loyalty program to increase returning guests percentage.');
            }
            
            if (revenueTrend === 'decreasing') {
              recommendations.push('Review pricing strategy to address declining revenue trend.');
            }
            
            if (recommendations.length === 0) {
              recommendations.push('Current performance is satisfactory. Continue monitoring key metrics.');
            }
            
            // Add the recommendations
            recommendations.forEach((recommendation, index) => {
              doc.text(`• ${recommendation}`, 20, 160 + (index * 7));
            });
            console.log("Added guest demographics and recommendations to PDF");
          } catch (err) {
            console.error('Error processing guest data:', err);
            doc.setFontSize(styles.normal.fontSize);
            doc.text('Error processing guest data for analysis.', 15, 45);
          }
        } else {
          // No guest data available
          console.log("No guest data available for analysis");
          doc.setFontSize(styles.normal.fontSize);
          doc.text('No guest data available for analysis.', 15, 45);
        }
        
        // Add daily performance data table
        try {
          doc.addPage();
          console.log("Added new page for daily performance data");
          doc.setFontSize(styles.heading.fontSize);
          doc.text('Daily Performance Data', 15, 30);
          
          if (revenueData && revenueData.dates && revenueData.dates.length > 0) {
            const tableColumn = ["Date", "Revenue (GH₵)", "Occupancy (%)"];
            const tableRows = [];
            
            for(let i = 0; i < revenueData.dates.length; i++) {
              const rowData = [
                revenueData.dates[i],
                revenueData.values[i].toLocaleString(),
                occupancyData.values[i].toString()
              ];
              tableRows.push(rowData);
            }
            
            autoTable(doc, {
              head: [tableColumn],
              body: tableRows,
              startY: 40,
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
            console.log("Added daily performance data table to PDF");
          } else {
            doc.setFontSize(styles.normal.fontSize);
            doc.text('No daily performance data available.', 15, 40);
          }
        } catch (err) {
          console.error('Error adding daily performance data:', err);
        }
      } catch (error) {
        console.error('Error processing occupancy data:', error);
        doc.text('Error processing occupancy data', 20, 55);
      }
      
      console.log("Summary PDF report generation completed successfully");
    } catch (error) {
      console.error('Error generating summary PDF report:', error);
      // Add error information to the PDF so it's not empty
      doc.setFontSize(14);
      doc.setTextColor(255, 0, 0);
      doc.text('Error Generating Report', 15, 30);
      doc.setFontSize(12);
      doc.text('There was an error generating the summary report.', 15, 45);
      doc.text(`Error details: ${error.message || 'Unknown error'}`, 15, 60);
    }
  };
  
  // Generate Financial PDF report
  const generateFinancialPdfReport = (doc, styles) => {
    // Check if data is available
    if (!financialData || !Array.isArray(financialData) || financialData.length === 0) {
      console.error('Financial data not available for PDF generation');
      doc.text('No financial data available for report generation.', 15, 30);
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
    
    // Add metrics in a visually appealing box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 50, 3, 3, 'FD');
    
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Invoices: ${financialData.length}`, 25, 70);
    doc.text(`Total Amount: GH₵${totalAmount.toLocaleString()}`, 25, 80);
    doc.text(`Paid Amount: GH₵${paidAmount.toLocaleString()} (${paidCount} invoices)`, 25, 90);
    doc.text(`Pending Amount: GH₵${pendingAmount.toLocaleString()} (${pendingCount} invoices)`, 25, 100);
    
    // Add revenue insights
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Revenue Insights', 15, 120);
    
    // Calculate averages
    const avgInvoiceAmount = totalAmount / financialData.length;
    
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Average Invoice Amount: GH₵${avgInvoiceAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}`, 20, 130);
    doc.text(`Collection Rate: ${Math.round((paidAmount / totalAmount) * 100)}%`, 20, 140);
    
    if (pendingAmount > 0) {
      doc.text(`Outstanding payments represent ${Math.round((pendingAmount / totalAmount) * 100)}% of total revenue.`, 20, 150);
      doc.text(`Follow-up recommended for ${pendingCount} unpaid invoices.`, 20, 160);
    } else {
      doc.text(`All invoices have been paid. Excellent collection rate!`, 20, 150);
    }
    
    // Add invoice details
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Invoice Details', 15, 180);
    
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
      startY: 190,
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
  
  // Generate Occupancy PDF report
  const generateOccupancyPdfReport = (doc, styles) => {
    // Check if data is available
    if (!occupancyData || !occupancyData.dates || !occupancyData.values ||
        !Array.isArray(occupancyData.dates) || occupancyData.dates.length === 0 ||
        !Array.isArray(occupancyData.values) || occupancyData.values.length === 0) {
      console.error('Occupancy data not available for PDF generation');
      doc.text('No occupancy data available for report generation.', 15, 30);
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
    
    // Add metrics in a visually appealing box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 50, 3, 3, 'FD');
    
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Rooms: ${totalRooms}`, 25, 70);
    doc.text(`Occupied Rooms: ${occupiedRooms} (${Math.round((occupiedRooms/totalRooms)*100)}%)`, 25, 80);
    doc.text(`Reserved Rooms: ${reservedRooms} (${Math.round((reservedRooms/totalRooms)*100)}%)`, 25, 90);
    doc.text(`Available Rooms: ${availableRooms} (${Math.round((availableRooms/totalRooms)*100)}%)`, 25, 100);
    doc.text(`Maintenance Rooms: ${maintenanceRooms} (${Math.round((maintenanceRooms/totalRooms)*100)}%)`, 105, 70);
    doc.text(`Average Occupancy Rate: ${avgOccupancy}%`, 105, 80);
    
    // Add occupancy insights
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Occupancy Insights', 15, 120);
    
    doc.setFontSize(styles.normal.fontSize);
    
    // Calculate occupancy trend
    let occupancyTrend = "stable";
    if (occupancyData.values.length > 1) {
      const firstHalf = occupancyData.values.slice(0, Math.floor(occupancyData.values.length / 2));
      const secondHalf = occupancyData.values.slice(Math.floor(occupancyData.values.length / 2));
      const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      if (secondHalfAvg > firstHalfAvg * 1.1) {
        occupancyTrend = "increasing";
      } else if (secondHalfAvg < firstHalfAvg * 0.9) {
        occupancyTrend = "decreasing";
      }
    }
    
    // Calculate peak occupancy day
    let peakOccupancyDay = "";
    let peakOccupancyRate = 0;
    for (let i = 0; i < occupancyData.dates.length; i++) {
      if (occupancyData.values[i] > peakOccupancyRate) {
        peakOccupancyRate = occupancyData.values[i];
        peakOccupancyDay = occupancyData.dates[i];
      }
    }
    
    // Create multiline text for occupancy insights
    const occupancyInsights = [
      `The hotel maintained an average occupancy rate of ${avgOccupancy}% during this period.`,
      `Occupancy trend is ${occupancyTrend} over the reporting period.`,
      `Peak occupancy of ${peakOccupancyRate}% was recorded on ${peakOccupancyDay}.`,
      `Room utilization efficiency is ${avgOccupancy < 50 ? 'below optimal levels' : avgOccupancy < 75 ? 'at satisfactory levels' : 'excellent'}.`
    ];
    
    // Add the multiline text
    occupancyInsights.forEach((insight, index) => {
      doc.text(insight, 20, 130 + (index * 7));
    });
    
    // Add daily occupancy table
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Daily Occupancy', 15, 170);
    
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
      startY: 180,
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
  
  // Generate Guest PDF report
  const generateGuestPdfReport = (doc, styles) => {
    // Check if data is available
    if (!guestData || !Array.isArray(guestData) || guestData.length === 0) {
      console.error('Guest data not available for PDF generation');
      doc.text('No guest data available for report generation.', 15, 30);
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
    
    // Count by status
    const statusCounts = guestData.reduce((acc, guest) => {
      const status = guest.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    // Add metrics in a visually appealing box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 40, 3, 3, 'FD');
    
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Guests: ${guestData.length}`, 25, 70);
    
    // Display status counts
    let yPos = 80;
    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = ((count / guestData.length) * 100).toFixed(1);
      doc.text(`${status}: ${count} guests (${percentage}%)`, 25, yPos);
      yPos += 10;
    });
    
    // Add guests table
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Guest Details', 15, yPos + 10);
    
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
      startY: yPos + 20,
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

  // Generate Housekeeping PDF report
  const generateHousekeepingPdfReport = (doc, styles) => {
    // Check if data is available
    if (!housekeepingData || !Array.isArray(housekeepingData) || housekeepingData.length === 0) {
      console.error('Housekeeping data not available for PDF generation');
      doc.text('No housekeeping data available for report generation.', 15, 30);
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
    
    // Add housekeeping task statistics
    doc.setFontSize(styles.heading.fontSize);
    doc.setTextColor(...styles.heading.textColor);
    doc.text('Task Overview', 15, 55);
    
    // Calculate task statistics
    const totalTasks = housekeepingData.length;
    const completedTasks = housekeepingData.filter(task => task.status === 'Completed' || task.status === 'Done').length;
    const pendingTasks = housekeepingData.filter(task => task.status === 'Pending' || task.status === 'In Progress').length;
    const overdueTasks = housekeepingData.filter(task => {
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date);
      return dueDate < new Date() && (task.status !== 'Completed' && task.status !== 'Done');
    }).length;
    
    // Add metrics in a visually appealing box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 40, 3, 3, 'FD');
    
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Tasks: ${totalTasks}`, 25, 70);
    doc.text(`Completed Tasks: ${completedTasks} (${Math.round((completedTasks/totalTasks)*100) || 0}%)`, 25, 80);
    doc.text(`Pending Tasks: ${pendingTasks} (${Math.round((pendingTasks/totalTasks)*100) || 0}%)`, 25, 90);
    doc.text(`Overdue Tasks: ${overdueTasks} (${Math.round((overdueTasks/totalTasks)*100) || 0}%)`, 100, 70);
    
    // Add task details
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Task Details', 15, 115);
    
    const tableColumn = ["Task ID", "Description", "Room", "Status", "Assigned To", "Due Date"];
    const tableRows = [];
    
    housekeepingData.forEach(task => {
      const rowData = [
        task.id || "N/A",
        task.description || task.task_description || "N/A",
        task.room_id || task.room || "N/A",
        task.status || "N/A",
        task.assigned_to || "N/A",
        task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : "N/A"
      ];
      tableRows.push(rowData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 125,
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
  
  // Generate Monthly PDF report
  const generateMonthlyPdfReport = (doc, styles) => {
    // Check if data is available
    if (!monthlyPerformanceData || Object.keys(monthlyPerformanceData).length === 0) {
      console.error('Monthly performance data not available for PDF generation');
      doc.text('No monthly performance data available for report generation.', 15, 30);
      return;
    }
    
    // Add title
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.text('Monthly Performance Report', 15, 30);
    
    // Add date
    doc.setFontSize(styles.subtitle.fontSize);
    doc.setTextColor(...styles.subtitle.textColor);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 15, 40);
    
    // Add summary
    doc.setFontSize(styles.heading.fontSize);
    doc.setTextColor(...styles.heading.textColor);
    doc.text('Monthly Performance Summary', 15, 55);
    
    // Calculate totals from monthly data
    let totalRevenue = 0;
    let totalPendingAmount = 0;
    let totalInvoiceCount = 0;
    
    Object.values(monthlyPerformanceData).forEach(monthData => {
      totalRevenue += monthData.revenue || 0;
      totalPendingAmount += monthData.pendingAmount || 0;
      totalInvoiceCount += monthData.invoiceCount || 0;
    });
    
    // Add metrics in a visually appealing box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 40, 3, 3, 'FD');
    
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Revenue: GH₵${totalRevenue.toLocaleString()}`, 25, 70);
    doc.text(`Total Pending: GH₵${totalPendingAmount.toLocaleString()}`, 25, 80);
    doc.text(`Total Invoices: ${totalInvoiceCount}`, 25, 90);
    doc.text(`Collection Rate: ${Math.round((totalRevenue / (totalRevenue + totalPendingAmount)) * 100) || 0}%`, 120, 70);
    
    // Add monthly details table
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Monthly Details', 15, 115);
    
    const tableColumn = ["Month", "Revenue (GH₵)", "Pending (GH₵)", "Invoices", "Paid", "Pending"];
    const tableRows = [];
    
    Object.entries(monthlyPerformanceData).forEach(([month, data]) => {
      const rowData = [
        month,
        (data.revenue || 0).toLocaleString(),
        (data.pendingAmount || 0).toLocaleString(),
        data.invoiceCount || 0,
        data.paidCount || 0,
        data.pendingCount || 0
      ];
      tableRows.push(rowData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 125,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: styles.tableRow.fontSize,
        cellPadding: 3,
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
    
    // Add monthly performance trend analysis
    doc.addPage();
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Monthly Trend Analysis', 15, 30);
    
    // Create trend analysis text
    const months = Object.keys(monthlyPerformanceData);
    if (months.length > 1) {
      const firstMonth = months[0];
      const lastMonth = months[months.length - 1];
      const firstMonthData = monthlyPerformanceData[firstMonth];
      const lastMonthData = monthlyPerformanceData[lastMonth];
      
      const revenueChange = lastMonthData.revenue - firstMonthData.revenue;
      const revenueChangePercent = firstMonthData.revenue ? 
        (revenueChange / firstMonthData.revenue) * 100 : 0;
        
      const collectionRateFirst = firstMonthData.revenue / 
        (firstMonthData.revenue + firstMonthData.pendingAmount) * 100 || 0;
      const collectionRateLast = lastMonthData.revenue / 
        (lastMonthData.revenue + lastMonthData.pendingAmount) * 100 || 0;
        
      doc.setFontSize(styles.normal.fontSize);
      doc.text(`Revenue Trend: ${revenueChange >= 0 ? 'Increasing' : 'Decreasing'} by ${Math.abs(revenueChangePercent).toFixed(1)}%`, 20, 45);
      doc.text(`Collection Rate Trend: ${collectionRateLast >= collectionRateFirst ? 'Improving' : 'Declining'}`, 20, 55);
      doc.text(`${firstMonth} Collection: ${collectionRateFirst.toFixed(1)}% vs ${lastMonth} Collection: ${collectionRateLast.toFixed(1)}%`, 20, 65);
    } else {
      doc.setFontSize(styles.normal.fontSize);
      doc.text('Insufficient data for trend analysis. Need at least two months of data.', 20, 45);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar activeLink="Reports" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Reports" />
        
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={darkMode ? 'dark' : 'light'}
        />
        
        {/* Report Preview and Share Modal */}
        <ReportModal 
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title={selectedReport?.name || 'Report Preview'}
          reportData={selectedReport}
          reportType={selectedReport?.type || 'PDF'}
          darkMode={darkMode}
          initialTab={selectedReport?.activeTab || 'preview'}
        />
        
        <div className={`flex-1 overflow-y-auto p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
          {/* Report Controls */}
          <div className={`mb-6 p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block mb-1 text-sm font-medium">Date Range</label>
                <select 
                  value={dateRange} 
                  onChange={(e) => setDateRange(e.target.value)}
                  className={`rounded p-2 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
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
          <div className={`mb-6 p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-medium mb-4">Report Generation</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="w-full md:w-1/3">
                <label className="block mb-1 text-sm font-medium">Report Type</label>
                <select 
                  value={selectedReportType} 
                  onChange={handleReportTypeChange}
                  className={`w-full rounded p-2 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
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
                    generateReport(selectedReportType);
                  }}
                  disabled={isGenerating}
                  className={`px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 flex items-center ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FaFilePdf className="mr-2" /> PDF Report
                </button>
                
                <button 
                  onClick={() => generateReport(selectedReportType, 'excel')}
                  disabled={isGenerating}
                  className={`px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 flex items-center ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FaFileExcel className="mr-2" /> Excel Report
                </button>
                
                <button 
                  onClick={() => generateReport(selectedReportType, 'csv')}
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
                  <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                </div>
                <p className="text-lg">Loading report data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Revenue Card */}
                <div className={`p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Revenue (Completed Payments)</p>
                      <h3 className="text-2xl font-bold mt-1">GH₵{totalRevenue.toLocaleString()}</h3>
                    </div>
                    <div className={`p-3 rounded-full ${darkMode ? 'bg-blue-900' : 'bg-blue-100'}`}>
                      <i className={`fas fa-money-bill-wave text-xl ${darkMode ? 'text-blue-300' : 'text-blue-500'}`}></i>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-medium">
                    <span className="text-gray-500 flex items-center">
                      <i className="fas fa-info-circle mr-1"></i> From all paid bills
                    </span>
                  </div>
                </div>
                
                {/* Pending Payments Card */}
                <div className={`p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Pending Payments</p>
                      <h3 className="text-2xl font-bold mt-1">GH₵{pendingPayments.toLocaleString()}</h3>
                    </div>
                    <div className={`p-3 rounded-full ${darkMode ? 'bg-yellow-900' : 'bg-yellow-100'}`}>
                      <i className={`fas fa-clock text-xl ${darkMode ? 'text-yellow-300' : 'text-yellow-500'}`}></i>
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
                <div className={`p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Average Occupancy</p>
                      <h3 className="text-2xl font-bold mt-1">{avgOccupancy}%</h3>
                    </div>
                    <div className={`p-3 rounded-full ${darkMode ? 'bg-green-900' : 'bg-green-100'}`}>
                      <i className={`fas fa-bed text-xl ${darkMode ? 'text-green-300' : 'text-green-500'}`}></i>
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
                <div className={`p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Room Bookings</p>
                      <h3 className="text-2xl font-bold mt-1">{totalRoomBookings}</h3>
                    </div>
                    <div className={`p-3 rounded-full ${darkMode ? 'bg-purple-900' : 'bg-purple-100'}`}>
                      <i className={`fas fa-calendar-check text-xl ${darkMode ? 'text-purple-300' : 'text-purple-500'}`}></i>
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
                <div className={`p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className="text-lg font-medium mb-4">Revenue Trend</h3>
                  <div ref={revenueChartRef} style={{ height: '300px' }}></div>
                </div>
                
                {/* Occupancy Chart */}
                <div className={`p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className="text-lg font-medium mb-4">Occupancy Rate</h3>
                  <div ref={occupancyChartRef} style={{ height: '300px' }}></div>
                </div>
              </div>
              
              {/* Performance Analysis */}
              <div className={`p-4 rounded-lg shadow-md mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
              <div className={`mt-6 p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
                <h3 className="text-lg font-semibold mb-2">Report History</h3>
                {reportHistory.length === 0 ? (
                  <p className="text-gray-500">No reports generated yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className={`w-full rounded-lg ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <tr>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-left">Type</th>
                          <th className="px-4 py-2 text-left">Generated By</th>
                          <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportHistory.map((report) => (
                          <tr key={report.id} className={`border-t ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-100'}`}>
                            <td className="px-4 py-2">{report.name}</td>
                            <td className="px-4 py-2">{new Date(report.date).toLocaleDateString()}</td>
                            <td className="px-4 py-2">{(report.type || report.format || 'Unknown').toUpperCase()}</td>
                            <td className="px-4 py-2">{report.generatedBy}</td>
                            <td className="px-4 py-2">
                              <div className="flex space-x-2">
                                {report.previewData && (
                                  <button 
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
                                    className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'} transition-colors`}
                                    title="Download"
                                  >
                                    <FaDownload size={18} className="text-green-500" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    // Regenerate the report
                                    switch(report.type) {
                                      case 'PDF':
                                        generateReport(report.name.toLowerCase().includes('summary') ? 'summary' : 
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
                                  className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'} transition-colors`}
                                  title="Regenerate"
                                >
                                  <FaDownload size={18} className="text-green-500" />
                                </button>
                                <button 
                                  onClick={() => {
                                    // Logic to share the report
                                    // This could be enhanced with actual sharing functionality
                                    alert('Sharing options would appear here.');
                                  }}
                                  className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'} transition-colors`}
                                  title="Share"
                                >
                                  <FaShareAlt size={18} className="text-yellow-500" />
                                </button>
                                <button 
                                  onClick={() => {
                                    // Remove from history
                                    deleteReport(report.id);
                                  }}
                                  className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'} transition-colors`}
                                  title="Delete"
                                >
                                  <FaTimesCircle size={18} className="text-red-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;