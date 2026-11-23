import {Onboarding} from './components/shell/Onboarding';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppProvider, useApp, type WorkspacePersistence } from './context/AppContext';
import { Sidebar } from './components/shell/Sidebar';
import { TopBar } from './components/shell/TopBar';
import { CommandPalette } from './components/shell/CommandPalette';
import { FloatingMiniTimer } from './components/shell/FloatingMiniTimer';
import { QuickModals } from './components/shell/QuickModals';
import { DashboardView } from './components/views/DashboardView';
import { PlannerView } from './components/views/PlannerView';
import { FocusTimerView } from './components/views/FocusTimerView';
import { TasksView } from './components/views/TasksView';
import { GoalsView } from './components/views/GoalsView';
import { SubjectsView } from './components/views/SubjectsView';
import { NotesView } from './components/views/NotesView';
import { FlashcardsView } from './components/views/FlashcardsView';
import { PracticeTestsView } from './components/views/PracticeTestsView';
import { ExamsView } from './components/views/ExamsView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { AiAssistantView } from './components/views/AiAssistantView';
import { AchievementsView } from './components/views/AchievementsView';
import { SettingsView } from './components/views/SettingsView';
import { AssistantProvider, type DesktopUsage } from './assistant/AssistantContext';
import { FloatingAssistant } from './assistant/FloatingAssistant';

const StudyFlowShell: React.FC = () => {
  const { route, preferences } = useApp();

  const renderView = () => {
    switch (route) {
      case 'dashboard':
        return <DashboardView />;
      case 'planner':
        return <PlannerView />;
      case 'focus':
        return <FocusTimerView />;
      case 'tasks':
        return <TasksView />;
      case 'goals':
        return <GoalsView />;
      case 'subjects':
        return <SubjectsView />;
      case 'notes':
        return <NotesView />;
      case 'flashcards':
        return <FlashcardsView />;
      case 'practice':
        return <PracticeTestsView />;
      case 'exams':
        return <ExamsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'assistant':
        return <AiAssistantView />;
      case 'achievements':
        return <AchievementsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar />

        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: 'var(--density-pad)' }}
        >
          <div className="max-w-[1440px] mx-auto w-full">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={route}
                initial={preferences.reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={preferences.reducedMotion ? undefined : { opacity: 0, y: -3 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <CommandPalette />
      <FloatingMiniTimer />
      <FloatingAssistant />
      <QuickModals />
      <Onboarding/>
    </div>
  );
};

export default function App({ workspace, desktopUsage }: { workspace?: WorkspacePersistence; desktopUsage?: DesktopUsage }) {
  return (
    <AppProvider workspace={workspace}>
      <AssistantProvider desktopUsage={desktopUsage}>
        <StudyFlowShell />
      </AssistantProvider>
    </AppProvider>
  );
}
