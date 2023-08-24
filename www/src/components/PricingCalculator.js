import React, { useState } from "react";
import styles from "./PricingCalculator.module.css";

const PRICING_PLAN = [
  { from: 0, to: 1000000, rate: 0 },
  { from: 1000000, to: 10000000, rate: 0.00002 },
  { from: 10000000, to: Infinity, rate: 0.000002 },
];

function calculateCost(units, pricingPlan) {
  let cost = 0;

  for (let tier of pricingPlan) {
    if (units > tier.from) {
      if (units < tier.to) {
        cost += (units - tier.from) * tier.rate;
        break;
      } else {
        cost += (tier.to - tier.from) * tier.rate;
      }
    }
  }

  return parseFloat(cost.toFixed(2));
}

function PricingCalculator() {
  const [inputValue, setInputValue] = useState("");
  const [outputValue, setOutputValue] = useState("");

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const computeOutput = () => {
    setOutputValue(calculateCost(inputValue, PRICING_PLAN));
  };

  return (
    <div className={styles.form}>
      <input
        required
        type="number"
        value={inputValue}
        className={styles.input}
        onChange={handleInputChange}
        placeholder="Invocations per month"
      />
      <button
        onClick={computeOutput}
        className={`button button--outline button--primary ${styles.button}`}
      >
        Calculate
      </button>
      <span>Estimated cost:</span>
      {outputValue !== "" ? (
        <span>
          <b>${outputValue}</b> per mo
        </span>
      ) : (
        <span>—</span>
      )}
    </div>
  );
}

export default PricingCalculator;
