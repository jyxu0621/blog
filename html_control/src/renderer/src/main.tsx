import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "admin-lte/dist/css/adminlte.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "admin-lte/dist/js/adminlte.min.js";
import "./styles.css";
import { App } from "./App";

const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => document.documentElement.setAttribute("data-bs-theme", colorScheme.matches ? "dark" : "light");
applyTheme();
colorScheme.addEventListener("change", applyTheme);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
