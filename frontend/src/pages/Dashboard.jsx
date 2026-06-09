import Header from "../components/Header";
import DashboardCards from "../components/DashboardCards";
import UploadSection from "../components/UploadSection";
import ChatSection from "../components/ChatSection";

function Dashboard() {
  return (
    <div className="flex-1 p-8 bg-black min-h-screen">
      <Header />
      <DashboardCards />
      <UploadSection />
      <ChatSection />
    </div>
  );
}

export default Dashboard;