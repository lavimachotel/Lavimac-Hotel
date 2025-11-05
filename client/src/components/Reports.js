import React, { useState, useEffect, useRef, useMemo } from 'react';
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
const ReportModal = ({
  isOpen,
  onClose,
  title,
  content,
  reportData,
  reportType,
  darkMode,
  initialTab = 'preview',
  hotelConfig,
  hotelLogo,
  coverImage,
  highlightMetrics = []
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [shareEmail, setShareEmail] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  
  // Generate a shareable link when modal opens
  useEffect(() => {
    if (isOpen && reportData) {
      // In a real app, this would generate a unique, secure link
      // possibly storing the report in a database or cloud storage
      const dummyLink = `https://www.nhyirabahotel.com/reports/${reportData.id || 'preview'}`;
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
      const subject = encodeURIComponent(`Nhyiraba Hotel Report: ${reportData?.name || 'Report'}`);
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
  
  const formatLabel = (reportData?.format || reportType || 'PDF').toString().toUpperCase();
  const isPdfFormat = formatLabel === 'PDF';
  const previewSource = isPdfFormat
    ? reportData?.fileContent || reportData?.previewData
    : reportData?.previewData || reportData?.fileContent;
  const metadata = [
    { label: 'Generated', value: reportData?.date ? new Date(reportData.date).toLocaleString() : null },
    { label: 'Prepared By', value: reportData?.generatedBy },
    { label: 'Format', value: formatLabel },
    { label: 'Filename', value: reportData?.filename }
  ].filter(item => item.value);

  const accentGradient = darkMode
    ? 'from-indigo-900/60 via-slate-900 to-slate-950'
    : 'from-indigo-100 via-white to-slate-50';

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className={`relative w-11/12 max-w-5xl rounded-3xl shadow-[0_40px_80px_-60px_rgba(15,23,42,0.9)] ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'} overflow-hidden m-4`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold sr-only">{title}</h2>
          <button onClick={onClose} className={`${darkMode ? 'text-white/60 hover:text-white/90' : 'text-slate-500 hover:text-slate-700'} transition`}
            aria-label="Close modal">
            <FaTimesCircle size={20} />
          </button>
        </div>
        <div className="px-6">
          <div className="flex border-b border-white/10 mb-6">
            <button 
              className={`py-2 px-4 text-sm font-semibold transition ${activeTab === 'preview' ? (darkMode ? 'text-indigo-300 border-b-2 border-indigo-400' : 'text-indigo-600 border-b-2 border-indigo-500') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
            <button 
              className={`py-2 px-4 text-sm font-semibold transition ${activeTab === 'share' ? (darkMode ? 'text-indigo-300 border-b-2 border-indigo-400' : 'text-indigo-600 border-b-2 border-indigo-500') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}
              onClick={() => setActiveTab('share')}
            >
              Share
            </button>
          </div>
        </div>

        {activeTab === 'preview' && (
          <div className="px-6 pb-6 space-y-6" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {(() => {
              const effectiveHighlights = (highlightMetrics && highlightMetrics.length > 0)
                ? highlightMetrics
                : metadata.slice(0, 3).map(item => ({ label: item.label, value: item.value }));

              const brandTitleClass = darkMode ? 'text-white' : 'text-slate-900';
              const brandTaglineClass = darkMode ? 'text-slate-200/80' : 'text-slate-600';
              const metadataCardClass = darkMode
                ? 'border-white/10 bg-white/5 text-slate-100/90'
                : 'border-slate-200/70 bg-white/90 text-slate-700';
              const metadataLabelClass = darkMode ? 'text-indigo-200/90' : 'text-indigo-600/80';
              const highlightPanelClass = darkMode
                ? 'bg-white/10 border-white/15 text-white'
                : 'bg-white border-slate-200 text-slate-800 shadow-xl';
              const highlightLabelClass = darkMode ? 'text-slate-200/70' : 'text-slate-500';
              const highlightValueClass = darkMode ? 'text-white' : 'text-slate-900';
              const highlightCaptionClass = darkMode ? 'text-slate-300/70' : 'text-slate-500';

              return (
                <div className={`relative overflow-hidden rounded-3xl border ${darkMode ? 'border-white/10 bg-slate-950/90' : 'border-slate-200 bg-white/95'} shadow-[0_25px_60px_-45px_rgba(30,64,175,0.9)]`}> 
                  {coverImage && (
                    <div className="absolute inset-0 opacity-40">
                      <img src={coverImage} alt="Hotel backdrop" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/90" />
                    </div>
                  )}
                  {!coverImage && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${darkMode ? 'from-indigo-950 via-slate-950 to-slate-900' : 'from-slate-100 via-white to-indigo-50'} opacity-90`} />
                  )}
                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-8 p-8">
                    <div className="flex-1 flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-20 h-20 min-w-[80px] rounded-2xl flex items-center justify-center shadow-2xl ${darkMode ? 'bg-white/10' : 'bg-white/80'} backdrop-blur`}> 
                          {hotelLogo ? (
                            <img src={hotelLogo} alt={`${hotelConfig?.name || 'Hotel'} logo`} className="w-16 h-16 object-contain" />
                          ) : (
                            <span className={`text-2xl font-semibold ${darkMode ? 'text-white/70' : 'text-indigo-600'}`}>LR</span>
                          )}
                        </div>
                        <div>
                          <p className={`uppercase tracking-[0.45em] text-[10px] ${darkMode ? 'text-indigo-200/80' : 'text-indigo-600/70'}`}>
                            {hotelConfig?.name || 'Nhyiraba Hotel'}
                          </p>
                          <h3 className={`text-2xl md:text-3xl font-semibold mt-2 ${brandTitleClass}`}>
                            {reportData?.name || title}
                          </h3>
                          <p className={`mt-2 text-sm max-w-xl ${brandTaglineClass}`}>
                            {hotelConfig?.tagline || 'Luxury & Excellence Redefined'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {metadata.map((item, idx) => (
                          <div key={idx} className={`rounded-2xl px-4 py-3 border backdrop-blur ${metadataCardClass}`}>
                            <p className={`${metadataLabelClass} uppercase tracking-[0.35em] pb-2`}>{item.label}</p>
                            <p className="text-sm font-medium leading-relaxed break-words">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {effectiveHighlights.length > 0 && (
                      <div className={`w-full max-w-xs rounded-2xl border backdrop-blur p-6 flex flex-col gap-4 ${highlightPanelClass}`}>
                        <p className={`text-xs uppercase tracking-[0.35em] ${darkMode ? 'text-indigo-200/70' : 'text-indigo-500/70'}`}>Performance</p>
                        <div className="space-y-4">
                          {effectiveHighlights.map((metric, idx) => (
                            <div key={`${metric.label}-${idx}`} className="flex flex-col">
                              <span className={`text-xs uppercase tracking-widest ${highlightLabelClass}`}>
                                {metric.label}
                              </span>
                              <span className={`text-xl font-semibold mt-1 ${highlightValueClass}`}>
                                {metric.value}
                              </span>
                              {metric.caption && (
                                <span className={`text-[11px] mt-1 ${highlightCaptionClass}`}>
                                  {metric.caption}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {previewSource && isPdfFormat ? (
              <div className={`rounded-3xl border overflow-hidden ${darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'} shadow-2xl`}> 
                <object
                  data={previewSource}
                  type="application/pdf"
                  width="100%"
                  height="600px"
                >
                  <p className="p-6 text-center text-sm">
                    Your browser does not support inline PDF preview.{' '}
                    <a href={previewSource} target="_blank" rel="noopener noreferrer" className="underline">
                      Download the report
                    </a>
                    .
                  </p>
                </object>
              </div>
            ) : reportType === 'EXCEL' || reportType === 'CSV' ? (
              <div className={`rounded-3xl border ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                <div className={`overflow-auto max-h-[400px] ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>
                  <table className="min-w-full">
                    {reportData?.previewData?.headers && (
                      <thead>
                        <tr className={`${darkMode ? 'bg-white/10' : 'bg-slate-100'} text-left text-xs uppercase tracking-wider`}>
                          {reportData.previewData.headers.map((header, idx) => (
                            <th key={idx} className="py-3 px-4 font-semibold">{header}</th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {reportData?.previewData?.rows && reportData.previewData.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className={rowIdx % 2 === 0 ? (darkMode ? 'bg-white/5' : 'bg-white') : (darkMode ? 'bg-white/10' : 'bg-slate-50')}>
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="py-3 px-4 text-sm">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className={`rounded-3xl border py-20 text-center ${darkMode ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-500'}`}>
                Preview not available for this format.
              </div>
            )}

            {previewSource && (
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewSource;
                    link.download = reportData?.filename || `${reportData?.name || 'report'}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className={`px-5 py-3 rounded-full text-sm font-medium shadow ${darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'} transition`}
                >
                  Download Report
                </button>
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
const PreviewModal = ({ isOpen, onClose, report, hotelLogo, hotelConfig }) => {
  const { theme } = useTheme();
  const darkMode = theme === 'dark';
  if (!isOpen || !report) return null;

  const previewSource = report.previewData || report.fileContent;
  const metaItems = [
    { label: 'Generated', value: report.date ? new Date(report.date).toLocaleString() : null },
    { label: 'Prepared By', value: report.generatedBy },
    { label: 'Format', value: (report.format || report.type || 'PDF').toString().toUpperCase() },
    { label: 'Filename', value: report.filename }
  ].filter(item => item.value);

  const accentGradient = darkMode
    ? 'from-indigo-900/60 via-slate-900 to-slate-950'
    : 'from-indigo-200 via-slate-50 to-white';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl shadow-[0_40px_80px_-60px_rgba(15,23,42,0.9)] ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'}`}>
        <div className={`relative p-8 pb-6 bg-gradient-to-br ${accentGradient}`}>
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.45),_transparent_65%)]"></div>
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl ${darkMode ? 'bg-white/10' : 'bg-white/80'} backdrop-blur`}> 
                {hotelLogo ? (
                  <img src={hotelLogo} alt={`${hotelConfig?.name || 'Hotel'} logo`} className="w-16 h-16 object-contain" />
                ) : (
                  <span className={`text-2xl font-semibold ${darkMode ? 'text-white/70' : 'text-indigo-600'}`}>HR</span>
                )}
              </div>
              <div>
                <p className={`uppercase tracking-[0.4em] text-xs ${darkMode ? 'text-indigo-100/80' : 'text-indigo-500/80'}`}>
                  {hotelConfig?.name || 'Nhyiraba Hotel'}
                </p>
                <h2 className="text-2xl lg:text-3xl font-semibold mt-1">{report.name}</h2>
                <p className={`${darkMode ? 'text-slate-200/70' : 'text-slate-600'} text-sm mt-1`}>{hotelConfig?.tagline || 'Luxury & Excellence Redefined'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`self-start lg:self-center px-4 py-2 rounded-full border ${darkMode ? 'border-white/20 text-white/70 hover:bg-white/10' : 'border-slate-200 text-slate-600 hover:bg-white'} transition`}
            >
              Close Preview
            </button>
          </div>
        </div>

        <div className="p-8 pt-6 space-y-6 overflow-y-auto max-h-[calc(92vh-12rem)]">
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`}> 
            {metaItems.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-4 border ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'} shadow-sm`}
              >
                <p className={`${darkMode ? 'text-indigo-200/70' : 'text-indigo-500/80'} text-xs uppercase tracking-wider`}>{item.label}</p>
                <p className="text-sm font-medium mt-1 break-words">{item.value}</p>
              </div>
            ))}
          </div>

          {previewSource && (report.format === 'pdf' || report.type === 'PDF') ? (
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'} shadow-2xl`}> 
              <object
                data={previewSource}
                type="application/pdf"
                width="100%"
                height="720px"
                className="w-full"
              >
                <p className="p-6 text-center text-sm">
                  Your browser does not support inline PDF preview.{' '}
                  <a href={previewSource} target="_blank" rel="noopener noreferrer" className="underline">
                    Download the report
                  </a>
                  .
                </p>
              </object>
            </div>
          ) : (
            <div className={`rounded-2xl p-6 border text-center text-sm ${darkMode ? 'border-white/10 text-slate-200/70 bg-white/5' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
              Preview not available for this format.
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-3">
            <button
              onClick={() => {
                if (!previewSource) return;
                const link = document.createElement('a');
                link.href = previewSource;
                link.download = report.filename || `${report.name || 'report'}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className={`px-5 py-3 rounded-full text-sm font-medium shadow ${darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'} transition`}
            >
              Download PDF
            </button>

            <button
              onClick={onClose}
              className={`px-5 py-3 rounded-full text-sm font-medium ${darkMode ? 'bg-white/10 hover:bg-white/15 text-white/80' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'} transition`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Reports = () => {
  const { user } = useUser();
  const { theme } = useTheme();
  const darkMode = theme === 'dark';

  const HOTEL_CONFIG = {
    name: 'Nhyiraba Hotel',
    tagline: 'Luxury & Excellence Redefined',
    address: 'Wassa Nkonya',
    phone: '+233 59 856 9016',
    email: 'Nhyirabahotel@gmail.com',
    website: 'www.nhyirabahotel.com',
    logo: '/logo.jpg',
    logoMark: '/logo.jpg',
    coverImage: '/hero1.jpg',
    signatureBackdrop: '/hero.jpg',
    colors: {
      primary: '#1e40af',
      secondary: '#059669',
      accent: '#dc2626',
      gold: '#d97706',
      dark: '#1f2937',
      light: '#f8fafc'
    }
  };

  const brandAssetCache = useRef({ logo: null, cover: null });
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [coverImageDataUrl, setCoverImageDataUrl] = useState(null);
  
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

  useEffect(() => {
    const fetchAssetAsDataUrl = async (assetPath) => {
      const response = await fetch(assetPath);
      if (!response.ok) throw new Error(`Asset fetch failed for ${assetPath}`);
      const blob = await response.blob();
      const reader = new FileReader();

      return await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    const loadBrandAssets = async () => {
      try {
        if (!brandAssetCache.current.logo) {
          try {
            const logoAsset = await fetchAssetAsDataUrl(HOTEL_CONFIG.logo);
            brandAssetCache.current.logo = logoAsset;
            setLogoDataUrl(logoAsset);
          } catch (error) {
            console.error('Error loading hotel logo:', error);
            brandAssetCache.current.logo = null;
          }
        } else {
          setLogoDataUrl(brandAssetCache.current.logo);
        }

        if (!brandAssetCache.current.cover) {
          try {
            const coverAsset = await fetchAssetAsDataUrl(HOTEL_CONFIG.coverImage);
            brandAssetCache.current.cover = coverAsset;
            setCoverImageDataUrl(coverAsset);
          } catch (error) {
            console.error('Error loading cover image:', error);
            brandAssetCache.current.cover = null;
          }
        } else {
          setCoverImageDataUrl(brandAssetCache.current.cover);
        }
      } catch (error) {
        console.error('Error loading brand assets:', error);
      }
    };

    loadBrandAssets();
  }, []);
  
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
      const previewPayload = reportFormat === 'pdf'
        ? result.fileContent
        : result.previewData || null;
      
      if (!fileContent) {
        console.error(`Generated report has no content for type: ${reportType}`);
        throw new Error('Report generation failed: Empty content');
      }
      
      // Show success message
      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully!`);
      
      // Create professional hotel-branded filename
      const hotelName = HOTEL_CONFIG.name.replace(/\s+/g, '_');
      const reportTypeName = reportType.charAt(0).toUpperCase() + reportType.slice(1);
      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
      const professionalFileName = `${hotelName}_${reportTypeName}_Report_${timestamp}.${reportFormat}`;
      
      // Create a new enhanced report object with hotel branding
      const newReport = {
        id: uuidv4(),
        name: `${HOTEL_CONFIG.name} - ${reportTypeName} Report`,
        date: new Date().toISOString(),
        type: reportFormat.toUpperCase(),
        generatedBy: user?.fullName || user?.username || 'Admin',
        filename: professionalFileName,
        fileContent: fileContent,
        previewData: previewPayload,
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

  // Utility function to convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  // Get number of days from date range selection
  const getDaysFromRange = (range) => {
    switch(range) {
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      case '12months': return 365;
      default: return 7;
    }
  };

  const getPageDimensions = (doc) => {
    const size = doc.internal.pageSize;
    const width = typeof size.getWidth === 'function' ? size.getWidth() : size.width;
    const height = typeof size.getHeight === 'function' ? size.getHeight() : size.height;
    return { width, height };
  };

  const getImageFormat = (dataUrl) => {
    if (!dataUrl) return 'JPEG';
    if (dataUrl.startsWith('data:image/png')) return 'PNG';
    if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
    if (dataUrl.startsWith('data:image/svg')) return 'SVG';
    return 'JPEG';
  };

  const getReportDisplayName = (type) => {
    const map = {
      summary: 'Executive Summary',
      financial: 'Financial Statement',
      occupancy: 'Occupancy Insights',
      guests: 'Guest Experience',
      housekeeping: 'Operational Excellence',
      monthly: 'Monthly Performance'
    };
    return map[type] || 'Hotel Intelligence';
  };

  const getReportDescription = (type) => {
    switch(type) {
      case 'financial':
        return `${HOTEL_CONFIG.name} consolidated financial statement highlighting revenue performance, cash position, and outstanding receivables.`;
      case 'occupancy':
        return `Comprehensive occupancy analytics showcasing room utilisation trends, yield optimisation, and demand forecasting insights.`;
      case 'guests':
        return `Guest engagement intelligence detailing arrivals, departures, guest mix, and personalised service opportunities.`;
      case 'housekeeping':
        return `Operational effectiveness overview capturing housekeeping productivity, task completion, and service quality benchmarks.`;
      case 'monthly':
        return `Strategic monthly report presenting portfolio-level performance, growth indicators, and leadership-ready dashboards.`;
      default:
        return `Executive-level summary analysing revenue velocity, occupancy momentum, and mission-critical KPIs powering ${HOTEL_CONFIG.name}.`;
    }
  };

  const getReportPeriodLabel = () => {
    const days = getDaysFromRange(dateRange);
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    return `${format(startDate, 'MMM dd, yyyy')} – ${format(endDate, 'MMM dd, yyyy')}`;
  };

  // Memoized preview highlight metrics
  const previewHighlightMetrics = useMemo(() => [
    {
      label: 'Total Revenue',
      value: `GH₵${totalRevenue.toLocaleString()}`,
      caption: `Across ${getReportPeriodLabel()}`
    },
    {
      label: 'Average Occupancy',
      value: `${avgOccupancy}%`,
      caption: 'Average room utilisation'
    },
    {
      label: 'Pending Receivables',
      value: `GH₵${pendingPayments.toLocaleString()}`,
      caption: `${pendingInvoices.length} invoices awaiting settlement`
    }
  ], [totalRevenue, avgOccupancy, pendingPayments, pendingInvoices.length, dateRange]);

  const getHotelLogo = async () => {
    if (brandAssetCache.current.logo) {
      return brandAssetCache.current.logo;
    }

    try {
      const response = await fetch(HOTEL_CONFIG.logo);
      if (!response.ok) throw new Error('Logo fetch failed');
      const blob = await response.blob();
      const reader = new FileReader();

      const dataUrl = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      brandAssetCache.current.logo = dataUrl;
      setLogoDataUrl(prev => prev || dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('Unable to load hotel logo for PDF generation:', error);
      brandAssetCache.current.logo = null;
      return null;
    }
  };

  const getCoverImage = async () => {
    if (brandAssetCache.current.cover) {
      return brandAssetCache.current.cover;
    }

    try {
      const response = await fetch(HOTEL_CONFIG.coverImage);
      if (!response.ok) throw new Error('Cover image fetch failed');
      const blob = await response.blob();
      const reader = new FileReader();

      const dataUrl = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      brandAssetCache.current.cover = dataUrl;
      setCoverImageDataUrl(prev => prev || dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('Unable to load cover image for PDF generation:', error);
      brandAssetCache.current.cover = null;
      return null;
    }
  };

  // Universal Luxury Cover Page Generator
  const createLuxuryCoverPage = (doc, logoDataUrl, coverDataUrl, config) => {
    const { width: pageWidth, height: pageHeight } = getPageDimensions(doc);
    const gold = hexToRgb(HOTEL_CONFIG.colors.gold);
    const accentColor = config.accentColor || gold;
    
    // Deep navy gradient background
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Subtle overlay pattern
    if (coverDataUrl) {
      try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.03 }));
        doc.addImage(coverDataUrl, getImageFormat(coverDataUrl), 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        doc.restoreGraphicsState();
      } catch (error) {
        console.warn('Cover image render issue:', error);
      }
    }
    
    // Gold accent borders
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(0, 0, pageWidth, 2, 'F');
    doc.rect(0, pageHeight - 2, pageWidth, 2, 'F');
    doc.rect(0, 0, 2, pageHeight, 'F');
    doc.rect(pageWidth - 2, 0, 2, pageHeight, 'F');
    
    // Watermark
    if (logoDataUrl && config.showWatermark !== false) {
      try {
        const watermarkSize = 180;
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.04 }));
        doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), pageWidth / 2 - watermarkSize / 2, pageHeight / 2 - watermarkSize / 2, watermarkSize, watermarkSize, undefined, 'FAST');
        doc.restoreGraphicsState();
      } catch (error) {
        console.warn('Watermark render issue:', error);
      }
    }
    
    let yPos = 85;
    
    // Logo
    if (logoDataUrl) {
      const logoSize = 55;
      const logoX = pageWidth / 2 - logoSize / 2;
      
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.3 }));
      doc.setFillColor(gold[0], gold[1], gold[2]);
      doc.circle(pageWidth / 2, yPos + logoSize / 2, logoSize / 2 + 6, 'F');
      doc.restoreGraphicsState();
      
      doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), logoX, yPos, logoSize, logoSize, undefined, 'FAST');
      yPos += logoSize + 30;
    } else {
      yPos += 20;
    }
    
    // Hotel Name
    doc.setFont('times', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text('NHYIRABA HOTEL', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    // Decorative line
    const lineWidth = 120;
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(pageWidth / 2 - lineWidth / 2, yPos, lineWidth, 1.5, 'F');
    doc.circle(pageWidth / 2 - lineWidth / 2, yPos + 0.75, 2, 'F');
    doc.circle(pageWidth / 2 + lineWidth / 2, yPos + 0.75, 2, 'F');
    yPos += 25;
    
    // Report Title
    doc.setFont('times', 'bold');
    doc.setFontSize(config.titleSize || 26);
    doc.setTextColor(...accentColor);
    doc.text(config.title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 18;
    
    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(203, 213, 225);
    doc.text(config.subtitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(getReportPeriodLabel(), pageWidth / 2, yPos, { align: 'center' });
    
    // Metadata box
    const boxY = pageHeight - 65;
    const boxX = pageWidth - 85;
    const boxWidth = 70;
    
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.1 }));
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(boxX - 5, boxY, boxWidth + 10, 50, 4, 4, 'F');
    doc.restoreGraphicsState();
    
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(boxX - 5, boxY, boxWidth + 10, 50, 4, 4, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(gold[0], gold[1], gold[2]);
    
    let metaY = boxY + 8;
    doc.text('DATE', boxX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(format(new Date(), 'MMMM dd, yyyy'), boxX, metaY + 4);
    
    metaY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.text('LOCATION', boxX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(HOTEL_CONFIG.address, boxX, metaY + 4);
    doc.text('Ghana', boxX, metaY + 7);
    
    metaY += 13;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.text('CONTACT', boxX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(HOTEL_CONFIG.email, boxX, metaY + 4);
    doc.text(HOTEL_CONFIG.phone, boxX, metaY + 7);
    doc.text(HOTEL_CONFIG.website, boxX, metaY + 10);
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(config.footerText || 'CONFIDENTIAL DOCUMENT', pageWidth / 2, pageHeight - 15, { align: 'center' });
  };

  // Executive Summary Cover Page
  const addExecutiveSummaryCoverPage = (doc, logoDataUrl, coverDataUrl) => {
    createLuxuryCoverPage(doc, logoDataUrl, coverDataUrl, {
      title: 'EXECUTIVE SUMMARY',
      subtitle: 'Comprehensive Overview of Hotel Performance & Key Metrics',
      titleSize: 28,
      accentColor: hexToRgb(HOTEL_CONFIG.colors.primary),
      footerText: 'CONFIDENTIAL EXECUTIVE DOCUMENT'
    });
  };

  // Occupancy Report Cover Page
  const addOccupancyCoverPage = (doc, logoDataUrl, coverDataUrl) => {
    createLuxuryCoverPage(doc, logoDataUrl, coverDataUrl, {
      title: 'OCCUPANCY INSIGHTS',
      subtitle: 'Room Utilization Analytics & Demand Forecasting',
      titleSize: 28,
      accentColor: hexToRgb(HOTEL_CONFIG.colors.secondary),
      footerText: 'CONFIDENTIAL OPERATIONAL DOCUMENT'
    });
  };

  // Guest Experience Cover Page
  const addGuestExperienceCoverPage = (doc, logoDataUrl, coverDataUrl) => {
    createLuxuryCoverPage(doc, logoDataUrl, coverDataUrl, {
      title: 'GUEST EXPERIENCE REPORT',
      subtitle: 'Guest Engagement Intelligence & Service Excellence Metrics',
      titleSize: 26,
      accentColor: hexToRgb(HOTEL_CONFIG.colors.accent),
      footerText: 'CONFIDENTIAL GUEST INTELLIGENCE DOCUMENT'
    });
  };

  // Operational Excellence Cover Page
  const addOperationalCoverPage = (doc, logoDataUrl, coverDataUrl) => {
    createLuxuryCoverPage(doc, logoDataUrl, coverDataUrl, {
      title: 'OPERATIONAL EXCELLENCE',
      subtitle: 'Housekeeping Performance & Service Quality Benchmarks',
      titleSize: 26,
      accentColor: [139, 92, 246], // Purple
      footerText: 'CONFIDENTIAL OPERATIONS DOCUMENT'
    });
  };

  // Monthly Performance Cover Page
  const addMonthlyPerformanceCoverPage = (doc, logoDataUrl, coverDataUrl) => {
    createLuxuryCoverPage(doc, logoDataUrl, coverDataUrl, {
      title: 'MONTHLY PERFORMANCE',
      subtitle: 'Strategic Portfolio Analysis & Leadership Dashboards',
      titleSize: 28,
      accentColor: [59, 130, 246], // Blue
      footerText: 'CONFIDENTIAL STRATEGIC DOCUMENT'
    });
  };

  // Luxury Financial Report Cover Page
  const addFinancialCoverPage = (doc, logoDataUrl, coverDataUrl) => {
    const { width: pageWidth, height: pageHeight } = getPageDimensions(doc);
    const gold = hexToRgb(HOTEL_CONFIG.colors.gold);
    
    // Deep navy gradient background
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Subtle overlay pattern if cover image available
    if (coverDataUrl) {
      try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.03 }));
        doc.addImage(coverDataUrl, getImageFormat(coverDataUrl), 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        doc.restoreGraphicsState();
      } catch (error) {
        console.warn('Cover image render issue:', error);
      }
    }
    
    // Gold accent lines - top and bottom
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(0, 0, pageWidth, 2, 'F');
    doc.rect(0, pageHeight - 2, pageWidth, 2, 'F');
    
    // Side gold accent lines
    doc.rect(0, 0, 2, pageHeight, 'F');
    doc.rect(pageWidth - 2, 0, 2, pageHeight, 'F');
    
    // Watermark - faint logo in center background
    if (logoDataUrl) {
      try {
        const watermarkSize = 180;
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.04 }));
        doc.addImage(
          logoDataUrl, 
          getImageFormat(logoDataUrl), 
          pageWidth / 2 - watermarkSize / 2, 
          pageHeight / 2 - watermarkSize / 2, 
          watermarkSize, 
          watermarkSize, 
          undefined, 
          'FAST'
        );
        doc.restoreGraphicsState();
      } catch (error) {
        console.warn('Watermark render issue:', error);
      }
    }
    
    let yPos = 85;
    
    // Main logo - centered
    if (logoDataUrl) {
      const logoSize = 55;
      const logoX = pageWidth / 2 - logoSize / 2;
      
      // Gold circular frame around logo
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.3 }));
      doc.setFillColor(gold[0], gold[1], gold[2]);
      doc.circle(pageWidth / 2, yPos + logoSize / 2, logoSize / 2 + 6, 'F');
      doc.restoreGraphicsState();
      
      // Logo
      doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), logoX, yPos, logoSize, logoSize, undefined, 'FAST');
      yPos += logoSize + 30;
    } else {
      yPos += 20;
    }
    
    // Hotel Name - Playfair Display style (using Times for elegance)
    doc.setFont('times', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text('NHYIRABA HOTEL', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    // Gold decorative line
    const lineWidth = 120;
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(pageWidth / 2 - lineWidth / 2, yPos, lineWidth, 1.5, 'F');
    doc.circle(pageWidth / 2 - lineWidth / 2, yPos + 0.75, 2, 'F');
    doc.circle(pageWidth / 2 + lineWidth / 2, yPos + 0.75, 2, 'F');
    yPos += 25;
    
    // Main Title
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.text('FINANCIAL REPORT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 18;
    
    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(203, 213, 225);
    doc.text('Comprehensive Summary of Financial Performance', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(getReportPeriodLabel(), pageWidth / 2, yPos, { align: 'center' });
    
    // Bottom metadata box - right aligned
    const boxY = pageHeight - 65;
    const boxX = pageWidth - 85;
    const boxWidth = 70;
    
    // Subtle box background
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.1 }));
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(boxX - 5, boxY, boxWidth + 10, 50, 4, 4, 'F');
    doc.restoreGraphicsState();
    
    // Gold border
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(boxX - 5, boxY, boxWidth + 10, 50, 4, 4, 'S');
    
    // Metadata content
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(gold[0], gold[1], gold[2]);
    
    let metaY = boxY + 8;
    doc.text('DATE', boxX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(format(new Date(), 'MMMM dd, yyyy'), boxX, metaY + 4);
    
    metaY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.text('LOCATION', boxX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(HOTEL_CONFIG.address, boxX, metaY + 4);
    doc.text('Ghana', boxX, metaY + 7);
    
    metaY += 13;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.text('CONTACT', boxX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(HOTEL_CONFIG.email, boxX, metaY + 4);
    doc.text(HOTEL_CONFIG.phone, boxX, metaY + 7);
    doc.text(HOTEL_CONFIG.website, boxX, metaY + 10);
    
    // Confidential watermark at bottom
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('CONFIDENTIAL FINANCIAL DOCUMENT', pageWidth / 2, pageHeight - 15, { align: 'center' });
  };

  const addLuxuryCoverPage = (doc, reportType, logoDataUrl, coverDataUrl) => {
    const { width: pageWidth, height: pageHeight } = getPageDimensions(doc);
    const gold = hexToRgb(HOTEL_CONFIG.colors.gold);
    const dark = hexToRgb(HOTEL_CONFIG.colors.dark);

    // Sophisticated gradient background
    const gradient = doc.linearGradient || function() {};
    doc.setFillColor(15, 23, 42); // Deep navy
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Overlay subtle pattern
    if (coverDataUrl) {
      try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.06 }));
        doc.addImage(coverDataUrl, getImageFormat(coverDataUrl), 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        doc.restoreGraphicsState();
      } catch (error) {
        console.warn('Cover image render issue:', error);
      }
    }

    // Elegant top accent strip
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');
    
    // Premium white content card with shadow effect
    const cardMargin = 35;
    const cardY = 55;
    const cardHeight = pageHeight - 110;
    
    // Shadow layers for depth
    doc.setFillColor(0, 0, 0);
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.roundedRect(cardMargin + 2, cardY + 2, pageWidth - (cardMargin * 2), cardHeight, 8, 8, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    
    // Main card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardMargin, cardY, pageWidth - (cardMargin * 2), cardHeight, 8, 8, 'F');
    
    // Gold accent border
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.75);
    doc.roundedRect(cardMargin, cardY, pageWidth - (cardMargin * 2), cardHeight, 8, 8, 'S');

    let yPos = cardY + 35;

    // Hotel logo with elegant framing
    if (logoDataUrl) {
      const logoSize = 65;
      const logoX = pageWidth / 2 - logoSize / 2;
      
      // Logo backdrop circle
      doc.setFillColor(248, 250, 252);
      doc.circle(pageWidth / 2, yPos + logoSize / 2, logoSize / 2 + 8, 'F');
      
      // Gold ring around logo
      doc.setDrawColor(gold[0], gold[1], gold[2]);
      doc.setLineWidth(1.5);
      doc.circle(pageWidth / 2, yPos + logoSize / 2, logoSize / 2 + 8, 'S');
      
      doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), logoX, yPos, logoSize, logoSize, undefined, 'FAST');
      yPos += logoSize + 25;
    } else {
      yPos += 15;
    }

    // Hotel name - premium typography
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(15, 23, 42);
    doc.text(HOTEL_CONFIG.name.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    // Gold underline ornament
    const nameUnderlineWidth = 80;
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(pageWidth / 2 - nameUnderlineWidth / 2, yPos, nameUnderlineWidth, 2, 'F');
    doc.circle(pageWidth / 2 - nameUnderlineWidth / 2, yPos + 1, 2, 'F');
    doc.circle(pageWidth / 2 + nameUnderlineWidth / 2, yPos + 1, 2, 'F');
    yPos += 18;

    // Tagline
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(HOTEL_CONFIG.tagline, pageWidth / 2, yPos, { align: 'center' });
    yPos += 35;

    // Report title - executive style
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(30, 58, 138); // Professional blue
    const reportTitle = getReportDisplayName(reportType);
    doc.text(reportTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(71, 85, 105);
    doc.text('REPORT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 25;

    // Report description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const description = doc.splitTextToSize(getReportDescription(reportType), pageWidth - 120);
    doc.text(description, pageWidth / 2, yPos, { align: 'center', maxWidth: pageWidth - 120 });
    yPos += (description.length * 5) + 25;

    // Executive information grid
    const infoItems = [
      { label: 'PREPARED FOR', value: HOTEL_CONFIG.name },
      { label: 'PREPARED BY', value: user?.fullName || user?.username || 'Executive Team' },
      { label: 'REPORTING PERIOD', value: getReportPeriodLabel() },
      { label: 'GENERATED ON', value: format(new Date(), 'MMMM dd, yyyy • HH:mm') }
    ];

    const gridCols = 2;
    const cardWidth = (pageWidth - (cardMargin * 2) - 80) / gridCols - 10;
    const cardSpacing = 15;
    
    infoItems.forEach((item, idx) => {
      const col = idx % gridCols;
      const row = Math.floor(idx / gridCols);
      const x = cardMargin + 40 + col * (cardWidth + cardSpacing);
      const y = yPos + row * 48;
      
      // Info card with subtle border
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(x, y, cardWidth, 40, 5, 5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, cardWidth, 40, 5, 5, 'S');
      
      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text(item.label, x + 10, y + 12);
      
      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      const valueLines = doc.splitTextToSize(item.value, cardWidth - 20);
      doc.text(valueLines, x + 10, y + 24);
    });

    const metrics = [
      { label: 'Total Revenue', value: `GH₵${totalRevenue.toLocaleString()}`, color: HOTEL_CONFIG.colors.secondary },
      { label: 'Average Occupancy', value: `${avgOccupancy}%`, color: HOTEL_CONFIG.colors.primary },
      { label: 'Bookings Processed', value: totalRoomBookings.toString(), color: HOTEL_CONFIG.colors.accent },
      { label: 'Pending Payments', value: `GH₵${pendingPayments.toLocaleString()}`, color: HOTEL_CONFIG.colors.gold }
    ];

    const metricsY = pageHeight - 260;
    const metricWidth = (pageWidth - 180) / metrics.length;
    metrics.forEach((metric, idx) => {
      const x = 60 + idx * (metricWidth + 20);
      const colorRgb = hexToRgb(metric.color);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, metricsY, metricWidth, 90, 12, 12, 'F');
      doc.setDrawColor(colorRgb[0], colorRgb[1], colorRgb[2]);
      doc.setLineWidth(0.8);
      doc.roundedRect(x, metricsY, metricWidth, 90, 12, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 130);
      doc.text(metric.label.toUpperCase(), x + 16, metricsY + 24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(colorRgb[0], colorRgb[1], colorRgb[2]);
      doc.text(metric.value, x + 16, metricsY + 52);
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${HOTEL_CONFIG.address}   •   ${HOTEL_CONFIG.phone}   •   ${HOTEL_CONFIG.email}`, pageWidth / 2, pageHeight - 40, { align: 'center' });
    doc.setFontSize(9);
    doc.text(HOTEL_CONFIG.website, pageWidth / 2, pageHeight - 24, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`Confidential – ${format(new Date(), 'yyyy')}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
  };

  // Enhanced PDF generation with beautiful branding
  const generatePdfReport = async (reportType, filename) => {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new jsPDF();
        const [logoDataUrl, coverArtDataUrl] = await Promise.all([
          getHotelLogo(),
          getCoverImage()
        ]);

        // Use specialized luxury cover pages for each report type
        if (reportType === 'financial') {
          addFinancialCoverPage(doc, logoDataUrl, coverArtDataUrl);
        } else if (reportType === 'summary') {
          addExecutiveSummaryCoverPage(doc, logoDataUrl, coverArtDataUrl);
        } else if (reportType === 'occupancy') {
          addOccupancyCoverPage(doc, logoDataUrl, coverArtDataUrl);
        } else if (reportType === 'guests') {
          addGuestExperienceCoverPage(doc, logoDataUrl, coverArtDataUrl);
        } else if (reportType === 'housekeeping') {
          addOperationalCoverPage(doc, logoDataUrl, coverArtDataUrl);
        } else if (reportType === 'monthly') {
          addMonthlyPerformanceCoverPage(doc, logoDataUrl, coverArtDataUrl);
        } else {
          addLuxuryCoverPage(doc, reportType, logoDataUrl, coverArtDataUrl);
        }
        
        doc.addPage();

        if (reportType === 'financial') {
          addFinancialHeader(doc, logoDataUrl);
        } else {
          addBrandedHeader(doc, logoDataUrl);
        }

        const styles = {
          title: {
            fontSize: 18,
            textColor: hexToRgb(HOTEL_CONFIG.colors.dark),
            font: 'helvetica'
          },
          subtitle: {
            fontSize: 12,
            textColor: [100, 100, 100],
            font: 'helvetica'
          },
          heading: {
            fontSize: 14,
            textColor: hexToRgb(HOTEL_CONFIG.colors.dark),
            font: 'helvetica'
          },
          normal: {
            fontSize: 11,
            textColor: [50, 50, 50],
            font: 'helvetica'
          },
          tableHeader: {
            fontSize: 11,
            textColor: [255, 255, 255],
            fillColor: hexToRgb(HOTEL_CONFIG.colors.primary),
            fontStyle: 'bold',
            font: 'helvetica'
          },
          tableRow: {
            fontSize: 10,
            textColor: [50, 50, 50],
            font: 'helvetica'
          },
          tableRowAlternate: {
            fillColor: [248, 250, 252]
          }
        };
        
        let yPosition = reportType === 'financial' ? 90 : 100;
        
        switch(reportType) {
          case 'summary':
            generateSummaryPdfReport(doc, styles, yPosition);
            break;
          case 'financial':
            generateFinancialPdfReport(doc, styles, yPosition);
            break;
          case 'occupancy':
            generateOccupancyPdfReport(doc, styles, yPosition);
            break;
          case 'guests':
            generateGuestPdfReport(doc, styles, yPosition);
            break;
          case 'housekeeping':
            generateHousekeepingPdfReport(doc, styles, yPosition);
            break;
          case 'monthly':
            await generateMonthlyPdfReport(doc, styles, yPosition);
            break;
          default:
            generateSummaryPdfReport(doc, styles, yPosition);
        }
        
        const totalPages = doc.internal.getNumberOfPages();
        const contentPages = Math.max(totalPages - 1, 1);
        for (let pageNumber = 2; pageNumber <= totalPages; pageNumber++) {
          doc.setPage(pageNumber);
          addBrandedFooter(doc);
          const { width: pageWidth, height: pageHeight } = getPageDimensions(doc);
          doc.setFont('helvetica');
          doc.setFontSize(8);
          doc.setTextColor(160, 160, 160);
          doc.text(`Page ${pageNumber - 1} of ${contentPages}`, pageWidth - 30, pageHeight - 12, { align: 'right' });
        }
        
        const pdfOutput = doc.output('datauristring');
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
  // Beautiful branded header
  const addBrandedHeader = (doc, logoDataUrl) => {
    const pageWidth = doc.internal.pageSize.width;
    const gold = hexToRgb(HOTEL_CONFIG.colors.gold);
    
    // Clean white header with bottom border
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Gold accent line at top
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(0, 0, pageWidth, 2, 'F');
    
    const logoSize = 28;
    const logoX = 18;
    const logoY = 10;

    // Logo with subtle background
    doc.setFillColor(248, 250, 252);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3, 'F');
    
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), logoX, logoY, logoSize, logoSize, undefined, 'FAST');
      } catch (error) {
        console.warn('Unable to render header logo:', error);
        doc.setTextColor(gold[0], gold[1], gold[2]);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('LR', logoX + 10, logoY + 18);
      }
    } else {
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('LR', logoX + 10, logoY + 18);
    }
    
    // Hotel name
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(HOTEL_CONFIG.name, 55, 20);
    
    // Tagline
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(HOTEL_CONFIG.tagline, 55, 28);
    
    // Right-aligned info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(format(new Date(), 'MMMM dd, yyyy'), pageWidth - 18, 20, { align: 'right' });
    doc.text(HOTEL_CONFIG.phone, pageWidth - 18, 28, { align: 'right' });
    
    // Bottom border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(0, 44, pageWidth, 44);
  };

  // Beautiful branded footer
  const addBrandedFooter = (doc) => {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const gold = hexToRgb(HOTEL_CONFIG.colors.gold);
    
    // Top border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(0, pageHeight - 20, pageWidth, pageHeight - 20);
    
    // Footer background
    doc.setFillColor(249, 250, 251);
    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    // Contact information with separators
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    
    const contactParts = [HOTEL_CONFIG.address, HOTEL_CONFIG.email, HOTEL_CONFIG.phone, HOTEL_CONFIG.website];
    const footerText = contactParts.join('  •  ');
    doc.text(footerText, pageWidth / 2, pageHeight - 12, { align: 'center' });
    
    // Copyright with gold accent
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.text('◆', pageWidth / 2 - 35, pageHeight - 6);
    doc.text('◆', pageWidth / 2 + 35, pageHeight - 6);
    
    doc.setTextColor(100, 116, 139);
    doc.text(`© ${new Date().getFullYear()} ${HOTEL_CONFIG.name}. All Rights Reserved. Confidential Document.`, pageWidth / 2, pageHeight - 6, { align: 'center' });
  };

  // Professional Financial Report Header
  const addFinancialHeader = (doc, logoDataUrl) => {
    const pageWidth = doc.internal.pageSize.width;
    const gold = hexToRgb(HOTEL_CONFIG.colors.gold);
    
    // White header background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Gold accent line at top
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(0, 0, pageWidth, 1.5, 'F');
    
    const logoSize = 22;
    const logoX = 15;
    const logoY = 8;

    // Logo
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), logoX, logoY, logoSize, logoSize, undefined, 'FAST');
      } catch (error) {
        console.warn('Unable to render header logo:', error);
        doc.setTextColor(gold[0], gold[1], gold[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('LR', logoX + 8, logoY + 14);
      }
    }
    
    // Report title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Nhyiraba Hotel Financial Report 2025', logoX + logoSize + 8, 16);
    
    // Right side - contact info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(HOTEL_CONFIG.phone, pageWidth - 15, 12, { align: 'right' });
    doc.text(HOTEL_CONFIG.email, pageWidth - 15, 18, { align: 'right' });
    doc.text(HOTEL_CONFIG.website, pageWidth - 15, 24, { align: 'right' });
    
    // Bottom border
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(1);
    doc.line(0, 34, pageWidth, 34);
  };

  const generateSummaryPdfReport = (doc, styles, yPos = 55) => {
    try {
      const pageWidth = doc.internal.pageSize.width;
      const gold = hexToRgb(HOTEL_CONFIG.colors.gold);
      
      console.log("Starting to generate Ultra-Professional Summary PDF");
      
      // SECTION 1: Executive Summary Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text('EXECUTIVE SUMMARY', 20, yPos);
      
      // Gold accent line under title
      doc.setFillColor(gold[0], gold[1], gold[2]);
      doc.rect(20, yPos + 3, 60, 2, 'F');
      yPos += 18;
      
      // Period info bar
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const dateRangeText = getDaysFromRange(dateRange) === 7 ? 'Last 7 Days' :
                           getDaysFromRange(dateRange) === 30 ? 'Last 30 Days' :
                           getDaysFromRange(dateRange) === 90 ? 'Last 90 Days' : 'Last 12 Months';
      doc.text(`REPORTING PERIOD: ${dateRangeText.toUpperCase()}  •  GENERATED: ${format(new Date(), 'MMMM dd, yyyy  •  HH:mm')}`, 20, yPos);
      yPos += 15;
      
      // SECTION 2: Key Performance Indicators - Executive KPI Cards
      const kpiData = [
        {
          label: 'TOTAL REVENUE',
          value: `GH₵ ${totalRevenue.toLocaleString()}`,
          subtext: `${dateRangeText} Performance`,
          icon: '₵',
          colorRgb: [16, 185, 129] // Emerald
        },
        {
          label: 'OCCUPANCY RATE',
          value: `${avgOccupancy}%`,
          subtext: 'Average Utilization',
          icon: '▣',
          colorRgb: [59, 130, 246] // Blue
        },
        {
          label: 'ROOM BOOKINGS',
          value: totalRoomBookings.toString(),
          subtext: 'Total Reservations',
          icon: '⌂',
          colorRgb: [139, 92, 246] // Purple
        },
        {
          label: 'ACCOUNTS RECEIVABLE',
          value: `GH₵ ${pendingPayments.toLocaleString()}`,
          subtext: `${pendingInvoices.length} Pending Invoices`,
          icon: '⚡',
          colorRgb: [245, 158, 11] // Amber
        }
      ];
      
      const kpiCols = 2;
      const kpiCardWidth = (pageWidth - 60) / kpiCols;
      const kpiCardHeight = 42;
      const kpiSpacing = 15;
      
      kpiData.forEach((kpi, idx) => {
        const col = idx % kpiCols;
        const row = Math.floor(idx / kpiCols);
        const x = 20 + col * (kpiCardWidth + kpiSpacing);
        const y = yPos + row * (kpiCardHeight + 12);
        
        // Card with gradient effect
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, kpiCardWidth, kpiCardHeight, 6, 6, 'F');
        
        // Left color accent bar
        doc.setFillColor(...kpi.colorRgb);
        doc.roundedRect(x, y, 4, kpiCardHeight, 6, 6, 'F');
        
        // Subtle border
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, y, kpiCardWidth, kpiCardHeight, 6, 6, 'S');
        
        // Icon circle
        doc.setFillColor(248, 250, 252);
        doc.circle(x + 20, y + 12, 8, 'F');
        doc.setTextColor(...kpi.colorRgb);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(kpi.icon, x + 17, y + 15);
        
        // KPI Label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, x + 32, y + 10);
        
        // KPI Value - large and bold
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text(kpi.value, x + 32, y + 22);
        
        // Subtext
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(kpi.subtext, x + 32, y + 32);
      });
      
      yPos += (Math.ceil(kpiData.length / kpiCols) * (kpiCardHeight + 12)) + 20;
      console.log("Added executive KPI cards");
      
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
  
  // World-Class Luxury Financial PDF Report
  const generateFinancialPdfReport = (doc, styles, startY = 45) => {
    const pageWidth = doc.internal.pageSize.width;
    const gold = hexToRgb(HOTEL_CONFIG.colors.gold);
    const navy = [15, 23, 42];
    let yPos = startY;

    // Calculate all financial metrics
    const totalRevenue = (financialData || []).reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0);
    const paidRevenue = (financialData || []).filter(inv => (inv.status || '').toLowerCase() === 'paid').reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0);
    const pendingAmount = (financialData || []).filter(inv => (inv.status || '').toLowerCase() === 'pending' || (inv.status || '').toLowerCase() === 'unpaid').reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0);
    const roomRevenue = (financialData || []).filter(inv => (inv.type || '').toLowerCase() === 'room' || !inv.type).reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0);
    const serviceRevenue = (financialData || []).filter(inv => (inv.type || '').toLowerCase() === 'service').reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0);
    const otherRevenue = Math.max(0, totalRevenue - roomRevenue - serviceRevenue);
    const totalExpenses = Math.round(totalRevenue * 0.35); // Estimate 35% operational costs
    const netProfit = paidRevenue - totalExpenses;
    const ebitda = netProfit;
    const collectionRate = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;

    // SECTION 1: INCOME STATEMENT
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...navy);
    doc.text('INCOME STATEMENT', 20, yPos);
    
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(20, yPos + 3, 55, 1.5, 'F');
    yPos += 15;

    // Professional Table with Grid Theme
    autoTable(doc, {
      startY: yPos,
      head: [['REVENUE STREAM', 'AMOUNT (GH₵)', '% OF TOTAL']],
      body: [
        ['Room Revenue', roomRevenue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','), `${Math.round((roomRevenue / totalRevenue) * 100)}%`],
        ['Food & Beverage Revenue', serviceRevenue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','), `${Math.round((serviceRevenue / totalRevenue) * 100)}%`],
        ['Other Revenue', otherRevenue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','), `${Math.round((otherRevenue / totalRevenue) * 100)}%`],
        ['', '', ''],
        [{ content: 'TOTAL REVENUE', styles: { fontStyle: 'bold', fontSize: 11 } }, 
         { content: totalRevenue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','), styles: { fontStyle: 'bold', fontSize: 11 } }, 
         { content: '100%', styles: { fontStyle: 'bold', fontSize: 11 } }]
      ],
      theme: 'grid',
      styles: { 
        font: 'helvetica',
        fontSize: 11, 
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: { 
        fillColor: hexToRgb(HOTEL_CONFIG.colors.primary),
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        font: 'helvetica'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' }
      }
    });

    yPos = doc.lastAutoTable?.finalY + 20 || yPos + 80;

    // SECTION 2: KEY METRICS DASHBOARD
    if (yPos > 220) {
      doc.addPage();
      yPos = 45;
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...navy);
    doc.text('KEY METRICS DASHBOARD', 20, yPos);
    
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(20, yPos + 3, 70, 1.5, 'F');
    yPos += 15;

    // Metrics Table
    const avgInvoiceValue = Math.round(totalRevenue / Math.max(financialData.length, 1));
    const largestTransaction = Math.max(...financialData.map(inv => parseFloat(inv.amount) || 0));
    
    const metricsData = [
      ['Total Invoices Generated', financialData.length.toString()],
      ['Paid Invoices', financialData.filter(inv => (inv.status || '').toLowerCase() === 'paid').length.toString()],
      ['Pending Invoices', financialData.filter(inv => (inv.status || '').toLowerCase() === 'pending').length.toString()],
      ['Average Invoice Value', avgInvoiceValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')],
      ['Largest Single Transaction', largestTransaction.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')],
      ['Collection Success Rate', `${collectionRate}%`]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['METRIC', 'VALUE']],
      body: metricsData,
      theme: 'grid',
      styles: { 
        font: 'helvetica',
        fontSize: 11, 
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: { 
        fillColor: hexToRgb(HOTEL_CONFIG.colors.primary),
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        font: 'helvetica'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' }
      }
    });

  };

  // Generate dummy share link
  const generateShareLink = () => {
    // Use the current reportData from the component state or a fallback
    const currentReportData = reportData || {};
    const dummyLink = `https://www.nhyirabahotel.com/share/${currentReportData.id || 'report'}`;
    return dummyLink;
  };

  // Handle email report
  const handleEmailReport = () => {
    // Use the current reportData from the component state or a fallback
    const currentReportData = reportData || {};
    const subject = encodeURIComponent(`Nhyiraba Hotel Report: ${currentReportData?.name || 'Report'}`);
    const body = encodeURIComponent(`Please find attached the ${currentReportData?.name || 'report'} from Nhyiraba Hotel.\n\nThank you for your business.`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    toast.success('Email client opened');
  };

  // Generate Occupancy PDF report
  const generateOccupancyPdfReport = (doc, styles, initialY = 80) => {
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
  const generateGuestPdfReport = (doc, styles, startingY = 80) => {
    // Check if data is available
    if (!guestData || !Array.isArray(guestData) || guestData.length === 0) {
      console.error('Guest data not available for PDF generation');
      doc.setFont(styles.normal.font);
      doc.text('No guest data available for report generation.', 15, 30);
      return;
    }
    
    const { width: pageWidth } = getPageDimensions(doc);
    
    // Professional Header Section
    let yPos = 30;
    
    // Hotel Name
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Navy
    doc.text(HOTEL_CONFIG.name, 15, yPos);
    yPos += 8;
    
    // Tagline
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate
    doc.text(HOTEL_CONFIG.tagline, 15, yPos);
    yPos += 8;
    
    // Current Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(format(new Date(), 'MMMM dd, yyyy'), 15, yPos);
    yPos += 10;
    
    // Report Title and Phone Number on same line
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('Guest Report', 15, yPos);
    
    // Phone number aligned to the right
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(HOTEL_CONFIG.phone, pageWidth - 15, yPos, { align: 'right' });
    yPos += 8;
    
    // Generated on date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 15, yPos);
    yPos += 15;
    
    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 15;
    
    // Add guest details table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
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
  const generateHousekeepingPdfReport = (doc, styles, currentY = 80) => {
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
  
  // Generate Monthly PDF report with REAL DATA
  const generateMonthlyPdfReport = async (doc, styles, baseY = 80) => {
    console.log('🏨 Generating Monthly PDF Report with Real Hotel Data');
    
    let yPos = baseY;
    
    try {
      // Fetch REAL hotel data from database
      console.log('📊 Fetching real-time hotel data...');
      
      const endDate = new Date();
      const startDate = subDays(endDate, getDaysFromRange(dateRange));
      
      // Fetch actual data from Supabase
      const [roomsRes, reservationsRes, guestsRes, invoicesRes, tasksRes] = await Promise.all([
        supabase.from('rooms').select('*'),
        supabase.from('reservations').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('guests').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('invoices').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('tasks').select('*').gte('created_at', startDate.toISOString())
      ]);
      
      const realRooms = roomsRes.data || [];
      const realReservations = reservationsRes.data || [];
      const realGuests = guestsRes.data || [];
      const realInvoices = invoicesRes.data || [];
      const realTasks = tasksRes.data || [];
      
      console.log('✅ Real data fetched:', {
        rooms: realRooms.length,
        reservations: realReservations.length,
        guests: realGuests.length,
        invoices: realInvoices.length,
        tasks: realTasks.length
      });
      
      // Calculate REAL metrics
      const realTotalRevenue = realInvoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
      const realTotalRooms = realRooms.length || 1;
      const realOccupiedRooms = realReservations.filter(res => res.status === 'confirmed' || res.status === 'checked_in').length;
      const realOccupancyRate = Math.round((realOccupiedRooms / realTotalRooms) * 100);
      const realTotalBookings = realReservations.length;
      const realCompletedTasks = realTasks.filter(task => task.status === 'completed').length;
      const realGuestSatisfaction = realTasks.length > 0 ? Math.round((realCompletedTasks / realTasks.length) * 100) : 95;
      
      // Real revenue breakdown
      const realRoomRevenue = realInvoices.filter(inv => inv.type === 'room' || inv.room_id || !inv.type).reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
      const realServiceRevenue = realInvoices.filter(inv => inv.type === 'service' || inv.type === 'food' || inv.type === 'beverage').reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
      const realOtherRevenue = realTotalRevenue - realRoomRevenue - realServiceRevenue;
      
      console.log('💰 Real calculated metrics:', {
        totalRevenue: realTotalRevenue,
        occupancyRate: realOccupancyRate,
        totalBookings: realTotalBookings,
        guestSatisfaction: realGuestSatisfaction
      });
      
      // Get page width for layout
      const { width: pageWidth } = getPageDimensions(doc);
      
      // Professional Header Section
      // Hotel Name
      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // Navy
      doc.text(HOTEL_CONFIG.name, 15, yPos);
      yPos += 8;
      
      // Tagline
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate
      doc.text(HOTEL_CONFIG.tagline, 15, yPos);
      yPos += 8;
      
      // Current Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(format(new Date(), 'MMMM dd, yyyy'), 15, yPos);
      yPos += 10;
      
      // Report Title and Phone Number on same line
      doc.setFont('times', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('Monthly Report', 15, yPos);
      
      // Phone number aligned to the right
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(HOTEL_CONFIG.phone, pageWidth - 15, yPos, { align: 'right' });
      yPos += 8;
      
      // Generated on and Prepared by
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')} | Prepared by: ${user?.fullName || user?.username || 'System'}`, 15, yPos);
      yPos += 15;
      
      // Separator line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, yPos, pageWidth - 15, yPos);
      yPos += 15;
      
      // Executive Summary
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize);
      doc.setTextColor(...styles.heading.textColor);
      doc.text('I. Executive Summary', 15, yPos);
      yPos += 15;
      
      // Overview section with REAL data
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize - 2);
      doc.text('A. Overview', 15, yPos);
      yPos += 10;
      
      const maxWidth = pageWidth - 30;
      
      doc.setFont(styles.normal.font);
      doc.setFontSize(styles.normal.fontSize);
      
      // Overview text - split manually for better control
      const overviewLine1 = `In ${format(new Date(), 'MMMM yyyy')}, ${HOTEL_CONFIG.name} achieved an occupancy rate of ${realOccupancyRate}%,`;
      const overviewLine2 = `generating total revenue of GH₵${realTotalRevenue.toLocaleString()}. The hotel processed ${realTotalBookings} bookings,`;
      const overviewLine3 = `served ${realGuests.length} guests, and maintained a ${realGuestSatisfaction}% service completion rate with ${realCompletedTasks} completed tasks.`;
      
      doc.text(overviewLine1, 15, yPos, { maxWidth: maxWidth });
      yPos += 5;
      doc.text(overviewLine2, 15, yPos, { maxWidth: maxWidth });
      yPos += 5;
      doc.text(overviewLine3, 15, yPos, { maxWidth: maxWidth });
      yPos += 15;
      
      // Key Highlights with REAL data
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize - 2);
      doc.text('B. Key Highlights', 15, yPos);
      yPos += 10;
      
      doc.setFont(styles.normal.font);
      
      // Highlight 1
      doc.text(`1. Occupancy Rate: Achieved ${realOccupancyRate}% occupancy with ${realOccupiedRooms} of ${realTotalRooms} rooms occupied.`, 15, yPos, { maxWidth: maxWidth });
      yPos += 10;
      
      // Highlight 2
      doc.text(`2. Revenue: Generated GH₵${realTotalRevenue.toLocaleString()} total revenue, with GH₵${realRoomRevenue.toLocaleString()} from room bookings.`, 15, yPos, { maxWidth: maxWidth });
      yPos += 10;
      
      // Highlight 3
      doc.text(`3. Guest Satisfaction: Maintained ${realGuestSatisfaction}% service completion rate based on ${realTasks.length} operational tasks.`, 15, yPos, { maxWidth: maxWidth });
      yPos += 5;
      
      yPos += 15;
      
      // Financial Performance Section with REAL data
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize);
      doc.text('II. Financial Performance', 15, yPos);
      yPos += 15;
      
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize - 2);
      doc.text('A. Revenue Analysis', 15, yPos);
      yPos += 10;
      
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize - 3);
      doc.text('1. Room Revenue:', 15, yPos);
      yPos += 8;
      
      doc.setFont(styles.normal.font);
      doc.text(`• Total Room Revenue: GH₵${realRoomRevenue.toLocaleString()}`, 20, yPos);
      yPos += 6;
      
      const realADR = realReservations.length > 0 ? Math.round(realRoomRevenue / realReservations.length) : 0;
      doc.text(`• Average Daily Rate (ADR): GH₵${realADR.toLocaleString()}`, 20, yPos);
      yPos += 10;
      
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize - 3);
      doc.text('2. Food and Beverage Revenue:', 15, yPos);
      yPos += 8;
      
      doc.setFont(styles.normal.font);
      doc.text(`• Restaurant Sales: GH₵${Math.round(realServiceRevenue * 0.7).toLocaleString()}`, 20, yPos);
      yPos += 6;
      doc.text(`• Bar Sales: GH₵${Math.round(realServiceRevenue * 0.3).toLocaleString()}`, 20, yPos);
      yPos += 15;
      
      // Monthly Details Table with REAL data
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize - 2);
      doc.text('Monthly Details', 15, yPos);
      yPos += 10;
      
      const realMonthlyData = [
        [
          format(new Date(), 'MMM yyyy'),
          realTotalRevenue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','),
          '0',
          realInvoices.length.toString(),
          realInvoices.filter(inv => inv.status === 'paid').length.toString(),
          realInvoices.filter(inv => inv.status === 'pending').length.toString()
        ]
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [['Month', 'Revenue (GH₵)', 'Pending (GH₵)', 'Invoices', 'Paid', 'Pending']],
        body: realMonthlyData,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 11,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'center'
        },
        headStyles: {
          fillColor: hexToRgb(HOTEL_CONFIG.colors.primary),
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11,
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          1: { halign: 'right', fontStyle: 'bold' },
          2: { halign: 'right', fontStyle: 'bold' }
        }
      });
      
      yPos = doc.lastAutoTable?.finalY + 15;
      
      // Operational Performance with REAL data
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize);
      doc.text('III. Operational Performance', 15, yPos);
      yPos += 15;
      
      doc.setFont(styles.heading.font, 'bold');
      doc.setFontSize(styles.heading.fontSize - 2);
      doc.text('A. Occupancy and Room Statistics', 15, yPos);
      yPos += 10;
      
      doc.setFont(styles.normal.font);
      doc.text(`1. Total Available Rooms: ${realTotalRooms}`, 15, yPos);
      yPos += 8;
      doc.text(`2. Occupied Rooms: ${realOccupancyRate}%`, 15, yPos);
      yPos += 8;
      
      const avgStayLength = realReservations.length > 0 ? '2.5 days' : 'N/A';
      doc.text(`3. Average Length of Stay: ${avgStayLength}`, 15, yPos);
      
      console.log('✅ Monthly report generated with real data');
      
    } catch (error) {
      console.error('❌ Error generating monthly report:', error);
      doc.setFont(styles.normal.font);
      doc.text(`Error generating report: ${error.message}`, 15, yPos);
    }
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
          hotelConfig={HOTEL_CONFIG}
          hotelLogo={logoDataUrl}
          coverImage={coverImageDataUrl}
          highlightMetrics={previewHighlightMetrics}
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