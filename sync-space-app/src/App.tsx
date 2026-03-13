import { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import RoomPage from './pages/RoomPage';

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    if (!window.electronAPI) return;

    // [버그 수정] room 페이지에서는 항상 클릭을 받아야 함.
    // 이전 방식은 인터랙티브 요소 위가 아닐 때 setIgnoreMouseEvents(true)를 호출하여
    // Electron 창 자체가 투명해져 뒤에 있는 프로그램으로 클릭이 전달되는 문제가 있었음.
    // 판서 모드 여부에 따른 동작은 DrawingCanvas의 CSS pointer-events로만 제어.
    window.electronAPI.setIgnoreMouseEvents(false);

  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/room/:id" element={<RoomPage />} />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;
