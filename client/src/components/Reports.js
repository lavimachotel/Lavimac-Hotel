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
  const [reportData, setReportData] = useState(null);
  
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
      const reportName = `GreenRoyal_Hotel_${reportType.charAt(0).toUpperCase() + reportType.slice(1)}_Report`;
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
        
        // Add Times New Roman font
        doc.addFont('times', 'Times', 'normal');
        doc.addFont('times', 'Times', 'bold');
        
        // Define styles for different text elements
        const styles = {
          title: {
            fontSize: 18,
            textColor: [0, 0, 0],
            font: 'Times'
          },
          subtitle: {
            fontSize: 12,
            textColor: [100, 100, 100],
            font: 'Times'
          },
          heading: {
            fontSize: 14,
            textColor: [0, 0, 0],
            font: 'Times'
          },
          normal: {
            fontSize: 12, // Updated to 12pt
            textColor: [0, 0, 0],
            font: 'Times'
          },
          tableHeader: {
            fontSize: 12, // Updated to 12pt
            textColor: [255, 255, 255],
            fillColor: [41, 128, 185],
            fontStyle: 'bold',
            font: 'Times'
          },
          tableRow: {
            fontSize: 12, // Updated to 12pt
            textColor: [0, 0, 0],
            font: 'Times'
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
          doc.setFont('Times');
          doc.setFontSize(10);
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
        // Create Excel file using xlsx library
        const workbook = XLSX.utils.book_new();
        let data = [];
        let headers = [];
        
        switch(reportType) {
          case 'summary':
            headers = ['Date', 'Revenue (GH)', 'Occupancy Rate'];
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
            headers = ['Invoice #', 'Guest', 'Room', 'Amount (GH)', 'Date', 'Status'];
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
            headers = ['Month', 'Revenue (GH)', 'Pending (GH)', 'Invoice Count', 'Paid Count', 'Pending Count'];
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
            headers = ['Date', 'Revenue (GH)', 'Occupancy Rate'];
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
        
        // Set column widths and font styling where possible
        const colWidths = headers.map(header => ({ wch: Math.max(header.length * 1.5, 15) }));
        worksheet['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(workbook, worksheet, reportType.charAt(0).toUpperCase() + reportType.slice(1));
        
        // Create title worksheet for more detailed reports
        if (reportType === 'monthly') {
          const titleData = [
            ['HOTEL INC'],
            [''],
            ['Hotel Monthly Report'],
            [''],
            ['Prepared by:'],
            ['Carl Carter'],
            [''],
            ['Chico, CA 95973'],
            ['inquiry@hotel.mail'],
            ['222 555 7777']
          ];
          
          const titleSheet = XLSX.utils.aoa_to_sheet(titleData);
          titleSheet['!cols'] = [{ wch: 40 }];
          
          // Add the title sheet as the first sheet
          XLSX.utils.book_append_sheet(workbook, titleSheet, 'Cover');
          
          // Reorder sheets so title is first
          const sheets = workbook.SheetNames;
          workbook.SheetNames = ['Cover', ...sheets.filter(name => name !== 'Cover')];
        }
        
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
        // CSV report generation
        let csvContent = '';
        let headers = [];
        let data = [];
        
        // Add report title and metadata
        const reportDate = format(new Date(), 'yyyy-MM-dd');
        csvContent += `# HOTEL INC - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report\r\n`;
        csvContent += `# Generated on: ${reportDate}\r\n`;
        csvContent += `# Prepared by: Carl Carter\r\n`;
        csvContent += '#\r\n';
        
        switch(reportType) {
          case 'summary':
            headers = ['Date', 'Revenue (GH)', 'Occupancy Rate'];
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
            
            // Add summary data
            const totalRevenue = revenueData?.values?.reduce((sum, val) => sum + val, 0) || 0;
            const avgOccupancy = occupancyData?.values?.reduce((sum, val) => sum + val, 0) / (occupancyData?.values?.length || 1) || 0;
            
            csvContent += `# Summary\r\n`;
            csvContent += `# Total Revenue: GH${totalRevenue.toLocaleString()}\r\n`;
            csvContent += `# Average Occupancy: ${avgOccupancy.toFixed(2)}%\r\n`;
            csvContent += '#\r\n';
            break;
          
          case 'financial':
            // Financial report data
            headers = ['Invoice #', 'Guest', 'Room', 'Amount (GH)', 'Date', 'Status'];
            data = financialData.map(invoice => [
              invoice.invoice_number || 'N/A',
              invoice.guest_name || 'N/A',
              invoice.room_id || 'N/A',
              invoice.amount || '0',
              invoice.created_at || 'N/A',
              invoice.status || 'N/A'
            ]);
            
            // Add summary data
            const totalAmount = financialData.reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);
            const paidAmount = financialData.filter(invoice => invoice.status === 'Paid')
                            .reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);
            const pendingAmount = financialData.filter(invoice => invoice.status === 'Pending')
                                .reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);
            
            csvContent += `# Financial Summary\r\n`;
            csvContent += `# Total Invoices: ${financialData.length}\r\n`;
            csvContent += `# Total Amount: GH${totalAmount.toLocaleString()}\r\n`;
            csvContent += `# Paid Amount: GH${paidAmount.toLocaleString()}\r\n`;
            csvContent += `# Pending Amount: GH${pendingAmount.toLocaleString()}\r\n`;
            csvContent += `# Collection Rate: ${Math.round((paidAmount / totalAmount) * 100) || 0}%\r\n`;
            csvContent += '#\r\n';
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
            
            // Add task status summary
            const completedTasks = housekeepingData.filter(task => task.status === 'Completed').length;
            const pendingTasks = housekeepingData.filter(task => task.status === 'Pending').length;
            const inProgressTasks = housekeepingData.filter(task => task.status === 'In Progress').length;
            
            csvContent += `# Housekeeping Tasks Summary\r\n`;
            csvContent += `# Total Tasks: ${housekeepingData.length}\r\n`;
            csvContent += `# Completed Tasks: ${completedTasks}\r\n`;
            csvContent += `# Pending Tasks: ${pendingTasks}\r\n`;
            csvContent += `# In Progress Tasks: ${inProgressTasks}\r\n`;
            csvContent += '#\r\n';
            break;
            
          case 'monthly':
            // Monthly report data
            headers = ['Month', 'Revenue (GH)', 'Pending (GH)', 'Invoice Count', 'Paid Count', 'Pending Count'];
            data = Object.entries(monthlyPerformanceData).map(([month, data]) => [
              month,
              data.revenue || 0,
              data.pendingAmount || 0,
              data.invoiceCount || 0,
              data.paidCount || 0,
              data.pendingCount || 0
            ]);
            
            // Calculate totals from monthly data for summary
            let totalRevMonthly = 0;
            let totalPendingAmount = 0;
            let totalInvoiceCount = 0;
            
            Object.values(monthlyPerformanceData).forEach(monthData => {
              totalRevMonthly += monthData.revenue || 0;
              totalPendingAmount += monthData.pendingAmount || 0;
              totalInvoiceCount += monthData.invoiceCount || 0;
            });
            
            // Add summary data at the top
            csvContent += `# Monthly Performance Summary\r\n`;
            csvContent += `# Total Revenue: GH${totalRevMonthly.toLocaleString()}\r\n`;
            csvContent += `# Total Pending: GH${totalPendingAmount.toLocaleString()}\r\n`;
            csvContent += `# Total Invoices: ${totalInvoiceCount}\r\n`;
            csvContent += `# Collection Rate: ${Math.round((totalRevMonthly / (totalRevMonthly + totalPendingAmount)) * 100) || 0}%\r\n`;
            csvContent += '#\r\n';
            
            // Add executive summary section
            csvContent += `# I. Executive Summary\r\n`;
            csvContent += `# A. Overview\r\n`;
            csvContent += `# In May 2050, [Your Company Name] experienced a robust month in terms of occupancy rates, revenue, and guest satisfaction.\r\n`;
            csvContent += `# The overall performance surpassed the projected targets due to strategic marketing plans and exceptional service delivery.\r\n`;
            csvContent += '#\r\n';
            
            // Add financial performance section
            csvContent += `# II. Financial Performance\r\n`;
            csvContent += `# A. Revenue Analysis\r\n`;
            csvContent += `# 1. Room Revenue: GH${Math.round(totalRevMonthly * 0.65).toLocaleString()}\r\n`;
            csvContent += `# 2. Food and Beverage Revenue: GH${Math.round(totalRevMonthly * 0.2).toLocaleString()}\r\n`;
            csvContent += '#\r\n';
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
            
            // Add guest summary data
            const activeGuests = guestData.filter(guest => guest.status === 'Active' || guest.status === 'Checked In').length;
            const checkingOut = guestData.filter(guest => 
              guest.status === 'Checked In' && 
              new Date(guest.checkOut || guest.check_out).toDateString() === new Date().toDateString()
            ).length;
            
            csvContent += `# Guest Summary\r\n`;
            csvContent += `# Total Guests: ${guestData.length}\r\n`;
            csvContent += `# Active Guests: ${activeGuests}\r\n`;
            csvContent += `# Checking Out Today: ${checkingOut}\r\n`;
            csvContent += '#\r\n';
            break;
            
          default:
            headers = ['Date', 'Revenue (GH)', 'Occupancy Rate'];
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
          // Convert each field to handle commas and special characters
          const escapedRow = row.map(field => {
            // If the field contains commas, quotes, or newlines, wrap it in quotes
            if (field && (String(field).includes(',') || String(field).includes('"') || String(field).includes('\n'))) {
              // Replace any existing quotes with double quotes
              return `"${String(field).replace(/"/g, '""')}"`;
            }
            return String(field);
          });
          csvContent += escapedRow.join(',') + '\r\n';
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
      doc.setFont(styles.title.font, 'bold');
      doc.setFontSize(styles.title.fontSize);
      doc.setTextColor(...styles.title.textColor);
      doc.text('The Green Royal Hotel - Summary Report', 15, 30);
      console.log("Added title to PDF");
      
      // Add date range
      doc.setFont(styles.subtitle.font);
      doc.setFontSize(styles.subtitle.fontSize);
      doc.setTextColor(...styles.subtitle.textColor);
      if (revenueData && revenueData.dates && revenueData.dates.length > 0) {
        doc.text(`Date Range: ${revenueData.dates[0]} - ${revenueData.dates[revenueData.dates.length - 1]}`, 15, 40);
      } else {
        doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 15, 40);
      }
      console.log("Added date range to PDF");
      
      // Add key metrics section
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize);
      doc.setTextColor(...styles.heading.textColor);
      doc.text('Key Performance Metrics', 15, 55);
      
      // Add metrics in a visually appealing box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(15, 60, 180, 50, 3, 3, 'FD');
      
      doc.setFont(styles.normal.font);
      doc.setFontSize(styles.normal.fontSize);
      doc.text(`Total Revenue: GH${totalRevenue.toLocaleString()}`, 25, 70);
      doc.text(`Average Occupancy: ${avgOccupancy}%`, 25, 80);
      doc.text(`Total Room Bookings: ${totalRoomBookings}`, 25, 90);
      doc.text(`Pending Payments: GH${pendingPayments.toLocaleString()}`, 25, 100);
      console.log("Added key metrics to PDF");
      
      // Revenue Analysis
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize);
      doc.text('Revenue Analysis', 15, 125);
      
      try {
        // Create revenue chart if revenue data is available
        if (revenueData && revenueData.dates && revenueData.dates.length > 0) {
          console.log("Creating revenue chart with data:", revenueData.dates.length, "data points");
          
          const chartWidth = 160;
          const chartHeight = 80;
          const xPadding = 20;
          const yPadding = 145;
          
          // Find max revenue for scaling
          const maxRevenue = Math.max(...revenueData.values);
          console.log("Max revenue for chart scaling:", maxRevenue);
          
          // Draw chart axes
          doc.setDrawColor(100, 100, 100);
          doc.line(xPadding, yPadding, xPadding, yPadding - chartHeight); // Y-axis
          doc.line(xPadding, yPadding, xPadding + chartWidth, yPadding); // X-axis
          
          // Y-axis labels (revenue)
          doc.setFont(styles.normal.font);
          doc.setFontSize(8);
          doc.text(`GH${maxRevenue.toLocaleString()}`, xPadding - 5, yPadding - chartHeight, { align: 'right' });
          doc.text(`GH${(maxRevenue / 2).toLocaleString()}`, xPadding - 5, yPadding - chartHeight / 2, { align: 'right' });
          doc.text('0', xPadding - 5, yPadding, { align: 'right' });
          
          // X-axis labels (dates) - show only a subset for readability
          const dateStep = Math.max(1, Math.floor(revenueData.dates.length / 5));
          
          // Draw bars or line for revenue
          doc.setFillColor(41, 128, 185); // Blue color for bars
          
          const barWidth = (chartWidth - 10) / revenueData.dates.length;
          
          for (let i = 0; i < revenueData.dates.length; i++) {
            const x = xPadding + 5 + (i * barWidth);
            const value = revenueData.values[i];
            const barHeight = (value / maxRevenue) * chartHeight;
            
            // Draw the bar
            doc.rect(x, yPadding - barHeight, barWidth - 1, barHeight, 'F');
            
            // Add date label for selected points
            if (i % dateStep === 0) {
              doc.setFontSize(8);
              doc.text(revenueData.dates[i], x + barWidth / 2, yPadding + 10, { align: 'center' });
            }
          }
          
          console.log("Revenue chart added to PDF");
        } else {
          console.log("No revenue data available for chart");
          doc.setFont(styles.normal.font);
          doc.setFontSize(styles.normal.fontSize);
          doc.text('No revenue data available to display chart.', 20, 145);
        }
      } catch (error) {
        console.error('Error creating revenue chart:', error);
        doc.text('Error creating revenue chart', 20, 145);
      }
      
      // Occupancy Analysis
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize);
      doc.text('Occupancy Analysis', 15, 245);
      
      try {
        // Create occupancy chart if data is available
        if (occupancyData && occupancyData.values && occupancyData.values.length > 0) {
          console.log("Creating occupancy chart with data:", occupancyData.values.length, "data points");
          
          const chartWidth = 160;
          const chartHeight = 80;
          const xPadding = 20;
          const yPadding = 265;
          
          // Draw chart axes
          doc.setDrawColor(100, 100, 100);
          doc.line(xPadding, yPadding, xPadding, yPadding - chartHeight); // Y-axis
          doc.line(xPadding, yPadding, xPadding + chartWidth, yPadding); // X-axis
          
          // Y-axis labels (percentage)
          doc.setFont(styles.normal.font);
          doc.setFontSize(8);
          doc.text('100%', xPadding - 5, yPadding - chartHeight, { align: 'right' });
          doc.text('50%', xPadding - 5, yPadding - chartHeight / 2, { align: 'right' });
          doc.text('0%', xPadding - 5, yPadding, { align: 'right' });
          
          // X-axis labels (dates) - show only a subset for readability
          const dateStep = Math.max(1, Math.floor(occupancyData.dates.length / 5));
          
          // Draw line for occupancy
          doc.setDrawColor(46, 204, 113); // Green color for occupancy
          doc.setLineWidth(2);
          
          let lastX, lastY;
          
          for (let i = 0; i < occupancyData.values.length; i++) {
            const x = xPadding + 5 + (i * ((chartWidth - 10) / occupancyData.values.length));
            const value = occupancyData.values[i];
            const y = yPadding - ((value / 100) * chartHeight);
            
            // Draw point
            doc.setFillColor(46, 204, 113);
            doc.circle(x, y, 2, 'F');
            
            // Draw line from last point
            if (i > 0) {
              doc.line(lastX, lastY, x, y);
            }
            
            lastX = x;
            lastY = y;
            
            // Add date label for selected points
            if (i % dateStep === 0 && occupancyData.dates && occupancyData.dates[i]) {
              doc.setFontSize(8);
              doc.text(occupancyData.dates[i], x, yPadding + 10, { align: 'center' });
            }
          }
          
          console.log("Occupancy chart added to PDF");
        } else {
          console.log("No occupancy data available for chart");
          doc.setFont(styles.normal.font);
          doc.setFontSize(styles.normal.fontSize);
          doc.text('No occupancy data available to display chart.', 20, 265);
        }
      } catch (error) {
        console.error('Error processing occupancy data:', error);
        doc.text('Error processing occupancy data', 20, 265);
      }
      
      // Add daily performance data table
      try {
        doc.addPage();
        console.log("Added new page for daily performance data");
        doc.setFont(styles.heading.font, 'bold');
        doc.setFontSize(styles.heading.fontSize);
        doc.text('Daily Performance Data', 15, 30);
        
        if (revenueData && revenueData.dates && revenueData.dates.length > 0) {
          const tableColumn = ["Date", "Revenue (GH)", "Occupancy (%)"];
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
              font: styles.normal.font,
              fontSize: styles.normal.fontSize,
              cellPadding: 3,
              overflow: 'linebreak',
              halign: 'center'
            },
            headStyles: {
              fillColor: styles.tableHeader.fillColor,
              textColor: styles.tableHeader.textColor,
              fontStyle: 'bold',
              fontSize: styles.tableHeader.fontSize,
              font: styles.tableHeader.font
            },
            alternateRowStyles: {
              fillColor: styles.tableRowAlternate.fillColor
            }
          });
          console.log("Added daily performance data table to PDF");
        } else {
          doc.setFont(styles.normal.font);
          doc.setFontSize(styles.normal.fontSize);
          doc.text('No daily performance data available.', 15, 40);
        }
      } catch (err) {
        console.error('Error adding daily performance data:', err);
      }
      
      console.log("Summary PDF report generation completed successfully");
    } catch (error) {
      console.error('Error generating summary PDF report:', error);
      // Add error information to the PDF so it's not empty
      doc.setFont(styles.normal.font, 'bold');
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
      doc.setFont(styles.normal.font);
      doc.text('No financial data available for report generation.', 15, 30);
      return;
    }
    
    // Add title
    doc.setFont(styles.title.font, 'bold');
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.setTextColor(179, 142, 51); // Gold color
    doc.text('HOTEL INC', 40, 20);
    
    // Add horizontal line
    doc.setDrawColor(179, 142, 51); // Gold color
    doc.line(150, 20, 190, 20);
    
    // Add title
    doc.setFont(styles.title.font, 'bold');
    doc.setFontSize(24);
    doc.setTextColor(179, 142, 51); // Gold color
    doc.text('Hotel Monthly', 30, 40);
    doc.text('Report', 30, 55);
    
    // Add prepared by section
    doc.setFont(styles.subtitle.font);
    doc.setFontSize(styles.subtitle.fontSize);
    doc.setTextColor(100, 100, 100);
    doc.text('Prepared by:', 30, 75);
    
    doc.setFont(styles.normal.font);
    doc.setFontSize(styles.normal.fontSize);
    doc.setTextColor(0, 0, 0);
    doc.text(`Carl Carter`, 30, 85);
    
    // Add contact information at bottom
    doc.setFont(styles.subtitle.font);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Chico, CA 95973`, 30, 270);
    doc.text(`inquiry@hotel.mail`, 30, 280);
    doc.text(`222 555 7777`, 30, 290);
    
    // Add vertical line on right margin
    doc.setDrawColor(179, 142, 51); // Gold color
    doc.line(190, 20, 190, 290);
    
    // Start the actual report content on page 2
    doc.addPage();
    
    // Add report title as header
    doc.setFont(styles.title.font, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Hotel Monthly Report', 105, 20, { align: 'center' });
    
    // Add Executive Summary section
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(14);
    doc.text('I. Executive Summary', 15, 35);
    
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(12);
    doc.text('A. Overview', 15, 45);
    
    doc.setFont(styles.normal.font);
    doc.setFontSize(12);
    let overview = 'In May 2050, [Your Company Name] experienced a robust month in terms of occupancy rates, revenue, and guest satisfaction. The overall performance surpassed the projected targets due to strategic marketing plans and exceptional service delivery. The favorable weather conditions and the lifting of travel restrictions in several key markets contributed to increased guest volume and exceptional service delivery.';
    let formattedOverview = doc.splitTextToSize(overview, 180);
    doc.text(formattedOverview, 15, 55);

    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(12);
    doc.text('B. Key Highlights', 15, 85);

    doc.setFont(styles.normal.font);
    doc.setFontSize(12);
    
    // Calculate totals from monthly data
    let totalRevenue = 0;
    let totalPendingAmount = 0;
    let totalInvoiceCount = 0;
    
    Object.values(monthlyPerformanceData).forEach(monthData => {
      totalRevenue += monthData.revenue || 0;
      totalPendingAmount += monthData.pendingAmount || 0;
      totalInvoiceCount += monthData.invoiceCount || 0;
    });
    
    // Format with bullet points
    doc.text('1. Occupancy Rate: Achieved an average occupancy rate of 78%, marking a 15% increase from April 2050.', 20, 95);
    doc.text(`2. Revenue: Generated total revenue of GH${totalRevenue.toLocaleString()}, having a 7% growth month-over-month.`, 20, 105);
    doc.text(`3. Guest Satisfaction: Maintained a high guest satisfaction score of 92%.`, 20, 115);
    
    // Financial Performance section
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(14);
    doc.text('II. Financial Performance', 15, 135);
    
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(12);
    doc.text('A. Revenue Analysis', 15, 145);
    
    doc.setFont(styles.normal.font);
    doc.setFontSize(12);
    doc.text(`1. Room Revenue:`, 20, 155);
    doc.text(`   • Total Room Revenue: GH${Math.round(totalRevenue * 0.65).toLocaleString()}`, 20, 165);
    doc.text(`   • Average Daily Rate (ADR): GH${Math.round(totalRevenue * 0.65 / 30 / 200).toLocaleString()}`, 20, 175);
    
    doc.text(`2. Food and Beverage Revenue:`, 20, 185);
    doc.text(`   • Restaurant Sales: GH${Math.round(totalRevenue * 0.2).toLocaleString()}`, 20, 195);
    doc.text(`   • Bar Sales: GH${Math.round(totalRevenue * 0.1).toLocaleString()}`, 20, 205);
    
    // Monthly details table
    doc.addPage();
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(14);
    doc.text('Monthly Details', 15, 20);
    
    const tableColumn = ["Month", "Revenue (GH)", "Pending (GH)", "Invoices", "Paid", "Pending"];
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
      startY: 30,
      theme: 'grid',
      styles: {
        font: styles.normal.font,
        fontSize: styles.normal.fontSize,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: styles.tableHeader.fillColor,
        textColor: styles.tableHeader.textColor,
        fontStyle: 'bold',
        fontSize: styles.tableHeader.fontSize,
        font: styles.tableHeader.font
      },
      alternateRowStyles: {
        fillColor: styles.tableRowAlternate.fillColor
      }
    });
    
    // Operational Performance section (if not too long)
    let yPos = doc.lastAutoTable.finalY + 20;
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(14);
    doc.text('III. Operational Performance', 15, yPos);
    
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(12);
    doc.text('A. Occupancy and Room Statistics', 15, yPos + 10);
    
    doc.setFont(styles.normal.font);
    doc.setFontSize(12);
    doc.text(`1. Total Available Rooms: 200`, 20, yPos + 20);
    doc.text(`2. Occupied Rooms: 78%`, 20, yPos + 30);
    doc.text(`3. Average Length of Stay: 2.5 days`, 20, yPos + 40);
  };

  // Generate dummy share link
  const generateShareLink = () => {
    // Use the current reportData from the component state or a fallback
    const currentReportData = reportData || {};
    const dummyLink = `https://greenroyal-hotel.example.com/share/${currentReportData.id || 'report'}`;
    return dummyLink;
  };

  // Handle email report
  const handleEmailReport = () => {
    // Use the current reportData from the component state or a fallback
    const currentReportData = reportData || {};
    const subject = encodeURIComponent(`The Green Royal Hotel Report: ${currentReportData?.name || 'Report'}`);
    const body = encodeURIComponent(`Please find attached the ${currentReportData?.name || 'report'} from The Green Royal Hotel.\n\nThank you for your business.`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    toast.success('Email client opened');
  };

  // Generate Occupancy PDF report
  const generateOccupancyPdfReport = (doc, styles) => {
    // Check if data is available
    if (!occupancyData || !Array.isArray(occupancyData.values) || occupancyData.values.length === 0) {
      console.error('Occupancy data not available for PDF generation');
      doc.setFont(styles.normal.font);
      doc.text('No occupancy data available for report generation.', 15, 30);
      return;
    }
    
    // Add title
    doc.setFont(styles.title.font, 'bold');
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.text('Occupancy Report', 15, 30);
    
    // Add date
    doc.setFont(styles.subtitle.font);
    doc.setFontSize(styles.subtitle.fontSize);
    doc.setTextColor(...styles.subtitle.textColor);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 15, 40);
    
    // Calculate occupancy summary
    const avgOccupancy = occupancyData.values.reduce((sum, value) => sum + value, 0) / occupancyData.values.length;
    const maxOccupancy = Math.max(...occupancyData.values);
    const minOccupancy = Math.min(...occupancyData.values);
    
    // Add occupancy summary
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    doc.setTextColor(...styles.heading.textColor);
    doc.text('Occupancy Overview', 15, 55);
    
    // Add metrics in a visually appealing box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 40, 3, 3, 'FD');
    
    doc.setFont(styles.normal.font);
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Average Occupancy Rate: ${avgOccupancy.toFixed(2)}%`, 25, 70);
    doc.text(`Highest Occupancy Rate: ${maxOccupancy}%`, 25, 80);
    doc.text(`Lowest Occupancy Rate: ${minOccupancy}%`, 25, 90);
    
    // Add occupancy chart
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Occupancy Trend', 15, 115);
    
    const chartWidth = 160;
    const chartHeight = 80;
    const xPadding = 20;
    const yPadding = 135;
    
    // Draw chart axes
    doc.setDrawColor(100, 100, 100);
    doc.line(xPadding, yPadding, xPadding, yPadding - chartHeight); // Y-axis
    doc.line(xPadding, yPadding, xPadding + chartWidth, yPadding); // X-axis
    
    // Y-axis labels (percentage)
    doc.setFont(styles.normal.font);
    doc.setFontSize(8);
    doc.text('100%', xPadding - 5, yPadding - chartHeight, { align: 'right' });
    doc.text('50%', xPadding - 5, yPadding - chartHeight / 2, { align: 'right' });
    doc.text('0%', xPadding - 5, yPadding, { align: 'right' });
    
    // Draw line for occupancy
    doc.setDrawColor(46, 204, 113); // Green color for occupancy
    doc.setLineWidth(2);
    
    let lastX, lastY;
    
    for (let i = 0; i < occupancyData.values.length; i++) {
      const x = xPadding + 5 + (i * ((chartWidth - 10) / occupancyData.values.length));
      const value = occupancyData.values[i];
      const y = yPadding - ((value / 100) * chartHeight);
      
      // Draw point
      doc.setFillColor(46, 204, 113);
      doc.circle(x, y, 2, 'F');
      
      // Draw line from last point
      if (i > 0) {
        doc.line(lastX, lastY, x, y);
      }
      
      lastX = x;
      lastY = y;
    }
    
    // Add occupancy data table
    doc.addPage();
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Daily Occupancy Data', 15, 30);
    
    const tableColumn = ["Date", "Occupancy Rate", "Available Rooms", "Occupied Rooms"];
    const tableRows = [];
    
    // Total number of rooms
    const totalRooms = 200; // Assuming a fixed number of rooms
    
    for(let i = 0; i < occupancyData.values.length; i++) {
      const rowData = [
        occupancyData.dates[i],
        occupancyData.values[i] + "%",
        totalRooms,
        Math.round((occupancyData.values[i] / 100) * totalRooms)
      ];
      tableRows.push(rowData);
    }
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: {
        font: styles.normal.font,
        fontSize: styles.normal.fontSize,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: styles.tableHeader.fillColor,
        textColor: styles.tableHeader.textColor,
        fontStyle: 'bold',
        fontSize: styles.tableHeader.fontSize,
        font: styles.tableHeader.font
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
      doc.setFont(styles.normal.font);
      doc.text('No guest data available for report generation.', 15, 30);
      return;
    }
    
    // Add title
    doc.setFont(styles.title.font, 'bold');
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.text('Guest Report', 15, 30);
    
    // Add date
    doc.setFont(styles.subtitle.font);
    doc.setFontSize(styles.subtitle.fontSize);
    doc.setTextColor(...styles.subtitle.textColor);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 15, 40);
    
    // Calculate guest statistics
    const activeGuests = guestData.filter(guest => 
      guest.status === 'Active' || guest.status === 'Checked In'
    ).length;
    
    const checkingOutToday = guestData.filter(guest => 
      guest.status === 'Checked In' && 
      isToday(new Date(guest.checkOut || guest.check_out))
    ).length;
    
    const newCheckinsToday = guestData.filter(guest => 
      isToday(new Date(guest.checkIn || guest.check_in))
    ).length;
    
    // Add guest summary
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    doc.setTextColor(...styles.heading.textColor);
    doc.text('Guest Overview', 15, 55);
    
    // Add metrics in a visually appealing box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 50, 3, 3, 'FD');
    
    doc.setFont(styles.normal.font);
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Guests: ${guestData.length}`, 25, 70);
    doc.text(`Active Guests: ${activeGuests}`, 25, 80);
    doc.text(`Checking Out Today: ${checkingOutToday}`, 25, 90);
    doc.text(`New Check-ins Today: ${newCheckinsToday}`, 25, 100);
    
    // Add guest distribution by room type if available
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    let yPos = 120;
    doc.text('Guest Distribution', 15, yPos);
    yPos += 10;
    
    // Create guest distribution calculation
    const roomTypeCounts = guestData.reduce((counts, guest) => {
      const roomType = guest.room_type || 'Unknown';
      counts[roomType] = (counts[roomType] || 0) + 1;
      return counts;
    }, {});
    
    // Display room type distribution
    doc.setFont(styles.normal.font);
    doc.setFontSize(styles.normal.fontSize);
    
    Object.entries(roomTypeCounts).forEach(([roomType, count], index) => {
      const percentage = ((count / guestData.length) * 100).toFixed(1);
      doc.text(`${roomType}: ${count} guests (${percentage}%)`, 25, yPos + (index * 10));
    });
    
    // Update yPos based on the number of room types
    yPos += (Object.keys(roomTypeCounts).length * 10) + 20;
    
    // Add guest details table
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Guest Details', 15, yPos);
    
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
        font: styles.normal.font,
        fontSize: styles.normal.fontSize,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: styles.tableHeader.fillColor,
        textColor: styles.tableHeader.textColor,
        fontStyle: 'bold',
        fontSize: styles.tableHeader.fontSize,
        font: styles.tableHeader.font
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
      doc.setFont(styles.normal.font);
      doc.text('No housekeeping data available for report generation.', 15, 30);
      return;
    }
    
    // Add title
    doc.setFont(styles.title.font, 'bold');
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.text('Housekeeping Report', 15, 30);
    
    // Add date
    doc.setFont(styles.subtitle.font);
    doc.setFontSize(styles.subtitle.fontSize);
    doc.setTextColor(...styles.subtitle.textColor);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 15, 40);
    
    // Calculate task statistics
    const completedTasks = housekeepingData.filter(task => task.status === 'Completed').length;
    const pendingTasks = housekeepingData.filter(task => task.status === 'Pending').length;
    const inProgressTasks = housekeepingData.filter(task => task.status === 'In Progress').length;
    
    // Add task summary
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    doc.setTextColor(...styles.heading.textColor);
    doc.text('Task Overview', 15, 55);
    
    // Add metrics in a visually appealing box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 50, 3, 3, 'FD');
    
    doc.setFont(styles.normal.font);
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Tasks: ${housekeepingData.length}`, 25, 70);
    doc.text(`Completed Tasks: ${completedTasks}`, 25, 80);
    doc.text(`Pending Tasks: ${pendingTasks}`, 25, 90);
    doc.text(`In Progress Tasks: ${inProgressTasks}`, 25, 100);
    
    // Add task completion rate
    const completionRate = (completedTasks / housekeepingData.length) * 100;
    
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Task Completion Rate', 15, 125);
    
    // Draw progress bar
    const barWidth = 150;
    const barHeight = 20;
    const fillWidth = (completionRate / 100) * barWidth;
    
    // Background
    doc.setFillColor(229, 231, 235);
    doc.rect(25, 135, barWidth, barHeight, 'F');
    
    // Fill
    doc.setFillColor(46, 204, 113);
    doc.rect(25, 135, fillWidth, barHeight, 'F');
    
    // Add percentage text
    doc.setFont(styles.normal.font);
    doc.setFontSize(styles.normal.fontSize);
    doc.setTextColor(255, 255, 255);
    doc.text(`${completionRate.toFixed(1)}%`, 25 + fillWidth / 2, 135 + barHeight / 2 + 3, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(...styles.normal.textColor);
    
    // Add task details table
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Task Details', 15, 180);
    
    const tableColumn = ["Task ID", "Description", "Room", "Status", "Assigned To", "Due Date"];
    const tableRows = [];
    
    housekeepingData.forEach(task => {
      const rowData = [
        task.id || "N/A",
        task.description || task.task_description || "N/A",
        task.room_id || task.room || "N/A",
        task.status || "N/A",
        task.assigned_to || "N/A",
        task.due_date || task.created_at || "N/A"
      ];
      tableRows.push(rowData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 190,
      theme: 'grid',
      styles: {
        font: styles.normal.font,
        fontSize: styles.normal.fontSize,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: styles.tableHeader.fillColor,
        textColor: styles.tableHeader.textColor,
        fontStyle: 'bold',
        fontSize: styles.tableHeader.fontSize,
        font: styles.tableHeader.font
      },
      alternateRowStyles: {
        fillColor: styles.tableRowAlternate.fillColor
      }
    });
  };
  
  // Generate Monthly PDF report
  const generateMonthlyPdfReport = (doc, styles) => {
    // Check if data is available
    if (!revenueData || !Array.isArray(revenueData.values) || revenueData.values.length === 0) {
      console.error('Revenue data not available for PDF generation');
      doc.setFont(styles.normal.font);
      doc.text('No revenue data available for report generation.', 15, 30);
      return;
    }
    
    // Add title
    doc.setFont(styles.title.font, 'bold');
    doc.setFontSize(styles.title.fontSize);
    doc.setTextColor(...styles.title.textColor);
    doc.text('Monthly Performance Report', 15, 30);
    
    // Add date
    doc.setFont(styles.subtitle.font);
    doc.setFontSize(styles.subtitle.fontSize);
    doc.setTextColor(...styles.subtitle.textColor);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 15, 40);
    
    // Executive Summary
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    doc.setTextColor(...styles.heading.textColor);
    doc.text('Executive Summary', 15, 55);
    
    // Add metrics in a visually appealing box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 50, 3, 3, 'FD');
    
    // Calculate month's total revenue
    const totalRevenue = revenueData.values.reduce((sum, value) => sum + value, 0);
    
    // Calculate average daily revenue
    const avgDailyRevenue = totalRevenue / revenueData.values.length;
    
    // Calculate highest day revenue
    const maxRevenue = Math.max(...revenueData.values);
    
    // Find average occupancy rate if available
    let avgOccupancy = 'N/A';
    if (occupancyData && Array.isArray(occupancyData.values) && occupancyData.values.length > 0) {
      avgOccupancy = (occupancyData.values.reduce((sum, value) => sum + value, 0) / occupancyData.values.length).toFixed(2) + '%';
    }
    
    doc.setFont(styles.normal.font);
    doc.setFontSize(styles.normal.fontSize);
    doc.text(`Total Revenue: GH ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 25, 70);
    doc.text(`Average Daily Revenue: GH ${avgDailyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 25, 80);
    doc.text(`Highest Daily Revenue: GH ${maxRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 25, 90);
    doc.text(`Average Occupancy Rate: ${avgOccupancy}`, 25, 100);
    
    // Financial Performance
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Financial Performance', 15, 125);
    
    // Revenue Breakdown
    doc.setFont(styles.subheading.font, 'bold');
    doc.setFontSize(styles.subheading.fontSize);
    doc.text('Revenue Breakdown', 20, 135);
    
    // Assume we have room, food & beverage, and other revenue data
    // You may need to adjust these values based on your actual data structure
    const roomRevenue = totalRevenue * 0.70; // Assuming 70% from rooms
    const fnbRevenue = totalRevenue * 0.20; // Assuming 20% from F&B
    const otherRevenue = totalRevenue * 0.10; // Assuming 10% from other sources
    
    // Add Revenue Breakdown
    doc.setFont(styles.normal.font);
    doc.setFontSize(styles.normal.fontSize);
    
    // Revenue breakdown box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(20, 140, 170, 45, 3, 3, 'FD');
    
    doc.text(`Room Revenue: GH ${roomRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 30, 150);
    doc.text(`Food & Beverage Revenue: GH ${fnbRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 30, 160);
    doc.text(`Other Revenue: GH ${otherRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 30, 170);
    doc.text(`Total Revenue: GH ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 30, 180);
    
    // Revenue Trend Chart
    doc.setFont(styles.subheading.font, 'bold');
    doc.setFontSize(styles.subheading.fontSize);
    doc.text('Revenue Trend', 20, 200);
    
    const chartWidth = 160;
    const chartHeight = 80;
    const xPadding = 25;
    const yPadding = 220;
    
    // Draw chart axes
    doc.setDrawColor(100, 100, 100);
    doc.line(xPadding, yPadding, xPadding, yPadding - chartHeight); // Y-axis
    doc.line(xPadding, yPadding, xPadding + chartWidth, yPadding); // X-axis
    
    // Find max revenue for scaling
    const maxChartRevenue = Math.max(...revenueData.values) * 1.1; // Add 10% for margin
    
    // Y-axis labels (revenue)
    doc.setFont(styles.normal.font);
    doc.setFontSize(8);
    doc.text(`GH ${maxChartRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, xPadding - 5, yPadding - chartHeight, { align: 'right' });
    doc.text(`GH ${(maxChartRevenue/2).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, xPadding - 5, yPadding - chartHeight / 2, { align: 'right' });
    doc.text('GH 0', xPadding - 5, yPadding, { align: 'right' });
    
    // Draw line for revenue
    doc.setDrawColor(41, 128, 185); // Blue color for revenue
    doc.setLineWidth(2);
    
    let lastX, lastY;
    
    for (let i = 0; i < revenueData.values.length; i++) {
      const x = xPadding + 5 + (i * ((chartWidth - 10) / revenueData.values.length));
      const value = revenueData.values[i];
      const y = yPadding - ((value / maxChartRevenue) * chartHeight);
      
      // Draw point
      doc.setFillColor(41, 128, 185);
      doc.circle(x, y, 2, 'F');
      
      // Draw line from last point
      if (i > 0) {
        doc.line(lastX, lastY, x, y);
      }
      
      lastX = x;
      lastY = y;
      
      // Draw date labels for every 5th point to avoid overcrowding
      if (i % 5 === 0 && revenueData.dates && revenueData.dates[i]) {
        doc.setFontSize(6);
        doc.text(revenueData.dates[i].split(' ')[0], x, yPadding + 10, { align: 'center' });
      }
    }
    
    // Add new page for detailed data
    doc.addPage();
    
    // Add title
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Detailed Performance Data', 15, 30);
    
    // Create Revenue Data Table
    doc.setFont(styles.subheading.font, 'bold');
    doc.setFontSize(styles.subheading.fontSize);
    doc.text('Daily Revenue', 15, 45);
    
    const tableColumn = ["Date", "Revenue (GH)", "Room Bookings", "Occupancy Rate"];
    const tableRows = [];
    
    // Assume booking data is available
    // Replace this with actual booking data if available
    const bookingsData = Array(revenueData.values.length).fill(0).map(() => Math.floor(Math.random() * 20) + 5);
    
    for(let i = 0; i < revenueData.values.length; i++) {
      const occupancyValue = occupancyData && Array.isArray(occupancyData.values) && occupancyData.values[i] 
        ? occupancyData.values[i] + '%' 
        : 'N/A';
      
      const rowData = [
        revenueData.dates[i],
        revenueData.values[i].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        bookingsData[i],
        occupancyValue
      ];
      tableRows.push(rowData);
    }
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      styles: {
        font: styles.normal.font,
        fontSize: styles.normal.fontSize,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: styles.tableHeader.fillColor,
        textColor: styles.tableHeader.textColor,
        fontStyle: 'bold',
        fontSize: styles.tableHeader.fontSize,
        font: styles.tableHeader.font
      },
      alternateRowStyles: {
        fillColor: styles.tableRowAlternate.fillColor
      }
    });
    
    // Add aggregated data at the bottom of the table
    const finalY = doc.lastAutoTable.finalY;
    
    doc.setFont(styles.normal.font, 'bold');
    doc.text(`Total Revenue: GH ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 15, finalY + 15);
    doc.text(`Total Bookings: ${bookingsData.reduce((sum, count) => sum + count, 0)}`, 15, finalY + 25);
    
    // Add notes section
    doc.setFont(styles.heading.font, 'bold');
    doc.setFontSize(styles.heading.fontSize);
    doc.text('Notes & Recommendations', 15, finalY + 45);
    
    doc.setFont(styles.normal.font);
    doc.setFontSize(styles.normal.fontSize);
    doc.text('This monthly report provides an overview of the hotel\'s performance for the period.', 15, finalY + 55);
    doc.text('Key observations:', 15, finalY + 65);
    doc.text('• Revenue trend shows overall stability with opportunities for growth.', 20, finalY + 75);
    doc.text('• Occupancy rates indicate potential for increased marketing efforts during low periods.', 20, finalY + 85);
    doc.text('• Consider adjusting pricing strategy based on peak and off-peak periods.', 20, finalY + 95);
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
      <Sidebar activeLink="Reports" />
      
      <div className="flex-1 overflow-auto relative">
        <div className={`absolute inset-0 ${darkMode ? 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-700/20 via-slate-900 to-slate-900' : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-400/10 via-sky-100 to-white'} -z-10`}></div>
        
        <div className="p-8 relative z-10">
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
        
          {/* Report Controls */}
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Date Range Selection */}
            <div className={`bg-gradient-to-br ${darkMode ? 'from-indigo-900/40 to-slate-800/40' : 'from-indigo-50 to-white'} backdrop-blur-lg rounded-xl p-6 shadow-lg border ${darkMode ? 'border-indigo-800/30' : 'border-indigo-200/70'} hover:shadow-indigo-500/10 transition-all duration-300`}>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <i className={`fas fa-calendar-alt mr-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                Date Range
              </h3>
              <div className="space-y-2">
                <div className={`flex items-center space-x-2 p-2 rounded-lg ${dateRange === '7days' ? (darkMode ? 'bg-indigo-600/30 border-indigo-500/40' : 'bg-indigo-100 border-indigo-300/40') : ''} border transition-colors cursor-pointer`} onClick={() => setDateRange('7days')}>
                  <input type="radio" checked={dateRange === '7days'} onChange={() => setDateRange('7days')} className="form-radio" />
                  <span>Last 7 Days</span>
              </div>
                <div className={`flex items-center space-x-2 p-2 rounded-lg ${dateRange === '30days' ? (darkMode ? 'bg-indigo-600/30 border-indigo-500/40' : 'bg-indigo-100 border-indigo-300/40') : ''} border transition-colors cursor-pointer`} onClick={() => setDateRange('30days')}>
                  <input type="radio" checked={dateRange === '30days'} onChange={() => setDateRange('30days')} className="form-radio" />
                  <span>Last 30 Days</span>
                </div>
                <div className={`flex items-center space-x-2 p-2 rounded-lg ${dateRange === '90days' ? (darkMode ? 'bg-indigo-600/30 border-indigo-500/40' : 'bg-indigo-100 border-indigo-300/40') : ''} border transition-colors cursor-pointer`} onClick={() => setDateRange('90days')}>
                  <input type="radio" checked={dateRange === '90days'} onChange={() => setDateRange('90days')} className="form-radio" />
                  <span>Last 90 Days</span>
                </div>
                <div className={`flex items-center space-x-2 p-2 rounded-lg ${dateRange === '12months' ? (darkMode ? 'bg-indigo-600/30 border-indigo-500/40' : 'bg-indigo-100 border-indigo-300/40') : ''} border transition-colors cursor-pointer`} onClick={() => setDateRange('12months')}>
                  <input type="radio" checked={dateRange === '12months'} onChange={() => setDateRange('12months')} className="form-radio" />
                  <span>Last 12 Months</span>
              </div>
            </div>
          </div>
          
            {/* Report Type Selection */}
            <div className={`bg-gradient-to-br ${darkMode ? 'from-violet-900/40 to-slate-800/40' : 'from-violet-50 to-white'} backdrop-blur-lg rounded-xl p-6 shadow-lg border ${darkMode ? 'border-violet-800/30' : 'border-violet-200/70'} hover:shadow-violet-500/10 transition-all duration-300`}>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <i className={`fas fa-file-alt mr-2 ${darkMode ? 'text-violet-400' : 'text-violet-500'}`}></i>
                Report Type
              </h3>
                <select 
                className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-slate-800/60 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-700'} focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-violet-500' : 'focus:ring-violet-400'} focus:border-transparent`}
                  value={selectedReportType} 
                  onChange={handleReportTypeChange}
                >
                  {reportTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              
            {/* Report Format */}
            <div className={`bg-gradient-to-br ${darkMode ? 'from-blue-900/40 to-slate-800/40' : 'from-blue-50 to-white'} backdrop-blur-lg rounded-xl p-6 shadow-lg border ${darkMode ? 'border-blue-800/30' : 'border-blue-200/70'} hover:shadow-blue-500/10 transition-all duration-300`}>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <i className={`fas fa-download mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}></i>
                Generate Report
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => generateReport(selectedReportType, 'pdf')}
                  disabled={isGenerating}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg ${darkMode ? 'bg-red-900/30 hover:bg-red-900/50 border-red-800/30' : 'bg-red-100 hover:bg-red-200 border-red-200'} border transition-colors`}
                >
                  <FaFilePdf size={24} className={`${darkMode ? 'text-red-400' : 'text-red-500'}`} />
                  <span className="mt-1 text-xs">PDF</span>
                </button>
                
                <button 
                  onClick={() => generateReport(selectedReportType, 'excel')}
                  disabled={isGenerating}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30 hover:bg-green-900/50 border-green-800/30' : 'bg-green-100 hover:bg-green-200 border-green-200'} border transition-colors`}
                >
                  <FaFileExcel size={24} className={`${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                  <span className="mt-1 text-xs">Excel</span>
                </button>
                
                <button 
                  onClick={() => generateReport(selectedReportType, 'csv')}
                  disabled={isGenerating}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg ${darkMode ? 'bg-yellow-900/30 hover:bg-yellow-900/50 border-yellow-800/30' : 'bg-yellow-100 hover:bg-yellow-200 border-yellow-200'} border transition-colors`}
                >
                  <FaFileCsv size={24} className={`${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                  <span className="mt-1 text-xs">CSV</span>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className={`bg-gradient-to-br from-blue-500/80 to-blue-700/80 backdrop-blur-lg rounded-xl p-6 shadow-custom border border-blue-500/30 relative overflow-hidden group hover:shadow-lg hover:shadow-blue-500/40 transition-all duration-300`}>
                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500`}></div>
                  <div className="relative z-10 flex flex-col items-center justify-center text-center">
                    <div className={`bg-blue-500/30 p-3 rounded-full h-12 w-12 flex items-center justify-center mb-2 text-blue-400`}>
                      <i className={`fas fa-money-bill-wave text-xl`}></i>
                    </div>
                    <h3 className={`text-sm font-medium text-blue-100`}>Total Revenue</h3>
                    <p className="text-3xl font-bold text-white mt-1">GH₵{totalRevenue.toFixed(0)}</p>
                    <span className="text-xs text-blue-200 mt-1">From all payments</span>
                  </div>
                </div>
                
                <div className={`bg-gradient-to-br from-purple-500/80 to-purple-700/80 backdrop-blur-lg rounded-xl p-6 shadow-custom border border-purple-500/30 relative overflow-hidden group hover:shadow-lg hover:shadow-purple-500/40 transition-all duration-300`}>
                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-purple-600 rounded-xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500`}></div>
                  <div className="relative z-10 flex flex-col items-center justify-center text-center">
                    <div className={`bg-purple-500/30 p-3 rounded-full h-12 w-12 flex items-center justify-center mb-2 text-purple-400`}>
                      <i className={`fas fa-chart-pie text-xl`}></i>
                    </div>
                    <h3 className={`text-sm font-medium text-purple-100`}>Avg Occupancy</h3>
                    <p className="text-3xl font-bold text-white mt-1">{avgOccupancy}%</p>
                    <span className="text-xs text-purple-200 mt-1">Room utilization</span>
                  </div>
                </div>
                
                <div className={`bg-gradient-to-br from-green-500/80 to-green-700/80 backdrop-blur-lg rounded-xl p-6 shadow-custom border border-green-500/30 relative overflow-hidden group hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300`}>
                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-green-600 to-green-600 rounded-xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500`}></div>
                  <div className="relative z-10 flex flex-col items-center justify-center text-center">
                    <div className={`bg-green-500/30 p-3 rounded-full h-12 w-12 flex items-center justify-center mb-2 text-green-400`}>
                      <i className={`fas fa-calendar-check text-xl`}></i>
                    </div>
                    <h3 className={`text-sm font-medium text-green-100`}>Room Bookings</h3>
                    <p className="text-3xl font-bold text-white mt-1">{totalRoomBookings}</p>
                    <span className="text-xs text-green-200 mt-1">Completed stays</span>
                  </div>
                </div>
                
                <div className={`bg-gradient-to-br from-amber-500/80 to-amber-700/80 backdrop-blur-lg rounded-xl p-6 shadow-custom border border-amber-500/30 relative overflow-hidden group hover:shadow-lg hover:shadow-amber-500/40 transition-all duration-300`}>
                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-amber-600 rounded-xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500`}></div>
                  <div className="relative z-10 flex flex-col items-center justify-center text-center">
                    <div className={`bg-amber-500/30 p-3 rounded-full h-12 w-12 flex items-center justify-center mb-2 text-amber-400`}>
                      <i className={`fas fa-file-invoice-dollar text-xl`}></i>
                    </div>
                    <h3 className={`text-sm font-medium text-amber-100`}>Pending Invoices</h3>
                    <p className="text-3xl font-bold text-white mt-1">{pendingInvoices.length}</p>
                    <span className="text-xs text-amber-200 mt-1">Awaiting payment</span>
                  </div>
                </div>
              </div>
              
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Revenue Chart */}
                <div className={`bg-gradient-to-br ${darkMode ? 'from-blue-900/30 to-slate-800/30' : 'from-blue-50 to-white'} backdrop-blur-lg rounded-xl p-6 shadow-lg border ${darkMode ? 'border-blue-800/20' : 'border-blue-200/60'} hover:shadow-blue-500/10 transition-all duration-300`}>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <i className={`fas fa-chart-line mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}></i>
                    Revenue Trend
                  </h3>
                  <div ref={revenueChartRef} style={{ height: '300px' }}></div>
                </div>
                
                {/* Occupancy Chart */}
                <div className={`bg-gradient-to-br ${darkMode ? 'from-purple-900/30 to-slate-800/30' : 'from-purple-50 to-white'} backdrop-blur-lg rounded-xl p-6 shadow-lg border ${darkMode ? 'border-purple-800/20' : 'border-purple-200/60'} hover:shadow-purple-500/10 transition-all duration-300`}>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <i className={`fas fa-chart-pie mr-2 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`}></i>
                    Occupancy Rate
                  </h3>
                  <div ref={occupancyChartRef} style={{ height: '300px' }}></div>
                </div>
              </div>
              
              {/* Performance Analysis */}
              <div className={`bg-gradient-to-br ${darkMode ? 'from-emerald-900/30 to-slate-800/30' : 'from-emerald-50 to-white'} backdrop-blur-lg rounded-xl p-6 shadow-lg border ${darkMode ? 'border-emerald-800/20' : 'border-emerald-200/60'} hover:shadow-emerald-500/10 transition-all duration-300 mb-6`}>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <i className={`fas fa-analytics mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`}></i>
                  Performance Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`bg-gradient-to-br ${darkMode ? 'from-slate-800/60 to-slate-900/60' : 'from-white to-gray-50'} rounded-lg p-4 border ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                    <h4 className="font-medium mb-3 flex items-center">
                      <i className={`fas fa-money-bill-trend-up mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`}></i>
                      Revenue Insights
                    </h4>
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
              <div className={`bg-gradient-to-br ${darkMode ? 'from-gray-800/40 to-slate-900/40' : 'from-gray-50 to-white'} backdrop-blur-lg rounded-xl p-6 shadow-lg border ${darkMode ? 'border-gray-700/40' : 'border-gray-200/80'} hover:shadow-lg transition-all duration-300`}>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <i className={`fas fa-history mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}></i>
                  Report History
                </h3>
                
                {reportHistory.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-10 ${darkMode ? 'bg-slate-800/60' : 'bg-gray-50'} rounded-lg border ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                    <i className={`fas fa-file-alt text-4xl mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}></i>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No reports generated yet.</p>
                    <p className={`mt-2 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Generate your first report using the options above.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`flex items-center justify-between py-3 px-4 ${darkMode ? 'bg-slate-800/60' : 'bg-white'} rounded-lg border ${darkMode ? 'border-slate-700' : 'border-gray-200'} mb-2`}>
                      <div className="grid grid-cols-12 gap-2 w-full text-sm font-medium">
                        <div className="col-span-4">Report Name</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2">Author</div>
                        <div className="col-span-2 text-right">Actions</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                      {reportHistory.map((report, index) => (
                        <div 
                          key={report.id} 
                          className={`grid grid-cols-12 gap-2 ${darkMode ? 'bg-slate-800/40 hover:bg-slate-800/60' : 'bg-white hover:bg-gray-50'} p-4 rounded-lg border ${darkMode ? 'border-slate-700/50' : 'border-gray-200'} transition-all duration-300 transform hover:scale-[1.01] hover:shadow-md relative overflow-hidden group`}
                          style={{animationDelay: `${index * 50}ms`}}
                        >
                          {/* Glowing effect on hover */}
                          <div className={`absolute inset-0 ${
                            report.type === 'PDF' || report.format === 'pdf'
                              ? 'bg-red-500/5'
                              : report.type === 'EXCEL' || report.format === 'excel'
                              ? 'bg-green-500/5'
                              : 'bg-yellow-500/5'
                          } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                          
                          {/* Report name with icon */}
                          <div className="col-span-4 flex items-center relative z-10">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                              report.type === 'PDF' || report.format === 'pdf'
                                ? darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                                : report.type === 'EXCEL' || report.format === 'excel'
                                ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                : darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {report.type === 'PDF' || report.format === 'pdf' ? (
                                <FaFilePdf size={18} />
                              ) : report.type === 'EXCEL' || report.format === 'excel' ? (
                                <FaFileExcel size={18} />
                              ) : (
                                <FaFileCsv size={18} />
                              )}
                            </div>
                            <div>
                              <div className="font-medium line-clamp-1">{report.name}</div>
                              <div className="text-xs opacity-70">{report.filename}</div>
                            </div>
                          </div>
                          
                          {/* Date with relative time */}
                          <div className="col-span-2 flex flex-col justify-center relative z-10">
                            <div>{new Date(report.date).toLocaleDateString()}</div>
                            <div className="text-xs opacity-70">
                              {new Date(report.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                          
                          {/* Report type badge */}
                          <div className="col-span-2 flex items-center relative z-10">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              report.type === 'PDF' || report.format === 'pdf' 
                                ? darkMode ? 'bg-red-900/30 text-red-400 border border-red-700/30' : 'bg-red-100 text-red-800 border border-red-200'
                                : report.type === 'EXCEL' || report.format === 'excel'
                                ? darkMode ? 'bg-green-900/30 text-green-400 border border-green-700/30' : 'bg-green-100 text-green-800 border border-green-200'
                                : report.type === 'CSV' || report.format === 'csv'
                                ? darkMode ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/30' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                            }`}>
                              <span className="flex items-center">
                                {report.type === 'PDF' || report.format === 'pdf' ? (
                                  <FaFilePdf size={10} className="mr-1" />
                                ) : report.type === 'EXCEL' || report.format === 'excel' ? (
                                  <FaFileExcel size={10} className="mr-1" />
                                ) : (
                                  <FaFileCsv size={10} className="mr-1" />
                                )}
                                {(report.type || report.format || 'Unknown').toUpperCase()}
                              </span>
                            </span>
                          </div>
                          
                          {/* Author */}
                          <div className="col-span-2 flex items-center relative z-10">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                              {report.generatedBy.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate">{report.generatedBy}</span>
                          </div>
                          
                          {/* Actions */}
                          <div className="col-span-2 flex justify-end items-center space-x-1 relative z-10">
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
                                className={`p-2 rounded-lg ${darkMode ? 'bg-green-900/20 hover:bg-green-800/40 text-green-400' : 'bg-green-50 hover:bg-green-100 text-green-600'} transition-colors backdrop-blur-sm tooltip-trigger group relative`}
                                aria-label="Download"
                                  >
                                <FaDownload size={16} />
                                <span className="tooltip-text">Download</span>
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                // Preview the report
                                openPreviewModal(report);
                              }}
                              className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/20 hover:bg-blue-800/40 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'} transition-colors backdrop-blur-sm tooltip-trigger`}
                              aria-label="Preview"
                            >
                              <FaEye size={16} />
                              <span className="tooltip-text">Preview</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    // Logic to share the report via Gmail
                                    const subject = encodeURIComponent(`${report.name} - Report from Hotel Management System`);
                                    const body = encodeURIComponent(`Please find attached the ${report.name} from the Hotel Management System.\n\nThank you for your business.`);
                                    window.open(`mailto:?subject=${subject}&body=${body}`);
                                    toast.success('Email client opened');
                                  }}
                              className={`p-2 rounded-lg ${darkMode ? 'bg-yellow-900/20 hover:bg-yellow-800/40 text-yellow-400' : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-600'} transition-colors backdrop-blur-sm tooltip-trigger`}
                              aria-label="Share"
                                >
                              <FaShareAlt size={16} />
                              <span className="tooltip-text">Share</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    // Remove from history
                                    deleteReport(report.id);
                                  }}
                              className={`p-2 rounded-lg ${darkMode ? 'bg-red-900/20 hover:bg-red-800/40 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'} transition-colors backdrop-blur-sm tooltip-trigger`}
                              aria-label="Delete"
                                >
                              <FaTimesCircle size={16} />
                              <span className="tooltip-text">Delete</span>
                                </button>
                              </div>
                        </div>
                      ))}
                    </div>
                    
                    <style jsx>{`
                      .tooltip-trigger .tooltip-text {
                        visibility: hidden;
                        width: 80px;
                        background-color: ${darkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(0, 0, 0, 0.7)'};
                        color: #fff;
                        text-align: center;
                        border-radius: 6px;
                        padding: 5px;
                        position: absolute;
                        z-index: 1;
                        bottom: 125%;
                        left: 50%;
                        transform: translateX(-50%);
                        opacity: 0;
                        transition: opacity 0.3s;
                        font-size: 0.75rem;
                      }
                      
                      .tooltip-trigger {
                        position: relative;
                      }
                      
                      .tooltip-trigger:hover .tooltip-text {
                        visibility: visible;
                        opacity: 1;
                      }
                      
                      .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                      }
                      
                      .custom-scrollbar::-webkit-scrollbar-track {
                        background: ${darkMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(241, 245, 249, 0.7)'};
                        border-radius: 10px;
                      }
                      
                      .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: ${darkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(148, 163, 184, 0.5)'};
                        border-radius: 10px;
                      }
                      
                      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: ${darkMode ? 'rgba(148, 163, 184, 0.7)' : 'rgba(148, 163, 184, 0.7)'};
                      }
                      
                      @keyframes fadeInUp {
                        from {
                          opacity: 0;
                          transform: translateY(10px);
                        }
                        to {
                          opacity: 1;
                          transform: translateY(0);
                        }
                      }
                      
                      .col-span-12 {
                        animation: fadeInUp 0.3s ease-out forwards;
                      }
                    `}</style>
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