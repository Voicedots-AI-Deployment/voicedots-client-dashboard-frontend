import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HeroUIProvider } from "@heroui/react";
import  App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";
// import $ from 'jquery';
// import _ from 'lodash';
import noUiSlider from 'nouislider';
import 'datatables.net';
import 'dropzone/dist/dropzone-min.js';
import * as VanillaCalendarPro from 'vanilla-calendar-pro';

// window._ = _;
// window.$ = $;
// window.jQuery = $;
// window.DataTable = $.fn.dataTable;
window.noUiSlider = noUiSlider;
window.VanillaCalendarPro = VanillaCalendarPro;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HeroUIProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </HeroUIProvider>
  </React.StrictMode>
);
