import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  RefreshControl,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AdminNavbar from '@/components/AdminNavbar';
import { API_URL } from '@/utils/apiConfig';

const FREQUENCY_OPTIONS = [
  { value: "once-daily", label: "Once daily" },
  { value: "twice-daily", label: "Twice daily" },
  { value: "three-times-daily", label: "3x daily" },
  { value: "four-times-daily", label: "4x daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as-needed", label: "As needed" },
  { value: "custom", label: "Custom" },
];

interface ScheduleEntry {
  time: string;
  days?: string[];
}

interface Medication {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  schedule: ScheduleEntry[];
  startDate: string;
  endDate?: string;
  instructions?: string;
  patient?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  prescribedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ViewMedications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDosage, setEditDosage] = useState("");
  const [editFrequency, setEditFrequency] = useState<string>("once-daily");
  const [editScheduleText, setEditScheduleText] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDateValue, setStartDateValue] = useState<Date>(new Date());
  const [endDateValue, setEndDateValue] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchMedications = async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setError("Authentication token missing.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Admin can fetch all medications without patientId
      const res = await fetch(`${API_URL}/api/medications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to fetch medications");
      } else {
        setMedications(data || []);
      }
    } catch (err) {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedications();
  };

  const deleteMedication = async (id: string) => {
    const message = "Are you sure you want to delete this medication? This action cannot be undone.";

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (!confirmed) return;
    } else {
      Alert.alert(
        "Confirm Delete",
        message,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await performDelete(id);
            },
          },
        ]
      );
      return;
    }

    await performDelete(id);
  };

  const performDelete = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/medications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        if (Platform.OS === 'web') {
          window.alert(data.message || "Failed to delete medication");
        } else {
          Alert.alert("Error", data.message || "Failed to delete medication");
        }
        return;
      }

      if (Platform.OS === 'web') {
        window.alert("Medication deleted successfully");
      } else {
        Alert.alert("Success", "Medication deleted successfully");
      }
      fetchMedications();
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert("Server error. Try again.");
      } else {
        Alert.alert("Error", "Server error. Try again.");
      }
    }
  };

  const formatSchedule = (schedule: ScheduleEntry[] | undefined) => {
    if (!schedule || schedule.length === 0) return "No schedule set";

    return schedule
      .map((entry) => {
        const time = entry.time;
        const days = entry.days && entry.days.length
          ? ` (${entry.days.join(", ")})`
          : "";
        return `${time}${days}`;
      })
      .join(", ");
  };

  const handleEditMedication = (medication: Medication) => {
    setSelectedMedication(medication);
    setEditName(medication.name);
    setEditDosage(medication.dosage);
    setEditFrequency(medication.frequency || 'once-daily');
    const schedule = medication.schedule || [];
    const times = schedule.map((s) => s.time).join(', ');
    setEditScheduleText(times);
    const startDate = medication.startDate ? new Date(medication.startDate) : new Date();
    const endDate = medication.endDate ? new Date(medication.endDate) : null;
    setStartDateValue(startDate);
    setEndDateValue(endDate);
    setEditStartDate(medication.startDate?.slice(0, 10) || '');
    setEditEndDate(medication.endDate?.slice(0, 10) || '');
    setEditInstructions(medication.instructions || '');
    setEditSuccessMessage(null);
    setValidationErrors({});
    setSaveError(null);
    setEditModalVisible(true);
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
      if (selectedDate) {
        setStartDateValue(selectedDate);
        setEditStartDate(selectedDate.toISOString().slice(0, 10));
      }
    } else {
      // iOS - update the value but keep picker open until Done is pressed
      if (selectedDate) {
        setStartDateValue(selectedDate);
      }
    }
  };

  const handleStartDateConfirm = () => {
    setShowStartDatePicker(false);
    setEditStartDate(startDateValue.toISOString().slice(0, 10));
    if (validationErrors.startDate) {
      setValidationErrors({ ...validationErrors, startDate: '' });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
      if (selectedDate) {
        setEndDateValue(selectedDate);
        setEditEndDate(selectedDate.toISOString().slice(0, 10));
      } else if (event.type === 'dismissed') {
        setEndDateValue(null);
        setEditEndDate('');
      }
    } else {
      // iOS - update the value but keep picker open until Done is pressed
      if (selectedDate) {
        setEndDateValue(selectedDate);
      }
    }
  };

  const handleEndDateConfirm = () => {
    setShowEndDatePicker(false);
    if (endDateValue) {
      setEditEndDate(endDateValue.toISOString().slice(0, 10));
    } else {
      setEditEndDate('');
    }
    if (validationErrors.endDate) {
      setValidationErrors({ ...validationErrors, endDate: '' });
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedMedication) return;

    // Clear previous errors
    setValidationErrors({});
    setSaveError(null);
    setEditSuccessMessage(null);

    const errors: Record<string, string> = {};

    // Validate required fields (only name, dosage, and startDate)
    if (!editName || editName.trim() === '') {
      errors.name = 'Medication name is required';
    }

    if (!editDosage || editDosage.trim() === '') {
      errors.dosage = 'Dosage is required';
    }

    if (!editStartDate || editStartDate.trim() === '') {
      errors.startDate = 'Start date is required';
    }

    // Validate schedule format if provided (optional)
    if (editScheduleText && editScheduleText.trim() !== '') {
      const times = editScheduleText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (times.length > 0) {
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        const invalidTimes = times.filter(time => !timeRegex.test(time));
        if (invalidTimes.length > 0) {
          errors.schedule = `Invalid time format. Use HH:MM (e.g., 08:00, 20:30)`;
        }
      }
    }

    // Validate date range if end date is provided
    if (editEndDate && editEndDate.trim() !== '') {
      const start = new Date(editStartDate);
      const end = new Date(editEndDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        errors.endDate = 'Invalid date format';
      } else if (start > end) {
        errors.endDate = 'End date cannot be earlier than start date';
      }
    }

    // If there are validation errors, show them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      if (Platform.OS !== 'web') {
        Alert.alert('Validation Error', 'Please fix the errors in the form.');
      }
      return;
    }

    // Build schedule payload only if schedule text is provided
    let schedulePayload: Array<{ time: string; days: string[] }> = [];
    if (editScheduleText && editScheduleText.trim() !== '') {
      const times = editScheduleText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      schedulePayload = times.map((time) => ({
        time,
        days: [],
      }));
    }

    setEditSaving(true);

    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/medications/${selectedMedication._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          dosage: editDosage,
          startDate: editStartDate,
          ...(editFrequency && { frequency: editFrequency }),
          ...(schedulePayload.length > 0 && { schedule: schedulePayload }),
          ...(editEndDate && editEndDate.trim() !== '' && { endDate: editEndDate }),
          ...(editInstructions && editInstructions.trim() !== '' && { instructions: editInstructions }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || 'Failed to update medication';
        setSaveError(errorMessage);
        if (Platform.OS !== 'web') {
          Alert.alert('Error', errorMessage);
        }
        return;
      }

      // Success
      if (Platform.OS === 'web') {
        setEditSuccessMessage('✅ Medication updated successfully!');
        setTimeout(() => {
          setEditSuccessMessage(null);
          setValidationErrors({});
          setSaveError(null);
          setEditModalVisible(false);
          fetchMedications();
        }, 1500);
      } else {
        Alert.alert('Success', 'Medication updated successfully!');
        setValidationErrors({});
        setSaveError(null);
        setEditModalVisible(false);
        fetchMedications();
      }
    } catch (err) {
      const errorMessage = 'Could not connect to server. Please check your connection and try again.';
      setSaveError(errorMessage);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setEditSaving(false);
    }
  };

  const exportToPDF = async () => {
    try {
      // Fetch ALL medications from the database (not just filtered ones)
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert('Error', 'Authentication token missing.');
        return;
      }

      const response = await fetch(`${API_URL}/api/medications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        Alert.alert('Error', data.message || 'Failed to fetch medications for export.');
        return;
      }

      // Get all medications from the response
      const allMedications: Medication[] = Array.isArray(data) ? data : [];
      
      if (allMedications.length === 0) {
        Alert.alert('No Data', 'There are no medications to export.');
        return;
      }

      // Sort medications alphabetically by name
      const sortedMedications = [...allMedications].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      const medicationsToExport = sortedMedications;

      // Generate standalone HTML document for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Medications Export - ${new Date().toLocaleDateString()}</title>
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
                color: #059669;
                border-bottom: 3px solid #059669;
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
                font-size: 10px;
                page-break-inside: auto;
              }
              th {
                background-color: #059669;
                color: white;
                padding: 10px 6px;
                text-align: left;
                font-weight: bold;
                font-size: 10px;
                white-space: nowrap;
              }
              td {
                padding: 8px 6px;
                border-bottom: 1px solid #ddd;
                font-size: 9px;
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
            </style>
          </head>
          <body>
            <h1>Medications Report</h1>
            <div class="info">
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Total Medications:</strong> ${medicationsToExport.length}</p>
              <p><strong>Note:</strong> This report includes all medications in the system.</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Medication Name</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Schedule</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Instructions</th>
                  <th>Prescribed By</th>
                </tr>
              </thead>
              <tbody>
                ${medicationsToExport.map((med) => {
                  const schedule = formatSchedule(med.schedule);
                  const startDate = med.startDate ? new Date(med.startDate).toLocaleDateString() : 'N/A';
                  const endDate = med.endDate ? new Date(med.endDate).toLocaleDateString() : 'No end date';
                  const prescribedBy = med.prescribedBy 
                    ? `${med.prescribedBy.firstName} ${med.prescribedBy.lastName}`
                    : 'N/A';
                  
                  return `
                  <tr>
                    <td>${med.name}</td>
                    <td>${med.dosage}</td>
                    <td>${med.frequency}</td>
                    <td>${schedule}</td>
                    <td>${startDate}</td>
                    <td>${endDate}</td>
                    <td>${med.instructions || 'N/A'}</td>
                    <td>${prescribedBy}</td>
                  </tr>
                `;
                }).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Generate PDF based on platform
      if (Platform.OS === 'web') {
        // For web, use hidden iframe to trigger print dialog (like macOS) without showing new window
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
          
          // Flag to ensure print dialog only opens once
          let printTriggered = false;
          
          // Wait for content to load, then trigger print dialog (only once)
          const triggerPrint = () => {
            if (printTriggered) return; // Prevent duplicate calls
            printTriggered = true;
            
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
              // The print dialog will appear, and user can choose "Save as PDF" (like macOS)
              // Clean up iframe after a delay
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
          
          // Wait for iframe to load - use only one method to prevent duplicates
          if (iframe.contentWindow) {
            // Use onload if available, otherwise use timeout
            if (iframeDoc.readyState === 'complete') {
              // Already loaded, trigger immediately
              setTimeout(triggerPrint, 100);
            } else {
              // Wait for load event
              iframe.onload = () => {
                setTimeout(triggerPrint, 100);
              };
              // Fallback timeout (only if onload doesn't fire)
              setTimeout(() => {
                if (!printTriggered && iframeDoc.readyState === 'complete') {
                  triggerPrint();
                }
              }, 1000);
            }
          }
        } else {
          // Fallback: try window.open if iframe fails
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
                    link.download = `medications-export-${new Date().toISOString().split('T')[0]}.html`;
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
        // For mobile, use expo-print
        const printOptions = {
          html: htmlContent,
          width: 612, // US Letter width in points (8.5 inches)
          height: 792, // US Letter height in points (11 inches)
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

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <AdminNavbar />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-gray-700 dark:text-gray-300">
            Loading medications...
          </Text>
        </View>
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
            onPress={fetchMedications}
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
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-4 pt-6 pb-8">
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-4 flex-row items-center"
            activeOpacity={0.7}
          >
            <View className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-md border border-gray-200 dark:border-gray-700">
              <Ionicons name="arrow-back" size={20} color="#059669" />
            </View>
            <Text className="text-gray-700 dark:text-gray-300 font-semibold ml-2">
              Back
            </Text>
          </TouchableOpacity>

          {/* Header */}
          <View
            className="mb-6 rounded-3xl p-6 shadow-2xl"
            style={{ backgroundColor: '#059669' }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-3xl font-bold text-white mb-2">
                  All Medications
                </Text>
                <Text className="text-green-100 text-base">
                  {medications.length} medication{medications.length !== 1 ? 's' : ''} total
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
                  <Ionicons name="medical" size={32} color="#fff" />
                </View>
              </View>
            </View>
          </View>

          {/* Medications List */}
          {medications.length === 0 ? (
            <View className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 items-center">
              <Ionicons name="medical-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 text-lg font-semibold mt-4">
                No medications found
              </Text>
            </View>
          ) : (
            medications.map((med) => (
              <View
                key={med._id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4 shadow-lg border border-gray-100 dark:border-gray-700"
              >
                {/* Medication Name - Header */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    MEDICATION
                  </Text>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">
                    {med.name}
                  </Text>
                </View>

                {/* Patient Information */}
                {med.patient && (
                  <View className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      PATIENT
                    </Text>
                    <View className="flex-row items-center">
                      <Ionicons name="person-circle-outline" size={18} color="#059669" />
                      <Text className="text-sm font-semibold text-gray-900 dark:text-white ml-2">
                        {med.patient.firstName} {med.patient.lastName}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        ({med.patient.email})
                      </Text>
                    </View>
                  </View>
                )}

                {/* Dosage, Schedule, Dates, Prescribed By - Same Line */}
                <View className="flex-row items-center flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                  <View className="flex-row items-center">
                    <Ionicons name="flask-outline" size={16} color="#6b7280" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                      {med.dosage}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                      {formatSchedule(med.schedule)}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                      Start: {new Date(med.startDate).toLocaleDateString()}
                    </Text>
                  </View>

                  {med.endDate ? (
                    <View className="flex-row items-center">
                      <Ionicons name="calendar" size={16} color="#6b7280" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                        End: {new Date(med.endDate).toLocaleDateString()}
                      </Text>
                    </View>
                  ) : null}

                  {med.prescribedBy && (
                    <View className="flex-row items-center">
                      <Ionicons name="medical-outline" size={16} color="#6b7280" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                        Prescribed by: {med.prescribedBy.firstName} {med.prescribedBy.lastName}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Instructions - Separate if exists */}
                {med.instructions && (
                  <View className="mt-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <View className="flex-row items-start">
                      <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1 flex-1">
                        {med.instructions}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Edit and Delete Buttons - Separate Row */}
                <View className="mt-3 flex-row justify-end gap-2">
                  <TouchableOpacity
                    onPress={() => handleEditMedication(med)}
                    className="bg-blue-500 px-3 py-1.5 rounded-lg shadow-md flex-row items-center justify-center"
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ zIndex: 10 }}
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text className="text-white font-semibold ml-1 text-xs">Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteMedication(med._id)}
                    className="bg-red-600 px-3 py-1.5 rounded-lg shadow-md flex-row items-center justify-center"
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ zIndex: 10 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text className="text-white font-semibold ml-1 text-xs">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Edit Medication Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        {Platform.OS === 'web' ? (
          <View className="flex-1 justify-center items-center bg-black/60">
            <Pressable 
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}
              onPress={() => setEditModalVisible(false)}
            />
            <View 
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl" 
              style={{ 
                maxHeight: '90%',
                maxWidth: 800,
                width: '90%'
              }}
              onStartShouldSetResponder={() => true}
            >
              <View className="flex-row justify-between items-center mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
                <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                  Edit Medication
                </Text>
                <TouchableOpacity 
                  onPress={() => setEditModalVisible(false)}
                  className="bg-gray-100 dark:bg-gray-700 rounded-full p-2"
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Error Banner */}
              {saveError && (
                <View className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <View className="flex-row items-start">
                    <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                    <Text className="text-red-700 dark:text-red-400 flex-1 text-sm font-medium">
                      {saveError}
                    </Text>
                    <TouchableOpacity onPress={() => setSaveError(null)}>
                      <Ionicons name="close" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Validation Errors Banner */}
              {Object.keys(validationErrors).length > 0 && (
                <View className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <View className="flex-row items-start">
                    <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                    <View className="flex-1">
                      <Text className="text-red-700 dark:text-red-400 text-sm font-semibold mb-1">
                        Please fix the following errors:
                      </Text>
                      {Object.entries(validationErrors).map(([field, message]) => (
                        <Text key={field} className="text-red-600 dark:text-red-400 text-sm">
                          • {message}
                        </Text>
                      ))}
                    </View>
                    <TouchableOpacity onPress={() => setValidationErrors({})}>
                      <Ionicons name="close" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {editSuccessMessage && (
                <View className={`mb-4 p-3 rounded-xl ${
                  editSuccessMessage.includes('✅') 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  <Text className={`text-center font-semibold ${
                    editSuccessMessage.includes('✅')
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}>
                    {editSuccessMessage}
                  </Text>
                </View>
              )}

              <ScrollView className="flex-1" style={{ maxHeight: 600 }}>
                <View className="bg-gray-50 dark:bg-gray-700 p-5 rounded-2xl">
                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mb-2">
                    Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={editName}
                    onChangeText={(text) => {
                      setEditName(text);
                      if (validationErrors.name) {
                        setValidationErrors({ ...validationErrors, name: '' });
                      }
                    }}
                    className={`bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 ${
                      validationErrors.name 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-200 dark:border-gray-500'
                    }`}
                    style={{ fontSize: 16 }}
                  />
                  {validationErrors.name && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">
                      {validationErrors.name}
                    </Text>
                  )}

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">
                    Dosage <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={editDosage}
                    onChangeText={setEditDosage}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">
                    Frequency (tap to select)
                  </Text>
                  <View className="flex-row flex-wrap mt-1">
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setEditFrequency(opt.value)}
                        className={`px-3 py-2 mr-2 mb-2 rounded-full border ${
                          editFrequency === opt.value
                            ? 'bg-blue-600 border-blue-700'
                            : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            editFrequency === opt.value
                              ? 'text-white'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">
                    Schedule (comma-separated times)
                  </Text>
                  <TextInput
                    value={editScheduleText}
                    onChangeText={setEditScheduleText}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                    placeholder="e.g., 08:00, 20:00"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">
                    Start Date <Text className="text-red-500">*</Text>
                  </Text>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => {
                      setEditStartDate(e.target.value);
                      if (e.target.value) {
                        setStartDateValue(new Date(e.target.value));
                      }
                      if (validationErrors.startDate) {
                        setValidationErrors({ ...validationErrors, startDate: '' });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: validationErrors.startDate 
                        ? '2px solid #ef4444' 
                        : '2px solid #e5e7eb',
                      fontSize: '16px',
                      backgroundColor: '#fff',
                      color: '#111827',
                    }}
                    className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  />
                  {validationErrors.startDate && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">
                      {validationErrors.startDate}
                    </Text>
                  )}

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">End Date</Text>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => {
                      setEditEndDate(e.target.value);
                      if (e.target.value) {
                        setEndDateValue(new Date(e.target.value));
                      } else {
                        setEndDateValue(null);
                      }
                      if (validationErrors.endDate) {
                        setValidationErrors({ ...validationErrors, endDate: '' });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: validationErrors.endDate 
                        ? '2px solid #ef4444' 
                        : '2px solid #e5e7eb',
                      fontSize: '16px',
                      backgroundColor: '#fff',
                      color: '#111827',
                    }}
                    className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  />
                  {validationErrors.endDate && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">
                      {validationErrors.endDate}
                    </Text>
                  )}

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">Instructions</Text>
                  <TextInput
                    value={editInstructions}
                    onChangeText={setEditInstructions}
                    multiline
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16, minHeight: 80 }}
                    placeholder="Optional instructions..."
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View className="flex-row gap-3 mt-6">
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={editSaving}
                    className={`flex-1 px-6 py-4 rounded-2xl ${
                      editSaving ? 'bg-blue-300' : 'bg-blue-600'
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-lg font-bold text-center">
                      {editSaving ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditModalVisible(false)}
                    disabled={editSaving}
                    className="flex-1 px-6 py-4 rounded-2xl bg-gray-500"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-lg font-bold text-center">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        ) : (
          <View className="flex-1 justify-end bg-black/60">
            <View 
              className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 shadow-2xl" 
              style={{ height: '90%' }}
            >
              <View className="flex-row justify-between items-center mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
                <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                  Edit Medication
                </Text>
                <TouchableOpacity 
                  onPress={() => setEditModalVisible(false)}
                  className="bg-gray-100 dark:bg-gray-700 rounded-full p-2"
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Error Banner */}
              {saveError && (
                <View className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <View className="flex-row items-start">
                    <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                    <Text className="text-red-700 dark:text-red-400 flex-1 text-sm font-medium">
                      {saveError}
                    </Text>
                    <TouchableOpacity onPress={() => setSaveError(null)}>
                      <Ionicons name="close" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Validation Errors Banner */}
              {Object.keys(validationErrors).length > 0 && (
                <View className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <View className="flex-row items-start">
                    <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                    <View className="flex-1">
                      <Text className="text-red-700 dark:text-red-400 text-sm font-semibold mb-1">
                        Please fix the following errors:
                      </Text>
                      {Object.entries(validationErrors).map(([field, message]) => (
                        <Text key={field} className="text-red-600 dark:text-red-400 text-sm">
                          • {message}
                        </Text>
                      ))}
                    </View>
                    <TouchableOpacity onPress={() => setValidationErrors({})}>
                      <Ionicons name="close" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {editSuccessMessage && (
                <View className={`mb-4 p-3 rounded-xl ${
                  editSuccessMessage.includes('✅') 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  <Text className={`text-center font-semibold ${
                    editSuccessMessage.includes('✅')
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}>
                    {editSuccessMessage}
                  </Text>
                </View>
              )}

              <ScrollView className="flex-1">
                <View className="bg-gray-50 dark:bg-gray-700 p-5 rounded-2xl">
                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mb-2">
                    Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={editName}
                    onChangeText={(text) => {
                      setEditName(text);
                      if (validationErrors.name) {
                        setValidationErrors({ ...validationErrors, name: '' });
                      }
                    }}
                    className={`bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 ${
                      validationErrors.name 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-200 dark:border-gray-500'
                    }`}
                    style={{ fontSize: 16 }}
                  />
                  {validationErrors.name && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">
                      {validationErrors.name}
                    </Text>
                  )}

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">
                    Dosage <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={editDosage}
                    onChangeText={(text) => {
                      setEditDosage(text);
                      if (validationErrors.dosage) {
                        setValidationErrors({ ...validationErrors, dosage: '' });
                      }
                    }}
                    className={`bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 ${
                      validationErrors.dosage 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-200 dark:border-gray-500'
                    }`}
                    style={{ fontSize: 16 }}
                  />
                  {validationErrors.dosage && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">
                      {validationErrors.dosage}
                    </Text>
                  )}

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">
                    Frequency (tap to select)
                  </Text>
                  <View className="flex-row flex-wrap mt-1">
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setEditFrequency(opt.value)}
                        className={`px-3 py-2 mr-2 mb-2 rounded-full border ${
                          editFrequency === opt.value
                            ? 'bg-blue-600 border-blue-700'
                            : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            editFrequency === opt.value
                              ? 'text-white'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">
                    Schedule (comma-separated times)
                  </Text>
                  <TextInput
                    value={editScheduleText}
                    onChangeText={setEditScheduleText}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                    placeholder="e.g., 08:00, 20:00"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">
                    Start Date <Text className="text-red-500">*</Text>
                  </Text>
                  <View>
                    <TouchableOpacity
                      onPress={() => setShowStartDatePicker(true)}
                      className={`bg-white dark:bg-gray-600 rounded-xl px-4 py-3 border-2 ${
                        validationErrors.startDate 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-500'
                      }`}
                    >
                      <Text className="text-gray-900 dark:text-white" style={{ fontSize: 16 }}>
                        {editStartDate || 'Select start date'}
                      </Text>
                    </TouchableOpacity>
                    {validationErrors.startDate && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {validationErrors.startDate}
                      </Text>
                    )}
                    {showStartDatePicker && (
                      <View>
                        {Platform.OS === 'ios' && (
                          <View className="flex-row justify-end gap-2 mt-2 mb-2">
                            <TouchableOpacity
                              onPress={() => setShowStartDatePicker(false)}
                              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                            >
                              <Text className="text-gray-700 dark:text-gray-300 font-semibold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={handleStartDateConfirm}
                              className="px-4 py-2 rounded-lg bg-blue-600"
                            >
                              <Text className="text-white font-semibold">Done</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <DateTimePicker
                          value={startDateValue}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={handleStartDateChange}
                          maximumDate={new Date(2100, 11, 31)}
                          minimumDate={new Date(1900, 0, 1)}
                        />
                      </View>
                    )}
                  </View>

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">End Date</Text>
                  <View>
                    <TouchableOpacity
                      onPress={() => setShowEndDatePicker(true)}
                      className={`bg-white dark:bg-gray-600 rounded-xl px-4 py-3 border-2 ${
                        validationErrors.endDate 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-500'
                      }`}
                    >
                      <Text className="text-gray-900 dark:text-white" style={{ fontSize: 16 }}>
                        {editEndDate || 'Select end date (optional)'}
                      </Text>
                    </TouchableOpacity>
                    {validationErrors.endDate && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {validationErrors.endDate}
                      </Text>
                    )}
                    {showEndDatePicker && (
                      <View>
                        {Platform.OS === 'ios' && (
                          <View className="flex-row justify-end gap-2 mt-2 mb-2">
                            <TouchableOpacity
                              onPress={() => setShowEndDatePicker(false)}
                              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                            >
                              <Text className="text-gray-700 dark:text-gray-300 font-semibold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={handleEndDateConfirm}
                              className="px-4 py-2 rounded-lg bg-blue-600"
                            >
                              <Text className="text-white font-semibold">Done</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <DateTimePicker
                          value={endDateValue || new Date()}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={handleEndDateChange}
                          maximumDate={new Date(2100, 11, 31)}
                          minimumDate={startDateValue}
                        />
                      </View>
                    )}
                  </View>

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">Instructions</Text>
                  <TextInput
                    value={editInstructions}
                    onChangeText={setEditInstructions}
                    multiline
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16, minHeight: 80 }}
                    placeholder="Optional instructions..."
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View className="flex-row gap-3 mt-6">
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={editSaving}
                    className={`flex-1 px-6 py-4 rounded-2xl ${
                      editSaving ? 'bg-blue-300' : 'bg-blue-600'
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-lg font-bold text-center">
                      {editSaving ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditModalVisible(false)}
                    disabled={editSaving}
                    className="flex-1 px-6 py-4 rounded-2xl bg-gray-500"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-lg font-bold text-center">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}
