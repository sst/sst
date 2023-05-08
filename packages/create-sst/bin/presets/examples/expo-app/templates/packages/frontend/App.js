/* eslint-disable no-undef */
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function App() {
  const [count, setCount] = useState(0);

  const API_URL = __DEV__ ? process.env.DEV_API_URL : process.env.PROD_API_URL;

  function onClick() {
    fetch(API_URL, {
      method: "POST",
    })
      .then((response) => response.text())
      .then(setCount);
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text>You clicked me {count} times.</Text>
      <TouchableOpacity style={styles.btn} onPress={onClick}>
        <Text>Click me!</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    backgroundColor: "lightblue",
    padding: 10,
    margin: 10,
    borderRadius: 5,
  },
});
