import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  FolderIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { recoveryAPI } from '../services/api';
import { RecoverySession } from '../services/types';
import { useRecoveryProgress, useWebSocketRoom } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';

interface RecoveryFile {
  id: string;
  name: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'other';
  size: number;
  path: string;
  dateDeleted: string;
  recoveryChance: 'high' | 'medium' | 'low';
  preview?: string;
  selected: boolean;
}



const DataRecovery: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const [recoverySession, setRecoverySession] = useState<RecoverySession | null>(null);
  const [recoveredFiles, setRecoveredFiles] = useState<RecoveryFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryHistory, setRecoveryHistory] = useState<RecoverySession[]>([]);

  // Use WebSocket for real-time progress updates
  const { progress: recoveryProgress } = useRecoveryProgress(recoverySession?.id || null);
  
  // Join WebSocket room for this recovery session
  useWebSocketRoom(recoverySession ? `recovery:${recoverySession.id}` : null);

  // Load recovery history on component mount
  useEffect(() => {
    const fetchRecoveryHistory = async () => {
      try {
        const response = await recoveryAPI.getRecoveryHistory({ limit: 10 });
        setRecoveryHistory(response.data.items || []);
      } catch (error: any) {
        console.error('Failed to fetch recovery history:', error);
      }
    };

    fetchRecoveryHistory();
  }, []);

  // Handle real-time progress updates from WebSocket
  useEffect(() => {
    if (recoveryProgress) {
      // Update recovery session with real-time progress
      setRecoverySession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          progress: recoveryProgress.progress || prev.progress,
          status: recoveryProgress.status || prev.status,
          filesFound: recoveryProgress.filesFound || prev.filesFound
        };
      });

      // Handle completion
      if (recoveryProgress.status === 'completed') {
        setIsScanning(false);
        
        // Transform recovered files from progress data
        if (recoveryProgress.recoveredFiles) {
          const files: RecoveryFile[] = recoveryProgress.recoveredFiles.map((file: any) => ({
            id: file.id,
            name: file.name,
            type: file.type || 'other',
            size: file.size,
            path: file.path,
            dateDeleted: file.dateDeleted,
            recoveryChance: file.recoveryChance || 'medium',
            preview: file.preview,
            selected: false
          }));
          setRecoveredFiles(files);
        }
        
        toast.success(`Scan completed! Found ${recoveryProgress.filesFound || 0} recoverable files.`);
      } else if (recoveryProgress.status === 'failed') {
        setIsScanning(false);
        toast.error('Recovery scan failed. Please try again.');
      }
    }
  }, [recoveryProgress]);

  const fileTypeIcons = {
    document: DocumentIcon,
    image: PhotoIcon,
    video: VideoCameraIcon,
    audio: MusicalNoteIcon,
    other: FolderIcon
  };

  const recoveryChanceColors = {
    high: 'text-success-600 bg-success-100',
    medium: 'text-warning-600 bg-warning-100',
    low: 'text-error-600 bg-error-100'
  };

  const startScan = async () => {
    setIsScanning(true);
    try {
      // Start recovery session via API
      const response = await recoveryAPI.startRecovery({
        deviceId: 'current-device', // This would come from device selection
        scanType: 'deep',
        fileTypes: ['all']
      });
      
      const session = response.data;
      setRecoverySession(session);
      
      // Real-time updates will be handled by the WebSocket hook
      // No need for polling anymore!
      
    } catch (error: any) {
      console.error('Failed to start recovery scan:', error);
      setIsScanning(false);
      toast.error(error.message || 'Failed to start recovery scan. Please try again.');
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    const filteredFiles = getFilteredFiles();
    setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
  };

  const deselectAllFiles = () => {
    setSelectedFiles(new Set());
  };

  const recoverSelectedFiles = async () => {
    if (selectedFiles.size === 0) {
      toast.error('Please select files to recover');
      return;
    }

    if (!recoverySession) {
      toast.error('No active recovery session');
      return;
    }

    setIsRecovering(true);
    try {
      // Get the selected file IDs as an array
      const selectedFileIds = Array.from(selectedFiles);
      
      // Start the recovery process for selected files
      // Note: This would typically involve updating the recovery session
      // or calling a specific recovery endpoint for the selected files
      
      // For now, we'll use the downloadRecoveredData endpoint
      // In a real implementation, you might have a separate endpoint for partial recovery
      await recoveryAPI.downloadRecoveredData(recoverySession.id);
      
      toast.success(`Successfully recovered ${selectedFiles.size} files!`);
      
      // Remove recovered files from the list
      setRecoveredFiles(prev => prev.filter(f => !selectedFiles.has(f.id)));
      setSelectedFiles(new Set());
    } catch (error: any) {
      console.error('Failed to recover files:', error);
      toast.error(error.message || 'Failed to recover files. Please try again.');
    } finally {
      setIsRecovering(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFilteredFiles = () => {
    return recoveredFiles.filter(file => {
      const matchesType = filterType === 'all' || file.type === filterType;
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  };

  const filteredFiles = getFilteredFiles();
  const fileTypeCounts = recoveredFiles.reduce((acc, file) => {
    acc[file.type] = (acc[file.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Recovery</h1>
            <p className="text-gray-600 mt-1">
              Scan and recover deleted files from your devices
            </p>
          </div>
          
          {!recoverySession && (
            <button
              onClick={startScan}
              disabled={isScanning}
              className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              Start Deep Scan
            </button>
          )}
        </div>
      </div>

      {/* Scanning Progress */}
      {recoverySession && recoverySession.status === 'scanning' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3"></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Scanning for deleted files...</h3>
                <p className="text-gray-600">This may take several minutes depending on your storage size</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={async () => {
                  if (recoverySession) {
                    try {
                      await recoveryAPI.pauseRecovery(recoverySession.id);
                      toast.success('Recovery scan paused');
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to pause recovery');
                    }
                  }
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                Pause
              </button>
              <button
                onClick={async () => {
                  if (recoverySession) {
                    try {
                      await recoveryAPI.cancelRecovery(recoverySession.id);
                      setRecoverySession(null);
                      setRecoveredFiles([]);
                      setIsScanning(false);
                      toast.success('Recovery scan cancelled');
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to cancel recovery');
                    }
                  }
                }}
                className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress: {Math.round(recoverySession.progress)}%</span>
              <span>Files found: {recoverySession.filesFound}</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className="bg-primary-600 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${recoverySession.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {recoverySession && recoverySession.status === 'completed' && (
        <>
          {/* Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-success-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Scan completed successfully!
                  </h3>
                  <p className="text-gray-600">
                    Found {recoveredFiles.length} recoverable files
                  </p>
                </div>
              </div>
              
              <button
                onClick={startScan}
                className="flex items-center px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Scan Again
              </button>
            </div>
            
            {/* File type summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(fileTypeCounts).map(([type, count]) => {
                const Icon = fileTypeIcons[type as keyof typeof fileTypeIcons];
                return (
                  <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                    <Icon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">{type}s</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                {/* Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Types</option>
                  <option value="document">Documents</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                  <option value="audio">Audio</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={selectAllFiles}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllFiles}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                >
                  Deselect All
                </button>
                <button
                  onClick={recoverSelectedFiles}
                  disabled={selectedFiles.size === 0 || isRecovering}
                  className="flex items-center px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRecovering ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <>
                      <CloudArrowDownIcon className="h-4 w-4 mr-2" />
                      Recover ({selectedFiles.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* File List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Recoverable Files ({filteredFiles.length})
              </h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {filteredFiles.map((file) => {
                const Icon = fileTypeIcons[file.type];
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        
                        <Icon className="h-8 w-8 text-gray-600" />
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{file.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>Deleted {new Date(file.dateDeleted).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{file.path}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          recoveryChanceColors[file.recoveryChance]
                        }`}>
                          {file.recoveryChance.charAt(0).toUpperCase() + file.recoveryChance.slice(1)} chance
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {filteredFiles.length === 0 && (
                <div className="p-12 text-center">
                  <FolderIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                  <p className="text-gray-600">
                    {searchQuery || filterType !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'No recoverable files were found in the scan'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!recoverySession && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <MagnifyingGlassIcon className="h-16 w-16 mx-auto text-gray-400 mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to recover your data?
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Start a deep scan to find deleted files on your device. Our advanced recovery algorithms can restore files even after they've been permanently deleted.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="bg-primary-100 rounded-full p-3 w-12 h-12 mx-auto mb-3">
                <MagnifyingGlassIcon className="h-6 w-6 text-primary-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Deep Scan</h4>
              <p className="text-sm text-gray-600">Thoroughly scan your storage for recoverable files</p>
            </div>
            
            <div className="text-center">
              <div className="bg-success-100 rounded-full p-3 w-12 h-12 mx-auto mb-3">
                <CheckCircleIcon className="h-6 w-6 text-success-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Preview & Select</h4>
              <p className="text-sm text-gray-600">Review found files and choose what to recover</p>
            </div>
            
            <div className="text-center">
              <div className="bg-warning-100 rounded-full p-3 w-12 h-12 mx-auto mb-3">
                <CloudArrowDownIcon className="h-6 w-6 text-warning-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Restore</h4>
              <p className="text-sm text-gray-600">Safely recover your files to a secure location</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataRecovery;