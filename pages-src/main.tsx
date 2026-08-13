import React from "react";
import ReactDOM from "react-dom/client";
import "../app/globals.css";
import "./pages.css";
import "./api-shim";
import FlashcardsApp from "../app/FlashcardsApp";
import AuthGate from "./AuthGate";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthGate><FlashcardsApp /></AuthGate>
  </React.StrictMode>,
);
