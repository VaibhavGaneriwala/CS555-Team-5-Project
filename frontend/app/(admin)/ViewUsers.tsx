import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
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
import EditUserModal from '@/components/EditUserModal';
import { API_URL } from '@/utils/apiConfig';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'patient' | 'provider';
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: {
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
  };
  isActive: boolean;
  createdAt: string;
  patientCount?: number;
  providerCount?: number;
}

export default function ViewUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'patient' | 'provider'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deletedUserIds, setDeletedUserIds] = useState<Set<string>>(new Set());

  const fetchCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userId = data._id || data.id || null;
        const userEmail = data.email || null;
        setCurrentUserId(userId);
        setCurrentUserEmail(userEmail);
      }
    } catch (err) {
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to fetch users.');
      } else {
        // Handle both response formats: {users: [...]} or {success: true, users: [...]}
        const allUsers: User[] = data.users || (Array.isArray(data) ? data : []);
        // Filter out any users that were deleted (optimistic updates)
        const filteredUsers = allUsers.filter((u) => !deletedUserIds.has(u._id.toString()));
        
        // Sort users alphabetically by last name, then first name
        const sortedUsers = filteredUsers.sort((a, b) => {
          const lastNameA = (a.lastName || '').toLowerCase();
          const lastNameB = (b.lastName || '').toLowerCase();
          if (lastNameA !== lastNameB) {
            return lastNameA.localeCompare(lastNameB);
          }
          // If last names are the same, sort by first name
          const firstNameA = (a.firstName || '').toLowerCase();
          const firstNameB = (b.firstName || '').toLowerCase();
          return firstNameA.localeCompare(firstNameB);
        });
        
        setUsers(sortedUsers);
        applyFilters(sortedUsers, searchQuery, filterRole, filterActive);
      }
    } catch (err) {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (
    userList: User[],
    query: string,
    role: string,
    active: string
  ) => {
    let filtered = [...userList];

    // Search filter
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.firstName.toLowerCase().includes(lowerQuery) ||
          u.lastName.toLowerCase().includes(lowerQuery) ||
          u.email.toLowerCase().includes(lowerQuery)
      );
    }

    // Role filter
    if (role !== 'all') {
      filtered = filtered.filter((u) => u.role === role);
    }

    // Active filter
    if (active === 'active') {
      filtered = filtered.filter((u) => u.isActive);
    } else if (active === 'inactive') {
      filtered = filtered.filter((u) => !u.isActive);
    }

    // Sort alphabetically by last name, then first name
    filtered.sort((a, b) => {
      const lastNameA = (a.lastName || '').toLowerCase();
      const lastNameB = (b.lastName || '').toLowerCase();
      if (lastNameA !== lastNameB) {
        return lastNameA.localeCompare(lastNameB);
      }
      // If last names are the same, sort by first name
      const firstNameA = (a.firstName || '').toLowerCase();
      const firstNameB = (b.firstName || '').toLowerCase();
      return firstNameA.localeCompare(firstNameB);
    });

    setFilteredUsers(filtered);
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters(users, searchQuery, filterRole, filterActive);
  }, [searchQuery, filterRole, filterActive, users]);

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    Alert.alert(
      currentStatus ? 'Deactivate User' : 'Activate User',
      `Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;

              const response = await fetch(`${API_URL}/api/auth/users/${userId}`, {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isActive: !currentStatus }),
              });

              if (response.ok) {
                fetchUsers();
                Alert.alert('Success', `User ${currentStatus ? 'deactivated' : 'activated'} successfully.`);
              } else {
                const data = await response.json();
                Alert.alert('Error', data.message || 'Failed to update user.');
              }
            } catch (err) {
              Alert.alert('Error', 'Could not connect to server.');
            }
          },
        },
      ]
    );
  };

  const exportToPDF = async () => {
    try {
      // Fetch ALL users from the database (not just filtered ones)
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token missing.');
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        Alert.alert('Error', data.message || 'Failed to fetch users for export.');
        return;
      }

      // Get all users from the response
      const allUsers: User[] = data.users || (Array.isArray(data) ? data : []);
      
      if (allUsers.length === 0) {
        Alert.alert('No Data', 'There are no users to export.');
        return;
      }

      // Sort users alphabetically by last name, then first name
      const sortedUsers = [...allUsers].sort((a, b) => {
        const lastNameA = (a.lastName || '').toLowerCase();
        const lastNameB = (b.lastName || '').toLowerCase();
        if (lastNameA !== lastNameB) {
          return lastNameA.localeCompare(lastNameB);
        }
        const firstNameA = (a.firstName || '').toLowerCase();
        const firstNameB = (b.firstName || '').toLowerCase();
        return firstNameA.localeCompare(firstNameB);
      });

      const usersToExport = sortedUsers;

      // Generate standalone HTML document for PDF (not from current page)
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Users Export - ${new Date().toLocaleDateString()}</title>
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
                color: #2563eb;
                border-bottom: 3px solid #2563eb;
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
                background-color: #2563eb;
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
              .role-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                display: inline-block;
              }
              .role-admin {
                background-color: #7c3aed;
                color: white;
              }
              .role-provider {
                background-color: #059669;
                color: white;
              }
              .role-patient {
                background-color: #dc2626;
                color: white;
              }
              .status-inactive {
                color: #ef4444;
                font-weight: bold;
              }
              .status-active {
                color: #10b981;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <h1>User Management Report</h1>
            <div class="info">
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Total Users:</strong> ${usersToExport.length}</p>
              <p><strong>Note:</strong> This report includes all users in the system.</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Phone</th>
                  <th>Date of Birth</th>
                  <th>Gender</th>
                  <th>Address</th>
                  <th>Patient Count</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                ${usersToExport.map((user) => {
                  const fullAddress = user.address 
                    ? `${user.address.streetAddress || ''}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.zipcode || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
                    : 'N/A';
                  const dob = user.dateOfBirth 
                    ? new Date(user.dateOfBirth).toLocaleDateString() 
                    : 'N/A';
                  const patientCount = user.patientCount !== undefined ? user.patientCount : (user.role === 'provider' ? 'N/A' : '-');
                  
                  return `
                  <tr>
                    <td>${user.firstName} ${user.lastName}</td>
                    <td>${user.email}</td>
                    <td><span class="role-badge role-${user.role}">${user.role.toUpperCase()}</span></td>
                    <td class="status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</td>
                    <td>${user.phoneNumber || 'N/A'}</td>
                    <td>${dob}</td>
                    <td>${user.gender || 'N/A'}</td>
                    <td>${fullAddress || 'N/A'}</td>
                    <td>${patientCount}</td>
                    <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                `;
                }).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Generate PDF from standalone HTML document (not from current page)
      // Using printToFileAsync with HTML string creates a new document
      const printOptions = {
        html: htmlContent,
        width: 612, // US Letter width in points (8.5 inches)
        height: 792, // US Letter height in points (11 inches)
      };

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
                    link.download = `users-export-${new Date().toISOString().split('T')[0]}.html`;
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

  const handleDeleteUser = async (userId: string, userName: string) => {
    // Prevent admin from deleting themselves
    if (currentUserId && userId.toString() === currentUserId.toString()) {
      Alert.alert(
        'Cannot Delete Account',
        'You cannot delete your own account. Please ask another admin to delete it if needed.'
      );
      return;
    }

    const message = `Are you sure you want to permanently delete ${userName}? This action cannot be undone.`;

    // Use platform-appropriate confirmation
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (!confirmed) {
        return;
      }
      // Proceed with deletion on web
      await performDelete(userId);
    } else {
      // Use Alert.alert for mobile
      Alert.alert(
        'Delete User',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await performDelete(userId);
            },
          },
        ]
      );
      return;
    }
  };

  const performDelete = async (userId: string) => {

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token missing. Please log in again.');
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        Alert.alert('Error', 'Invalid response from server.');
        return;
      }

      if (response.ok) {
        const userIdStr = userId.toString();
        
        // Add to deleted set to prevent it from reappearing
        setDeletedUserIds((prev) => new Set([...prev, userIdStr]));
        
        // Immediately remove from local state for instant UI update
        const updatedUsers = users.filter((u) => {
          const userStr = u._id.toString();
          return userStr !== userIdStr;
        });
        
        // Sort alphabetically
        updatedUsers.sort((a, b) => {
          const lastNameA = (a.lastName || '').toLowerCase();
          const lastNameB = (b.lastName || '').toLowerCase();
          if (lastNameA !== lastNameB) {
            return lastNameA.localeCompare(lastNameB);
          }
          const firstNameA = (a.firstName || '').toLowerCase();
          const firstNameB = (b.firstName || '').toLowerCase();
          return firstNameA.localeCompare(firstNameB);
        });
        
        // Update all state atomically
        setUsers(updatedUsers);
        // The useEffect will automatically call applyFilters when users changes
        
        Alert.alert('Success', 'User deleted successfully.');
        
        // Refresh from server after a delay to ensure consistency
        setTimeout(() => {
          fetchUsers();
          // Remove from deleted set after refresh (in case deletion failed on server)
          setDeletedUserIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userIdStr);
            return newSet;
          });
        }, 1500);
      } else {
        Alert.alert('Error', data.message || 'Failed to delete user.');
        // Remove from deleted set on error
        setDeletedUserIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId.toString());
          return newSet;
        });
        // Refresh on error to get correct state
        fetchUsers();
      }
    } catch (err) {
      Alert.alert('Error', `Could not connect to server: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-2 text-gray-700 dark:text-gray-300">
          Loading users...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
        <Text className="text-red-500 text-lg font-semibold mb-3 text-center">
          {error}
        </Text>
        <TouchableOpacity
          onPress={fetchUsers}
          className="bg-blue-500 px-6 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold text-center">
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <AdminNavbar />
      <ScrollView className="flex-1 px-4 pt-6 pb-6">
        {/* Beautiful Header */}
        <View 
          className="mb-6 rounded-3xl p-6 shadow-2xl"
          style={{ backgroundColor: '#2563eb' }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-white mb-2">
                User Management
              </Text>
              <Text className="text-blue-100 text-base">
                {filteredUsers.length} of {users.length} users
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
              <View className="bg-white/20 rounded-full p-4">
                <Ionicons name="people" size={32} color="#fff" />
              </View>
            </View>
          </View>
        </View>

        {/* Search and Filters */}
        <View className="mb-6">
          <View className="relative mb-4">
            <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
              <Ionicons name="search" size={20} color="#9ca3af" />
            </View>
            <TextInput
              placeholder="Search by name or email..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="bg-white dark:bg-gray-800 rounded-2xl pl-12 pr-4 py-4 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 shadow-md"
            />
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Filter by Role
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setFilterRole('all')}
                  className={`px-3 py-2.5 rounded-2xl shadow-sm ${
                    filterRole === 'all'
                      ? 'bg-blue-500'
                      : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-bold text-xs ${
                      filterRole === 'all'
                        ? 'text-white'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterRole('patient')}
                  className={`px-3 py-2.5 rounded-2xl shadow-sm ${
                    filterRole === 'patient'
                      ? 'bg-red-500'
                      : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-bold text-xs ${
                      filterRole === 'patient'
                        ? 'text-white'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    Patients
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterRole('provider')}
                  className={`px-3 py-2.5 rounded-2xl shadow-sm ${
                    filterRole === 'provider'
                      ? 'bg-green-500'
                      : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-bold text-xs ${
                      filterRole === 'provider'
                        ? 'text-white'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    Providers
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterRole('admin')}
                  className={`px-3 py-2.5 rounded-2xl shadow-sm ${
                    filterRole === 'admin'
                      ? 'bg-purple-500'
                      : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-bold text-xs ${
                      filterRole === 'admin'
                        ? 'text-white'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    Admins
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Filter by Status
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setFilterActive('all')}
                  className={`px-3 py-2.5 rounded-2xl shadow-sm ${
                    filterActive === 'all'
                      ? 'bg-blue-500'
                      : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-bold text-xs ${
                      filterActive === 'all'
                        ? 'text-white'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterActive('active')}
                  className={`px-3 py-2.5 rounded-2xl shadow-sm ${
                    filterActive === 'active'
                      ? 'bg-green-500'
                      : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-bold text-xs ${
                      filterActive === 'active'
                        ? 'text-white'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterActive('inactive')}
                  className={`px-3 py-2.5 rounded-2xl shadow-sm ${
                    filterActive === 'inactive'
                      ? 'bg-red-500'
                      : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-bold text-xs ${
                      filterActive === 'inactive'
                        ? 'text-white'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    Inactive
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* User List */}
        {filteredUsers.map((item) => (
            <View key={item._id} className="bg-white dark:bg-gray-800 p-5 mb-4 rounded-3xl shadow-lg border-2 border-gray-100 dark:border-gray-700">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center mb-2">
                    <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2 mr-3">
                      <Ionicons 
                        name={item.role === 'admin' ? 'shield' : item.role === 'provider' ? 'medical' : 'person'} 
                        size={20} 
                        color={item.role === 'admin' ? '#7c3aed' : item.role === 'provider' ? '#059669' : '#dc2626'} 
                      />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center flex-wrap">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white">
                          {item.firstName} {item.lastName}
                        </Text>
                        {!item.isActive && (
                          <View className="ml-2 bg-red-500 px-3 py-1 rounded-full">
                            <Text className="text-xs text-white font-bold">
                              INACTIVE
                            </Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="mail-outline" size={14} color="#6b7280" />
                        <Text className="text-gray-600 dark:text-gray-400 text-sm ml-1">
                          {item.email}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="flex-row items-center flex-wrap gap-2 mt-3">
                    <View
                      className={`px-3 py-1.5 rounded-xl ${
                        item.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-900/30'
                          : item.role === 'provider'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          item.role === 'admin'
                            ? 'text-purple-700 dark:text-purple-300'
                            : item.role === 'provider'
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}
                      >
                        {item.role.toUpperCase()}
                      </Text>
                    </View>
                    {item.role === 'provider' && item.patientCount !== undefined && (
                      <View className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl">
                        <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                          👥 {item.patientCount} patients
                        </Text>
                      </View>
                    )}
                    {item.role === 'patient' && item.providerCount !== undefined && item.providerCount > 0 && (
                      <View className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl">
                        <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                          👨‍⚕️ 1 provider
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedUserId(item._id);
                      setEditUserModalVisible(true);
                    }}
                    className="bg-blue-500 px-4 py-3 rounded-xl shadow-md"
                    activeOpacity={0.7}
                    style={{ zIndex: 10 }}
                  >
                    <Ionicons name="create-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  {(() => {
                    // Compare user IDs - handle both string and object ID formats
                    const itemIdStr = String(item._id);
                    const currentIdStr = currentUserId ? String(currentUserId) : null;
                    
                    // Check by ID first, then by email as fallback
                    const isCurrentUserById = currentIdStr && itemIdStr === currentIdStr;
                    const isCurrentUserByEmail = currentUserEmail && item.email && 
                      currentUserEmail.toLowerCase() === item.email.toLowerCase();
                    const isCurrentUser = isCurrentUserById || isCurrentUserByEmail;
                    
                    if (isCurrentUser) {
                      return null;
                    }
                    
                    return (
                      <TouchableOpacity
                        onPress={() => {
                          // Double-check before deleting (safety net)
                          const checkId = currentUserId && String(item._id) === String(currentUserId);
                          const checkEmail = currentUserEmail && item.email && 
                            currentUserEmail.toLowerCase() === item.email.toLowerCase();
                          
                          if (checkId || checkEmail) {
                            Alert.alert(
                              'Cannot Delete Account',
                              'You cannot delete your own account. Please ask another admin to delete it if needed.'
                            );
                            return;
                          }
                          handleDeleteUser(item._id, `${item.firstName} ${item.lastName}`);
                        }}
                        className="bg-red-600 px-4 py-3 rounded-xl shadow-md"
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ zIndex: 10 }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#fff" />
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              </View>
            </View>
        ))}

        {/* Action Buttons */}
        <View className="mt-6 gap-3">
        </View>
      </ScrollView>

      {/* Edit User Modal */}
      <EditUserModal
        visible={editUserModalVisible}
        userId={selectedUserId}
        currentUserId={currentUserId}
        onClose={() => {
          setEditUserModalVisible(false);
          setSelectedUserId(null);
        }}
        onSave={() => {
          fetchUsers();
        }}
      />
    </View>
  );
}
