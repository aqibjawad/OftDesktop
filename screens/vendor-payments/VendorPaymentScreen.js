import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

const API_URL = "https://oftbrothers.com/backend/api/payments.php";
const VENDORS_URL = "https://oftbrothers.com/backend/api/vendor.php";
const BANKS_URL = "https://oftbrothers.com/backend/api/bank.php";

const VendorPaymentScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [vendors, setVendors] = useState([]);
  const [banks, setBanks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVendors();
    fetchBanks();
    fetchPayments();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch(VENDORS_URL);
      const result = await response.json();
      if (result.success === true) {
        setVendors(result.data);
      } else {
        Alert.alert("Error", "Failed to fetch vendors");
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
      Alert.alert("Error", "Network error while fetching vendors");
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await fetch(BANKS_URL);
      const result = await response.json();
      if (Array.isArray(result)) {
        setBanks(result);
      } else {
        Alert.alert("Error", "Failed to fetch banks");
      }
    } catch (error) {
      console.error("Error fetching banks:", error);
      Alert.alert("Error", "Network error while fetching banks");
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      const result = await response.json();
      if (result.success === true) {
        setPayments(result.data);
      } else {
        Alert.alert("Error", "Failed to fetch payments");
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      Alert.alert("Error", "Network error while fetching payments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVendor || !selectedBank || !amount) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        vendor_id: selectedVendor,
        bank_id: selectedBank,
        amount: parseFloat(amount),
        description: description,
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success === true) {
        Alert.alert("Success", "Payment processed successfully");
        // Reset form and close modal
        setSelectedVendor("");
        setSelectedBank("");
        setAmount("");
        setDescription("");
        setModalVisible(false);
        // Refresh payments list
        fetchPayments();
      } else {
        Alert.alert("Error", result.message || "Failed to process payment");
      }
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Network error while submitting payment");
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentItem = ({ item }) => (
    <View style={styles.tableRow}>
      <Text style={styles.tableCell}>{item.vendor_name || 'Unknown'}</Text>
      <Text style={styles.tableCell}>{item.bank_name || 'Unknown'}</Text>
      <Text style={styles.tableCell}>₹ {parseFloat(item.amount).toFixed(2)}</Text>
      <Text style={styles.tableCell}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
        disabled={loading}
      >
        <Text style={styles.addButtonText}>Add New Payment</Text>
      </TouchableOpacity>

      {/* Modal Form */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.title}>New Vendor Payment</Text>

              <Text style={styles.label}>Select Vendor</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedVendor}
                  onValueChange={setSelectedVendor}
                  style={styles.picker}
                  enabled={!loading}
                >
                  <Picker.Item label="Select a vendor" value="" />
                  {vendors.map((vendor) => (
                    <Picker.Item
                      key={vendor.id}
                      label={vendor.name}
                      value={vendor.id}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Select Bank</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedBank}
                  onValueChange={setSelectedBank}
                  style={styles.picker}
                  enabled={!loading}
                >
                  <Picker.Item label="Select a bank" value="" />
                  {banks.map((bank) => (
                    <Picker.Item
                      key={bank.id}
                      label={`${bank.bank_name} (Balance: ₹${parseFloat(bank.balance).toFixed(2)})`}
                      value={bank.id}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="Enter amount"
                editable={!loading}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter payment description"
                multiline
                numberOfLines={4}
                editable={!loading}
              />

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.submitButton, loading && styles.disabledButton]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>{loading ? "Processing..." : "Submit"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payments Table */}
      <View style={styles.tableContainer}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.tableHeaderCell}>Vendor</Text>
          <Text style={styles.tableHeaderCell}>Bank</Text>
          <Text style={styles.tableHeaderCell}>Amount</Text>
          <Text style={styles.tableHeaderCell}>Date</Text>
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading payments...</Text>
          </View>
        ) : (
          <FlatList
            data={payments}
            renderItem={renderPaymentItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No payments found</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 10,
    maxHeight: "80%",
  },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: "500",
    color: "#333",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  submitButton: {
    backgroundColor: "#007AFF",
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  tableContainer: {
    flex: 1,
    marginTop: 10,
  },
  tableHeader: {
    backgroundColor: "#f4f4f4",
  },
  tableRow: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tableHeaderCell: {
    flex: 1,
    fontWeight: "bold",
    fontSize: 14,
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
});

export default VendorPaymentScreen;
