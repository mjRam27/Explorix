import {
  View,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import TransportMap from "../components/transport/TransportMap";
import JourneySheet from "../components/transport/JourneySheet";
import FromToInputs from "../components/transport/FromToInputs";
import TransportFilters from "../components/transport/TransportFilters";
import DateTimeModal from "../components/transport/DateTimeModal";

export default function TransportScreen() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mode, setMode] = useState("all");

  const [dateTime, setDateTime] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);

  const [searchActive, setSearchActive] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<any>(null);

  return (
    // <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>

        {/* MAP ALWAYS EXISTS */}
        <TransportMap
          journey={selectedJourney}
        />

        {/* 🔙 BACK BUTTON */}
        {searchActive && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSearchActive(false);
              setSelectedJourney(null);
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#000" />
          </TouchableOpacity>
        )}

        {/* 🔼 TOP INPUTS (ONLY BEFORE SEARCH) */}
        {!searchActive && (
          <View style={styles.topOverlay}>
            <FromToInputs
              from={from}
              to={to}
              onChangeFrom={setFrom}
              onChangeTo={setTo}
              date={dateTime}
              onPressDate={() => setShowDateModal(true)}
              onSwap={() => {
                setFrom(to);
                setTo(from);
              }}
              onSearch={() => setSearchActive(true)}
            />

            <TransportFilters
              active={mode}
              onChange={setMode}
            />
          </View>
        )}

        {/* 🕒 DATE TIME MODAL */}
        <DateTimeModal
          visible={showDateModal}
          value={dateTime}
          onClose={() => setShowDateModal(false)}
          onConfirm={(d) => {
            setDateTime(d);
            setShowDateModal(false);
          }}
        />

        {/* 🔽 BOTTOM SHEET (ONLY AFTER SEARCH) */}
        {searchActive && (
          <JourneySheet
            onSelectJourney={(journey) => setSelectedJourney(journey)}
          />
        )}

      </View>
    // </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  topOverlay: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    zIndex: 20,
  },

  backButton: {
    position: "absolute",
    top: 48,
    left: 16,
    backgroundColor: "#fff",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    zIndex: 30,
  },
});
