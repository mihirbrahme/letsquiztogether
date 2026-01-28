import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Layout } from './components/cms/Layout';

import { Dashboard } from './components/cms/Dashboard';
import { QuizEditor } from './components/cms/QuizEditor';
import { RoundEditor } from './components/cms/RoundEditor';
import { Library } from './components/cms/Library';
import { SessionConsole } from './components/cms/SessionConsole';
import { Presenter } from './components/presenter/Presenter';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* CMS Routes wrapped in Layout */}
        <Route element={<Layout><Outlet /></Layout>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/quiz/:id" element={<QuizEditor />} />
          <Route path="/quiz/:quizId/round/:roundId" element={<RoundEditor />} />
          <Route path="/library" element={<Library />} />
          <Route path="/session/:sessionId" element={<SessionConsole />} />
        </Route>

        {/* Presenter Route (Fullscreen, no layout) */}
        <Route path="/present" element={<Presenter />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
