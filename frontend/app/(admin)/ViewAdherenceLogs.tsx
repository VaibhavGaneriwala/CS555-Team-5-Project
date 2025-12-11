import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AdminNavbar from '@/components/AdminNavbar';
import { API_URL } from '@/utils/apiConfig';

interface AdherenceLog {
  _id: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  medication: {
    _id: string;
    name: string;
    dosage: string;
  };
  scheduledTime: string;
  takenAt?: string;
  status: 'taken' | 'missed' | 'skipped';
  createdAt: string;
}

export default function ViewAdherenceLogs() {
  const [logs, setLogs] = useState<AdherenceLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AdherenceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'taken' | 'missed' | 'skipped'>('all');
  const isFilteringRef = useRef(false);

  const applyFilters = useCallback((
    logList: AdherenceLog[],
    status: 'all' | 'taken' | 'missed' | 'skipped'
  ) => {
    if (isFilteringRef.current) return;
    isFilteringRef.current = true;

    try {
      let filtered = [...logList];

      if (status !== 'all') {
        filtered = filtered.filter((log) => log.status === status);
      }

      setFilteredLogs(filtered);
    } finally {
      setTimeout(() => {
        isFilteringRef.current = false;
      }, 100);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/adherence`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to fetch adherence logs.');
      } else {
        setLogs(data);
        setTimeout(() => {
          try {
            applyFilters(data, statusFilter);
          } catch (err) {
          }
        }, Platform.OS !== 'web' ? 100 : 0);
      }
    } catch (err) {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
      if (Platform.OS !== 'web') {
        const timeoutId = setTimeout(() => {
          try {
            applyFilters(logs, statusFilter);
          } catch (err) {
          }
        }, 150);
        return () => clearTimeout(timeoutId);
      } else {
        try {
          applyFilters(logs, statusFilter);
        } catch (err) {
        }
      }
  }, [logs, statusFilter, applyFilters]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken':
        return '#10b981';
      case 'missed':
        return '#ef4444';
      case 'skipped':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return 'checkmark-circle';
      case 'missed':
        return 'close-circle';
      case 'skipped':
        return 'remove-circle';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateForPDF = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToPDF = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token missing.');
        return;
      }

      const response = await fetch(`${API_URL}/api/adherence`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        Alert.alert('Error', data.message || 'Failed to fetch adherence logs for export.');
        return;
      }

      const allLogs: AdherenceLog[] = Array.isArray(data) ? data : [];
      
      if (allLogs.length === 0) {
        Alert.alert('No Data', 'There are no adherence logs to export.');
        return;
      }

      const sortedLogs = [...allLogs].sort((a, b) => {
        const dateA = new Date(a.scheduledTime).getTime();
        const dateB = new Date(b.scheduledTime).getTime();
        return dateB - dateA;
      });

      const logsToExport = sortedLogs;

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Adherence Logs Export - ${new Date().toLocaleDateString()}</title>
            <style>
              @page {
                size: letter;
                margin: 0.5in;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                color: #333;
                background: white;
              }
              h1 {
                color: #10b981;
                border-bottom: 3px solid #10b981;
                padding-bottom: 10px;
                margin-bottom: 20px;
              }
              .info {
                margin-bottom: 20px;
                color: #666;
                font-size: 14px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 9px;
                page-break-inside: auto;
              }
              th {
                background-color: #10b981;
                color: white;
                padding: 10px 6px;
                text-align: left;
                font-weight: bold;
                font-size: 9px;
                white-space: nowrap;
              }
              td {
                padding: 8px 6px;
                border-bottom: 1px solid #ddd;
                font-size: 8px;
                word-wrap: break-word;
                vertical-align: top;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              tr:nth-child(even) {
                background-color: #f9fafb;
              }
              .status-taken {
                color: #10b981;
                font-weight: bold;
              }
              .status-missed {
                color: #ef4444;
                font-weight: bold;
              }
              .status-skipped {
                color: #f59e0b;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <h1>Adherence Logs Report</h1>
            <div class="info">
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Total Logs:</strong> ${logsToExport.length}</p>
              <p><strong>Note:</strong> This report includes all adherence logs in the system.</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Medication</th>
                  <th>Dosage</th>
                  <th>Status</th>
                  <th>Scheduled Time</th>
                  <th>Taken At</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                ${logsToExport.map((log) => {
                  const patientName = log.patient
                    ? typeof log.patient === 'object' && log.patient.firstName
                      ? `${log.patient.firstName} ${log.patient.lastName || ''}`.trim()
                      : 'Unknown Patient'
                    : 'Unknown Patient';
                  const medicationName = log.medication?.name || 'Unknown Medication';
                  const dosage = log.medication?.dosage || 'N/A';
                  const status = log.status || 'N/A';
                  const scheduledTime = formatDateForPDF(log.scheduledTime);
                  const takenAt = log.takenAt ? formatDateForPDF(log.takenAt) : 'N/A';
                  const createdAt = formatDateForPDF(log.createdAt);
                  
                  const statusClass = `status-${status}`;
                  
                  return `
                  <tr>
                    <td>${patientName}</td>
                    <td>${medicationName}</td>
                    <td>${dosage}</td>
                    <td class="${statusClass}">${status.toUpperCase()}</td>
                    <td>${scheduledTime}</td>
                    <td>${takenAt}</td>
                    <td>${createdAt}</td>
                  </tr>
                `;
                }).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.visibility = 'hidden';
        iframe.style.opacity = '0';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(htmlContent);
          iframeDoc.close();
          
          let printTriggered = false;
          
          const triggerPrint = () => {
            if (printTriggered) return;
            printTriggered = true;
            
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
              setTimeout(() => {
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                }
              }, 1000);
            } catch (err) {
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
              Alert.alert('Error', 'Could not open print dialog. Please try again.');
            }
          };
          
          if (iframe.contentWindow) {
            if (iframeDoc.readyState === 'complete') {
              setTimeout(triggerPrint, 100);
            } else {
              iframe.onload = () => {
                setTimeout(triggerPrint, 100);
              };
              setTimeout(() => {
                if (!printTriggered && iframeDoc.readyState === 'complete') {
                  triggerPrint();
                }
              }, 1000);
            }
          }
        } else {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.focus();
              printWindow.print();
            }, 500);
          } else {
            Alert.alert(
              'Error',
              'Could not open print dialog. Please allow popups or try downloading the HTML file.',
              [
                {
                  text: 'Download HTML',
                  onPress: () => {
                    const blob = new Blob([htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `adherence-logs-export-${new Date().toISOString().split('T')[0]}.html`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  },
                },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }
        }
      } else {
        const printOptions = {
          html: htmlContent,
          width: 612,
          height: 792,
        };

        const { uri } = await Print.printToFileAsync(printOptions);
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  };

  const handleDelete = (log: AdherenceLog) => {
    const patientName = log.patient
      ? typeof log.patient === 'object' && log.patient.firstName
        ? `${log.patient.firstName} ${log.patient.lastName || ''}`.trim()
        : 'Unknown Patient'
      : 'Unknown Patient';
    const medicationName = log.medication?.name || 'Unknown Medication';

    const message = `Are you sure you want to delete this adherence log?\n\nPatient: ${patientName}\nMedication: ${medicationName}\nStatus: ${log.status}\n\nThis action cannot be undone.`;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        deleteLog(log._id);
      }
    } else {
      Alert.alert(
        'Delete Adherence Log',
        message,
        [
          { 
            text: 'Cancel', 
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteLog(log._id);
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const deleteLog = async (logId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token missing.');
        return;
      }

      const response = await fetch(`${API_URL}/api/adherence/${logId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
        Alert.alert('Error', responseData.message || 'Failed to delete log.');
      } else {
        setLogs((prevLogs) => {
          return prevLogs.filter((log) => log._id !== logId);
        });
        Alert.alert('Success', 'Adherence log deleted successfully.');
        setTimeout(() => {
          fetchLogs();
        }, 500);
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to connect to server.');
    }
  };


  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-gray-700 dark:text-gray-300">
          Loading adherence logs...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <AdminNavbar />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text className="text-red-500 text-lg font-semibold mb-3 text-center mt-4">
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchLogs}
            className="bg-blue-500 px-6 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <AdminNavbar />
      <ScrollView 
        className="flex-1 px-4 pt-6 pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-4 flex-row items-center"
            activeOpacity={0.7}
          >
            <View className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-md border border-gray-200 dark:border-gray-700">
              <Ionicons name="arrow-back" size={20} color="#10b981" />
            </View>
            <Text className="text-gray-700 dark:text-gray-300 font-semibold ml-2">
              Back
            </Text>
          </TouchableOpacity>

          {/* Header */}
          <View
            className="mb-6 rounded-3xl p-6 shadow-2xl"
            style={{ backgroundColor: '#10b981' }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-3xl font-bold text-white mb-2">
                  Adherence Logs
                </Text>
                <Text className="text-green-100 text-base">
                  {filteredLogs.length} of {logs.length} log{logs.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={exportToPDF}
                  className="bg-white/20 px-4 py-2 rounded-xl flex-row items-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text className="text-white font-semibold ml-2 text-sm">Export PDF</Text>
                </TouchableOpacity>
                <View className="bg-white/20 rounded-full p-4 backdrop-blur">
                  <Ionicons name="checkmark-circle" size={32} color="#fff" />
                </View>
              </View>
            </View>
          </View>

          {/* Filters */}
          <View className="mb-6 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center mb-4">
              <View className="h-1 w-8 bg-green-500 rounded-full mr-2" />
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                Filters
              </Text>
            </View>

            {/* Status Filter */}
            <View className="flex-row gap-2">
              {(['all', 'taken', 'missed', 'skipped'] as const).map((status) => {
                const handleFilterPress = () => {
                  try {
                    if (Platform.OS !== 'web') {
                      setTimeout(() => {
                        try {
                          setStatusFilter(status);
                        } catch (err) {
                        }
                      }, 200);
                    } else {
                      setStatusFilter(status);
                    }
                  } catch (err) {
                  }
                };

                return (
                  <TouchableOpacity
                    key={status}
                  onPress={handleFilterPress}
                  className={`px-3 py-2 rounded-xl ${
                    statusFilter === status
                      ? status === 'all'
                        ? 'bg-green-500'
                        : status === 'taken'
                        ? 'bg-green-500'
                        : status === 'missed'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                        : 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-semibold text-xs ${
                      statusFilter === status
                        ? 'text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {filteredLogs.length === 0 ? (
            <View className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 items-center">
              <Ionicons name="document-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 text-lg font-semibold mt-4">
                No adherence logs found
              </Text>
            </View>
          ) : (
            <View>
              {filteredLogs.map((item) => {
                const statusColor = getStatusColor(item.status);
                const statusIcon = getStatusIcon(item.status);

                const patientName = item.patient
                  ? (typeof item.patient === 'object' && item.patient.firstName
                      ? `${item.patient.firstName} ${item.patient.lastName || ''}`.trim()
                      : 'Unknown Patient')
                  : 'Unknown Patient';
                
                const patientEmail = item.patient
                  ? (typeof item.patient === 'object' && item.patient.email
                      ? item.patient.email
                      : '')
                  : '';

                return (
                  <View 
                    key={item._id} 
                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4 shadow-lg border border-gray-100 dark:border-gray-700"
                    style={{ position: 'relative' }}
                  >
                    <View className="mb-3">
                      <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        TAKEN BY
                      </Text>
                      <Text className="text-lg font-bold text-gray-900 dark:text-white">
                        {patientName}
                      </Text>
                      {patientEmail ? (
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          {patientEmail}
                        </Text>
                      ) : null}
                    </View>

                    <View className="flex-row items-center flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                      <View className="flex-row items-center">
                        <Ionicons name="medical-outline" size={16} color="#6b7280" />
                        <Text className="text-sm text-gray-900 dark:text-white font-semibold ml-1">
                          {item.medication?.name || 'Unknown'}
                        </Text>
                      </View>
                      
                      <View className="flex-row items-center">
                        <Ionicons name="flask-outline" size={16} color="#6b7280" />
                        <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                          {item.medication?.dosage || 'N/A'}
                        </Text>
                      </View>

                      <View
                        className="px-2 py-1 rounded-full flex-row items-center"
                        style={{ backgroundColor: `${statusColor}20` }}
                      >
                        <Ionicons
                          name={statusIcon as any}
                          size={14}
                          color={statusColor}
                        />
                        <Text
                          className="ml-1 text-xs font-bold uppercase"
                          style={{ color: statusColor }}
                        >
                          {item.status}
                        </Text>
                      </View>

                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={16} color="#6b7280" />
                        <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                          Scheduled: {formatDate(item.scheduledTime)}
                        </Text>
                      </View>

                      {item.takenAt && (
                        <View className="flex-row items-center">
                          <Ionicons name="checkmark-outline" size={16} color="#6b7280" />
                          <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                            Taken at: {formatDate(item.takenAt)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View 
                      className="mt-3 flex-row justify-end"
                      style={{ 
                        position: 'relative',
                        zIndex: 1000,
                        elevation: 10
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          handleDelete(item);
                        }}
                        className="bg-red-600 px-4 py-2.5 rounded-lg shadow-lg flex-row items-center justify-center"
                        activeOpacity={0.6}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        style={{ 
                          zIndex: 1001, 
                          elevation: 11,
                          minWidth: 80,
                          minHeight: 36,
                          position: 'relative'
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#fff" />
                        <Text className="text-white font-bold ml-1.5 text-sm">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
      </ScrollView>
    </View>
  );
}
