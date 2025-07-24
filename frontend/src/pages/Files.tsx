import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FolderIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  ChevronRightIcon,
  HomeIcon,
  CloudArrowUpIcon,
  EyeIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  StarIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  fileType?: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';
  size?: number;
  modifiedAt: string;
  createdAt: string;
  path: string;
  deviceId: string;
  deviceName: string;
  isShared: boolean;
  isFavorite: boolean;
  thumbnail?: string;
  mimeType?: string;
  children?: FileItem[];
}

interface Device {
  id: string;
  name: string;
  type: 'phone' | 'tablet' | 'computer';
  isConnected: boolean;
}

const Files: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>(['']);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFileMenu, setShowFileMenu] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  const fileTypeIcons = {
    folder: FolderIcon,
    document: DocumentIcon,
    image: PhotoIcon,
    video: VideoCameraIcon,
    audio: MusicalNoteIcon,
    archive: ArchiveBoxIcon,
    other: DocumentIcon
  };

  const deviceTypeIcons = {
    phone: DevicePhoneMobileIcon,
    tablet: DevicePhoneMobileIcon,
    computer: ComputerDesktopIcon
  };

  useEffect(() => {
    // Mock devices
    const mockDevices: Device[] = [
      { id: 'device-1', name: 'iPhone 14 Pro', type: 'phone', isConnected: true },
      { id: 'device-2', name: 'MacBook Pro', type: 'computer', isConnected: true },
      { id: 'device-3', name: 'iPad Air', type: 'tablet', isConnected: false }
    ];
    setDevices(mockDevices);

    // Mock files
    const mockFiles: FileItem[] = [
      {
        id: 'folder-1',
        name: 'Documents',
        type: 'folder',
        modifiedAt: new Date(Date.now() - 86400000).toISOString(),
        createdAt: new Date(Date.now() - 2592000000).toISOString(),
        path: '/Documents',
        deviceId: 'device-1',
        deviceName: 'iPhone 14 Pro',
        isShared: false,
        isFavorite: true,
        children: [
          {
            id: 'file-1',
            name: 'Resume.pdf',
            type: 'file',
            fileType: 'document',
            size: 2048576,
            modifiedAt: new Date(Date.now() - 3600000).toISOString(),
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            path: '/Documents/Resume.pdf',
            deviceId: 'device-1',
            deviceName: 'iPhone 14 Pro',
            isShared: true,
            isFavorite: false,
            mimeType: 'application/pdf'
          },
          {
            id: 'file-2',
            name: 'Project Proposal.docx',
            type: 'file',
            fileType: 'document',
            size: 1536000,
            modifiedAt: new Date(Date.now() - 7200000).toISOString(),
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            path: '/Documents/Project Proposal.docx',
            deviceId: 'device-1',
            deviceName: 'iPhone 14 Pro',
            isShared: false,
            isFavorite: true,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          }
        ]
      },
      {
        id: 'folder-2',
        name: 'Photos',
        type: 'folder',
        modifiedAt: new Date(Date.now() - 43200000).toISOString(),
        createdAt: new Date(Date.now() - 5184000000).toISOString(),
        path: '/Photos',
        deviceId: 'device-1',
        deviceName: 'iPhone 14 Pro',
        isShared: true,
        isFavorite: false,
        children: [
          {
            id: 'file-3',
            name: 'vacation-2023.jpg',
            type: 'file',
            fileType: 'image',
            size: 4194304,
            modifiedAt: new Date(Date.now() - 43200000).toISOString(),
            createdAt: new Date(Date.now() - 43200000).toISOString(),
            path: '/Photos/vacation-2023.jpg',
            deviceId: 'device-1',
            deviceName: 'iPhone 14 Pro',
            isShared: false,
            isFavorite: true,
            mimeType: 'image/jpeg',
            thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=150&h=150&fit=crop'
          },
          {
            id: 'file-4',
            name: 'family-dinner.mp4',
            type: 'file',
            fileType: 'video',
            size: 52428800,
            modifiedAt: new Date(Date.now() - 86400000).toISOString(),
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            path: '/Photos/family-dinner.mp4',
            deviceId: 'device-1',
            deviceName: 'iPhone 14 Pro',
            isShared: false,
            isFavorite: false,
            mimeType: 'video/mp4'
          }
        ]
      },
      {
        id: 'file-5',
        name: 'presentation.pptx',
        type: 'file',
        fileType: 'document',
        size: 8388608,
        modifiedAt: new Date(Date.now() - 1800000).toISOString(),
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        path: '/presentation.pptx',
        deviceId: 'device-2',
        deviceName: 'MacBook Pro',
        isShared: true,
        isFavorite: false,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      },
      {
        id: 'file-6',
        name: 'music-collection.zip',
        type: 'file',
        fileType: 'archive',
        size: 104857600,
        modifiedAt: new Date(Date.now() - 604800000).toISOString(),
        createdAt: new Date(Date.now() - 1209600000).toISOString(),
        path: '/music-collection.zip',
        deviceId: 'device-2',
        deviceName: 'MacBook Pro',
        isShared: false,
        isFavorite: true,
        mimeType: 'application/zip'
      }
    ];
    setFiles(mockFiles);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getCurrentFiles = () => {
    if (currentPath.length === 1 && currentPath[0] === '') {
      return files;
    }
    
    let current = files;
    for (let i = 1; i < currentPath.length; i++) {
      const folder = current.find(f => f.name === currentPath[i] && f.type === 'folder');
      if (folder && folder.children) {
        current = folder.children;
      }
    }
    return current;
  };

  const getFilteredFiles = () => {
    let filtered = getCurrentFiles();

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(file => 
        file.type === 'folder' || file.fileType === filterType
      );
    }

    // Apply device filter
    if (filterDevice !== 'all') {
      filtered = filtered.filter(file => file.deviceId === filterDevice);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      // Folders first
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const navigateToFolder = (folderName: string) => {
    setCurrentPath([...currentPath, folderName]);
  };

  const navigateToPath = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const toggleFavorite = async (fileId: string) => {
    try {
      setFiles(prev => prev.map(file => {
        if (file.id === fileId) {
          return { ...file, isFavorite: !file.isFavorite };
        }
        if (file.children) {
          return {
            ...file,
            children: file.children.map(child => 
              child.id === fileId ? { ...child, isFavorite: !child.isFavorite } : child
            )
          };
        }
        return file;
      }));
      toast.success('File updated');
    } catch (error) {
      toast.error('Failed to update file');
    }
  };

  const downloadFile = async (fileId: string) => {
    try {
      setLoading(true);
      // Simulate download
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download file');
    } finally {
      setLoading(false);
    }
  };

  const shareFile = async (fileId: string) => {
    try {
      // Simulate sharing
      await navigator.clipboard.writeText(`https://syncsphere.com/shared/${fileId}`);
      toast.success('Share link copied to clipboard');
    } catch (error) {
      toast.error('Failed to share file');
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      setFiles(prev => prev.filter(file => file.id !== fileId));
      toast.success('File deleted');
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const filteredFiles = getFilteredFiles();
  const totalFiles = files.reduce((count, file) => {
    if (file.type === 'file') count++;
    if (file.children) {
      count += file.children.filter(child => child.type === 'file').length;
    }
    return count;
  }, 0);
  const totalSize = files.reduce((size, file) => {
    if (file.size) size += file.size;
    if (file.children) {
      size += file.children.reduce((childSize, child) => childSize + (child.size || 0), 0);
    }
    return size;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Files</h1>
            <p className="text-gray-600 mt-1">
              Browse and manage files across all your devices
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded transition-colors"
            >
              {viewMode === 'grid' ? <ListBulletIcon className="h-5 w-5" /> : <Squares2X2Icon className="h-5 w-5" />}
            </button>
            
            <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              Upload
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <DocumentIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Files</p>
              <p className="text-2xl font-bold text-gray-900">{totalFiles}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <FolderIcon className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Folders</p>
              <p className="text-2xl font-bold text-gray-900">{files.filter(f => f.type === 'folder').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <ArchiveBoxIcon className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Size</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-error-100 rounded-lg">
              <StarIcon className="h-6 w-6 text-error-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Favorites</p>
              <p className="text-2xl font-bold text-gray-900">
                {files.filter(f => f.isFavorite).length + 
                 files.reduce((count, f) => count + (f.children?.filter(c => c.isFavorite).length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <nav className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => navigateToPath(0)}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <HomeIcon className="h-4 w-4 mr-1" />
            Home
          </button>
          
          {currentPath.slice(1).map((path, index) => (
            <React.Fragment key={index}>
              <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              <button
                onClick={() => navigateToPath(index + 1)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                {path}
              </button>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
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
            
            {/* Type Filter */}
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
              <option value="archive">Archives</option>
            </select>
            
            {/* Device Filter */}
            <select
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Devices</option>
              {devices.map(device => (
                <option key={device.id} value={device.id}>{device.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-');
                setSortBy(by as 'name' | 'date' | 'size');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="size-desc">Largest First</option>
              <option value="size-asc">Smallest First</option>
            </select>
            
            <div className="text-sm text-gray-600">
              {filteredFiles.length} items
            </div>
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {viewMode === 'list' ? (
          <div className="divide-y divide-gray-200">
            {filteredFiles.map((file) => {
              const Icon = fileTypeIcons[file.type === 'folder' ? 'folder' : file.fileType || 'other'];
              const DeviceIcon = deviceTypeIcons[devices.find(d => d.id === file.deviceId)?.type || 'computer'];
              
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      
                      <div className="flex items-center space-x-3">
                        {file.thumbnail ? (
                          <img
                            src={file.thumbnail}
                            alt={file.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <Icon className="h-10 w-10 text-gray-600" />
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => file.type === 'folder' ? navigateToFolder(file.name) : null}
                              className={`font-medium text-gray-900 hover:text-primary-600 transition-colors ${
                                file.type === 'folder' ? 'cursor-pointer' : 'cursor-default'
                              }`}
                            >
                              {file.name}
                            </button>
                            
                            {file.isFavorite && (
                              <StarIcon className="h-4 w-4 text-warning-500" />
                            )}
                            
                            {file.isShared && (
                              <ShareIcon className="h-4 w-4 text-primary-500" />
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center">
                              <DeviceIcon className="h-4 w-4 mr-1" />
                              {file.deviceName}
                            </span>
                            
                            {file.size && (
                              <span>{formatFileSize(file.size)}</span>
                            )}
                            
                            <span className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              {formatDate(file.modifiedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleFavorite(file.id)}
                        className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                          file.isFavorite ? 'text-warning-500' : 'text-gray-400'
                        }`}
                      >
                        <StarIcon className="h-4 w-4" />
                      </button>
                      
                      {file.type === 'file' && (
                        <button
                          onClick={() => downloadFile(file.id)}
                          disabled={loading}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                      )}
                      
                      <div className="relative">
                        <button
                          onClick={() => setShowFileMenu(showFileMenu === file.id ? null : file.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                        >
                          <EllipsisVerticalIcon className="h-4 w-4" />
                        </button>
                        
                        {showFileMenu === file.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  // Preview file
                                  setShowFileMenu(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <EyeIcon className="h-4 w-4 mr-3" />
                                Preview
                              </button>
                              
                              <button
                                onClick={() => {
                                  shareFile(file.id);
                                  setShowFileMenu(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <ShareIcon className="h-4 w-4 mr-3" />
                                Share
                              </button>
                              
                              <button
                                onClick={() => {
                                  // Rename file
                                  setShowFileMenu(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <PencilIcon className="h-4 w-4 mr-3" />
                                Rename
                              </button>
                              
                              <button
                                onClick={() => {
                                  // Duplicate file
                                  setShowFileMenu(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <DocumentDuplicateIcon className="h-4 w-4 mr-3" />
                                Duplicate
                              </button>
                              
                              <button
                                onClick={() => {
                                  deleteFile(file.id);
                                  setShowFileMenu(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-error-600 hover:bg-error-50"
                              >
                                <TrashIcon className="h-4 w-4 mr-3" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {filteredFiles.length === 0 && (
              <div className="p-12 text-center">
                <DocumentIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                <p className="text-gray-600">
                  {searchQuery || filterType !== 'all' || filterDevice !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Upload your first file to get started'
                  }
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredFiles.map((file) => {
                const Icon = fileTypeIcons[file.type === 'folder' ? 'folder' : file.fileType || 'other'];
                
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative group"
                  >
                    <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="flex flex-col items-center">
                        {file.thumbnail ? (
                          <img
                            src={file.thumbnail}
                            alt={file.name}
                            className="w-16 h-16 rounded object-cover mb-2"
                          />
                        ) : (
                          <Icon className="h-16 w-16 text-gray-600 mb-2" />
                        )}
                        
                        <p className="text-sm font-medium text-gray-900 text-center truncate w-full">
                          {file.name}
                        </p>
                        
                        {file.size && (
                          <p className="text-xs text-gray-600 mt-1">
                            {formatFileSize(file.size)}
                          </p>
                        )}
                      </div>
                      
                      {/* Overlay actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(file.id);
                          }}
                          className={`p-1 rounded hover:bg-white transition-colors ${
                            file.isFavorite ? 'text-warning-500' : 'text-gray-400'
                          }`}
                        >
                          <StarIcon className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Selection checkbox */}
                      <div className="absolute top-2 left-2">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {filteredFiles.length === 0 && (
              <div className="text-center py-12">
                <DocumentIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                <p className="text-gray-600">
                  {searchQuery || filterType !== 'all' || filterDevice !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Upload your first file to get started'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Files;