import React from "react";
import { 
  Printer, 
  Files, 
  SlidersHorizontal, 
  History
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const menuItems = [
    { id: "writer", label: "Cheque Writer", icon: Printer },
    { id: "bulk", label: "Bulk Print", icon: Files },
    { id: "calibration", label: "Calibration", icon: SlidersHorizontal },
    { id: "history", label: "Audit Ledger", icon: History }
  ];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.svg" alt="Chandan Steel Limited" />
        </div>

        <nav>
          <ul className="nav-links">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`nav-item ${activeTab === item.id ? "active" : ""}`}
                    style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="profile-card">
            <div className="profile-avatar">CS</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "#fff" }}>Chandan Steel</p>
              <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }}>Cheque Management</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};
