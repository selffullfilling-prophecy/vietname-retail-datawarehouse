import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { SalesPage } from "../pages/SalesPage";
import { InventoryPage } from "../pages/InventoryPage";
import { AdvancedAnalysisPage } from "../pages/AdvancedAnalysisPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "sales", element: <SalesPage /> },
      { path: "inventory", element: <InventoryPage /> },
      { path: "advanced", element: <AdvancedAnalysisPage /> }
    ]
  }
]);
