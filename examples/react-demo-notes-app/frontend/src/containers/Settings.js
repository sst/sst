import React, { useState } from "react";
import { API } from "aws-amplify";
import { useHistory } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import BillingForm from "../components/BillingForm";
import { onError } from "../lib/errorLib";
import config from "../config";
import "./Settings.css";

export default function Settings() {
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(false);
  const stripePromise = loadStripe(config.STRIPE_KEY);

  function billUser(details) {
    return API.post("notes", "/billing", {
      body: details
    });
  }

  async function handleFormSubmit(storage, { token, error }) {
    if (error) {
      onError(error);
      return;
    }

    setIsLoading(true);

    try {
      await billUser({
        storage,
        source: token.id,
      });

      alert("Your card has been charged successfully!");
      history.push("/");
    } catch (e) {
      onError(e);
      setIsLoading(false);
    }
  }

  return (
    <div className="Settings">
      <Elements
        stripe={stripePromise}
        fonts={[
          {
            cssSrc:
              "https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700,800",
          },
        ]}
      >
        <BillingForm isLoading={isLoading} onSubmit={handleFormSubmit} />
      </Elements>
    </div>
  );
}
