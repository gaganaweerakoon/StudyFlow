import type {
  DashboardWidgetConfig,
  ExamItem,
  FlashcardDeck,
  FlashcardItem,
  FocusHistoryItem,
  GoalItem,
  NoteFolder,
  NoteItem,
  PracticeQuiz,
  StudySession,
  Subject,
  TaskItem,
} from '../types/studyflow';
import type { RewardLedger } from '../utils/rewards';

export interface DemoWorkspaceSeed {
  anchorDate: string;
  dashboardWidgets: DashboardWidgetConfig[];
  subjects: Subject[];
  tasks: TaskItem[];
  sessions: StudySession[];
  goals: GoalItem[];
  folders: NoteFolder[];
  notes: NoteItem[];
  decks: FlashcardDeck[];
  flashcards: FlashcardItem[];
  exams: ExamItem[];
  quizzes: PracticeQuiz[];
  focusHistory: FocusHistoryItem[];
  cardReviews: Record<string, number>;
  rewardLedger: RewardLedger;
  xpPoints: number;
}

export const DEMO_WORKSPACE: DemoWorkspaceSeed = {
  "anchorDate": "2026-11-25",
  "dashboardWidgets": [
    {
      "id": "kpi_strip",
      "label": "Overview",
      "visible": true
    },
    {
      "id": "planned_actual_chart",
      "label": "Planned vs Actual",
      "visible": true
    },
    {
      "id": "today_schedule",
      "label": "Today’s Schedule",
      "visible": true
    },
    {
      "id": "quick_focus",
      "label": "Quick Start Focus",
      "visible": true
    },
    {
      "id": "subject_progress",
      "label": "Subject Progress",
      "visible": true
    },
    {
      "id": "upcoming_exams",
      "label": "Upcoming Exams",
      "visible": true
    },
    {
      "id": "recent_notes",
      "label": "Recent Notes",
      "visible": true
    },
    {
      "id": "ai_insight",
      "label": "AI Insight",
      "visible": true
    }
  ],
  "subjects": [
    {
      "chapters": [
        {
          "id": "al27-chemistry-unit-01",
          "title": "පරමාණු ආකෘති හා වර්ණාවලි",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-01-01",
              "revisionStatus": "not_started",
              "title": "පරමාණු ආකෘති, උපපරමාණුක අංශු හා සමස්ථානික"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-01-02",
              "revisionStatus": "not_started",
              "title": "විද්‍යුත් චුම්බක විකිරණ හා තරංග අංශු ද්වෛතය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-01-03",
              "revisionStatus": "not_started",
              "title": "බෝර් ආකෘතිය, හයිඩ්‍රජන් වර්ණාවලිය හා ශක්ති මට්ටම්"
            }
          ],
          "unitId": "u-al27-chemistry-unit-01"
        },
        {
          "id": "al27-chemistry-unit-01-ch2",
          "title": "ඉලෙක්ට්‍රෝන වින්‍යාස හා ආවර්තිතාව",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-01-04",
              "revisionStatus": "not_started",
              "title": "ක්වොන්ටම් අංක හා කාක්ෂික"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-01-05",
              "revisionStatus": "not_started",
              "title": "ඉලෙක්ට්‍රෝන වින්‍යාස හා පිරවීමේ නීති"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-01-06",
              "revisionStatus": "not_started",
              "title": "ආවර්තිතා වගුව හා ආවර්තිතා විචලන"
            }
          ],
          "unitId": "u-al27-chemistry-unit-01"
        },
        {
          "id": "al27-chemistry-unit-02",
          "title": "බන්ධන සෑදීම හා අණුක හැඩ",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-02-01",
              "revisionStatus": "not_started",
              "title": "අයනික බන්ධන හා අයනික සංයෝග"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-02-02",
              "revisionStatus": "not_started",
              "title": "සහසංයුජ බන්ධන හා ලුවිස් ව්‍යුහ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-02-03",
              "revisionStatus": "not_started",
              "title": "සම්ප්‍රයුක්ත බන්ධන හා අනුනාදය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-02-04",
              "revisionStatus": "not_started",
              "title": "අණුක හැඩ, VSEPR හා මුහුම්කරණය"
            }
          ],
          "unitId": "u-al27-chemistry-unit-02"
        },
        {
          "id": "al27-chemistry-unit-02-ch2",
          "title": "ධ්‍රැවීයතාව, අන්තර් අණුක බල හා ද්‍රව්‍ය ගුණ",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-02-05",
              "revisionStatus": "not_started",
              "title": "බන්ධන ධ්‍රැවීයතාව හා ද්විධ්‍රැව ඝූර්ණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-02-06",
              "revisionStatus": "not_started",
              "title": "අන්තර් අණුක බල හා හයිඩ්‍රජන් බන්ධන"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-02-07",
              "revisionStatus": "not_started",
              "title": "ලෝහක බන්ධන හා ව්‍යුහ-ගුණ සම්බන්ධතා"
            }
          ],
          "unitId": "u-al27-chemistry-unit-02"
        },
        {
          "id": "al27-chemistry-unit-03",
          "title": "මවුලය හා රසායනික සූත්‍ර",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-03-01",
              "revisionStatus": "not_started",
              "title": "සාපේක්ෂ පරමාණුක හා අණුක ස්කන්ධ; මවුලය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-03-02",
              "revisionStatus": "not_started",
              "title": "ආනුභවික හා අණුක සූත්‍ර"
            }
          ],
          "unitId": "u-al27-chemistry-unit-03"
        },
        {
          "id": "al27-chemistry-unit-03-ch2",
          "title": "තුලිත සමීකරණ හා ප්‍රතික්‍රියා ගණනය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-03-03",
              "revisionStatus": "not_started",
              "title": "ඔක්සිකරණ අංක හා රෙඩොක්ස් සමීකරණ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-03-04",
              "revisionStatus": "not_started",
              "title": "රසායනික සමීකරණ හා ස්ටොයිකියෝමිතිය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-03-05",
              "revisionStatus": "not_started",
              "title": "සීමාකාරී ප්‍රතික්‍රියක, පිරිසිදුකම හා ඵලදාව"
            }
          ],
          "unitId": "u-al27-chemistry-unit-03"
        },
        {
          "id": "al27-chemistry-unit-03-ch3",
          "title": "ද්‍රාවණ, සාන්ද්‍රණය හා සංයුතිය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-03-06",
              "revisionStatus": "not_started",
              "title": "සාන්ද්‍රණය, ස්කන්ධ භාග, මවුල භාග හා ppm"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-03-07",
              "revisionStatus": "not_started",
              "title": "ද්‍රාවණ සකස් කිරීම, තනුක කිරීම හා මිශ්‍ර කිරීම"
            }
          ],
          "unitId": "u-al27-chemistry-unit-03"
        },
        {
          "id": "al27-chemistry-unit-03-ch4",
          "title": "අම්ල–භෂ්ම අනුමාපන",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "cc-tit-0",
              "revisionStatus": "not_started",
              "title": "අම්ල–භෂ්ම අනුමාපන"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "cc-tit-1",
              "revisionStatus": "not_started",
              "title": "දර්ශක"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "cc-tit-2",
              "revisionStatus": "not_started",
              "title": "කාබනේට්"
            }
          ],
          "unitId": "u-al27-chemistry-unit-03"
        },
        {
          "id": "al27-chemistry-unit-04",
          "title": "වායු නියම හා වායු මිශ්‍රණ",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-04-01",
              "revisionStatus": "not_started",
              "title": "වායු නියම හා පීඩනය, පරිමාව, උෂ්ණත්වය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-04-02",
              "revisionStatus": "not_started",
              "title": "පරිපූර්ණ වායු සමීකරණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-04-03",
              "revisionStatus": "not_started",
              "title": "වායු මිශ්‍රණ හා ආංශික පීඩන"
            }
          ],
          "unitId": "u-al27-chemistry-unit-04"
        },
        {
          "id": "al27-chemistry-unit-04-ch2",
          "title": "වායු අණුවල හැසිරීම",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-04-04",
              "revisionStatus": "not_started",
              "title": "වායු චාලක අණුක වාදය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-04-05",
              "revisionStatus": "not_started",
              "title": "වායු විසරණය හා කාන්දුවීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-04-06",
              "revisionStatus": "not_started",
              "title": "තාත්වික වායු හා අපගමන"
            }
          ],
          "unitId": "u-al27-chemistry-unit-04"
        },
        {
          "id": "al27-chemistry-unit-05",
          "title": "ශක්ති වෙනස්වීම් හා ඒවා මැනීම",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-05-01",
              "revisionStatus": "not_started",
              "title": "පද්ධතිය, පරිසරය හා ශක්ති හුවමාරුව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-05-02",
              "revisionStatus": "not_started",
              "title": "එන්තැල්පි වෙනස්වීම් හා සම්මත අවස්ථා"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-05-03",
              "revisionStatus": "not_started",
              "title": "තාපමිතිය"
            }
          ],
          "unitId": "u-al27-chemistry-unit-05"
        },
        {
          "id": "al27-chemistry-unit-05-ch2",
          "title": "ශක්ති චක්‍ර හා ප්‍රතික්‍රියාවල ස්වයංසිද්ධතාව",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-05-04",
              "revisionStatus": "not_started",
              "title": "හෙස් නියමය හා එන්තැල්පි චක්‍ර"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-05-05",
              "revisionStatus": "not_started",
              "title": "බන්ධන එන්තැල්පි හා ජාලක එන්තැල්පි"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-05-06",
              "revisionStatus": "not_started",
              "title": "එන්ට්‍රොපිය, ගිබ්ස් ශක්තිය හා ස්වයංසිද්ධතාව"
            }
          ],
          "unitId": "u-al27-chemistry-unit-05"
        },
        {
          "id": "al27-chemistry-unit-06",
          "title": "ප්‍රධාන කාණ්ඩවල මූලද්‍රව්‍ය රසායනය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-06-01",
              "revisionStatus": "not_started",
              "title": "s ගොනු මූලද්‍රව්‍ය හා සංයෝග"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-06-02",
              "revisionStatus": "not_started",
              "title": "p ගොනු මූලද්‍රව්‍ය හා සංයෝග"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-06-03",
              "revisionStatus": "not_started",
              "title": "කාබන්, සිලිකන් හා ජාලක ව්‍යුහ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-06-04",
              "revisionStatus": "not_started",
              "title": "නයිට්‍රජන්, ඔක්සිජන්, සල්ෆර් හා හැලජන"
            }
          ],
          "unitId": "u-al27-chemistry-unit-06"
        },
        {
          "id": "al27-chemistry-unit-06-ch2",
          "title": "ආන්තරික මූලද්‍රව්‍ය හා රසායනික විශ්ලේෂණය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-06-05",
              "revisionStatus": "not_started",
              "title": "d ගොනු මූලද්‍රව්‍ය, ඔක්සිකරණ අවස්ථා හා වර්ණ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-06-06",
              "revisionStatus": "not_started",
              "title": "සංකීර්ණ අයන හා නාමකරණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-06-07",
              "revisionStatus": "not_started",
              "title": "ගුණාත්මක අකාබනික විශ්ලේෂණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-06-08",
              "revisionStatus": "not_started",
              "title": "රෙඩොක්ස් අනුමාපන හා ප්‍රායෝගික පරීක්ෂණ"
            }
          ],
          "unitId": "u-al27-chemistry-unit-06"
        },
        {
          "id": "al27-chemistry-unit-07",
          "title": "කාබනික සංයෝගවල ව්‍යුහය හා නාමකරණය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-07-01",
              "revisionStatus": "not_started",
              "title": "කාබන් බන්ධන හා ක්‍රියාකාරී කාණ්ඩ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-07-02",
              "revisionStatus": "not_started",
              "title": "IUPAC නාමකරණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-07-03",
              "revisionStatus": "not_started",
              "title": "ව්‍යුහ සමාවයවිකතාව හා අවකාශ සමාවයවිකතාව"
            }
          ],
          "unitId": "u-al27-chemistry-unit-07"
        },
        {
          "id": "al27-chemistry-unit-07-ch2",
          "title": "කාබනික ප්‍රතික්‍රියාශීලීතාව",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-07-04",
              "revisionStatus": "not_started",
              "title": "බන්ධන විඛණ්ඩනය, න්‍යෂ්ටිකාමී හා ඉලෙක්ට්‍රෝනකාමී ප්‍රතික්‍රියක"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-07-05",
              "revisionStatus": "not_started",
              "title": "කාබනික ප්‍රතික්‍රියා වර්ග හා යාන්ත්‍රණ"
            }
          ],
          "unitId": "u-al27-chemistry-unit-07"
        },
        {
          "id": "al27-chemistry-unit-08",
          "title": "ඇලිෆැටික හයිඩ්‍රොකාබන",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-08-01",
              "revisionStatus": "not_started",
              "title": "ඇල්කේන"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-08-02",
              "revisionStatus": "not_started",
              "title": "ඇල්කීන"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-08-03",
              "revisionStatus": "not_started",
              "title": "ඇල්කයින"
            }
          ],
          "unitId": "u-al27-chemistry-unit-08"
        },
        {
          "id": "al27-chemistry-unit-08-ch2",
          "title": "ඇරෝමැටික සංයෝග හා හැලෝඇල්කේන",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-08-04",
              "revisionStatus": "not_started",
              "title": "බෙන්සීන් හා ඇරෝමැටික ආදේශන"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-08-05",
              "revisionStatus": "not_started",
              "title": "ඇරෝමැටික ආදේශකවල දිශාකරණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-08-06",
              "revisionStatus": "not_started",
              "title": "හැලෝඇල්කේන, ආදේශන හා විලෝපන"
            }
          ],
          "unitId": "u-al27-chemistry-unit-08"
        },
        {
          "id": "al27-chemistry-unit-09",
          "title": "හයිඩ්‍රොක්සිල් හා කාබොනයිල් සංයෝග",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-09-01",
              "revisionStatus": "not_started",
              "title": "මධ්‍යසාර"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-09-02",
              "revisionStatus": "not_started",
              "title": "ෆීනෝල"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-09-03",
              "revisionStatus": "not_started",
              "title": "ඇල්ඩිහයිඩ හා කීටෝන"
            }
          ],
          "unitId": "u-al27-chemistry-unit-09"
        },
        {
          "id": "al27-chemistry-unit-09-ch2",
          "title": "කාබොක්සිලික් අම්ල, ව්‍යුත්පන්න හා හඳුනාගැනීම",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-09-04",
              "revisionStatus": "not_started",
              "title": "කාබොක්සිලික් අම්ල"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-09-05",
              "revisionStatus": "not_started",
              "title": "අම්ල ක්ලෝරයිඩ, එස්ටර හා ඇමයිඩ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-09-06",
              "revisionStatus": "not_started",
              "title": "හඳුනාගැනීමේ පරීක්ෂණ හා සංස්ලේෂණ මාර්ග"
            }
          ],
          "unitId": "u-al27-chemistry-unit-09"
        },
        {
          "id": "al27-chemistry-unit-10",
          "title": "ඇමීන හා ඩයසෝනියම් ලවණ",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-10-01",
              "revisionStatus": "not_started",
              "title": "ඇමයිනවල ව්‍යුහය, භාෂ්මිකතාව හා ප්‍රතික්‍රියා"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-10-02",
              "revisionStatus": "not_started",
              "title": "ඇනිලීන් හා ඩයසෝනියම් ලවණ"
            }
          ],
          "unitId": "u-al27-chemistry-unit-10"
        },
        {
          "id": "al27-chemistry-unit-10-ch2",
          "title": "නයිට්‍රජන් අඩංගු සංයෝගවල පරිවර්තන",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-10-03",
              "revisionStatus": "not_started",
              "title": "නයිට්‍රජන් සංයෝගවල පරිවර්තන"
            }
          ],
          "unitId": "u-al27-chemistry-unit-10"
        },
        {
          "id": "al27-chemistry-unit-11",
          "title": "ප්‍රතික්‍රියා ශීඝ්‍රතාව මැනීම හා ශීඝ්‍රතා නියම",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-11-01",
              "revisionStatus": "not_started",
              "title": "ප්‍රතික්‍රියා ශීඝ්‍රතාව හා මැනීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-11-02",
              "revisionStatus": "not_started",
              "title": "ශීඝ්‍රතාවට බලපාන සාධක"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-11-03",
              "revisionStatus": "not_started",
              "title": "ශීඝ්‍රතා සමීකරණ, ප්‍රතික්‍රියා පෙළ හා ශීඝ්‍රතා නියතය"
            }
          ],
          "unitId": "u-al27-chemistry-unit-11"
        },
        {
          "id": "al27-chemistry-unit-11-ch2",
          "title": "ප්‍රතික්‍රියා ශීඝ්‍රතාව පිළිබඳ අණුක විග්‍රහය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-11-04",
              "revisionStatus": "not_started",
              "title": "ඝට්ටන වාදය හා සක්‍රියන ශක්තිය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-11-05",
              "revisionStatus": "not_started",
              "title": "උෂ්ණත්වය, ඇරීනියස් සම්බන්ධය හා උත්ප්‍රේරණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-11-06",
              "revisionStatus": "not_started",
              "title": "ප්‍රතික්‍රියා යාන්ත්‍රණ හා ශීඝ්‍රතාව තීරණය කරන පියවර"
            }
          ],
          "unitId": "u-al27-chemistry-unit-11"
        },
        {
          "id": "al27-chemistry-unit-12",
          "title": "රසායනික සමතුලිතතාව",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-12-01",
              "revisionStatus": "not_started",
              "title": "ගතික සමතුලිතතාව හා සමතුලිතතා නියත"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-12-02",
              "revisionStatus": "not_started",
              "title": "Kc හා Kp ගණනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-12-03",
              "revisionStatus": "not_started",
              "title": "ලේ චැටලියේ මූලධර්මය"
            }
          ],
          "unitId": "u-al27-chemistry-unit-12"
        },
        {
          "id": "al27-chemistry-unit-12-ch2",
          "title": "අම්ල–භෂ්ම සමතුලිතතාව",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-12-04",
              "revisionStatus": "not_started",
              "title": "අම්ල භෂ්ම න්‍යාය හා ජලයේ අයනික ගුණිතය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-12-05",
              "revisionStatus": "not_started",
              "title": "pH, Ka හා Kb ගණනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-12-06",
              "revisionStatus": "not_started",
              "title": "ලවණ ජලවිච්ඡේදනය හා ස්වාරක්ෂක ද්‍රාවණ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-12-07",
              "revisionStatus": "not_started",
              "title": "අම්ල භෂ්ම අනුමාපන හා දර්ශක"
            }
          ],
          "unitId": "u-al27-chemistry-unit-12"
        },
        {
          "id": "al27-chemistry-unit-12-ch3",
          "title": "ද්‍රාව්‍යතාව හා ව්‍යාප්ති සමතුලිතතාව",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-12-08",
              "revisionStatus": "not_started",
              "title": "ද්‍රාව්‍යතා ගුණිතය හා අවක්ෂේපණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-12-09",
              "revisionStatus": "not_started",
              "title": "විභාජන සමතුලිතතාව"
            }
          ],
          "unitId": "u-al27-chemistry-unit-12"
        },
        {
          "id": "al27-chemistry-unit-13",
          "title": "විද්‍යුත් රසායනික කෝෂ",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-13-01",
              "revisionStatus": "not_started",
              "title": "ඔක්සිකරණ ඔක්සිහරණ හා විද්‍යුත් රසායනික ශ්‍රේණිය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-13-02",
              "revisionStatus": "not_started",
              "title": "ඉලෙක්ට්‍රෝඩ විභව හා සම්මත ඉලෙක්ට්‍රෝඩ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-13-03",
              "revisionStatus": "not_started",
              "title": "ගැල්වානි කෝෂ හා විද්‍යුත්ගාමක බලය"
            }
          ],
          "unitId": "u-al27-chemistry-unit-13"
        },
        {
          "id": "al27-chemistry-unit-13-ch2",
          "title": "විද්‍යුත් විච්ඡේදනය හා යෙදීම්",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-13-04",
              "revisionStatus": "not_started",
              "title": "විද්‍යුත් විච්ඡේදනය හා ෆැරඩේ නියම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-13-05",
              "revisionStatus": "not_started",
              "title": "විඛාදනය හා විද්‍යුත් රසායනික යෙදීම්"
            }
          ],
          "unitId": "u-al27-chemistry-unit-13"
        },
        {
          "id": "al27-chemistry-unit-14",
          "title": "කාර්මික රසායනික ක්‍රියාවලි",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-14-01",
              "revisionStatus": "not_started",
              "title": "කාර්මික නිෂ්පාදන ක්‍රියාවලි හා අමුද්‍රව්‍ය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-14-02",
              "revisionStatus": "not_started",
              "title": "ඇමෝනියා, නයිට්‍රික් අම්ලය හා සල්ෆියුරික් අම්ලය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-14-03",
              "revisionStatus": "not_started",
              "title": "ලෝහ හා ඛනිජ ආශ්‍රිත කර්මාන්ත"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-14-04",
              "revisionStatus": "not_started",
              "title": "දේශීය කර්මාන්ත, ටයිටේනියම් ඩයොක්සයිඩ හා ඛනිජ සම්පත්"
            }
          ],
          "unitId": "u-al27-chemistry-unit-14"
        },
        {
          "id": "al27-chemistry-unit-14-ch2",
          "title": "කාර්මික නිෂ්පාදන හා පාරිසරික බලපෑම්",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-14-05",
              "revisionStatus": "not_started",
              "title": "බහුඅවයවික, ප්ලාස්ටික් හා ආකලන"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-14-06",
              "revisionStatus": "not_started",
              "title": "එතනෝල්, විනාකිරි, සගන්ධ තෙල් හා ජෛව ඩීසල්"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-14-07",
              "revisionStatus": "not_started",
              "title": "වායු දූෂණය හා දේශගුණික බලපෑම්"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-chemistry-unit-14-08",
              "revisionStatus": "not_started",
              "title": "ජල දූෂණය හා ජල පිරිපහදුව"
            }
          ],
          "unitId": "u-al27-chemistry-unit-14"
        }
      ],
      "code": "CHEM",
      "color": "#16A34A",
      "currentGrade": "",
      "icon": "flask",
      "id": "al27-chemistry",
      "instructor": "",
      "lastStudied": "",
      "name": "රසායන විද්‍යාව",
      "nextExamDate": "",
      "nextExamTitle": "",
      "targetGrade": "",
      "totalHours": 0,
      "units": [
        {
          "id": "u-al27-chemistry-unit-01",
          "title": "පරමාණුක ව්‍යුහය"
        },
        {
          "id": "u-al27-chemistry-unit-02",
          "title": "ව්‍යුහය හා බන්ධන"
        },
        {
          "id": "u-al27-chemistry-unit-03",
          "title": "රසායනික ගණනය"
        },
        {
          "id": "u-al27-chemistry-unit-04",
          "title": "පදාර්ථයේ වායු අවස්ථාව"
        },
        {
          "id": "u-al27-chemistry-unit-05",
          "title": "ශක්ති විද්‍යාව"
        },
        {
          "id": "u-al27-chemistry-unit-06",
          "title": "s, p හා d ගොනු මූලද්‍රව්‍යවල රසායනය"
        },
        {
          "id": "u-al27-chemistry-unit-07",
          "title": "කාබනික රසායනයේ මූලික සංකල්ප"
        },
        {
          "id": "u-al27-chemistry-unit-08",
          "title": "හයිඩ්‍රොකාබන හා හැලොහයිඩ්‍රොකාබන"
        },
        {
          "id": "u-al27-chemistry-unit-09",
          "title": "ඔක්සිජන් අඩංගු කාබනික සංයෝග"
        },
        {
          "id": "u-al27-chemistry-unit-10",
          "title": "නයිට්‍රජන් අඩංගු කාබනික සංයෝග"
        },
        {
          "id": "u-al27-chemistry-unit-11",
          "title": "චාලක රසායනය"
        },
        {
          "id": "u-al27-chemistry-unit-12",
          "title": "සමතුලිතතාව"
        },
        {
          "id": "u-al27-chemistry-unit-13",
          "title": "විද්‍යුත් රසායනය"
        },
        {
          "id": "u-al27-chemistry-unit-14",
          "title": "කාර්මික රසායනය හා පරිසර දූෂණය"
        }
      ],
      "weeklyTargetHours": 0
    },
    {
      "chapters": [
        {
          "id": "al27-physics-unit-01",
          "title": "භෞතික රාශි හා මාන",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-01-01",
              "revisionStatus": "not_started",
              "title": "භෞතික විද්‍යාවේ විෂය පථය හා විද්‍යාත්මක ක්‍රමය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-01-02",
              "revisionStatus": "not_started",
              "title": "භෞතික රාශි, SI ඒකක හා උපසර්ග"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-01-03",
              "revisionStatus": "not_started",
              "title": "මාන හා මාන විශ්ලේෂණය"
            }
          ],
          "unitId": "u-al27-physics-unit-01"
        },
        {
          "id": "al27-physics-unit-01-ch2",
          "title": "මිනුම් හා දෛශික",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-01-04",
              "revisionStatus": "not_started",
              "title": "මිනුම් උපකරණ, දෝෂ හා ප්‍රතිශත දෝෂ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-01-05",
              "revisionStatus": "not_started",
              "title": "අදිශ, දෛශික හා දෛශික විභේදනය"
            }
          ],
          "unitId": "u-al27-physics-unit-01"
        },
        {
          "id": "al27-physics-unit-02",
          "title": "උත්තාරණ චලිතය හා බල",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-02-01",
              "revisionStatus": "not_started",
              "title": "චලිතය, ප්‍රවේගය, ත්වරණය හා චලිත ප්‍රස්තාර"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-02-02",
              "revisionStatus": "not_started",
              "title": "සරල රේඛීය චලිතය හා ප්‍රක්ෂිප්ත චලිතය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-02-03",
              "revisionStatus": "not_started",
              "title": "නිව්ටන් නියම හා බල"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-02-04",
              "revisionStatus": "not_started",
              "title": "ඝර්ෂණය හා ආනත තල"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-02-05",
              "revisionStatus": "not_started",
              "title": "ආවේගය, ගම්‍යතාව හා ඝට්ටන"
            }
          ],
          "unitId": "u-al27-physics-unit-02"
        },
        {
          "id": "al27-physics-unit-02-ch2",
          "title": "ශක්තිය හා භ්‍රමණ චලිතය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-02-06",
              "revisionStatus": "not_started",
              "title": "බල ඝූර්ණය හා බල සමතුලිතතාව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-02-07",
              "revisionStatus": "not_started",
              "title": "කාර්යය, ශක්තිය හා ජවය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-02-08",
              "revisionStatus": "not_started",
              "title": "වෘත්ත චලිතය හා කේන්ද්‍රාභිසාරී බලය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-02-09",
              "revisionStatus": "not_started",
              "title": "භ්‍රමණ චලිතය, අවස්ථිති ඝූර්ණය හා කෝණික ගම්‍යතාව"
            }
          ],
          "unitId": "u-al27-physics-unit-02"
        },
        {
          "id": "al27-physics-unit-02-ch3",
          "title": "තරල ස්ථිතිකය හා තරල ගතිකය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-02-10",
              "revisionStatus": "not_started",
              "title": "ද්‍රව ස්ථිතිකය, පීඩනය හා උත්ප්ලාවකතාව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-02-11",
              "revisionStatus": "not_started",
              "title": "ද්‍රව ගති විද්‍යාව, සන්තති සමීකරණය හා බර්නූලි මූලධර්මය"
            }
          ],
          "unitId": "u-al27-physics-unit-02"
        },
        {
          "id": "al27-physics-unit-03",
          "title": "දෝලන හා තරංග චලිතය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-03-01",
              "revisionStatus": "not_started",
              "title": "සරල අනුවර්තීය චලිතය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-03-02",
              "revisionStatus": "not_started",
              "title": "සරල අවලම්බය හා දුන්නක දෝලන"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-03-03",
              "revisionStatus": "not_started",
              "title": "තරංග ලක්ෂණ හා තරංග සමීකරණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-03-04",
              "revisionStatus": "not_started",
              "title": "අධිස්ථාපනය, නිරෝධනය හා ස්ථාවර තරංග"
            }
          ],
          "unitId": "u-al27-physics-unit-03"
        },
        {
          "id": "al27-physics-unit-03-ch2",
          "title": "ධ්වනි හා විද්‍යුත් චුම්බක තරංග",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-03-05",
              "revisionStatus": "not_started",
              "title": "ධ්වනි තරංග, අනුනාදය හා ස්වරක"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-03-06",
              "revisionStatus": "not_started",
              "title": "ඩොප්ලර් ආචරණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-03-07",
              "revisionStatus": "not_started",
              "title": "විද්‍යුත් චුම්බක තරංග"
            }
          ],
          "unitId": "u-al27-physics-unit-03"
        },
        {
          "id": "al27-physics-unit-03-ch3",
          "title": "ජ්‍යාමිතික ප්‍රකාශ විද්‍යාව",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-03-08",
              "revisionStatus": "not_started",
              "title": "ආලෝක පරාවර්තනය හා වර්තනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-03-09",
              "revisionStatus": "not_started",
              "title": "පූර්ණ අභ්‍යන්තර පරාවර්තනය හා ප්‍රිස්ම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-03-10",
              "revisionStatus": "not_started",
              "title": "කාච, දර්පණ හා දෘශ්‍ය උපකරණ"
            }
          ],
          "unitId": "u-al27-physics-unit-03"
        },
        {
          "id": "al27-physics-unit-04",
          "title": "තාප සංසිද්ධි හා වායු ආකෘති",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-04-01",
              "revisionStatus": "not_started",
              "title": "උෂ්ණත්වය, උෂ්ණත්වමිතිය හා උෂ්ණත්වමාන"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-04-02",
              "revisionStatus": "not_started",
              "title": "තාප ප්‍රසාරණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-04-03",
              "revisionStatus": "not_started",
              "title": "වායු නියම හා පරිපූර්ණ වායු සමීකරණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-04-04",
              "revisionStatus": "not_started",
              "title": "වායුවල චාලක අණුක වාදය"
            }
          ],
          "unitId": "u-al27-physics-unit-04"
        },
        {
          "id": "al27-physics-unit-04-ch2",
          "title": "තාපය හා අවස්ථා විපර්යාස",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-04-05",
              "revisionStatus": "not_started",
              "title": "තාප ධාරිතාව හා විශිෂ්ට තාප ධාරිතාව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-04-06",
              "revisionStatus": "not_started",
              "title": "තාපමිතිය හා ගුප්ත තාපය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-04-07",
              "revisionStatus": "not_started",
              "title": "වාෂ්ප පීඩනය හා ආර්ද්‍රතාව"
            }
          ],
          "unitId": "u-al27-physics-unit-04"
        },
        {
          "id": "al27-physics-unit-04-ch3",
          "title": "තාප ශක්තිය හුවමාරුව",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-04-08",
              "revisionStatus": "not_started",
              "title": "තාපගති විද්‍යාවේ පළමු නියමය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-04-09",
              "revisionStatus": "not_started",
              "title": "සන්නයනය, සංවහනය හා විකිරණය"
            }
          ],
          "unitId": "u-al27-physics-unit-04"
        },
        {
          "id": "al27-physics-unit-05",
          "title": "ගුරුත්වාකර්ෂණ බල හා ක්ෂේත්‍ර",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-05-01",
              "revisionStatus": "not_started",
              "title": "නිව්ටන්ගේ ගුරුත්වාකර්ෂණ නියමය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-05-02",
              "revisionStatus": "not_started",
              "title": "ගුරුත්වාකර්ෂණ ක්ෂේත්‍ර තීව්‍රතාව"
            }
          ],
          "unitId": "u-al27-physics-unit-05"
        },
        {
          "id": "al27-physics-unit-05-ch2",
          "title": "ගුරුත්වාකර්ෂණ ශක්තිය හා කක්ෂ",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-05-03",
              "revisionStatus": "not_started",
              "title": "ගුරුත්වාකර්ෂණ විභවය හා විභව ශක්තිය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-05-04",
              "revisionStatus": "not_started",
              "title": "චන්ද්‍රිකා කක්ෂ හා මිදුම් ප්‍රවේගය"
            }
          ],
          "unitId": "u-al27-physics-unit-05"
        },
        {
          "id": "al27-physics-unit-06",
          "title": "විද්‍යුත් ආරෝපණ, ක්ෂේත්‍ර හා විභවය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-06-01",
              "revisionStatus": "not_started",
              "title": "විද්‍යුත් ආරෝපණ හා කූලෝම් නියමය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-06-02",
              "revisionStatus": "not_started",
              "title": "විද්‍යුත් ක්ෂේත්‍ර තීව්‍රතාව හා ක්ෂේත්‍ර රේඛා"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-06-03",
              "revisionStatus": "not_started",
              "title": "විද්‍යුත් විභවය හා විභව ශක්තිය"
            }
          ],
          "unitId": "u-al27-physics-unit-06"
        },
        {
          "id": "al27-physics-unit-06-ch2",
          "title": "ධාරිත්‍රක",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-06-04",
              "revisionStatus": "not_started",
              "title": "ධාරිත්‍රක, ධාරිතාව හා සංයෝජන"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-06-05",
              "revisionStatus": "not_started",
              "title": "ධාරිත්‍රකවල ගබඩා ශක්තිය හා පාරවිද්‍යුත් ද්‍රව්‍ය"
            }
          ],
          "unitId": "u-al27-physics-unit-06"
        },
        {
          "id": "al27-physics-unit-07",
          "title": "චුම්බක ක්ෂේත්‍ර හා චුම්බක බල",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-07-01",
              "revisionStatus": "not_started",
              "title": "චුම්බක ක්ෂේත්‍ර හා චුම්බක ස්‍රාව ඝනත්වය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-07-02",
              "revisionStatus": "not_started",
              "title": "ධාරා ගෙනයන සන්නායකවල ක්ෂේත්‍ර"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-07-03",
              "revisionStatus": "not_started",
              "title": "ධාරා සහිත සන්නායක හා චලිත ආරෝපණ මත බල"
            }
          ],
          "unitId": "u-al27-physics-unit-07"
        },
        {
          "id": "al27-physics-unit-07-ch2",
          "title": "බල ඝූර්ණය හා විද්‍යුත් චුම්බක ප්‍රේරණය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-07-04",
              "revisionStatus": "not_started",
              "title": "ධාරා පුඩුවක ඝූර්ණය හා විද්‍යුත් මෝටර"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-07-05",
              "revisionStatus": "not_started",
              "title": "විද්‍යුත් චුම්බක ප්‍රේරණය, ෆැරඩේ හා ලෙන්ස් නියම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-07-06",
              "revisionStatus": "not_started",
              "title": "ප්‍රත්‍යාවර්ත ධාරා ජනක හා පරිණාමක"
            }
          ],
          "unitId": "u-al27-physics-unit-07"
        },
        {
          "id": "al27-physics-unit-08",
          "title": "ප්‍රතිරෝධ හා පරිපථ ජාල",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-08-01",
              "revisionStatus": "not_started",
              "title": "ධාරාව, විභව අන්තරය හා ප්‍රතිරෝධය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-08-02",
              "revisionStatus": "not_started",
              "title": "ඕම් නියමය, ප්‍රතිරෝධකතාව හා උෂ්ණත්ව බලපෑම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-08-03",
              "revisionStatus": "not_started",
              "title": "ශ්‍රේණි හා සමාන්තර ප්‍රතිරෝධක"
            }
          ],
          "unitId": "u-al27-physics-unit-08"
        },
        {
          "id": "al27-physics-unit-08-ch2",
          "title": "විද්‍යුත් ප්‍රභව, මිනුම් හා ජවය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-08-04",
              "revisionStatus": "not_started",
              "title": "විද්‍යුත්ගාමක බලය හා අභ්‍යන්තර ප්‍රතිරෝධය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-08-05",
              "revisionStatus": "not_started",
              "title": "කර්චොෆ් නියම හා පරිපථ ගණනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-08-06",
              "revisionStatus": "not_started",
              "title": "විභව බෙදුම්, විභවමානය හා වීට්ස්ටන් සේතුව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-08-07",
              "revisionStatus": "not_started",
              "title": "විද්‍යුත් ශක්තිය, ජවය හා ආරක්ෂාව"
            }
          ],
          "unitId": "u-al27-physics-unit-08"
        },
        {
          "id": "al27-physics-unit-09",
          "title": "අර්ධ සන්නායක උපාංග",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-09-01",
              "revisionStatus": "not_started",
              "title": "අර්ධ සන්නායක හා මාත්‍රණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-09-02",
              "revisionStatus": "not_started",
              "title": "p-n සන්ධි ඩයෝඩය හා ලක්ෂණ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-09-03",
              "revisionStatus": "not_started",
              "title": "සෘජුකරණය හා පෙරහන පරිපථ"
            }
          ],
          "unitId": "u-al27-physics-unit-09"
        },
        {
          "id": "al27-physics-unit-09-ch2",
          "title": "ප්‍රතිසම හා අංකිත පරිපථ",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-09-04",
              "revisionStatus": "not_started",
              "title": "ට්‍රාන්සිස්ටර හා වර්ධක"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-09-05",
              "revisionStatus": "not_started",
              "title": "කාරක වර්ධක හා සංසන්දක"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-09-06",
              "revisionStatus": "not_started",
              "title": "තාර්කික ද්වාර හා ඩිජිටල් පරිපථ"
            }
          ],
          "unitId": "u-al27-physics-unit-09"
        },
        {
          "id": "al27-physics-unit-10",
          "title": "ඝන ද්‍රව්‍යවල ප්‍රත්‍යාස්ථතාව",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-10-01",
              "revisionStatus": "not_started",
              "title": "ප්‍රත්‍යාස්ථතාව, ප්‍රත්‍යාබලය හා වික්‍රියාව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-10-02",
              "revisionStatus": "not_started",
              "title": "යං මාපාංකය හා ප්‍රත්‍යාස්ථ ශක්තිය"
            }
          ],
          "unitId": "u-al27-physics-unit-10"
        },
        {
          "id": "al27-physics-unit-10-ch2",
          "title": "ද්‍රව පෘෂ්ඨ හා ප්‍රවාහය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-10-03",
              "revisionStatus": "not_started",
              "title": "පෘෂ්ඨික ආතතිය හා කේශාකර්ෂණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-10-04",
              "revisionStatus": "not_started",
              "title": "දුස්ස්‍රාවිතාව, ස්ටෝක්ස් නියමය හා ආන්ත ප්‍රවේගය"
            }
          ],
          "unitId": "u-al27-physics-unit-10"
        },
        {
          "id": "al27-physics-unit-11",
          "title": "ක්වොන්ටම් භෞතිකය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-11-01",
              "revisionStatus": "not_started",
              "title": "ප්‍රකාශ විද්‍යුත් ආචරණය හා ෆෝටෝන"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-11-02",
              "revisionStatus": "not_started",
              "title": "තරංග අංශු ද්වෛතය හා ඩි බ්‍රොයි තරංග ආයාමය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-11-03",
              "revisionStatus": "not_started",
              "title": "පරමාණුක ශක්ති මට්ටම් හා වර්ණාවලි"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-11-04",
              "revisionStatus": "not_started",
              "title": "X කිරණ හා ඒවායේ යෙදීම්"
            }
          ],
          "unitId": "u-al27-physics-unit-11"
        },
        {
          "id": "al27-physics-unit-11-ch2",
          "title": "න්‍යෂ්ටික භෞතිකය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-11-05",
              "revisionStatus": "not_started",
              "title": "න්‍යෂ්ටික ව්‍යුහය, ස්කන්ධ ඌනතාව හා බන්ධන ශක්තිය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-11-06",
              "revisionStatus": "not_started",
              "title": "විකිරණශීලීතාව, ක්ෂය නියමය හා අර්ධ ආයු කාලය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-physics-unit-11-07",
              "revisionStatus": "not_started",
              "title": "න්‍යෂ්ටික විඛණ්ඩනය, විලයනය හා විකිරණ ආරක්ෂාව"
            }
          ],
          "unitId": "u-al27-physics-unit-11"
        }
      ],
      "code": "PHY",
      "color": "#3B82F6",
      "currentGrade": "",
      "icon": "brain",
      "id": "al27-physics",
      "instructor": "",
      "lastStudied": "",
      "name": "භෞතික විද්‍යාව",
      "nextExamDate": "",
      "nextExamTitle": "",
      "targetGrade": "",
      "totalHours": 0,
      "units": [
        {
          "id": "u-al27-physics-unit-01",
          "title": "මිනුම්"
        },
        {
          "id": "u-al27-physics-unit-02",
          "title": "යාන්ත්‍ර විද්‍යාව"
        },
        {
          "id": "u-al27-physics-unit-03",
          "title": "දෝලන හා තරංග"
        },
        {
          "id": "u-al27-physics-unit-04",
          "title": "තාප භෞතික විද්‍යාව"
        },
        {
          "id": "u-al27-physics-unit-05",
          "title": "ගුරුත්වාකර්ෂණ ක්ෂේත්‍රය"
        },
        {
          "id": "u-al27-physics-unit-06",
          "title": "ස්ථිති විද්‍යුත් ක්ෂේත්‍රය"
        },
        {
          "id": "u-al27-physics-unit-07",
          "title": "චුම්බක ක්ෂේත්‍රය"
        },
        {
          "id": "u-al27-physics-unit-08",
          "title": "ධාරා විද්‍යුතය"
        },
        {
          "id": "u-al27-physics-unit-09",
          "title": "ඉලෙක්ට්‍රොනික විද්‍යාව"
        },
        {
          "id": "u-al27-physics-unit-10",
          "title": "පදාර්ථයේ යාන්ත්‍රික ගුණ"
        },
        {
          "id": "u-al27-physics-unit-11",
          "title": "පදාර්ථ හා විකිරණ"
        }
      ],
      "weeklyTargetHours": 0
    },
    {
      "chapters": [
        {
          "id": "al27-math-f1",
          "title": "මූලික වීජ ගණිතය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-F1.1",
              "revisionStatus": "not_started",
              "title": "වීජීය ප්‍රකාශන ප්‍රසාරණය (වර්ග අන්තරය, ඝන එකතුව හා අන්තරය, පද තුනක ප්‍රකාශනවල වර්ග හා ඝන)"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-F1.2",
              "revisionStatus": "not_started",
              "title": "සර්වසාම්‍ය භාවිතයෙන් සාධක කිරීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-F1.3",
              "revisionStatus": "not_started",
              "title": "වීජීය භාග: එකතු කිරීම, අඩු කිරීම, ගුණ කිරීම හා බෙදීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-F1.4",
              "revisionStatus": "not_started",
              "title": "සමීකරණ: භාග සහිත සමීකරණ, නොදන්නා රාශි තුනක් දක්වා සමගාමී සමීකරණ, විචල්‍ය දෙකක වර්ගජ සමගාමී සමීකරණ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-F1.5",
              "revisionStatus": "not_started",
              "title": "දර්ශක හා ලඝුගණක: නීති, සරල කිරීම හා සමීකරණ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-F1.6",
              "revisionStatus": "not_started",
              "title": "අනුපාත හා සමානුපාත: ගුණ හා සමීකරණ"
            }
          ],
          "unitId": "math-f"
        },
        {
          "id": "al27-math-f2",
          "title": "තල ජ්‍යාමිතිය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-F2.1",
              "revisionStatus": "not_started",
              "title": "වෘත්ත ප්‍රමේය: ඡේදනය වන ජ්‍යා හා ඒකාන්තර ඛණ්ඩ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-F2.2",
              "revisionStatus": "not_started",
              "title": "පයිතගරස් ප්‍රමේය හා දිගු කිරීම්: සුළුකෝණ හා මහාකෝණ ත්‍රිකෝණ, ඇපලෝනියස් ප්‍රමේය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-F2.3",
              "revisionStatus": "not_started",
              "title": "අභ්‍යන්තර හා බාහිර කෝණ සමච්ඡේදක ප්‍රමේය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-F2.4",
              "revisionStatus": "not_started",
              "title": "සමරූපී ත්‍රිකෝණ: වර්ගඵල අනුපාත හා අනුරූප පාද"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-F2.5",
              "revisionStatus": "not_started",
              "title": "ත්‍රිකෝණ කේන්ද්‍ර: පරිවෘත්ත කේන්ද්‍රය, අන්තර්වෘත්ත කේන්ද්‍රය, ලම්බ කේන්ද්‍රය, මධ්‍යස්ථ කේන්ද්‍රය; මධ්‍යස්ථ හා ලම්බ"
            }
          ],
          "unitId": "math-f"
        },
        {
          "id": "al27-math-p01",
          "title": "තාත්වික සංඛ්‍යා",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-1.1",
              "revisionStatus": "not_started",
              "title": "සංඛ්‍යා පද්ධති: ඓතිහාසික විකාශය, සංඛ්‍යා කුලක හා අංකනය, සංඛ්‍යා රේඛාව මත ජ්‍යාමිතික නිරූපණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-1.2",
              "revisionStatus": "not_started",
              "title": "දශම නිරූපණය හා කරණි: අවසාන, අනන්ත, ආවර්ත හා අනාවර්ත දශම; කරණි සරල කිරීම හා හරය පරිමේය කිරීම"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p02",
          "title": "ශ්‍රිත",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-2.1",
              "revisionStatus": "not_started",
              "title": "එක් විචල්‍යයක ශ්‍රිත: නියත, විචල්‍ය, ශ්‍රිත අංකනය, වසම, සහවසම, පරාසය, එකට එක ශ්‍රිත, මතට ශ්‍රිත හා ප්‍රතිලෝම ශ්‍රිත"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-2.2",
              "revisionStatus": "not_started",
              "title": "ශ්‍රිත වර්ග හා ප්‍රස්තාර: නියත, රේඛීය, ඛණ්ඩ වශයෙන් අර්ථ දක්වන, මාපාංක හා සංයුක්ත ශ්‍රිත"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p03",
          "title": "වර්ගජ ශ්‍රිත හා වර්ගජ සමීකරණ",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-3.1",
              "revisionStatus": "not_started",
              "title": "වර්ගජ ශ්‍රිත: අර්ථ දැක්වීම, පූර්ණ වර්ගය සෑදීම, විවේචකය, උපරිමය හා අවමය, තාත්වික ශූන්‍යවල පැවැත්ම හා ප්‍රස්තාර"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-3.2",
              "revisionStatus": "not_started",
              "title": "වර්ගජ මූල: එකතුව හා ගුණිතය, මූලවල සමමිතික ප්‍රකාශන, මූලවල ස්වභාවය, සමීකරණ දෙකක පොදු මූල හා මූල පරිණාමනය"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p04",
          "title": "බහුපද",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-4.1",
              "revisionStatus": "not_started",
              "title": "එක් විචල්‍යයක බහුපද: පද, සංගුණක, මාත්‍රය, ප්‍රමුඛ පදය හා සංගුණකය, සර්වසම බහුපද"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-4.2",
              "revisionStatus": "not_started",
              "title": "බහුපද කර්ම: එකතු කිරීම, අඩු කිරීම, ගුණ කිරීම, බෙදීම හා දීර්ඝ බෙදීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-4.3",
              "revisionStatus": "not_started",
              "title": "බෙදීමේ ඇල්ගොරිතමය, සංශ්ලේෂී බෙදීම, ශේෂ ප්‍රමේය, සාධක ප්‍රමේය හා විලෝමය; ශූන්‍ය හා හතරවන මාත්‍රය දක්වා බහුපද සමීකරණ"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p05",
          "title": "පරිමේය ශ්‍රිත හා අර්ධ භාග",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-5.1",
              "revisionStatus": "not_started",
              "title": "නියම හා විෂම පරිමේය ශ්‍රිත; හරයෙහි වෙනස් රේඛීය, පුනරාවර්තී රේඛීය හා වර්ගජ සාධක සහිත අර්ධ භාග (නොදන්නා රාශි හතරක් දක්වා)"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p06",
          "title": "දර්ශක හා ලඝුගණක නීති",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-6.1",
              "revisionStatus": "not_started",
              "title": "දර්ශක නීති, ලඝුගණක නීති හා පාදය මාරු කිරීම"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p07",
          "title": "අසමානතා",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-7.1",
              "revisionStatus": "not_started",
              "title": "අසමානතාවල ගුණ: ත්‍රිවිභාජන නීතිය, සංඛ්‍යාත්මක අසමානතා, සංඛ්‍යා රේඛාව හා ප්‍රාන්තර අංකනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-7.2",
              "revisionStatus": "not_started",
              "title": "රේඛීය, වර්ගජ හා පරිමේය අසමානතා: වීජීය හා ප්‍රස්තාරික විසඳුම්"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-7.3",
              "revisionStatus": "not_started",
              "title": "මාපාංක අසමානතා: නිරපේක්ෂ අගය, ප්‍රස්තාර හා සරල රේඛීය මාපාංක අසමානතා"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p08",
          "title": "කෝණ මිනුම්",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-8.1",
              "revisionStatus": "not_started",
              "title": "ලකුණ සහිත කෝණ, අංශක, රේඩියන හා පරිවර්තනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-8.2",
              "revisionStatus": "not_started",
              "title": "චාප දිග හා වෘත්ත කේන්ද්‍රික ඛණ්ඩයේ වර්ගඵලය"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p09",
          "title": "වෘත්තීය ශ්‍රිත හා ත්‍රිකෝණමිතික සමීකරණ",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-9.1",
              "revisionStatus": "not_started",
              "title": "ත්‍රිකෝණමිතික ශ්‍රිත හය, වසම් හා පරාස"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-9.2",
              "revisionStatus": "not_started",
              "title": "සම්මත කෝණවල අගය හා චතුර්ථාංශවල ලකුණු"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-9.3",
              "revisionStatus": "not_started",
              "title": "සම්බන්ධිත කෝණ හා ආවර්තතාව: ඍණ කෝණ, π/2 හා π ගුණාකාර"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-9.4",
              "revisionStatus": "not_started",
              "title": "වෘත්තීය ශ්‍රිතවල ප්‍රස්තාර හා ආවර්ත ගුණ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-9.5",
              "revisionStatus": "not_started",
              "title": "සයින්, කොසයින් හා ටැන්ජන්ට් සමීකරණවල සාධාරණ විසඳුම්"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p10",
          "title": "ත්‍රිකෝණමිතික සර්වසාම්‍ය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-10.1",
              "revisionStatus": "not_started",
              "title": "පයිතගරස් සර්වසාම්‍ය; සර්වසාම්‍ය හා සමීකරණ අතර වෙනස"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-10.2",
              "revisionStatus": "not_started",
              "title": "එකතු හා අන්තර සූත්‍ර"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-10.3",
              "revisionStatus": "not_started",
              "title": "ගුණිත එකතුවට හා එකතුව ගුණිතයට හැරවීමේ සූත්‍ර"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-10.4",
              "revisionStatus": "not_started",
              "title": "ද්විත්ව, ත්‍රිත්ව හා අර්ධ කෝණ සූත්‍ර; a cos θ + b sin θ = c සමීකරණ විසඳීම"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p11",
          "title": "සයින් නීතිය හා කොසයින් නීතිය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-11.1",
              "revisionStatus": "not_started",
              "title": "ත්‍රිකෝණ අංකනය හා සයින් සහ කොසයින් නීති සාධනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-11.2",
              "revisionStatus": "not_started",
              "title": "සයින් හා කොසයින් නීති යෙදීම්"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p12",
          "title": "ප්‍රතිලෝම ත්‍රිකෝණමිතික ශ්‍රිත",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-12.1",
              "revisionStatus": "not_started",
              "title": "අර්ථ දැක්වීම්, ප්‍රධාන අගය, වසම් හා පරාස"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-12.2",
              "revisionStatus": "not_started",
              "title": "ප්‍රතිලෝම සයින්, කොසයින් හා ටැන්ජන්ට් ප්‍රස්තාර"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-12.3",
              "revisionStatus": "not_started",
              "title": "ප්‍රතිලෝම ත්‍රිකෝණමිතික ශ්‍රිත ආශ්‍රිත ගැටලු"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p13",
          "title": "සීමා හා සන්තතිකතාව",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-13.1",
              "revisionStatus": "not_started",
              "title": "ශ්‍රිතයක සීමාව: අන්තර්ඥානමය අදහස හා සීමාව නොපැවතීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-13.2",
              "revisionStatus": "not_started",
              "title": "මූලික සීමා ප්‍රමේය හා යෙදීම්"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-13.3",
              "revisionStatus": "not_started",
              "title": "බල ශ්‍රිත සීමාව: පරිමේය n සඳහා සූත්‍රය සාධනය හා යෙදීම්"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-13.4",
              "revisionStatus": "not_started",
              "title": "සිර කිරීමේ ප්‍රමේය (සාධනය නොමැතිව); ත්‍රිකෝණමිතික සීමාව සාධනය හා යෙදීම්"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-13.5",
              "revisionStatus": "not_started",
              "title": "වාම හා දක්ෂිණ පාර්ශ්වික සීමා"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-13.6",
              "revisionStatus": "not_started",
              "title": "අනන්තයේදී සීමා හා තිරස් අනන්තස්පර්ශක"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-13.7",
              "revisionStatus": "not_started",
              "title": "අනන්ත සීමා හා සිරස් අනන්තස්පර්ශක"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-13.8",
              "revisionStatus": "not_started",
              "title": "ලක්ෂ්‍යයකදී සන්තතිකතාව"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p14",
          "title": "අවකලනය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-14.1",
              "revisionStatus": "not_started",
              "title": "අවකලජය: ස්පර්ශක අනුක්‍රමණය, සීමාව හා වෙනස්වීමේ ශීඝ්‍රතාව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-14.2",
              "revisionStatus": "not_started",
              "title": "ප්‍රථම මූලධර්මයෙන් අවකලනය: පරිමේය බල, මූලික ත්‍රිකෝණමිතික ශ්‍රිත හා වීජීය සංයෝජන"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-14.3",
              "revisionStatus": "not_started",
              "title": "අවකලන නීති: නියත ගුණක, එකතු, ගුණිත, ලබ්ධි හා දාම නීති"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-14.4",
              "revisionStatus": "not_started",
              "title": "ප්‍රතිලෝම ත්‍රිකෝණමිතික ශ්‍රිතවල අවකලජ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-14.5",
              "revisionStatus": "not_started",
              "title": "ස්වාභාවික ඝාතීය ශ්‍රිතය: ගුණ, ප්‍රස්තාරය හා අවකලජය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-14.6",
              "revisionStatus": "not_started",
              "title": "ස්වාභාවික ලඝුගණක ශ්‍රිතය: වසම, පරාසය, ප්‍රස්තාරය හා අවකලජය; සාමාන්‍ය ඝාතීය ශ්‍රිතය aˣ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-14.7",
              "revisionStatus": "not_started",
              "title": "අව්‍යක්ත හා පරාමිතික අවකලනය; මූලාශ්‍රයේ සඳහන් පරාවලය, ඉලිප්සය හා බහුවලය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-14.8",
              "revisionStatus": "not_started",
              "title": "අනුක්‍රමික අවකලනය හා ඉහළ ගණයේ අවකලජ"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p15",
          "title": "අවකලනයේ යෙදීම්",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-15.1",
              "revisionStatus": "not_started",
              "title": "නිශ්චල ලක්ෂ්‍ය, වර්ධනය වන හා හීන වන ශ්‍රිත, දේශීය උපරිම/අවම, පළමු හා දෙවන අවකලජ පරීක්ෂණ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-15.2",
              "revisionStatus": "not_started",
              "title": "අවතලතාව හා නැවුම් ලක්ෂ්‍ය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-15.3",
              "revisionStatus": "not_started",
              "title": "තිරස් හා සිරස් අනන්තස්පර්ශක ඇතුළුව වක්‍ර ඇඳීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-15.4",
              "revisionStatus": "not_started",
              "title": "ප්‍රශස්තකරණ ගැටලු"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p16",
          "title": "අනුකලනය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-16.1",
              "revisionStatus": "not_started",
              "title": "අවකලනයේ ප්‍රතිලෝම ක්‍රියාව ලෙස අවිනිශ්චිත අනුකලනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-16.2",
              "revisionStatus": "not_started",
              "title": "අනුකලන ප්‍රමේය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-16.3",
              "revisionStatus": "not_started",
              "title": "නිශ්චිත අනුකල, කලනයේ මූලික ප්‍රමේය, ගුණ හා අගය සෙවීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-16.4",
              "revisionStatus": "not_started",
              "title": "පරිමේය ශ්‍රිත අනුකලනය: ලඝුගණක ආකාරය හා අර්ධ භාග"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-16.5",
              "revisionStatus": "not_started",
              "title": "ත්‍රිකෝණමිතික සර්වසාම්‍ය භාවිතයෙන් අනුකලනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-16.6",
              "revisionStatus": "not_started",
              "title": "ආදේශනයෙන් අනුකලනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-16.7",
              "revisionStatus": "not_started",
              "title": "කොටස් වශයෙන් අනුකලනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-16.8",
              "revisionStatus": "not_started",
              "title": "වක්‍රයක් යට හා වක්‍ර අතර වර්ගඵලය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-16.9",
              "revisionStatus": "not_started",
              "title": "භ්‍රමණයෙන් ජනිත ඝන වස්තුවල පරිමාව"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p17",
          "title": "කාටිසීය ඛණ්ඩාංක",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-17.1",
              "revisionStatus": "not_started",
              "title": "සෘජුකෝණී කාටිසීය ඛණ්ඩාංක පද්ධතිය හා දුර සූත්‍රය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-17.2",
              "revisionStatus": "not_started",
              "title": "රේඛා ඛණ්ඩයක් අනුපාතයකට අභ්‍යන්තරව හා බාහිරව බෙදීම"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p18",
          "title": "සරල රේඛා",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-18.1",
              "revisionStatus": "not_started",
              "title": "ආනතිය, අනුක්‍රමණය, අන්තඃඛණ්ඩ හා සරල රේඛා සමීකරණ ආකාර"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-18.2",
              "revisionStatus": "not_started",
              "title": "සමාන්තර නොවන රේඛාවල ඡේදනය හා ඡේදන ලක්ෂ්‍යය හරහා යන රේඛා පවුල"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-18.3",
              "revisionStatus": "not_started",
              "title": "රේඛාවක එකම හෝ ප්‍රතිවිරුද්ධ පැතිවල ලක්ෂ්‍ය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-18.4",
              "revisionStatus": "not_started",
              "title": "රේඛා අතර කෝණය, සමාන්තර හා ලම්බ රේඛාවල අනුක්‍රමණ, පරාමිතික රේඛා සමීකරණ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-18.5",
              "revisionStatus": "not_started",
              "title": "ලක්ෂ්‍යයක සිට රේඛාවකට ලම්බ දුර; කෝණ සමච්ඡේදක සමීකරණ"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p19",
          "title": "ගණිත අභ්‍යුහනය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-19.1",
              "revisionStatus": "not_started",
              "title": "ගණිත අභ්‍යුහන මූලධර්මය: බෙදිය හැකි බව, ශ්‍රේණි එකතු හා අසමානතා සාධනය"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p20",
          "title": "පරිමිත ශ්‍රේණි",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-20.1",
              "revisionStatus": "not_started",
              "title": "සිග්මා අංකනය හා සමාකලන එකතු කිරීමේ ගුණ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-20.2",
              "revisionStatus": "not_started",
              "title": "සමාන්තර හා ගුණෝත්තර ශ්‍රේණි; r, r² හා r³ එකතු"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p21",
          "title": "ශ්‍රේණි එකතුව හා අනන්ත ශ්‍රේණි",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-21.1",
              "revisionStatus": "not_started",
              "title": "අන්තර ක්‍රමය, අර්ධ භාග හා අභ්‍යුහනය මගින් ශ්‍රේණි එකතු කිරීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-21.2",
              "revisionStatus": "not_started",
              "title": "අනුක්‍රම, අර්ධ එකතු, අභිසරණය, අපසරණය හා අනන්තයට එකතුව"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p22",
          "title": "ද්විපද ප්‍රසාරණය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-22.1",
              "revisionStatus": "not_started",
              "title": "ධන පූර්ණ සංඛ්‍යා දර්ශක සඳහා ද්විපද ප්‍රමේය, සාධාරණ පදය, සංගුණක හා අභ්‍යුහනයෙන් සාධනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-22.2",
              "revisionStatus": "not_started",
              "title": "ද්විපද සංගුණක අතර සම්බන්ධතා හා විශේෂ පද සෙවීම"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p23",
          "title": "සංකීර්ණ සංඛ්‍යා",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-23.1",
              "revisionStatus": "not_started",
              "title": "අතාත්වික ඒකකය, සංකීර්ණ සංඛ්‍යා පද්ධතිය, තාත්වික හා අතාත්වික කොටස්, ශුද්ධ අතාත්වික සංඛ්‍යා හා සමානතාව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-23.2",
              "revisionStatus": "not_started",
              "title": "සංකීර්ණ සංඛ්‍යාවල වීජීය කර්ම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-23.3",
              "revisionStatus": "not_started",
              "title": "සංකීර්ණ ප්‍රතිබද්ධ හා මූලික ගුණ සාධනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-23.4",
              "revisionStatus": "not_started",
              "title": "මාපාංකය හා එහි ගුණ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-23.5",
              "revisionStatus": "not_started",
              "title": "ආර්ගන්ඩ් රූප සටහන, ජ්‍යාමිතික කර්ම, ධ්‍රැවීය ආකාරය, විස්තාරය හා ප්‍රධාන විස්තාරය, ත්‍රිකෝණ අසමානතාව හා ප්‍රතිලෝම ත්‍රිකෝණ අසමානතාව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-23.6",
              "revisionStatus": "not_started",
              "title": "ඩි මොයිවර් ප්‍රමේය: ප්‍රකාශය, සාධනය හා මූලික යෙදීම්"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-23.7",
              "revisionStatus": "not_started",
              "title": "මාපාංකය හා විස්තාරය භාවිතයෙන් විචල්‍ය සංකීර්ණ සංඛ්‍යාවල පථ හා ප්‍රදේශ"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p24",
          "title": "සංයෝජන හා සංයුක්ත කිරීම් (පිළිවෙළ සැකසීම් හා තේරීම්)",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-24.1",
              "revisionStatus": "not_started",
              "title": "ක්‍රමාරෝපිතය: අර්ථ දැක්වීම, සාධාරණ ආකාරය හා පුනරාවර්තන සම්බන්ධය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-24.2",
              "revisionStatus": "not_started",
              "title": "ගණනය කිරීමේ මූලික මූලධර්ම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-24.3",
              "revisionStatus": "not_started",
              "title": "පිළිවෙළ සැකසීම් (සංයෝජන): අර්ථ දැක්වීම, nPr අංකනය හා යෙදීම්"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-24.4",
              "revisionStatus": "not_started",
              "title": "තේරීම් (සංයුක්ත කිරීම්): අර්ථ දැක්වීම, nCr අංකනය, පිළිවෙළ සැකසීම්වලින් වෙනස හා යෙදීම්"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p25",
          "title": "න්‍යාස",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-25.1",
              "revisionStatus": "not_started",
              "title": "න්‍යාස අංකනය, අවයව, පේළි, තීරු, ප්‍රමාණය, පේළි/තීරු/සමචතුරස්‍ර/ශූන්‍ය න්‍යාස, සමානතාව, අදිශ ගුණනය, එකතු කිරීම, අඩු කිරීම හා ගුණ කිරීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-25.2",
              "revisionStatus": "not_started",
              "title": "සමචතුරස්‍ර න්‍යාස: ඒකක, විකර්ණ, සමමිතික, ප්‍රතිසමමිතික හා ඉහළ/පහළ ත්‍රිකෝණාකාර න්‍යාස"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-25.3",
              "revisionStatus": "not_started",
              "title": "පක්ෂාන්තරිත න්‍යාසය හා ප්‍රතිලෝම න්‍යාසය (2×2 සඳහා පමණි)"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-25.4",
              "revisionStatus": "not_started",
              "title": "විචල්‍ය දෙකක සමගාමී රේඛීය සමීකරණ; ඒකීය විසඳුම, අනන්ත විසඳුම් හා විසඳුම් නොමැති අවස්ථා, ප්‍රස්තාරික අර්ථකථනය"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p26",
          "title": "වෘත්තයක සමීකරණය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-26.1",
              "revisionStatus": "not_started",
              "title": "මූල ලක්ෂ්‍යය හෝ ඕනෑම කේන්ද්‍රයක් හා දී ඇති අරයක් සඳහා වෘත්තයේ කාටිසීය සමීකරණය"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-p27",
          "title": "වෘත්ත හා ස්පර්ශක",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-27.1",
              "revisionStatus": "not_started",
              "title": "රේඛාව හා වෘත්තය අතර සාපේක්ෂ පිහිටීම: ඡේදනය, ස්පර්ශය හෝ ඡේදනය නොවීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-27.2",
              "revisionStatus": "not_started",
              "title": "ලක්ෂ්‍යයකදී ස්පර්ශකය, බාහිර ලක්ෂ්‍යයකින් ඇඳෙන ස්පර්ශක, ස්පර්ශක දිග හා ස්පර්ශ ජ්‍යාව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-27.3",
              "revisionStatus": "not_started",
              "title": "රේඛාවක් හා වෘත්තයක් ඡේදනය වන ලක්ෂ්‍ය හරහා යන වෘත්ත පවුල"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-27.4",
              "revisionStatus": "not_started",
              "title": "වෘත්ත දෙකක සාපේක්ෂ පිහිටීම: ඡේදනය, ඡේදනය නොවීම, බාහිර/අභ්‍යන්තර ස්පර්ශය හා එකක් අනෙක තුළ පිහිටීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-I-27.5",
              "revisionStatus": "not_started",
              "title": "වෘත්ත දෙකක ලම්බක ඡේදනය"
            }
          ],
          "unitId": "math-p"
        },
        {
          "id": "al27-math-a01",
          "title": "දෛශික",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-1.1",
              "revisionStatus": "not_started",
              "title": "අදිශ හා දෛශික රාශි; විශාලත්වය, දිශාව, අංකනය, ශූන්‍ය දෛශිකය, සමානතාව, ත්‍රිකෝණ නීතිය, අදිශයකින් ගුණ කිරීම, අඩු කිරීම, ඒකක දෛශික, සමාන්තර දෛශික, දෛශික කිහිපයක් එකතු කිරීම හා ඕනෑම දිශාවලට විභේදනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-1.2",
              "revisionStatus": "not_started",
              "title": "දෛශික එකතු කිරීම හා අදිශ ගුණනය පිළිබඳ වීජීය නීති"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-1.3",
              "revisionStatus": "not_started",
              "title": "පිහිටුම් දෛශික, කාටිසීය ඒකක දෛශික i හා j, ද්විමාන පිහිටුම් දෛශික හා ස්වායත්ත අසමාන්තර දෛශිකවල යෙදීම්"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-1.4",
              "revisionStatus": "not_started",
              "title": "අදිශ ගුණිතය හා දෛශික ගුණිතය: අර්ථ දැක්වීම්, ගුණ, ලම්බකතාව හා ඒකක දෛශිකය k"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a02",
          "title": "අංශුවක් මත ක්‍රියා කරන බල",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.1",
              "revisionStatus": "not_started",
              "title": "අංශුව, බලය, නිරූපණය, මාන, ඒකක, බල වර්ග හා සම්ප්‍රයුක්ත බලය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.2",
              "revisionStatus": "not_started",
              "title": "බල දෙකක්: සමාන්තරාස්‍ර නීතිය, සම්ප්‍රයුක්තය, සමතුලිතතාව හා දී ඇති හෝ ලම්බ දිශාවලට විභේදනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.3",
              "revisionStatus": "not_started",
              "title": "ඒකතල ඒකලක්ෂ්‍යීය බල: සංරචක, විභේදන හා ප්‍රස්තාරික ක්‍රමයෙන් සම්ප්‍රයුක්තය, සමතුලිතතා කොන්දේසි හා බල බහුඅස්‍රය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.4",
              "revisionStatus": "not_started",
              "title": "බල තුනක් යටතේ අංශුවක සමතුලිතතාව: ත්‍රිකෝණ නීතිය, ලැමී ප්‍රමේය හා යෙදීම්"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a03",
          "title": "දෘඪ වස්තුවක් මත ක්‍රියා කරන ඒකතල බල",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.5",
              "revisionStatus": "not_started",
              "title": "දෘඪ වස්තුව, බල සම්ප්‍රේෂණ මූලධර්මය, උත්තාරණය හා භ්‍රමණය, බලයක ඝූර්ණය, විශාලත්වය හා දිශා අර්ථය, මාන හා ඒකක, ඝූර්ණ මූලධර්මය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.6",
              "revisionStatus": "not_started",
              "title": "සමාන්තර හා අසමාන්තර බලවල සම්ප්‍රයුක්තය; සමදිශ හා විරුද්ධදිශ සමාන්තර බල, බල දෙකක් යටතේ සමතුලිතතාව, බල යුග්ම, යුග්ම ඝූර්ණය, තුල්‍ය හා සංයුක්ත යුග්ම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.7",
              "revisionStatus": "not_started",
              "title": "ඒකතල බල පද්ධතියක් බලයකට හා බල යුග්මයකට ඌනනය; සම්ප්‍රයුක්තය හා ක්‍රියා රේඛාව; තනි බලයකට හෝ යුග්මයකට ඌනනය; දෘඪ වස්තුවල සමතුලිතතාව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.8",
              "revisionStatus": "not_started",
              "title": "බල තුනක් යටතේ දෘඪ වස්තුවක සමතුලිතතාව: ඒකලක්ෂ්‍යීයතාව හෝ සමාන්තරතාව, ත්‍රිකෝණ නීතිය, ලැමී ප්‍රමේය, කෝටැන්ජන්ට් නීතිය, ජ්‍යාමිතිය හා විභේදනය"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a04",
          "title": "ඝර්ෂණය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.9",
              "revisionStatus": "not_started",
              "title": "සුමට හා රළු පෘෂ්ඨ, ඝර්ෂණයේ ස්වභාවය, වාසි හා අවාසි, සීමාකාරී ඝර්ෂණය, ඝර්ෂණ නීති, ඝර්ෂණ සංගුණකය, ඝර්ෂණ කෝණය හා සමතුලිතතා ගැටලු"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a05",
          "title": "සන්ධි කළ දඬු",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.10",
              "revisionStatus": "not_started",
              "title": "සරල සන්ධි, චල හා දෘඪ සන්ධි, සුමට සන්ධිවල බල හා සන්ධි කළ දඬුවල සමතුලිතතාව"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a06",
          "title": "රාමු සැකිලි",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.11",
              "revisionStatus": "not_started",
              "title": "සුමටව සන්ධි කළ සැහැල්ලු දඬුවල රාමු, සන්ධිවල සමතුලිතතාව, බෝ අංකනය, ආතති රූප සටහන හා ආතති සහ තෙරපුම් ගණනය"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a07",
          "title": "ස්කන්ධ කේන්ද්‍රය හා ගුරුත්ව කේන්ද්‍රය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.12",
              "revisionStatus": "not_started",
              "title": "සමමිතික ඒකාකාර වස්තුවල ස්කන්ධ කේන්ද්‍ර: සිහින් දණ්ඩ, සෘජුකෝණාස්‍රාකාර තහඩුව, වෘත්තාකාර වළල්ල හා තැටිය, කුහර/ඝන සිලින්ඩර හා ගෝල; සිහින් තීරු මගින් ත්‍රිකෝණාකාර හා සමාන්තරාස්‍රාකාර තහඩු"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.13",
              "revisionStatus": "not_started",
              "title": "අනුකලනයෙන් ස්කන්ධ කේන්ද්‍රය: වෘත්ත චාප, කේන්ද්‍රික ඛණ්ඩ, කුහර/ඝන කේතුව, කුහර/ඝන අර්ධගෝල හා ගෝල ඛණ්ඩ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.14",
              "revisionStatus": "not_started",
              "title": "සංයුක්ත හා ඉතිරි වස්තුවල ස්කන්ධ කේන්ද්‍රය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.15",
              "revisionStatus": "not_started",
              "title": "ගුරුත්ව කේන්ද්‍රය හා ස්කන්ධ කේන්ද්‍රය සමපාත වීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.16",
              "revisionStatus": "not_started",
              "title": "තලයක් මත රැඳී ඇති වස්තුවල සමතුලිතතාවේ ස්ථායිතාව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-2.17",
              "revisionStatus": "not_started",
              "title": "එල්ලා ඇති වස්තු හා ආනත කෝණය"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a08",
          "title": "සරල රේඛීය චලිතය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.1",
              "revisionStatus": "not_started",
              "title": "දුර, වේගය, විස්ථාපනය, ප්‍රවේගය හා ත්වරණය: මාන, ඒකක, මධ්‍යන්‍ය/ක්ෂණික/ඒකාකාර අගය, මන්දනය, විස්ථාපන–කාල හා ප්‍රවේග–කාල ප්‍රස්තාර, අනුක්‍රමණය හා ලකුණ සහිත වර්ගඵලය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.2",
              "revisionStatus": "not_started",
              "title": "නියත ත්වරණ චලිත සමීකරණ: අර්ථ දැක්වීම් හා ප්‍රස්තාර මගින් ව්‍යුත්පන්න කිරීම; ගුරුත්වය යටතේ සිරස් චලිතය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.3",
              "revisionStatus": "not_started",
              "title": "ඒකමාන සාපේක්ෂ චලිතය: සමුද්දේශ රාමුව, සාපේක්ෂ විස්ථාපනය, ප්‍රවේගය හා ත්වරණය; නියත සාපේක්ෂ ත්වරණය"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a09",
          "title": "තලයක චලිතය හා සාපේක්ෂ චලිතය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.4",
              "revisionStatus": "not_started",
              "title": "ද්විමාන පිහිටුම්, ප්‍රවේග හා ත්වරණ දෛශික, කාලය අනුව අවකලනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.5",
              "revisionStatus": "not_started",
              "title": "තලයක අංශු දෙකක සාපේක්ෂ චලිතය: සමුද්දේශ රාමුව, සාපේක්ෂ විස්ථාපනය, ප්‍රවේගය, ත්වරණය හා පථය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.6",
              "revisionStatus": "not_started",
              "title": "සාපේක්ෂ චලිතයේ යෙදීම්: අවම දුර හා එයට ගතවන කාලය, ගැටීමේ කාලය හා පිහිටීම, දී ඇති පථයක් ගමන් කිරීමට ගතවන කාලය, දෛශික ක්‍රම"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a10",
          "title": "ප්‍රක්ෂිප්ත",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.7",
              "revisionStatus": "not_started",
              "title": "සිරස් තලයක ප්‍රක්ෂිප්ත චලිතය: විස්ථාපනය හා ප්‍රවේගයේ තිරස්/සිරස් සංරචක, පථ සමීකරණය, උපරිම උස, පියාසර කාලය, තිරස් පරාසය, එකම පරාසය දෙන ප්‍රක්ෂේපණ කෝණ හා උපරිම පරාසය"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a11",
          "title": "නිව්ටන්ගේ චලිත නියම",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.8",
              "revisionStatus": "not_started",
              "title": "නිව්ටන්ගේ පළමු, දෙවන හා තෙවන නියම; ස්කන්ධය, රේඛීය ගම්‍යතාව, අවස්ථිති සමුද්දේශ රාමුව, බලයේ නිරපේක්ෂ හා ගුරුත්ව ඒකක, බර හා ස්කන්ධය අතර වෙනස, නියත බල ගැටලු, සම්බන්ධිත අංශු හා ස්පර්ශයේ පවතින වස්තු"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a12",
          "title": "කාර්යය, ශක්තිය හා ජවය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.9",
              "revisionStatus": "not_started",
              "title": "නියත බලයක් යටතේ කාර්යය, මාන හා ඒකක; චාලක ශක්තිය හා කාර්ය–ශක්ති සමීකරණය; සංස්ථිතික හා විසරණ බල; ගුරුත්ව හා ප්‍රත්‍යාස්ථ විභව ශක්තිය; යාන්ත්‍රික ශක්ති සංස්ථිතිය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.10",
              "revisionStatus": "not_started",
              "title": "ජවය, මාන හා ඒකක, නියත කර්ෂණ බලය හා P=F·v"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a13",
          "title": "ආවේගය, ගම්‍යතාව හා ගැටීම්",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.11",
              "revisionStatus": "not_started",
              "title": "ආවේග දෛශිකය, මාන හා ඒකක, ආවේග–ගම්‍යතා සම්බන්ධය, ආවේග ක්‍රියාවක් නිසා චාලක ශක්ති හානිය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.12",
              "revisionStatus": "not_started",
              "title": "නිව්ටන්ගේ ප්‍රත්‍යාගති නියමය, ප්‍රත්‍යාගති සංගුණකය, පූර්ණ ප්‍රත්‍යාස්ථ ගැටීම, ශක්ති හානිය, සුමට ගෝලවල සෘජු ගැටීම හා තලයකට ලම්බ ගැටීම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.13",
              "revisionStatus": "not_started",
              "title": "රේඛීය ගම්‍යතා සංස්ථිතිය හා යෙදීම්"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a14",
          "title": "වෘත්ත චලිතය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.14",
              "revisionStatus": "not_started",
              "title": "කෝණික ප්‍රවේගය හා ත්වරණය; වෘත්ත චලිතයේ ප්‍රවේගය හා ත්වරණය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.15",
              "revisionStatus": "not_started",
              "title": "තිරස් වෘත්ත චලිතය: සුමට තිරස් තලයක සැහැල්ලු අවිතන්‍ය තන්තුවකට බැඳි අංශුව; කේතුක අවලම්බය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.16",
              "revisionStatus": "not_started",
              "title": "ශක්ති සංස්ථිතිය හා F=ma මගින් සිරස් වෘත්ත චලිතය: සුමට ගෝල පෘෂ්ඨය, කුහර ගෝලය තුළ, සැහැල්ලු තන්තුව, ස්ථාවර සුමට වෘත්තාකාර කම්බිය හා සිරස් නළය"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a15",
          "title": "සරල අනුවර්තී චලිතය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.17",
              "revisionStatus": "not_started",
              "title": "අර්ථ දැක්වීම, ලාක්ෂණික සමීකරණය හා විසඳුම, විස්ථාපනයේ ශ්‍රිතයක් ලෙස ප්‍රවේගය, විස්තාරය, ආවර්ත කාලය, විස්ථාපන–කාල සම්බන්ධය හා වෘත්ත චලිතයෙන් අර්ථකථනය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.18",
              "revisionStatus": "not_started",
              "title": "ප්‍රත්‍යාස්ථ බල යටතේ තිරස් සරල අනුවර්තී චලිතය: හුක් නියමය, ප්‍රත්‍යාස්ථ තන්තුවක ආතතිය හා දුන්නක ආතතිය/තෙරපුම"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-3.19",
              "revisionStatus": "not_started",
              "title": "ප්‍රත්‍යාස්ථ බල හා බර යටතේ සිරස් සරල අනුවර්තී චලිතය; ගුරුත්වය යටතේ නිදහස් චලිතය සමඟ සංයෝජනය"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a16",
          "title": "සම්භාවිතාව",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-4.1",
              "revisionStatus": "not_started",
              "title": "සසම්භාවී පරීක්ෂණ, පරිමිත/අපරිමිත නියැදි අවකාශ හා නියැදි ලක්ෂ්‍ය, සරල/සංයුක්ත/ශූන්‍ය/අනුපූරක සිද්ධි, මේලය, ඡේදනය, අන්‍යෝන්‍ය වශයෙන් බහිෂ්කාර, පරිපූර්ණ හා සමසම්භාවී සිද්ධි"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-4.2",
              "revisionStatus": "not_started",
              "title": "සම්භාවිතාවේ සම්භාව්‍ය අර්ථ දැක්වීම, සංඛ්‍යාත ආසන්නය හා ප්‍රත්‍යක්ෂ මත පදනම් වූ අර්ථ දැක්වීම; සීමාවන්; අනුපූරක හා එකතු කිරීමේ ප්‍රමේය, ඒකදිශතාව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-4.3",
              "revisionStatus": "not_started",
              "title": "කොන්දේසිගත සම්භාවිතාව, කොන්දේසිගත සම්භාවිතා ප්‍රමේය හා ගුණ කිරීමේ නීතිය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-4.4",
              "revisionStatus": "not_started",
              "title": "සිද්ධි දෙකක හා තුනක ස්වායත්තතාව, යුගල වශයෙන් හා අන්‍යෝන්‍ය ස්වායත්තතාව"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-4.5",
              "revisionStatus": "not_started",
              "title": "නියැදි අවකාශ විභජනය, මුළු සම්භාවිතා ප්‍රමේය හා බේස් ප්‍රමේය"
            }
          ],
          "unitId": "math-a"
        },
        {
          "id": "al27-math-a17",
          "title": "සංඛ්‍යානය",
          "topics": [
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-5.1",
              "revisionStatus": "not_started",
              "title": "සංඛ්‍යානයේ අර්ථ දැක්වීම හා ස්වභාවය; විස්තරාත්මක සංඛ්‍යානය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-5.2",
              "revisionStatus": "not_started",
              "title": "කේන්ද්‍රීය ප්‍රවණතා මිනුම්: අංකගණිත මධ්‍යන්‍යය, මාතය, මධ්‍යස්ථය, සමූහගත/අසමූහගත සංඛ්‍යාත දත්ත හා භාරිත අංකගණිත මධ්‍යන්‍යය"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-5.3",
              "revisionStatus": "not_started",
              "title": "සාපේක්ෂ පිහිටුම් මිනුම්: මධ්‍යස්ථය, චතුර්ථක, ප්‍රතිශතක හා කොටු ප්‍රස්තාර"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-5.4",
              "revisionStatus": "not_started",
              "title": "විසිරුම් මිනුම්: පරාසය, අන්තශ්චතුර්ථක පරාසය, අර්ධ අන්තශ්චතුර්ථක පරාසය, මධ්‍යන්‍ය අපගමනය, විචලතාව, සමූහගත/අසමූහගත දත්ත සඳහා සම්මත අපගමනය; සංයුක්ත මධ්‍යන්‍යය, සංයුක්ත විචලතාව හා z-ලකුණ"
            },
            {
              "completed": false,
              "confidence": 1,
              "difficulty": "medium",
              "id": "al27-math-topic-II-5.5",
              "revisionStatus": "not_started",
              "title": "ව්‍යාප්තියේ හැඩය හා කාල් පියර්සන්ගේ ඇලතාව මිනුම්"
            }
          ],
          "unitId": "math-a"
        }
      ],
      "code": "CM",
      "color": "#A855F7",
      "currentGrade": "",
      "icon": "sigma",
      "id": "al27-combined-maths",
      "instructor": "",
      "lastStudied": "",
      "name": "සංයුක්ත ගණිතය",
      "nextExamDate": "",
      "nextExamTitle": "",
      "targetGrade": "",
      "totalHours": 0,
      "units": [
        {
          "id": "math-f",
          "title": "මූලික පාඨමාලාව"
        },
        {
          "id": "math-p",
          "title": "ශුද්ධ ගණිතය"
        },
        {
          "id": "math-a",
          "title": "ව්‍යවහාරික ගණිතය"
        }
      ],
      "weeklyTargetHours": 0
    }
  ],
  "tasks": [
    {
      "description": "Academic unit / group: රසායනික ගණනය - Chemical Calculations\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-11-25\nSource calendar event ID: AL27-lesson-C01\nOriginal lesson: C01\nUnit: Chemical Calculations\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/x8DmnrQbMfc\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-11-25",
      "dueLabel": "2026-11-25",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-C01",
      "priority": "high",
      "status": "todo",
      "subjectId": "al27-chemistry",
      "subtasks": [],
      "title": "රසායනික ගණනය - Chemical Calculations - Redox Seminar"
    },
    {
      "description": "Academic unit / group: ත්‍රිකෝණමිතිය - Trigonometry\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-11-25\nSource calendar event ID: AL27-lesson-M01\nOriginal lesson: M01\nUnit: Trigonometry\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/x_UWPR_GnZk\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-11-25",
      "dueLabel": "2026-11-25",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-M01",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "ත්‍රිකෝණමිතිය - Trigonometry - Day 03"
    },
    {
      "description": "Academic unit / group: යාන්ත්‍ර විද්‍යාව - Mechanics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-11-26\nSource calendar event ID: AL27-lesson-P01\nOriginal lesson: P01\nUnit: Mechanics\nOriginal class date: 09 Oct\nRecording duration: 6:21:20\nResource: https://youtu.be/ikQMSrOunvg\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-11-26",
      "dueLabel": "2026-11-26",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P01",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "නිව්ටන් නියම - Newton's Laws - Introduction"
    },
    {
      "description": "Academic unit / group: ව්‍යුහය හා බන්ධන - Structure and Bonding\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-11-26\nSource calendar event ID: AL27-lesson-C02\nOriginal lesson: C02\nUnit: Structure and Bonding\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/rZUWJThFAMM\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-11-26",
      "dueLabel": "2026-11-26",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-C02",
      "priority": "high",
      "status": "todo",
      "subjectId": "al27-chemistry",
      "subtasks": [],
      "title": "ව්‍යුහය හා බන්ධන - Structure and Bonding - Day 08"
    },
    {
      "description": "Academic unit / group: ව්‍යුහය හා බන්ධන - Structure and Bonding\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-11-27\nSource calendar event ID: AL27-lesson-C03\nOriginal lesson: C03\nUnit: Structure and Bonding\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://student.echem.lk/student/lessons/eyJpdiI6IlUzZ2tEN3dmUGZTbnFoUzBTU1R0QVE9PSIsInZhbHVlIjoiTUlnZ3J6VlRUZXNSNXE5UFpFMk1WQT09IiwibWFjIjoiYzE1MWJhZWM0NzNmNTQ2YjBlNjZhY2ViYzk1ZTViNDE4NDUyODNkMGY4ZmFjY2YzMmY4MTZhMjBhOWYxZmM4YiIsInRhZyI6IiJ9\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-11-27",
      "dueLabel": "2026-11-27",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-C03",
      "priority": "high",
      "status": "todo",
      "subjectId": "al27-chemistry",
      "subtasks": [],
      "title": "ව්‍යුහය හා බන්ධන - Structure and Bonding - Day 09"
    },
    {
      "description": "Academic unit / group: ත්‍රිකෝණමිතිය - Trigonometry\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-11-27\nSource calendar event ID: AL27-lesson-M02\nOriginal lesson: M02\nUnit: Trigonometry\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/oUmw0jGJnv4\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-11-27",
      "dueLabel": "2026-11-27",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-M02",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "ත්‍රිකෝණමිතිය - Trigonometry - Day 04"
    },
    {
      "description": "Academic unit / group: යාන්ත්‍ර විද්‍යාව - Mechanics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-11-28\nSource calendar event ID: AL27-lesson-P02\nOriginal lesson: P02\nUnit: Mechanics\nOriginal class date: 16 Oct\nRecording duration: 6:14:53\nResource: https://youtu.be/u6SV7YwzEYs\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-11-28",
      "dueLabel": "2026-11-28",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P02",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "නිව්ටන් නියම - Newton's Laws - Special Concepts and Pulleys"
    },
    {
      "description": "Academic unit / group: ශක්ති විද්‍යාව - Energetics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-11-28\nSource calendar event ID: AL27-lesson-C04\nOriginal lesson: C04\nUnit: Energetics\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/WKE2Pc4Ep8A\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-11-28",
      "dueLabel": "2026-11-28",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-C04",
      "priority": "high",
      "status": "todo",
      "subjectId": "al27-chemistry",
      "subtasks": [],
      "title": "ශක්ති විද්‍යාව - Energetics - Day 01"
    },
    {
      "description": "Academic unit / group: ශක්ති විද්‍යාව - Energetics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-11-29\nSource calendar event ID: AL27-lesson-C05\nOriginal lesson: C05\nUnit: Energetics\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://student.echem.lk/student/lessons/eyJpdiI6IjNkR2FKU1NKSitJVUhQVXhFaTg3c3c9PSIsInZhbHVlIjoiQ1ltZjAwZmZmcW5FaHh4aXdBSFBrQT09IiwibWFjIjoiODIwN2VhNTU1ZTAzYTlhMDA0N2Y5MGMwNmE5NWQ4MGEyZWQ5MjQzMDc5OTQyMjk3NzFhOTlmZjI4YTk3NTNkYyIsInRhZyI6IiJ9\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-11-29",
      "dueLabel": "2026-11-29",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-C05",
      "priority": "high",
      "status": "todo",
      "subjectId": "al27-chemistry",
      "subtasks": [],
      "title": "ශක්ති විද්‍යාව - Energetics - Day 02"
    },
    {
      "description": "Academic unit / group: චලිත විද්‍යාව - Kinematics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-11-29\nSource calendar event ID: AL27-lesson-M03\nOriginal lesson: M03\nUnit: Kinematics\nOriginal class date: Unknown\nRecording duration: 2:59:15\nResource: https://youtu.be/zmO9c6Baphg (shared with Relative Velocity Day 1; verify content)\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-11-29",
      "dueLabel": "2026-11-29",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-M03",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "ප්‍රවේග කාල ප්‍රස්තාර - Velocity-Time Graphs - Day 01"
    },
    {
      "description": "Academic unit / group: යාන්ත්‍ර විද්‍යාව - Mechanics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-11-30\nSource calendar event ID: AL27-lesson-P03\nOriginal lesson: P03\nUnit: Mechanics\nOriginal class date: 23 Oct\nRecording duration: Unknown\nResource: https://youtu.be/_BS_-q9rVow\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-11-30",
      "dueLabel": "2026-11-30",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P03",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "නිව්ටන් නියම - Newton's Laws - Pulleys and Inclined Planes"
    },
    {
      "description": "Academic unit / group: ශක්ති විද්‍යාව - Energetics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-11-30\nSource calendar event ID: AL27-lesson-C06\nOriginal lesson: C06\nUnit: Energetics\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://student.echem.lk/student/lessons/eyJpdiI6IjhBUTdoRFd5WEpTOXNycUtkNGR3SWc9PSIsInZhbHVlIjoialBEaDRMWGJ1V2ZPQ09FU1oycVE3dz09IiwibWFjIjoiMzUxNDkxMWQ0NjhmOWQ3ZmVlYWEwNDYyYWFiZjJhNjRiNzAyZTI4NDk3MWIwZTk2YzZhODlhZDBlODI0YjJhMiIsInRhZyI6IiJ9\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-11-30",
      "dueLabel": "2026-11-30",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-C06",
      "priority": "high",
      "status": "todo",
      "subjectId": "al27-chemistry",
      "subtasks": [],
      "title": "ශක්ති විද්‍යාව - Energetics - Day 03"
    },
    {
      "description": "Academic unit / group: ශක්ති විද්‍යාව - Energetics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-01\nSource calendar event ID: AL27-lesson-C07\nOriginal lesson: C07\nUnit: Energetics\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://student.echem.lk/student/lessons/eyJpdiI6Ik95ZlhaUEZybGJiTWI4eXhneVRwZXc9PSIsInZhbHVlIjoieUx5VWkvcFhXMXE2QlVsWFNGdXJwdz09IiwibWFjIjoiYzY3NmNlNTQ3ODcxNWY4NDhlOTVhMmM2OTFjMDM1ZTBiNmJjMGIzNTBmZWQyN2IyOTdiNTY3ZDZkOTUzNDliNCIsInRhZyI6IiJ9 (listed as live; recording not verified)\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-01",
      "dueLabel": "2026-12-01",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-C07",
      "priority": "high",
      "status": "todo",
      "subjectId": "al27-chemistry",
      "subtasks": [],
      "title": "ශක්ති විද්‍යාව - Energetics - Day 04"
    },
    {
      "description": "Academic unit / group: සාපේක්ෂ ප්‍රවේගය - Relative Velocity\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-01\nSource calendar event ID: AL27-lesson-M04\nOriginal lesson: M04\nUnit: Relative Velocity\nOriginal class date: Unknown\nRecording duration: 3:42:50 (previously reported, unverified)\nResource: https://youtu.be/bB0XCLcdQ0s\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-01",
      "dueLabel": "2026-12-01",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-M04",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "සාපේක්ෂ ප්‍රවේගය - Relative Velocity - Day 02"
    },
    {
      "description": "Academic unit / group: යාන්ත්‍ර විද්‍යාව - Mechanics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-02\nSource calendar event ID: AL27-lesson-P04\nOriginal lesson: P04\nUnit: Mechanics\nOriginal class date: 30 Oct\nRecording duration: Unknown\nResource: https://youtu.be/Gn-XV2kCk2k\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-02",
      "dueLabel": "2026-12-02",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P04",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "ආවේගය හා ගම්‍යතාව - Impulse and Momentum"
    },
    {
      "description": "Academic unit / group: චාලක රසායනය - Chemical Kinetics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-02\nSource calendar event ID: AL27-lesson-C08\nOriginal lesson: C08\nUnit: Chemical Kinetics\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://student.echem.lk/student/lessons/eyJpdiI6InI3UzFGMTB2YzhQV2ZNVW5jVlN5U3c9PSIsInZhbHVlIjoiVHIzVWlpM1VpZzZidlpxMUs1N2daUT09IiwibWFjIjoiMTZlMjg2NGFiYzA1ZGQwZGE2MDk2YTEyODBlODAyMzRmMTBmZjY3NmFlMDcyZjA0OTUwNDMwMWNkNWFlNmJkMSIsInRhZyI6IiJ9\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-02",
      "dueLabel": "2026-12-02",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-C08",
      "priority": "high",
      "status": "todo",
      "subjectId": "al27-chemistry",
      "subtasks": [],
      "title": "චාලක රසායනය - Chemical Kinetics - Day 01"
    },
    {
      "description": "Academic unit / group: රසායන විද්‍යා අමතර පුනරීක්ෂණය - Chemistry Extra Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-03\nSource calendar event ID: AL27-class-Chemistry-Extra-Revision-2026-11-25\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-11-25\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-03",
      "dueLabel": "2026-12-03",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Chemistry-Extra-Revision-2026-11-25",
      "priority": "high",
      "status": "todo",
      "subjectId": "al27-chemistry",
      "subtasks": [],
      "title": "අමතර රසායන විද්‍යා පුනරීක්ෂණය - Chemistry Extra Revision - 2026-11-25"
    },
    {
      "description": "Academic unit / group: සාපේක්ෂ ප්‍රවේගය - Relative Velocity\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-03\nSource calendar event ID: AL27-lesson-M05\nOriginal lesson: M05\nUnit: Relative Velocity\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/h2rdnEPjd9Y\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-03",
      "dueLabel": "2026-12-03",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-M05",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "සාපේක්ෂ ප්‍රවේගය - Relative Velocity - Day 03"
    },
    {
      "description": "Academic unit / group: යාන්ත්‍ර විද්‍යාව - Mechanics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-04\nSource calendar event ID: AL27-lesson-P05\nOriginal lesson: P05\nUnit: Mechanics\nOriginal class date: 01 Nov\nRecording duration: 4:43:28\nResource: https://youtu.be/j3z24QM7-yE\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-04",
      "dueLabel": "2026-12-04",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P05",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "නිව්ටන් නියම - Newton's Laws - Tension and Pulleys"
    },
    {
      "description": "Academic unit / group: රසායන විද්‍යා ප්‍රධාන පුනරීක්ෂණය - Chemistry Main Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-04\nSource calendar event ID: AL27-class-Chemistry-Main-Revision-2026-11-30\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-11-30\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-04",
      "dueLabel": "2026-12-04",
      "estimatedMinutes": 360,
      "id": "task-AL27-class-Chemistry-Main-Revision-2026-11-30",
      "priority": "high",
      "status": "todo",
      "subjectId": "al27-chemistry",
      "subtasks": [],
      "title": "ප්‍රධාන රසායන විද්‍යා පුනරීක්ෂණය - Chemistry Main Revision - 2026-11-30"
    },
    {
      "description": "Academic unit / group: රසායන විද්‍යා අමතර පුනරීක්ෂණය - Chemistry Extra Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-05\nSource calendar event ID: AL27-class-Chemistry-Extra-Revision-2026-12-02\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-02\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-05",
      "dueLabel": "2026-12-05",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Chemistry-Extra-Revision-2026-12-02",
      "priority": "high",
      "status": "todo",
      "subjectId": "al27-chemistry",
      "subtasks": [],
      "title": "අමතර රසායන විද්‍යා පුනරීක්ෂණය - Chemistry Extra Revision - 2026-12-02"
    },
    {
      "description": "Academic unit / group: ද්විපද ප්‍රසාරණය - Binomial Expansion\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-05\nSource calendar event ID: AL27-lesson-M06\nOriginal lesson: M06\nUnit: Binomial Expansion\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/17w2HFHz0O4\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-05",
      "dueLabel": "2026-12-05",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-M06",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "ද්විපද ප්‍රසාරණය - Binomial Expansion"
    },
    {
      "description": "Academic unit / group: යාන්ත්‍ර විද්‍යාව - Mechanics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-06\nSource calendar event ID: AL27-lesson-P06\nOriginal lesson: P06\nUnit: Mechanics\nOriginal class date: 05 Nov\nRecording duration: Unknown\nResource: https://www.youtube.com/live/oGqA9Eg55TE?si=ZAnLrNV5GmGd43Vs\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-06",
      "dueLabel": "2026-12-06",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P06",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "ඝර්ෂණය - Friction - Session 01"
    },
    {
      "description": "Academic unit / group: දෛශික - Vectors\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-07\nSource calendar event ID: AL27-lesson-M07\nOriginal lesson: M07\nUnit: Vectors\nOriginal class date: Unknown\nRecording duration: 4:56:38\nResource: https://cmwithmn.lk/watch-video/5651c696-9d76-44de-8904-d38425c40728\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-07",
      "dueLabel": "2026-12-07",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-M07",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "දෛශික - Vectors - Day 01"
    },
    {
      "description": "Academic unit / group: යාන්ත්‍ර විද්‍යාව - Mechanics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-08\nSource calendar event ID: AL27-lesson-P07\nOriginal lesson: P07\nUnit: Mechanics\nOriginal class date: 06 Nov\nRecording duration: 6:13:07\nResource: https://youtu.be/m2cSpuAJgNE\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-08",
      "dueLabel": "2026-12-08",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P07",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "ඝර්ෂණය - Friction - Session 02"
    },
    {
      "description": "Academic unit / group: දෛශික - Vectors\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-08\nSource calendar event ID: AL27-lesson-M08\nOriginal lesson: M08\nUnit: Vectors\nOriginal class date: Unknown\nRecording duration: 4:16:37\nResource: https://cmwithmn.lk/watch-video/d5bef1ea-689e-4bb3-9165-b590d4fbe7a3\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-08",
      "dueLabel": "2026-12-08",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-M08",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "දෛශික - Vectors - Day 02"
    },
    {
      "description": "Academic unit / group: යාන්ත්‍ර විද්‍යාව - Mechanics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-09\nSource calendar event ID: AL27-lesson-P08\nOriginal lesson: P08\nUnit: Mechanics\nOriginal class date: 13 Nov\nRecording duration: 6:06:54\nResource: https://youtu.be/b3wA_TsvBQM\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-09",
      "dueLabel": "2026-12-09",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P08",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "බල සමතුලිතතාව - Equilibrium of Forces - Introduction"
    },
    {
      "description": "Academic unit / group: යාන්ත්‍ර විද්‍යාව - Mechanics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-10\nSource calendar event ID: AL27-lesson-P09\nOriginal lesson: P09\nUnit: Mechanics\nOriginal class date: 20 Nov\nRecording duration: 6:13:34\nResource: https://youtu.be/33smY3XQulk\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-10",
      "dueLabel": "2026-12-10",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P09",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "බල සමතුලිතතාව - Equilibrium of Forces - Full Lesson"
    },
    {
      "description": "Academic unit / group: බලය - Forces\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-10\nSource calendar event ID: AL27-lesson-M09\nOriginal lesson: M09\nUnit: Forces\nOriginal class date: Unknown\nRecording duration: 5:07:29\nResource: https://cmwithmn.lk/watch-video/10cf5921-83a7-4618-b676-f60c09b6fb0e\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-10",
      "dueLabel": "2026-12-10",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-M09",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "බලය - Forces - Day 01"
    },
    {
      "description": "Academic unit / group: විශේෂ පුනරීක්ෂණය - Super Revision\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-11\nSource calendar event ID: AL27-lesson-M10\nOriginal lesson: M10\nUnit: Super Revision\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/geQAwP14-Fk\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-11",
      "dueLabel": "2026-12-11",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-M10",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 05"
    },
    {
      "description": "Academic unit / group: විශේෂ පුනරීක්ෂණය - Super Revision\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-11\nSource calendar event ID: AL27-lesson-M11\nOriginal lesson: M11\nUnit: Super Revision\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/z8Ka9befBiM\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-11",
      "dueLabel": "2026-12-11",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-M11",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 06"
    },
    {
      "description": "Academic unit / group: විශේෂ පුනරීක්ෂණය - Super Revision\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-12\nSource calendar event ID: AL27-lesson-M12\nOriginal lesson: M12\nUnit: Super Revision\nOriginal class date: Unknown\nRecording duration: 4:03:23\nResource: https://cmwithmn.lk/watch-video/e69d4899-1e76-456f-9778-c4929dd2d1c1\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-12",
      "dueLabel": "2026-12-12",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-M12",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 07"
    },
    {
      "description": "Academic unit / group: තාප භෞතික විද්‍යාව - Thermal Physics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-12\nSource calendar event ID: AL27-lesson-P10\nOriginal lesson: P10\nUnit: Thermal Physics\nOriginal class date: 04 Oct\nRecording duration: 3:26:13\nResource: https://youtu.be/W-3TspTyOf8\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-12",
      "dueLabel": "2026-12-12",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-P10",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "උෂ්ණත්වමිතිය - Thermometry - Introduction"
    },
    {
      "description": "Academic unit / group: තාප භෞතික විද්‍යාව - Thermal Physics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-13\nSource calendar event ID: AL27-lesson-P11\nOriginal lesson: P11\nUnit: Thermal Physics\nOriginal class date: 11 Oct\nRecording duration: 3:23:09\nResource: https://youtu.be/EFLOmITeDXk\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-13",
      "dueLabel": "2026-12-13",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P11",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "උෂ්ණත්වමාන - Thermometers - Full Lesson"
    },
    {
      "description": "Academic unit / group: විශේෂ පුනරීක්ෂණය - Super Revision\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-13\nSource calendar event ID: AL27-lesson-M13\nOriginal lesson: M13\nUnit: Super Revision\nOriginal class date: Unknown\nRecording duration: 2:29:16\nResource: https://cmwithmn.lk/watch-video/22f2c9f3-c158-4e17-b477-e08c424af595\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-13",
      "dueLabel": "2026-12-13",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-M13",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 08"
    },
    {
      "description": "Academic unit / group: විශේෂ පුනරීක්ෂණය - Super Revision\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-14\nSource calendar event ID: AL27-lesson-M14\nOriginal lesson: M14\nUnit: Super Revision\nOriginal class date: Unknown\nRecording duration: 2:47:48\nResource: https://cmwithmn.lk/watch-video/8248496a-865c-4ca2-9693-13c082a72e71\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-14",
      "dueLabel": "2026-12-14",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-M14",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 09"
    },
    {
      "description": "Academic unit / group: තාප භෞතික විද්‍යාව - Thermal Physics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-15\nSource calendar event ID: AL27-lesson-P12\nOriginal lesson: P12\nUnit: Thermal Physics\nOriginal class date: 18 Oct\nRecording duration: 3:24:40\nResource: https://youtu.be/pI2JBDfHB2E\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-15",
      "dueLabel": "2026-12-15",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P12",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "වායු නියම - Gas Laws - Introduction"
    },
    {
      "description": "Academic unit / group: සංයුක්ත ගණිත විශේෂ පුනරීක්ෂණය - Combined Mathematics Super Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-15\nSource calendar event ID: AL27-class-Combined-Mathematics-Super-Revision-2026-11-27\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-11-27\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-15",
      "dueLabel": "2026-12-15",
      "estimatedMinutes": 360,
      "id": "task-AL27-class-Combined-Mathematics-Super-Revision-2026-11-27",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "විශේෂ සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Super Revision - 2026-11-27"
    },
    {
      "description": "Academic unit / group: සංයුක්ත ගණිත ප්‍රධාන පුනරීක්ෂණය - Combined Mathematics Main Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-16\nSource calendar event ID: AL27-class-Combined-Mathematics-Main-Revision-2026-12-01\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-01\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-16",
      "dueLabel": "2026-12-16",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Combined-Mathematics-Main-Revision-2026-12-01",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "ප්‍රධාන සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Main Revision - 2026-12-01"
    },
    {
      "description": "Academic unit / group: සංයුක්ත ගණිත විශේෂ පුනරීක්ෂණය - Combined Mathematics Super Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-17\nSource calendar event ID: AL27-class-Combined-Mathematics-Super-Revision-2026-12-04\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-04\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-17",
      "dueLabel": "2026-12-17",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Combined-Mathematics-Super-Revision-2026-12-04",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "විශේෂ සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Super Revision - 2026-12-04"
    },
    {
      "description": "Academic unit / group: තාප භෞතික විද්‍යාව - Thermal Physics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-17\nSource calendar event ID: AL27-lesson-P13\nOriginal lesson: P13\nUnit: Thermal Physics\nOriginal class date: 01 Nov (approx.)\nRecording duration: 3:13:30\nResource: Not located\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-17",
      "dueLabel": "2026-12-17",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-P13",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "චාල්ස් නියමය - Charles's Law"
    },
    {
      "description": "Academic unit / group: තාප භෞතික විද්‍යාව - Thermal Physics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-18\nSource calendar event ID: AL27-lesson-P14\nOriginal lesson: P14\nUnit: Thermal Physics\nOriginal class date: 08 Nov (approx.)\nRecording duration: 3:16:48\nResource: https://youtu.be/2IOqmSTlu0U\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-18",
      "dueLabel": "2026-12-18",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P14",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "චාලක අණුක වාදය - Kinetic Theory of Gases"
    },
    {
      "description": "Academic unit / group: සංයුක්ත ගණිත ප්‍රධාන පුනරීක්ෂණය - Combined Mathematics Main Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-18\nSource calendar event ID: AL27-class-Combined-Mathematics-Main-Revision-2026-12-08\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-08\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-18",
      "dueLabel": "2026-12-18",
      "estimatedMinutes": 360,
      "id": "task-AL27-class-Combined-Mathematics-Main-Revision-2026-12-08",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "ප්‍රධාන සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Main Revision - 2026-12-08"
    },
    {
      "description": "Academic unit / group: තාප භෞතික විද්‍යාව - Thermal Physics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-19\nSource calendar event ID: AL27-lesson-P15\nOriginal lesson: P15\nUnit: Thermal Physics\nOriginal class date: 15 Nov (approx.)\nRecording duration: Unknown\nResource: Not located\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-19",
      "dueLabel": "2026-12-19",
      "estimatedMinutes": 450,
      "id": "task-AL27-lesson-P15",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "තාපමිතිය - Calorimetry - Full Lesson"
    },
    {
      "description": "Academic unit / group: සංයුක්ත ගණිත විශේෂ පුනරීක්ෂණය - Combined Mathematics Super Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-19\nSource calendar event ID: AL27-class-Combined-Mathematics-Super-Revision-2026-12-11\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-11\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-19",
      "dueLabel": "2026-12-19",
      "estimatedMinutes": 360,
      "id": "task-AL27-class-Combined-Mathematics-Super-Revision-2026-12-11",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "විශේෂ සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Super Revision - 2026-12-11"
    },
    {
      "description": "Academic unit / group: සංයුක්ත ගණිත ප්‍රධාන පුනරීක්ෂණය - Combined Mathematics Main Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-20\nSource calendar event ID: AL27-class-Combined-Mathematics-Main-Revision-2026-12-15\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-15\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-20",
      "dueLabel": "2026-12-20",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Combined-Mathematics-Main-Revision-2026-12-15",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "ප්‍රධාන සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Main Revision - 2026-12-15"
    },
    {
      "description": "Academic unit / group: තාප භෞතික විද්‍යාව - Thermal Physics\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-20\nSource calendar event ID: AL27-lesson-P16\nOriginal lesson: P16\nUnit: Thermal Physics\nOriginal class date: 22 Nov (approx.)\nRecording duration: 3:15:16\nResource: https://youtu.be/SNdxaDkHMl0\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "dueDate": "2026-12-20",
      "dueLabel": "2026-12-20",
      "estimatedMinutes": 360,
      "id": "task-AL27-lesson-P16",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "තාපමිතිය - Calorimetry - Special Concepts"
    },
    {
      "description": "Academic unit / group: සංයුක්ත ගණිත විශේෂ පුනරීක්ෂණය - Combined Mathematics Super Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-21\nSource calendar event ID: AL27-class-Combined-Mathematics-Super-Revision-2026-12-18\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-18\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-21",
      "dueLabel": "2026-12-21",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Combined-Mathematics-Super-Revision-2026-12-18",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-combined-maths",
      "subtasks": [],
      "title": "විශේෂ සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Super Revision - 2026-12-18"
    },
    {
      "description": "Academic unit / group: භෞතික විද්‍යා ප්‍රධාන පුනරීක්ෂණය - Physics Main Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-22\nSource calendar event ID: AL27-class-Physics-Main-Revision-2026-11-25\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-11-25\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-22",
      "dueLabel": "2026-12-22",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Physics-Main-Revision-2026-11-25",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 2026-11-25"
    },
    {
      "description": "Academic unit / group: භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-23\nSource calendar event ID: AL27-class-Physics-Sunday-Class-2026-11-29\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-11-29\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-23",
      "dueLabel": "2026-12-23",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Physics-Sunday-Class-2026-11-29",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 2026-11-29"
    },
    {
      "description": "Academic unit / group: භෞතික විද්‍යා ප්‍රධාන පුනරීක්ෂණය - Physics Main Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-24\nSource calendar event ID: AL27-class-Physics-Main-Revision-2026-12-02\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-02\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-24",
      "dueLabel": "2026-12-24",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Physics-Main-Revision-2026-12-02",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 2026-12-02"
    },
    {
      "description": "Academic unit / group: භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-24\nSource calendar event ID: AL27-class-Physics-Sunday-Class-2026-12-06\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-06\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-24",
      "dueLabel": "2026-12-24",
      "estimatedMinutes": 360,
      "id": "task-AL27-class-Physics-Sunday-Class-2026-12-06",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 2026-12-06"
    },
    {
      "description": "Academic unit / group: භෞතික විද්‍යා ප්‍රධාන පුනරීක්ෂණය - Physics Main Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-25\nSource calendar event ID: AL27-class-Physics-Main-Revision-2026-12-09\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-09\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-25",
      "dueLabel": "2026-12-25",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Physics-Main-Revision-2026-12-09",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 2026-12-09"
    },
    {
      "description": "Academic unit / group: භෞතික විද්‍යා ප්‍රධාන පුනරීක්ෂණය - Physics Main Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-26\nSource calendar event ID: AL27-class-Physics-Main-Revision-2026-12-16\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-16\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-26",
      "dueLabel": "2026-12-26",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Physics-Main-Revision-2026-12-16",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 2026-12-16"
    },
    {
      "description": "Academic unit / group: භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-26\nSource calendar event ID: AL27-class-Physics-Sunday-Class-2026-12-13\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-13\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-26",
      "dueLabel": "2026-12-26",
      "estimatedMinutes": 360,
      "id": "task-AL27-class-Physics-Sunday-Class-2026-12-13",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 2026-12-13"
    },
    {
      "description": "Academic unit / group: භෞතික විද්‍යා ප්‍රධාන පුනරීක්ෂණය - Physics Main Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-27\nSource calendar event ID: AL27-class-Physics-Main-Revision-2026-12-23\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-23\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-27",
      "dueLabel": "2026-12-27",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Physics-Main-Revision-2026-12-23",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 2026-12-23"
    },
    {
      "description": "Academic unit / group: භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-27\nSource calendar event ID: AL27-class-Physics-Sunday-Class-2026-12-20\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-20\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-27",
      "dueLabel": "2026-12-27",
      "estimatedMinutes": 360,
      "id": "task-AL27-class-Physics-Sunday-Class-2026-12-20",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 2026-12-20"
    },
    {
      "description": "Academic unit / group: භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)\nComplete recording, notes, homework and exercises.\nScheduled date: 2026-12-28\nSource calendar event ID: AL27-class-Physics-Sunday-Class-2026-12-27\nRECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-27\nNo verified recording URL or duration yet.",
      "dueDate": "2026-12-28",
      "dueLabel": "2026-12-28",
      "estimatedMinutes": 450,
      "id": "task-AL27-class-Physics-Sunday-Class-2026-12-27",
      "priority": "medium",
      "status": "todo",
      "subjectId": "al27-physics",
      "subtasks": [],
      "title": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 2026-12-27"
    }
  ],
  "sessions": [
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-25",
      "dayIndex": 2,
      "durationHours": 7.5,
      "id": "AL27-lesson-C01",
      "location": "",
      "notes": "Original lesson: C01\nUnit: Chemical Calculations\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/x8DmnrQbMfc\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "රසායනික ගණනය - Chemical Calculations - Redox Seminar"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-25",
      "dayIndex": 2,
      "durationHours": 6,
      "id": "AL27-lesson-M01",
      "location": "",
      "notes": "Original lesson: M01\nUnit: Trigonometry\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/x_UWPR_GnZk\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "ත්‍රිකෝණමිතිය - Trigonometry - Day 03"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-11-25",
      "dayIndex": 2,
      "durationHours": 6,
      "id": "AL27-2026-11-25-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-11-25",
      "dayIndex": 2,
      "durationHours": 1.5,
      "id": "AL27-2026-11-25-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-25",
      "dayIndex": 2,
      "durationHours": 1,
      "id": "AL27-2026-11-25-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Physics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-26",
      "dayIndex": 3,
      "durationHours": 7.5,
      "id": "AL27-lesson-P01",
      "location": "",
      "notes": "Original lesson: P01\nUnit: Mechanics\nOriginal class date: 09 Oct\nRecording duration: 6:21:20\nResource: https://youtu.be/ikQMSrOunvg\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "නිව්ටන් නියම - Newton's Laws - Introduction"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-26",
      "dayIndex": 3,
      "durationHours": 6,
      "id": "AL27-lesson-C02",
      "location": "",
      "notes": "Original lesson: C02\nUnit: Structure and Bonding\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/rZUWJThFAMM\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "ව්‍යුහය හා බන්ධන - Structure and Bonding - Day 08"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-11-26",
      "dayIndex": 3,
      "durationHours": 6,
      "id": "AL27-2026-11-26-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-11-26",
      "dayIndex": 3,
      "durationHours": 1.5,
      "id": "AL27-2026-11-26-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-26",
      "dayIndex": 3,
      "durationHours": 1,
      "id": "AL27-2026-11-26-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-27",
      "dayIndex": 4,
      "durationHours": 7.5,
      "id": "AL27-lesson-C03",
      "location": "",
      "notes": "Original lesson: C03\nUnit: Structure and Bonding\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://student.echem.lk/student/lessons/eyJpdiI6IlUzZ2tEN3dmUGZTbnFoUzBTU1R0QVE9PSIsInZhbHVlIjoiTUlnZ3J6VlRUZXNSNXE5UFpFMk1WQT09IiwibWFjIjoiYzE1MWJhZWM0NzNmNTQ2YjBlNjZhY2ViYzk1ZTViNDE4NDUyODNkMGY4ZmFjY2YzMmY4MTZhMjBhOWYxZmM4YiIsInRhZyI6IiJ9\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "ව්‍යුහය හා බන්ධන - Structure and Bonding - Day 09"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-27",
      "dayIndex": 4,
      "durationHours": 6,
      "id": "AL27-lesson-M02",
      "location": "",
      "notes": "Original lesson: M02\nUnit: Trigonometry\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/oUmw0jGJnv4\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "ත්‍රිකෝණමිතිය - Trigonometry - Day 04"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-11-27",
      "dayIndex": 4,
      "durationHours": 6,
      "id": "AL27-2026-11-27-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-11-27",
      "dayIndex": 4,
      "durationHours": 1.5,
      "id": "AL27-2026-11-27-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-27",
      "dayIndex": 4,
      "durationHours": 1,
      "id": "AL27-2026-11-27-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Physics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-28",
      "dayIndex": 5,
      "durationHours": 7.5,
      "id": "AL27-lesson-P02",
      "location": "",
      "notes": "Original lesson: P02\nUnit: Mechanics\nOriginal class date: 16 Oct\nRecording duration: 6:14:53\nResource: https://youtu.be/u6SV7YwzEYs\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "නිව්ටන් නියම - Newton's Laws - Special Concepts and Pulleys"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-28",
      "dayIndex": 5,
      "durationHours": 6,
      "id": "AL27-lesson-C04",
      "location": "",
      "notes": "Original lesson: C04\nUnit: Energetics\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/WKE2Pc4Ep8A\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "ශක්ති විද්‍යාව - Energetics - Day 01"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-11-28",
      "dayIndex": 5,
      "durationHours": 6,
      "id": "AL27-2026-11-28-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-11-28",
      "dayIndex": 5,
      "durationHours": 1.5,
      "id": "AL27-2026-11-28-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-28",
      "dayIndex": 5,
      "durationHours": 1,
      "id": "AL27-2026-11-28-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-29",
      "dayIndex": 6,
      "durationHours": 7.5,
      "id": "AL27-lesson-C05",
      "location": "",
      "notes": "Original lesson: C05\nUnit: Energetics\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://student.echem.lk/student/lessons/eyJpdiI6IjNkR2FKU1NKSitJVUhQVXhFaTg3c3c9PSIsInZhbHVlIjoiQ1ltZjAwZmZmcW5FaHh4aXdBSFBrQT09IiwibWFjIjoiODIwN2VhNTU1ZTAzYTlhMDA0N2Y5MGMwNmE5NWQ4MGEyZWQ5MjQzMDc5OTQyMjk3NzFhOTlmZjI4YTk3NTNkYyIsInRhZyI6IiJ9\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "ශක්ති විද්‍යාව - Energetics - Day 02"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-29",
      "dayIndex": 6,
      "durationHours": 6,
      "id": "AL27-lesson-M03",
      "location": "",
      "notes": "Original lesson: M03\nUnit: Kinematics\nOriginal class date: Unknown\nRecording duration: 2:59:15\nResource: https://youtu.be/zmO9c6Baphg (shared with Relative Velocity Day 1; verify content)\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "ප්‍රවේග කාල ප්‍රස්තාර - Velocity-Time Graphs - Day 01"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-11-29",
      "dayIndex": 6,
      "durationHours": 6,
      "id": "AL27-2026-11-29-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-11-29",
      "dayIndex": 6,
      "durationHours": 1.5,
      "id": "AL27-2026-11-29-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-29",
      "dayIndex": 6,
      "durationHours": 1,
      "id": "AL27-2026-11-29-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Physics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-30",
      "dayIndex": 0,
      "durationHours": 7.5,
      "id": "AL27-lesson-P03",
      "location": "",
      "notes": "Original lesson: P03\nUnit: Mechanics\nOriginal class date: 23 Oct\nRecording duration: Unknown\nResource: https://youtu.be/_BS_-q9rVow\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "නිව්ටන් නියම - Newton's Laws - Pulleys and Inclined Planes"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-30",
      "dayIndex": 0,
      "durationHours": 6,
      "id": "AL27-lesson-C06",
      "location": "",
      "notes": "Original lesson: C06\nUnit: Energetics\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://student.echem.lk/student/lessons/eyJpdiI6IjhBUTdoRFd5WEpTOXNycUtkNGR3SWc9PSIsInZhbHVlIjoialBEaDRMWGJ1V2ZPQ09FU1oycVE3dz09IiwibWFjIjoiMzUxNDkxMWQ0NjhmOWQ3ZmVlYWEwNDYyYWFiZjJhNjRiNzAyZTI4NDk3MWIwZTk2YzZhODlhZDBlODI0YjJhMiIsInRhZyI6IiJ9\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "ශක්ති විද්‍යාව - Energetics - Day 03"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-11-30",
      "dayIndex": 0,
      "durationHours": 6,
      "id": "AL27-2026-11-30-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-11-30",
      "dayIndex": 0,
      "durationHours": 1.5,
      "id": "AL27-2026-11-30-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-11-30",
      "dayIndex": 0,
      "durationHours": 1,
      "id": "AL27-2026-11-30-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-01",
      "dayIndex": 1,
      "durationHours": 7.5,
      "id": "AL27-lesson-C07",
      "location": "",
      "notes": "Original lesson: C07\nUnit: Energetics\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://student.echem.lk/student/lessons/eyJpdiI6Ik95ZlhaUEZybGJiTWI4eXhneVRwZXc9PSIsInZhbHVlIjoieUx5VWkvcFhXMXE2QlVsWFNGdXJwdz09IiwibWFjIjoiYzY3NmNlNTQ3ODcxNWY4NDhlOTVhMmM2OTFjMDM1ZTBiNmJjMGIzNTBmZWQyN2IyOTdiNTY3ZDZkOTUzNDliNCIsInRhZyI6IiJ9 (listed as live; recording not verified)\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "ශක්ති විද්‍යාව - Energetics - Day 04"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-01",
      "dayIndex": 1,
      "durationHours": 6,
      "id": "AL27-lesson-M04",
      "location": "",
      "notes": "Original lesson: M04\nUnit: Relative Velocity\nOriginal class date: Unknown\nRecording duration: 3:42:50 (previously reported, unverified)\nResource: https://youtu.be/bB0XCLcdQ0s\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "සාපේක්ෂ ප්‍රවේගය - Relative Velocity - Day 02"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-01",
      "dayIndex": 1,
      "durationHours": 6,
      "id": "AL27-2026-12-01-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-01",
      "dayIndex": 1,
      "durationHours": 1.5,
      "id": "AL27-2026-12-01-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-01",
      "dayIndex": 1,
      "durationHours": 1,
      "id": "AL27-2026-12-01-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Physics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-02",
      "dayIndex": 2,
      "durationHours": 7.5,
      "id": "AL27-lesson-P04",
      "location": "",
      "notes": "Original lesson: P04\nUnit: Mechanics\nOriginal class date: 30 Oct\nRecording duration: Unknown\nResource: https://youtu.be/Gn-XV2kCk2k\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "ආවේගය හා ගම්‍යතාව - Impulse and Momentum"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-02",
      "dayIndex": 2,
      "durationHours": 6,
      "id": "AL27-lesson-C08",
      "location": "",
      "notes": "Original lesson: C08\nUnit: Chemical Kinetics\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://student.echem.lk/student/lessons/eyJpdiI6InI3UzFGMTB2YzhQV2ZNVW5jVlN5U3c9PSIsInZhbHVlIjoiVHIzVWlpM1VpZzZidlpxMUs1N2daUT09IiwibWFjIjoiMTZlMjg2NGFiYzA1ZGQwZGE2MDk2YTEyODBlODAyMzRmMTBmZjY3NmFlMDcyZjA0OTUwNDMwMWNkNWFlNmJkMSIsInRhZyI6IiJ9\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "චාලක රසායනය - Chemical Kinetics - Day 01"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-02",
      "dayIndex": 2,
      "durationHours": 6,
      "id": "AL27-2026-12-02-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-02",
      "dayIndex": 2,
      "durationHours": 1.5,
      "id": "AL27-2026-12-02-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-02",
      "dayIndex": 2,
      "durationHours": 1,
      "id": "AL27-2026-12-02-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-03",
      "dayIndex": 3,
      "durationHours": 7.5,
      "id": "AL27-class-Chemistry-Extra-Revision-2026-11-25",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-11-25\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "අමතර රසායන විද්‍යා පුනරීක්ෂණය - Chemistry Extra Revision - 03 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-03",
      "dayIndex": 3,
      "durationHours": 6,
      "id": "AL27-lesson-M05",
      "location": "",
      "notes": "Original lesson: M05\nUnit: Relative Velocity\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/h2rdnEPjd9Y\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "සාපේක්ෂ ප්‍රවේගය - Relative Velocity - Day 03"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-03",
      "dayIndex": 3,
      "durationHours": 6,
      "id": "AL27-2026-12-03-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-03",
      "dayIndex": 3,
      "durationHours": 1.5,
      "id": "AL27-2026-12-03-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-03",
      "dayIndex": 3,
      "durationHours": 1,
      "id": "AL27-2026-12-03-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Physics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-04",
      "dayIndex": 4,
      "durationHours": 7.5,
      "id": "AL27-lesson-P05",
      "location": "",
      "notes": "Original lesson: P05\nUnit: Mechanics\nOriginal class date: 01 Nov\nRecording duration: 4:43:28\nResource: https://youtu.be/j3z24QM7-yE\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "නිව්ටන් නියම - Newton's Laws - Tension and Pulleys"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-04",
      "dayIndex": 4,
      "durationHours": 6,
      "id": "AL27-class-Chemistry-Main-Revision-2026-11-30",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-11-30\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "ප්‍රධාන රසායන විද්‍යා පුනරීක්ෂණය - Chemistry Main Revision - 04 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-04",
      "dayIndex": 4,
      "durationHours": 6,
      "id": "AL27-2026-12-04-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-04",
      "dayIndex": 4,
      "durationHours": 1.5,
      "id": "AL27-2026-12-04-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-04",
      "dayIndex": 4,
      "durationHours": 1,
      "id": "AL27-2026-12-04-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-05",
      "dayIndex": 5,
      "durationHours": 7.5,
      "id": "AL27-class-Chemistry-Extra-Revision-2026-12-02",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-02\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "අමතර රසායන විද්‍යා පුනරීක්ෂණය - Chemistry Extra Revision - 05 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-05",
      "dayIndex": 5,
      "durationHours": 6,
      "id": "AL27-lesson-M06",
      "location": "",
      "notes": "Original lesson: M06\nUnit: Binomial Expansion\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/17w2HFHz0O4\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "ද්විපද ප්‍රසාරණය - Binomial Expansion"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-05",
      "dayIndex": 5,
      "durationHours": 6,
      "id": "AL27-2026-12-05-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-05",
      "dayIndex": 5,
      "durationHours": 1.5,
      "id": "AL27-2026-12-05-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-05",
      "dayIndex": 5,
      "durationHours": 1,
      "id": "AL27-2026-12-05-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Physics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-06",
      "dayIndex": 6,
      "durationHours": 7.5,
      "id": "AL27-lesson-P06",
      "location": "",
      "notes": "Original lesson: P06\nUnit: Mechanics\nOriginal class date: 05 Nov\nRecording duration: Unknown\nResource: https://www.youtube.com/live/oGqA9Eg55TE?si=ZAnLrNV5GmGd43Vs\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "ඝර්ෂණය - Friction - Session 01"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-06",
      "dayIndex": 6,
      "durationHours": 6,
      "id": "AL27-2026-12-06-AM-buffer",
      "location": "",
      "notes": "Reserved for outstanding work and homework. November Chemistry must be cleared before 10 December.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "November Chemistry - Homework and Resource Clearance"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-06",
      "dayIndex": 6,
      "durationHours": 6,
      "id": "AL27-2026-12-06-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-06",
      "dayIndex": 6,
      "durationHours": 1.5,
      "id": "AL27-2026-12-06-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-06",
      "dayIndex": 6,
      "durationHours": 1,
      "id": "AL27-2026-12-06-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-07",
      "dayIndex": 0,
      "durationHours": 7.5,
      "id": "AL27-lesson-M07",
      "location": "",
      "notes": "Original lesson: M07\nUnit: Vectors\nOriginal class date: Unknown\nRecording duration: 4:56:38\nResource: https://cmwithmn.lk/watch-video/5651c696-9d76-44de-8904-d38425c40728\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "දෛශික - Vectors - Day 01"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-07",
      "dayIndex": 0,
      "durationHours": 6,
      "id": "AL27-class-Chemistry-Main-Revision-2026-12-07",
      "location": "",
      "notes": "PROVISIONAL LIVE CLASS: actual broadcast time unverified; attend live only if subject backlog is zero. Adjust slot to actual class time.\nOriginal class date: 2026-12-07\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "[LIVE • provisional] Chemistry Main Revision - 07 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-07",
      "dayIndex": 0,
      "durationHours": 6,
      "id": "AL27-2026-12-07-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-07",
      "dayIndex": 0,
      "durationHours": 1.5,
      "id": "AL27-2026-12-07-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-07",
      "dayIndex": 0,
      "durationHours": 1,
      "id": "AL27-2026-12-07-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Physics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-08",
      "dayIndex": 1,
      "durationHours": 7.5,
      "id": "AL27-lesson-P07",
      "location": "",
      "notes": "Original lesson: P07\nUnit: Mechanics\nOriginal class date: 06 Nov\nRecording duration: 6:13:07\nResource: https://youtu.be/m2cSpuAJgNE\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "ඝර්ෂණය - Friction - Session 02"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-08",
      "dayIndex": 1,
      "durationHours": 6,
      "id": "AL27-lesson-M08",
      "location": "",
      "notes": "Original lesson: M08\nUnit: Vectors\nOriginal class date: Unknown\nRecording duration: 4:16:37\nResource: https://cmwithmn.lk/watch-video/d5bef1ea-689e-4bb3-9165-b590d4fbe7a3\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "දෛශික - Vectors - Day 02"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-08",
      "dayIndex": 1,
      "durationHours": 6,
      "id": "AL27-2026-12-08-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-08",
      "dayIndex": 1,
      "durationHours": 1.5,
      "id": "AL27-2026-12-08-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-08",
      "dayIndex": 1,
      "durationHours": 1,
      "id": "AL27-2026-12-08-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-09",
      "dayIndex": 2,
      "durationHours": 7.5,
      "id": "AL27-lesson-P08",
      "location": "",
      "notes": "Original lesson: P08\nUnit: Mechanics\nOriginal class date: 13 Nov\nRecording duration: 6:06:54\nResource: https://youtu.be/b3wA_TsvBQM\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "බල සමතුලිතතාව - Equilibrium of Forces - Introduction"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-09",
      "dayIndex": 2,
      "durationHours": 6,
      "id": "AL27-class-Chemistry-Extra-Revision-2026-12-09",
      "location": "",
      "notes": "PROVISIONAL LIVE CLASS: actual broadcast time unverified; attend live only if subject backlog is zero. Adjust slot to actual class time.\nOriginal class date: 2026-12-09\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "[LIVE • provisional] Chemistry Extra Revision - 09 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-09",
      "dayIndex": 2,
      "durationHours": 6,
      "id": "AL27-2026-12-09-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-09",
      "dayIndex": 2,
      "durationHours": 1.5,
      "id": "AL27-2026-12-09-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-09",
      "dayIndex": 2,
      "durationHours": 1,
      "id": "AL27-2026-12-09-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-10",
      "dayIndex": 3,
      "durationHours": 7.5,
      "id": "AL27-lesson-P09",
      "location": "",
      "notes": "Original lesson: P09\nUnit: Mechanics\nOriginal class date: 20 Nov\nRecording duration: 6:13:34\nResource: https://youtu.be/33smY3XQulk\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "බල සමතුලිතතාව - Equilibrium of Forces - Full Lesson"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-10",
      "dayIndex": 3,
      "durationHours": 6,
      "id": "AL27-lesson-M09",
      "location": "",
      "notes": "Original lesson: M09\nUnit: Forces\nOriginal class date: Unknown\nRecording duration: 5:07:29\nResource: https://cmwithmn.lk/watch-video/10cf5921-83a7-4618-b676-f60c09b6fb0e\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "බලය - Forces - Day 01"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-10",
      "dayIndex": 3,
      "durationHours": 6,
      "id": "AL27-2026-12-10-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-10",
      "dayIndex": 3,
      "durationHours": 1.5,
      "id": "AL27-2026-12-10-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-10",
      "dayIndex": 3,
      "durationHours": 1,
      "id": "AL27-2026-12-10-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-11",
      "dayIndex": 4,
      "durationHours": 7.5,
      "id": "AL27-lesson-M10",
      "location": "",
      "notes": "Original lesson: M10\nUnit: Super Revision\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/geQAwP14-Fk\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 05"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-11",
      "dayIndex": 4,
      "durationHours": 6,
      "id": "AL27-lesson-M11",
      "location": "",
      "notes": "Original lesson: M11\nUnit: Super Revision\nOriginal class date: Unknown\nRecording duration: Unknown\nResource: https://youtu.be/z8Ka9befBiM\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 06"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-11",
      "dayIndex": 4,
      "durationHours": 6,
      "id": "AL27-2026-12-11-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-11",
      "dayIndex": 4,
      "durationHours": 1.5,
      "id": "AL27-2026-12-11-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-11",
      "dayIndex": 4,
      "durationHours": 1,
      "id": "AL27-2026-12-11-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry and Physics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-12",
      "dayIndex": 5,
      "durationHours": 7.5,
      "id": "AL27-lesson-M12",
      "location": "",
      "notes": "Original lesson: M12\nUnit: Super Revision\nOriginal class date: Unknown\nRecording duration: 4:03:23\nResource: https://cmwithmn.lk/watch-video/e69d4899-1e76-456f-9778-c4929dd2d1c1\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 07"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-12",
      "dayIndex": 5,
      "durationHours": 6,
      "id": "AL27-lesson-P10",
      "location": "",
      "notes": "Original lesson: P10\nUnit: Thermal Physics\nOriginal class date: 04 Oct\nRecording duration: 3:26:13\nResource: https://youtu.be/W-3TspTyOf8\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "උෂ්ණත්වමිතිය - Thermometry - Introduction"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-12",
      "dayIndex": 5,
      "durationHours": 6,
      "id": "AL27-2026-12-12-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-12",
      "dayIndex": 5,
      "durationHours": 1.5,
      "id": "AL27-2026-12-12-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-12",
      "dayIndex": 5,
      "durationHours": 1,
      "id": "AL27-2026-12-12-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-13",
      "dayIndex": 6,
      "durationHours": 7.5,
      "id": "AL27-lesson-P11",
      "location": "",
      "notes": "Original lesson: P11\nUnit: Thermal Physics\nOriginal class date: 11 Oct\nRecording duration: 3:23:09\nResource: https://youtu.be/EFLOmITeDXk\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "උෂ්ණත්වමාන - Thermometers - Full Lesson"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-13",
      "dayIndex": 6,
      "durationHours": 6,
      "id": "AL27-lesson-M13",
      "location": "",
      "notes": "Original lesson: M13\nUnit: Super Revision\nOriginal class date: Unknown\nRecording duration: 2:29:16\nResource: https://cmwithmn.lk/watch-video/22f2c9f3-c158-4e17-b477-e08c424af595\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 08"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-13",
      "dayIndex": 6,
      "durationHours": 6,
      "id": "AL27-2026-12-13-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-13",
      "dayIndex": 6,
      "durationHours": 1.5,
      "id": "AL27-2026-12-13-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-13",
      "dayIndex": 6,
      "durationHours": 1,
      "id": "AL27-2026-12-13-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-14",
      "dayIndex": 0,
      "durationHours": 7.5,
      "id": "AL27-lesson-M14",
      "location": "",
      "notes": "Original lesson: M14\nUnit: Super Revision\nOriginal class date: Unknown\nRecording duration: 2:47:48\nResource: https://cmwithmn.lk/watch-video/8248496a-865c-4ca2-9693-13c082a72e71\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 09"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-14",
      "dayIndex": 0,
      "durationHours": 6,
      "id": "AL27-class-Chemistry-Main-Revision-2026-12-14",
      "location": "",
      "notes": "PROVISIONAL LIVE CLASS: actual broadcast time unverified; attend live only if subject backlog is zero. Adjust slot to actual class time.\nOriginal class date: 2026-12-14\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "[LIVE • provisional] Chemistry Main Revision - 14 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-14",
      "dayIndex": 0,
      "durationHours": 6,
      "id": "AL27-2026-12-14-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-14",
      "dayIndex": 0,
      "durationHours": 1.5,
      "id": "AL27-2026-12-14-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-14",
      "dayIndex": 0,
      "durationHours": 1,
      "id": "AL27-2026-12-14-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Physics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-15",
      "dayIndex": 1,
      "durationHours": 7.5,
      "id": "AL27-lesson-P12",
      "location": "",
      "notes": "Original lesson: P12\nUnit: Thermal Physics\nOriginal class date: 18 Oct\nRecording duration: 3:24:40\nResource: https://youtu.be/pI2JBDfHB2E\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "වායු නියම - Gas Laws - Introduction"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-15",
      "dayIndex": 1,
      "durationHours": 6,
      "id": "AL27-class-Combined-Mathematics-Super-Revision-2026-11-27",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-11-27\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "විශේෂ සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Super Revision - 15 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-15",
      "dayIndex": 1,
      "durationHours": 6,
      "id": "AL27-2026-12-15-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-15",
      "dayIndex": 1,
      "durationHours": 1.5,
      "id": "AL27-2026-12-15-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-15",
      "dayIndex": 1,
      "durationHours": 1,
      "id": "AL27-2026-12-15-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-16",
      "dayIndex": 2,
      "durationHours": 7.5,
      "id": "AL27-class-Combined-Mathematics-Main-Revision-2026-12-01",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-01\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "ප්‍රධාන සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Main Revision - 16 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-16",
      "dayIndex": 2,
      "durationHours": 6,
      "id": "AL27-class-Chemistry-Extra-Revision-2026-12-16",
      "location": "",
      "notes": "PROVISIONAL LIVE CLASS: actual broadcast time unverified; attend live only if subject backlog is zero. Adjust slot to actual class time.\nOriginal class date: 2026-12-16\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "[LIVE • provisional] Chemistry Extra Revision - 16 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-16",
      "dayIndex": 2,
      "durationHours": 6,
      "id": "AL27-2026-12-16-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-16",
      "dayIndex": 2,
      "durationHours": 1.5,
      "id": "AL27-2026-12-16-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-16",
      "dayIndex": 2,
      "durationHours": 1,
      "id": "AL27-2026-12-16-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Physics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-17",
      "dayIndex": 3,
      "durationHours": 7.5,
      "id": "AL27-class-Combined-Mathematics-Super-Revision-2026-12-04",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-04\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "විශේෂ සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Super Revision - 17 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-17",
      "dayIndex": 3,
      "durationHours": 6,
      "id": "AL27-lesson-P13",
      "location": "",
      "notes": "Original lesson: P13\nUnit: Thermal Physics\nOriginal class date: 01 Nov (approx.)\nRecording duration: 3:13:30\nResource: Not located\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "චාල්ස් නියමය - Charles's Law"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-17",
      "dayIndex": 3,
      "durationHours": 6,
      "id": "AL27-2026-12-17-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-17",
      "dayIndex": 3,
      "durationHours": 1.5,
      "id": "AL27-2026-12-17-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-17",
      "dayIndex": 3,
      "durationHours": 1,
      "id": "AL27-2026-12-17-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-18",
      "dayIndex": 4,
      "durationHours": 7.5,
      "id": "AL27-lesson-P14",
      "location": "",
      "notes": "Original lesson: P14\nUnit: Thermal Physics\nOriginal class date: 08 Nov (approx.)\nRecording duration: 3:16:48\nResource: https://youtu.be/2IOqmSTlu0U\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "චාලක අණුක වාදය - Kinetic Theory of Gases"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-18",
      "dayIndex": 4,
      "durationHours": 6,
      "id": "AL27-class-Combined-Mathematics-Main-Revision-2026-12-08",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-08\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "ප්‍රධාන සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Main Revision - 18 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-18",
      "dayIndex": 4,
      "durationHours": 6,
      "id": "AL27-2026-12-18-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-18",
      "dayIndex": 4,
      "durationHours": 1.5,
      "id": "AL27-2026-12-18-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-18",
      "dayIndex": 4,
      "durationHours": 1,
      "id": "AL27-2026-12-18-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-19",
      "dayIndex": 5,
      "durationHours": 7.5,
      "id": "AL27-lesson-P15",
      "location": "",
      "notes": "Original lesson: P15\nUnit: Thermal Physics\nOriginal class date: 15 Nov (approx.)\nRecording duration: Unknown\nResource: Not located\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "තාපමිතිය - Calorimetry - Full Lesson"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-19",
      "dayIndex": 5,
      "durationHours": 6,
      "id": "AL27-class-Combined-Mathematics-Super-Revision-2026-12-11",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-11\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "විශේෂ සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Super Revision - 19 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-19",
      "dayIndex": 5,
      "durationHours": 6,
      "id": "AL27-2026-12-19-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-19",
      "dayIndex": 5,
      "durationHours": 1.5,
      "id": "AL27-2026-12-19-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-19",
      "dayIndex": 5,
      "durationHours": 1,
      "id": "AL27-2026-12-19-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-20",
      "dayIndex": 6,
      "durationHours": 7.5,
      "id": "AL27-class-Combined-Mathematics-Main-Revision-2026-12-15",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-15\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "ප්‍රධාන සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Main Revision - 20 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-20",
      "dayIndex": 6,
      "durationHours": 6,
      "id": "AL27-lesson-P16",
      "location": "",
      "notes": "Original lesson: P16\nUnit: Thermal Physics\nOriginal class date: 22 Nov (approx.)\nRecording duration: 3:15:16\nResource: https://youtu.be/SNdxaDkHMl0\nInclude homework, notes, exercises and breaks. Resource availability not verified.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "තාපමිතිය - Calorimetry - Special Concepts"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-20",
      "dayIndex": 6,
      "durationHours": 6,
      "id": "AL27-2026-12-20-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-20",
      "dayIndex": 6,
      "durationHours": 1.5,
      "id": "AL27-2026-12-20-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-20",
      "dayIndex": 6,
      "durationHours": 1,
      "id": "AL27-2026-12-20-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-21",
      "dayIndex": 0,
      "durationHours": 7.5,
      "id": "AL27-class-Combined-Mathematics-Super-Revision-2026-12-18",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-18\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "විශේෂ සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Super Revision - 21 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-21",
      "dayIndex": 0,
      "durationHours": 6,
      "id": "AL27-class-Chemistry-Main-Revision-2026-12-21",
      "location": "",
      "notes": "PROVISIONAL LIVE CLASS: actual broadcast time unverified; attend live only if subject backlog is zero. Adjust slot to actual class time.\nOriginal class date: 2026-12-21\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "[LIVE • provisional] Chemistry Main Revision - 21 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-21",
      "dayIndex": 0,
      "durationHours": 6,
      "id": "AL27-2026-12-21-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-21",
      "dayIndex": 0,
      "durationHours": 1.5,
      "id": "AL27-2026-12-21-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-21",
      "dayIndex": 0,
      "durationHours": 1,
      "id": "AL27-2026-12-21-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Physics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-22",
      "dayIndex": 1,
      "durationHours": 7.5,
      "id": "AL27-class-Physics-Main-Revision-2026-11-25",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-11-25\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 22 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-22",
      "dayIndex": 1,
      "durationHours": 6,
      "id": "AL27-class-Combined-Mathematics-Main-Revision-2026-12-22",
      "location": "",
      "notes": "PROVISIONAL LIVE CLASS: actual broadcast time unverified; attend live only if subject backlog is zero. Adjust slot to actual class time.\nOriginal class date: 2026-12-22\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "[LIVE • provisional] Combined Mathematics Main Revision - 22 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-22",
      "dayIndex": 1,
      "durationHours": 6,
      "id": "AL27-2026-12-22-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-22",
      "dayIndex": 1,
      "durationHours": 1.5,
      "id": "AL27-2026-12-22-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-22",
      "dayIndex": 1,
      "durationHours": 1,
      "id": "AL27-2026-12-22-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-23",
      "dayIndex": 2,
      "durationHours": 7.5,
      "id": "AL27-class-Physics-Sunday-Class-2026-11-29",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-11-29\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 23 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-23",
      "dayIndex": 2,
      "durationHours": 6,
      "id": "AL27-class-Chemistry-Extra-Revision-2026-12-23",
      "location": "",
      "notes": "PROVISIONAL LIVE CLASS: actual broadcast time unverified; attend live only if subject backlog is zero. Adjust slot to actual class time.\nOriginal class date: 2026-12-23\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "[LIVE • provisional] Chemistry Extra Revision - 23 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-23",
      "dayIndex": 2,
      "durationHours": 6,
      "id": "AL27-2026-12-23-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-23",
      "dayIndex": 2,
      "durationHours": 1.5,
      "id": "AL27-2026-12-23-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-23",
      "dayIndex": 2,
      "durationHours": 1,
      "id": "AL27-2026-12-23-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-24",
      "dayIndex": 3,
      "durationHours": 7.5,
      "id": "AL27-class-Physics-Main-Revision-2026-12-02",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-02\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 24 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-24",
      "dayIndex": 3,
      "durationHours": 6,
      "id": "AL27-class-Physics-Sunday-Class-2026-12-06",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-06\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 24 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-24",
      "dayIndex": 3,
      "durationHours": 6,
      "id": "AL27-2026-12-24-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-24",
      "dayIndex": 3,
      "durationHours": 1.5,
      "id": "AL27-2026-12-24-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-24",
      "dayIndex": 3,
      "durationHours": 1,
      "id": "AL27-2026-12-24-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry and Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-25",
      "dayIndex": 4,
      "durationHours": 7.5,
      "id": "AL27-class-Physics-Main-Revision-2026-12-09",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-09\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 25 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-25",
      "dayIndex": 4,
      "durationHours": 6,
      "id": "AL27-class-Combined-Mathematics-Super-Revision-2026-12-25",
      "location": "",
      "notes": "PROVISIONAL LIVE CLASS: actual broadcast time unverified; attend live only if subject backlog is zero. Adjust slot to actual class time.\nOriginal class date: 2026-12-25\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "[LIVE • provisional] Combined Mathematics Super Revision - 25 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-25",
      "dayIndex": 4,
      "durationHours": 6,
      "id": "AL27-2026-12-25-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-25",
      "dayIndex": 4,
      "durationHours": 1.5,
      "id": "AL27-2026-12-25-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-25",
      "dayIndex": 4,
      "durationHours": 1,
      "id": "AL27-2026-12-25-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-26",
      "dayIndex": 5,
      "durationHours": 7.5,
      "id": "AL27-class-Physics-Main-Revision-2026-12-16",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-16\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 26 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-26",
      "dayIndex": 5,
      "durationHours": 6,
      "id": "AL27-class-Physics-Sunday-Class-2026-12-13",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-13\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 26 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-26",
      "dayIndex": 5,
      "durationHours": 6,
      "id": "AL27-2026-12-26-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-26",
      "dayIndex": 5,
      "durationHours": 1.5,
      "id": "AL27-2026-12-26-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-26",
      "dayIndex": 5,
      "durationHours": 1,
      "id": "AL27-2026-12-26-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry and Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-27",
      "dayIndex": 6,
      "durationHours": 7.5,
      "id": "AL27-class-Physics-Main-Revision-2026-12-23",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-23\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 27 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-27",
      "dayIndex": 6,
      "durationHours": 6,
      "id": "AL27-class-Physics-Sunday-Class-2026-12-20",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-20\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 27 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-27",
      "dayIndex": 6,
      "durationHours": 6,
      "id": "AL27-2026-12-27-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-27",
      "dayIndex": 6,
      "durationHours": 1.5,
      "id": "AL27-2026-12-27-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-27",
      "dayIndex": 6,
      "durationHours": 1,
      "id": "AL27-2026-12-27-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry and Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-28",
      "dayIndex": 0,
      "durationHours": 7.5,
      "id": "AL27-class-Physics-Sunday-Class-2026-12-27",
      "location": "",
      "notes": "RECORDING RESERVATION: expected class release; confirm actual availability before viewing. Include homework, notes, exercises and breaks.\nOriginal class date: 2026-12-27\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 28 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-28",
      "dayIndex": 0,
      "durationHours": 6,
      "id": "AL27-class-Chemistry-Main-Revision-2026-12-28",
      "location": "",
      "notes": "PROVISIONAL LIVE CLASS: actual broadcast time unverified; attend live only if subject backlog is zero. Adjust slot to actual class time.\nOriginal class date: 2026-12-28\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "[LIVE • provisional] Chemistry Main Revision - 28 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-28",
      "dayIndex": 0,
      "durationHours": 6,
      "id": "AL27-2026-12-28-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-28",
      "dayIndex": 0,
      "durationHours": 1.5,
      "id": "AL27-2026-12-28-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-28",
      "dayIndex": 0,
      "durationHours": 1,
      "id": "AL27-2026-12-28-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 10,
        "remindAtBedtime": false,
        "ringAtStart": true,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-29",
      "dayIndex": 1,
      "durationHours": 7.5,
      "id": "AL27-2026-12-29-AM-buffer",
      "location": "",
      "notes": "Reserved for outstanding work and homework. November Chemistry must be cleared before 10 December.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Final Backlog Clearance / Buffer"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-29",
      "dayIndex": 1,
      "durationHours": 6,
      "id": "AL27-class-Combined-Mathematics-Main-Revision-2026-12-29",
      "location": "",
      "notes": "PROVISIONAL LIVE CLASS: actual broadcast time unverified; attend live only if subject backlog is zero. Adjust slot to actual class time.\nOriginal class date: 2026-12-29\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-combined-maths",
      "title": "[LIVE • provisional] Combined Mathematics Main Revision - 29 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-29",
      "dayIndex": 1,
      "durationHours": 6,
      "id": "AL27-2026-12-29-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-29",
      "dayIndex": 1,
      "durationHours": 1.5,
      "id": "AL27-2026-12-29-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-29",
      "dayIndex": 1,
      "durationHours": 1,
      "id": "AL27-2026-12-29-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Chemistry and Physics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-30",
      "dayIndex": 2,
      "durationHours": 7.5,
      "id": "AL27-class-Physics-Main-Revision-2026-12-30",
      "location": "",
      "notes": "PROVISIONAL LIVE CLASS: actual broadcast time unverified; attend live only if subject backlog is zero. Adjust slot to actual class time.\nOriginal class date: 2026-12-30\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 6.5,
      "status": "upcoming",
      "subjectId": "al27-physics",
      "title": "[LIVE • provisional] Physics Main Revision - 30 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-30",
      "dayIndex": 2,
      "durationHours": 6,
      "id": "AL27-class-Chemistry-Extra-Revision-2026-12-30",
      "location": "",
      "notes": "PROVISIONAL LIVE CLASS: actual broadcast time unverified; attend live only if subject backlog is zero. Adjust slot to actual class time.\nOriginal class date: 2026-12-30\nNo verified recording URL or duration yet.",
      "recurring": false,
      "startHour": 15.5,
      "status": "upcoming",
      "subjectId": "al27-chemistry",
      "title": "[LIVE • provisional] Chemistry Extra Revision - 30 Dec 2026"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": true
      },
      "blockType": "sleep",
      "countsTowardStudy": false,
      "date": "2026-12-30",
      "dayIndex": 2,
      "durationHours": 6,
      "id": "AL27-2026-12-30-sleep",
      "location": "",
      "notes": "Wake at 06:00. Aim for adequate sleep; extend rest when needed.",
      "recurring": false,
      "startHour": 0,
      "status": "upcoming",
      "subjectId": "",
      "title": "Sleep"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "free",
      "countsTowardStudy": false,
      "date": "2026-12-30",
      "dayIndex": 2,
      "durationHours": 1.5,
      "id": "AL27-2026-12-30-free",
      "location": "",
      "notes": "Protected free time.",
      "recurring": false,
      "startHour": 21.5,
      "status": "upcoming",
      "subjectId": "",
      "title": "Free Time"
    },
    {
      "alarms": {
        "advanceNoticeMin": 0,
        "remindAtBedtime": false,
        "ringAtStart": false,
        "wakeAtEnd": false
      },
      "blockType": "study",
      "countsTowardStudy": true,
      "date": "2026-12-30",
      "dayIndex": 2,
      "durationHours": 1,
      "id": "AL27-2026-12-30-revision",
      "location": "",
      "notes": "Optional revision / extra sleep. Prioritize Combined Mathematics (active recall, homework or corrections; split available time if needed). Do not sacrifice adequate sleep; move review into available daytime breaks if needed.",
      "recurring": false,
      "startHour": 23,
      "status": "upcoming",
      "subjectId": "",
      "title": "Night Revision"
    }
  ],
  "goals": [
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-11-25",
      "id": "al27-goal-01",
      "milestones": [
        {
          "date": "2026-11-25",
          "done": false,
          "id": "ms-AL27-lesson-C01",
          "label": "රසායනික ගණනය - Chemical Calculations - Redox Seminar",
          "taskId": "task-AL27-lesson-C01"
        }
      ],
      "subjectId": "al27-chemistry",
      "target": 1,
      "title": "රසායනික ගණනය - Chemical Calculations",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-11-27",
      "id": "al27-goal-02",
      "milestones": [
        {
          "date": "2026-11-26",
          "done": false,
          "id": "ms-AL27-lesson-C02",
          "label": "ව්‍යුහය හා බන්ධන - Structure and Bonding - Day 08",
          "taskId": "task-AL27-lesson-C02"
        },
        {
          "date": "2026-11-27",
          "done": false,
          "id": "ms-AL27-lesson-C03",
          "label": "ව්‍යුහය හා බන්ධන - Structure and Bonding - Day 09",
          "taskId": "task-AL27-lesson-C03"
        }
      ],
      "subjectId": "al27-chemistry",
      "target": 2,
      "title": "ව්‍යුහය හා බන්ධන - Structure and Bonding",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-01",
      "id": "al27-goal-03",
      "milestones": [
        {
          "date": "2026-11-28",
          "done": false,
          "id": "ms-AL27-lesson-C04",
          "label": "ශක්ති විද්‍යාව - Energetics - Day 01",
          "taskId": "task-AL27-lesson-C04"
        },
        {
          "date": "2026-11-29",
          "done": false,
          "id": "ms-AL27-lesson-C05",
          "label": "ශක්ති විද්‍යාව - Energetics - Day 02",
          "taskId": "task-AL27-lesson-C05"
        },
        {
          "date": "2026-11-30",
          "done": false,
          "id": "ms-AL27-lesson-C06",
          "label": "ශක්ති විද්‍යාව - Energetics - Day 03",
          "taskId": "task-AL27-lesson-C06"
        },
        {
          "date": "2026-12-01",
          "done": false,
          "id": "ms-AL27-lesson-C07",
          "label": "ශක්ති විද්‍යාව - Energetics - Day 04",
          "taskId": "task-AL27-lesson-C07"
        }
      ],
      "subjectId": "al27-chemistry",
      "target": 4,
      "title": "ශක්ති විද්‍යාව - Energetics",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-02",
      "id": "al27-goal-04",
      "milestones": [
        {
          "date": "2026-12-02",
          "done": false,
          "id": "ms-AL27-lesson-C08",
          "label": "චාලක රසායනය - Chemical Kinetics - Day 01",
          "taskId": "task-AL27-lesson-C08"
        }
      ],
      "subjectId": "al27-chemistry",
      "target": 1,
      "title": "චාලක රසායනය - Chemical Kinetics",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-05",
      "id": "al27-goal-05",
      "milestones": [
        {
          "date": "2026-12-03",
          "done": false,
          "id": "ms-AL27-class-Chemistry-Extra-Revision-2026-11-25",
          "label": "අමතර රසායන විද්‍යා පුනරීක්ෂණය - Chemistry Extra Revision - 2026-11-25",
          "taskId": "task-AL27-class-Chemistry-Extra-Revision-2026-11-25"
        },
        {
          "date": "2026-12-05",
          "done": false,
          "id": "ms-AL27-class-Chemistry-Extra-Revision-2026-12-02",
          "label": "අමතර රසායන විද්‍යා පුනරීක්ෂණය - Chemistry Extra Revision - 2026-12-02",
          "taskId": "task-AL27-class-Chemistry-Extra-Revision-2026-12-02"
        }
      ],
      "subjectId": "al27-chemistry",
      "target": 2,
      "title": "රසායන විද්‍යා අමතර පුනරීක්ෂණය - Chemistry Extra Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-04",
      "id": "al27-goal-06",
      "milestones": [
        {
          "date": "2026-12-04",
          "done": false,
          "id": "ms-AL27-class-Chemistry-Main-Revision-2026-11-30",
          "label": "ප්‍රධාන රසායන විද්‍යා පුනරීක්ෂණය - Chemistry Main Revision - 2026-11-30",
          "taskId": "task-AL27-class-Chemistry-Main-Revision-2026-11-30"
        }
      ],
      "subjectId": "al27-chemistry",
      "target": 1,
      "title": "රසායන විද්‍යා ප්‍රධාන පුනරීක්ෂණය - Chemistry Main Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-10",
      "id": "al27-goal-07",
      "milestones": [
        {
          "date": "2026-11-26",
          "done": false,
          "id": "ms-AL27-lesson-P01",
          "label": "නිව්ටන් නියම - Newton's Laws - Introduction",
          "taskId": "task-AL27-lesson-P01"
        },
        {
          "date": "2026-11-28",
          "done": false,
          "id": "ms-AL27-lesson-P02",
          "label": "නිව්ටන් නියම - Newton's Laws - Special Concepts and Pulleys",
          "taskId": "task-AL27-lesson-P02"
        },
        {
          "date": "2026-11-30",
          "done": false,
          "id": "ms-AL27-lesson-P03",
          "label": "නිව්ටන් නියම - Newton's Laws - Pulleys and Inclined Planes",
          "taskId": "task-AL27-lesson-P03"
        },
        {
          "date": "2026-12-02",
          "done": false,
          "id": "ms-AL27-lesson-P04",
          "label": "ආවේගය හා ගම්‍යතාව - Impulse and Momentum",
          "taskId": "task-AL27-lesson-P04"
        },
        {
          "date": "2026-12-04",
          "done": false,
          "id": "ms-AL27-lesson-P05",
          "label": "නිව්ටන් නියම - Newton's Laws - Tension and Pulleys",
          "taskId": "task-AL27-lesson-P05"
        },
        {
          "date": "2026-12-06",
          "done": false,
          "id": "ms-AL27-lesson-P06",
          "label": "ඝර්ෂණය - Friction - Session 01",
          "taskId": "task-AL27-lesson-P06"
        },
        {
          "date": "2026-12-08",
          "done": false,
          "id": "ms-AL27-lesson-P07",
          "label": "ඝර්ෂණය - Friction - Session 02",
          "taskId": "task-AL27-lesson-P07"
        },
        {
          "date": "2026-12-09",
          "done": false,
          "id": "ms-AL27-lesson-P08",
          "label": "බල සමතුලිතතාව - Equilibrium of Forces - Introduction",
          "taskId": "task-AL27-lesson-P08"
        },
        {
          "date": "2026-12-10",
          "done": false,
          "id": "ms-AL27-lesson-P09",
          "label": "බල සමතුලිතතාව - Equilibrium of Forces - Full Lesson",
          "taskId": "task-AL27-lesson-P09"
        }
      ],
      "subjectId": "al27-physics",
      "target": 9,
      "title": "යාන්ත්‍ර විද්‍යාව - Mechanics",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-20",
      "id": "al27-goal-08",
      "milestones": [
        {
          "date": "2026-12-12",
          "done": false,
          "id": "ms-AL27-lesson-P10",
          "label": "උෂ්ණත්වමිතිය - Thermometry - Introduction",
          "taskId": "task-AL27-lesson-P10"
        },
        {
          "date": "2026-12-13",
          "done": false,
          "id": "ms-AL27-lesson-P11",
          "label": "උෂ්ණත්වමාන - Thermometers - Full Lesson",
          "taskId": "task-AL27-lesson-P11"
        },
        {
          "date": "2026-12-15",
          "done": false,
          "id": "ms-AL27-lesson-P12",
          "label": "වායු නියම - Gas Laws - Introduction",
          "taskId": "task-AL27-lesson-P12"
        },
        {
          "date": "2026-12-17",
          "done": false,
          "id": "ms-AL27-lesson-P13",
          "label": "චාල්ස් නියමය - Charles's Law",
          "taskId": "task-AL27-lesson-P13"
        },
        {
          "date": "2026-12-18",
          "done": false,
          "id": "ms-AL27-lesson-P14",
          "label": "චාලක අණුක වාදය - Kinetic Theory of Gases",
          "taskId": "task-AL27-lesson-P14"
        },
        {
          "date": "2026-12-19",
          "done": false,
          "id": "ms-AL27-lesson-P15",
          "label": "තාපමිතිය - Calorimetry - Full Lesson",
          "taskId": "task-AL27-lesson-P15"
        },
        {
          "date": "2026-12-20",
          "done": false,
          "id": "ms-AL27-lesson-P16",
          "label": "තාපමිතිය - Calorimetry - Special Concepts",
          "taskId": "task-AL27-lesson-P16"
        }
      ],
      "subjectId": "al27-physics",
      "target": 7,
      "title": "තාප භෞතික විද්‍යාව - Thermal Physics",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-27",
      "id": "al27-goal-09",
      "milestones": [
        {
          "date": "2026-12-22",
          "done": false,
          "id": "ms-AL27-class-Physics-Main-Revision-2026-11-25",
          "label": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 2026-11-25",
          "taskId": "task-AL27-class-Physics-Main-Revision-2026-11-25"
        },
        {
          "date": "2026-12-24",
          "done": false,
          "id": "ms-AL27-class-Physics-Main-Revision-2026-12-02",
          "label": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 2026-12-02",
          "taskId": "task-AL27-class-Physics-Main-Revision-2026-12-02"
        },
        {
          "date": "2026-12-25",
          "done": false,
          "id": "ms-AL27-class-Physics-Main-Revision-2026-12-09",
          "label": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 2026-12-09",
          "taskId": "task-AL27-class-Physics-Main-Revision-2026-12-09"
        },
        {
          "date": "2026-12-26",
          "done": false,
          "id": "ms-AL27-class-Physics-Main-Revision-2026-12-16",
          "label": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 2026-12-16",
          "taskId": "task-AL27-class-Physics-Main-Revision-2026-12-16"
        },
        {
          "date": "2026-12-27",
          "done": false,
          "id": "ms-AL27-class-Physics-Main-Revision-2026-12-23",
          "label": "ප්‍රධාන භෞතික විද්‍යා පුනරීක්ෂණය - Physics Main Revision - 2026-12-23",
          "taskId": "task-AL27-class-Physics-Main-Revision-2026-12-23"
        }
      ],
      "subjectId": "al27-physics",
      "target": 5,
      "title": "භෞතික විද්‍යා ප්‍රධාන පුනරීක්ෂණය - Physics Main Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-28",
      "id": "al27-goal-10",
      "milestones": [
        {
          "date": "2026-12-23",
          "done": false,
          "id": "ms-AL27-class-Physics-Sunday-Class-2026-11-29",
          "label": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 2026-11-29",
          "taskId": "task-AL27-class-Physics-Sunday-Class-2026-11-29"
        },
        {
          "date": "2026-12-24",
          "done": false,
          "id": "ms-AL27-class-Physics-Sunday-Class-2026-12-06",
          "label": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 2026-12-06",
          "taskId": "task-AL27-class-Physics-Sunday-Class-2026-12-06"
        },
        {
          "date": "2026-12-26",
          "done": false,
          "id": "ms-AL27-class-Physics-Sunday-Class-2026-12-13",
          "label": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 2026-12-13",
          "taskId": "task-AL27-class-Physics-Sunday-Class-2026-12-13"
        },
        {
          "date": "2026-12-27",
          "done": false,
          "id": "ms-AL27-class-Physics-Sunday-Class-2026-12-20",
          "label": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 2026-12-20",
          "taskId": "task-AL27-class-Physics-Sunday-Class-2026-12-20"
        },
        {
          "date": "2026-12-28",
          "done": false,
          "id": "ms-AL27-class-Physics-Sunday-Class-2026-12-27",
          "label": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class - 2026-12-27",
          "taskId": "task-AL27-class-Physics-Sunday-Class-2026-12-27"
        }
      ],
      "subjectId": "al27-physics",
      "target": 5,
      "title": "භෞතික විද්‍යා ඉරිදා පන්තිය - Physics Sunday Class (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-11-27",
      "id": "al27-goal-11",
      "milestones": [
        {
          "date": "2026-11-25",
          "done": false,
          "id": "ms-AL27-lesson-M01",
          "label": "ත්‍රිකෝණමිතිය - Trigonometry - Day 03",
          "taskId": "task-AL27-lesson-M01"
        },
        {
          "date": "2026-11-27",
          "done": false,
          "id": "ms-AL27-lesson-M02",
          "label": "ත්‍රිකෝණමිතිය - Trigonometry - Day 04",
          "taskId": "task-AL27-lesson-M02"
        }
      ],
      "subjectId": "al27-combined-maths",
      "target": 2,
      "title": "ත්‍රිකෝණමිතිය - Trigonometry",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-11-29",
      "id": "al27-goal-12",
      "milestones": [
        {
          "date": "2026-11-29",
          "done": false,
          "id": "ms-AL27-lesson-M03",
          "label": "ප්‍රවේග කාල ප්‍රස්තාර - Velocity-Time Graphs - Day 01",
          "taskId": "task-AL27-lesson-M03"
        }
      ],
      "subjectId": "al27-combined-maths",
      "target": 1,
      "title": "චලිත විද්‍යාව - Kinematics",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-03",
      "id": "al27-goal-13",
      "milestones": [
        {
          "date": "2026-12-01",
          "done": false,
          "id": "ms-AL27-lesson-M04",
          "label": "සාපේක්ෂ ප්‍රවේගය - Relative Velocity - Day 02",
          "taskId": "task-AL27-lesson-M04"
        },
        {
          "date": "2026-12-03",
          "done": false,
          "id": "ms-AL27-lesson-M05",
          "label": "සාපේක්ෂ ප්‍රවේගය - Relative Velocity - Day 03",
          "taskId": "task-AL27-lesson-M05"
        }
      ],
      "subjectId": "al27-combined-maths",
      "target": 2,
      "title": "සාපේක්ෂ ප්‍රවේගය - Relative Velocity",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-05",
      "id": "al27-goal-14",
      "milestones": [
        {
          "date": "2026-12-05",
          "done": false,
          "id": "ms-AL27-lesson-M06",
          "label": "ද්විපද ප්‍රසාරණය - Binomial Expansion",
          "taskId": "task-AL27-lesson-M06"
        }
      ],
      "subjectId": "al27-combined-maths",
      "target": 1,
      "title": "ද්විපද ප්‍රසාරණය - Binomial Expansion",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-08",
      "id": "al27-goal-15",
      "milestones": [
        {
          "date": "2026-12-07",
          "done": false,
          "id": "ms-AL27-lesson-M07",
          "label": "දෛශික - Vectors - Day 01",
          "taskId": "task-AL27-lesson-M07"
        },
        {
          "date": "2026-12-08",
          "done": false,
          "id": "ms-AL27-lesson-M08",
          "label": "දෛශික - Vectors - Day 02",
          "taskId": "task-AL27-lesson-M08"
        }
      ],
      "subjectId": "al27-combined-maths",
      "target": 2,
      "title": "දෛශික - Vectors",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-10",
      "id": "al27-goal-16",
      "milestones": [
        {
          "date": "2026-12-10",
          "done": false,
          "id": "ms-AL27-lesson-M09",
          "label": "බලය - Forces - Day 01",
          "taskId": "task-AL27-lesson-M09"
        }
      ],
      "subjectId": "al27-combined-maths",
      "target": 1,
      "title": "බලය - Forces",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-14",
      "id": "al27-goal-17",
      "milestones": [
        {
          "date": "2026-12-11",
          "done": false,
          "id": "ms-AL27-lesson-M10",
          "label": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 05",
          "taskId": "task-AL27-lesson-M10"
        },
        {
          "date": "2026-12-11",
          "done": false,
          "id": "ms-AL27-lesson-M11",
          "label": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 06",
          "taskId": "task-AL27-lesson-M11"
        },
        {
          "date": "2026-12-12",
          "done": false,
          "id": "ms-AL27-lesson-M12",
          "label": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 07",
          "taskId": "task-AL27-lesson-M12"
        },
        {
          "date": "2026-12-13",
          "done": false,
          "id": "ms-AL27-lesson-M13",
          "label": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 08",
          "taskId": "task-AL27-lesson-M13"
        },
        {
          "date": "2026-12-14",
          "done": false,
          "id": "ms-AL27-lesson-M14",
          "label": "විශේෂ පුනරීක්ෂණය - Super Revision - Day 09",
          "taskId": "task-AL27-lesson-M14"
        }
      ],
      "subjectId": "al27-combined-maths",
      "target": 5,
      "title": "විශේෂ පුනරීක්ෂණය - Super Revision",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-21",
      "id": "al27-goal-18",
      "milestones": [
        {
          "date": "2026-12-15",
          "done": false,
          "id": "ms-AL27-class-Combined-Mathematics-Super-Revision-2026-11-27",
          "label": "විශේෂ සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Super Revision - 2026-11-27",
          "taskId": "task-AL27-class-Combined-Mathematics-Super-Revision-2026-11-27"
        },
        {
          "date": "2026-12-17",
          "done": false,
          "id": "ms-AL27-class-Combined-Mathematics-Super-Revision-2026-12-04",
          "label": "විශේෂ සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Super Revision - 2026-12-04",
          "taskId": "task-AL27-class-Combined-Mathematics-Super-Revision-2026-12-04"
        },
        {
          "date": "2026-12-19",
          "done": false,
          "id": "ms-AL27-class-Combined-Mathematics-Super-Revision-2026-12-11",
          "label": "විශේෂ සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Super Revision - 2026-12-11",
          "taskId": "task-AL27-class-Combined-Mathematics-Super-Revision-2026-12-11"
        },
        {
          "date": "2026-12-21",
          "done": false,
          "id": "ms-AL27-class-Combined-Mathematics-Super-Revision-2026-12-18",
          "label": "විශේෂ සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Super Revision - 2026-12-18",
          "taskId": "task-AL27-class-Combined-Mathematics-Super-Revision-2026-12-18"
        }
      ],
      "subjectId": "al27-combined-maths",
      "target": 4,
      "title": "සංයුක්ත ගණිත විශේෂ පුනරීක්ෂණය - Combined Mathematics Super Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)",
      "unit": "lessons"
    },
    {
      "category": "subject",
      "current": 0,
      "deadline": "2026-12-20",
      "id": "al27-goal-19",
      "milestones": [
        {
          "date": "2026-12-16",
          "done": false,
          "id": "ms-AL27-class-Combined-Mathematics-Main-Revision-2026-12-01",
          "label": "ප්‍රධාන සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Main Revision - 2026-12-01",
          "taskId": "task-AL27-class-Combined-Mathematics-Main-Revision-2026-12-01"
        },
        {
          "date": "2026-12-18",
          "done": false,
          "id": "ms-AL27-class-Combined-Mathematics-Main-Revision-2026-12-08",
          "label": "ප්‍රධාන සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Main Revision - 2026-12-08",
          "taskId": "task-AL27-class-Combined-Mathematics-Main-Revision-2026-12-08"
        },
        {
          "date": "2026-12-20",
          "done": false,
          "id": "ms-AL27-class-Combined-Mathematics-Main-Revision-2026-12-15",
          "label": "ප්‍රධාන සංයුක්ත ගණිත පුනරීක්ෂණය - Combined Mathematics Main Revision - 2026-12-15",
          "taskId": "task-AL27-class-Combined-Mathematics-Main-Revision-2026-12-15"
        }
      ],
      "subjectId": "al27-combined-maths",
      "target": 3,
      "title": "සංයුක්ත ගණිත ප්‍රධාන පුනරීක්ෂණය - Combined Mathematics Main Revision (පොරොත්තු පටිගත කිරීම් - Catch-up recordings)",
      "unit": "lessons"
    }
  ],
  "folders": [
    {
      "id": "notes",
      "name": "සටහන්"
    },
    {
      "id": "cc-rb-folder",
      "name": "රසායනික ගණනය",
      "subjectId": "al27-chemistry"
    }
  ],
  "notes": [
    {
      "attachments": [],
      "content": "# රසායනික ගණනය කිරීම් (Chemical Calculations) - සංශෝධන පොත 02\n\n## 1. මවුලික සාන්ද්‍රණය (Molar Concentration)\n- ඒකක පරිමාවක ද්‍රාවණයක දියවී ඇති ද්‍රව්‍යයේ මවුල ගණනයි.\n- **සූත්‍රය:** \n  $$\\text{මවුලික සාන්ද්‍රණය} = \\frac{\\text{ද්‍රව්‍යයේ මවුල ගණන}}{\\text{ද්‍රාවණයේ පරිමාව}}$$\n- **SI ඒකකය:** $\\text{mol m}^{-3}$ (බහුලව භාවිතා වන ඒකකය: $\\text{mol dm}^{-3}$ හෝ $\\text{mol L}^{-1}$)\n\n---\n\n## 2. තනුක කිරීම (Dilution)\n- බාහිරින් ජලය එකතු කිරීමෙන් ද්‍රාවණයක සාන්ද්‍රණය අඩු කිරීමයි (පරිමාව වැඩි වේ).\n- **මූලධර්මය:** තනුක කිරීමේදී ද්‍රාවණයේ ද්‍රව්‍ය මවුල ගණන නියוත්ව පවතී.\n- **සූත්‍රය:** \n  $$C_1V_1 = C_2V_2$$\n\n---\n\n## 3. වෙන් කිරීම (Separation)\n- විශාල ද්‍රාවණ පරිමාවකින් නිශ්චිත පරිමාවක් (කොටසක්) ඉවත් කිරීමයි.\n- වෙන් කිරීමේදී ද්‍රාවණයේ සාන්ද්‍රණය වෙනස් නොවේ. එහෙත් ද්‍රව්‍යයේ මවුල ගණන පරිමාව වෙනස් වන භාගයට වෙනස් වේ.\n\n---\n\n## 4. කොටස් දස ලක්ෂයට (ppm - Parts Per Million)\n- ප්‍රමාණයක් මිශ්‍රණයක මුළු ප්‍රමාණයට සාපේක්ෂව දස ලක්ෂයකට ප්‍රකාශ කළ විට එය $\\text{ppm}$ අගය ලෙස හැඳින්වේ.\n- **සූත්‍රය:** \n  $$\\text{ppm අගය} = \\text{දී ඇති භාගය} \\times 10^6$$\n- ඉතා තනුක ජලීය ද්‍රාවවල (ඝනත්වය ආසන්න වශයෙන් $1 \\text{ g cm}^{-3}$) සංයුතිය $\\text{ppm}$ වලින් ප්‍රකාශ කළ විට ලැබෙන අගය $\\text{mg dm}^{-3}$ වලින් ප්‍රකාශිත සාන්ද්‍රණයට ආසන්න වශයෙන් සමාන වේ.\n\n---\n\n## 5. ද්‍රාවණවල ප්‍රතිශත පිරිසිදුකමට අදාළ ගණනය කිරීම්\n- ද්‍රාවණයේ ස්කන්ධ ප්‍රතිශතය / පිරිසිදුකම / ප්‍රතිශත සංයුතිය යනු, ද්‍රාවණයේ මුළු ස්කන්ධයෙන් සලකා බලන ද්‍රව්‍යයේ ස්කන්ධය කීයක් ප්‍රතිශතයක් වේ ද යන්නයි ($\\text{w/w}\\%$).",
      "folderId": "notes",
      "id": "note-6dd30c31-1880-438a-b033-0b9be56755b6",
      "linkedResources": [],
      "pdfHighlights": [],
      "pinned": false,
      "subjectId": "al27-chemistry",
      "syllabusLinks": {
        "chapterIds": [
          "al27-chemistry-unit-03-ch3"
        ],
        "unitIds": [
          "u-al27-chemistry-unit-03"
        ]
      },
      "tags": [
        "Draft"
      ],
      "title": "රසායනික ගණනය කිරීම් - මවුලික සාන්ද්‍රණය සහ ද්‍රාවණ සංයුති",
      "updatedAt": "Just now"
    },
    {
      "attachments": [],
      "content": "# රසායනික ගණනය කිරීම් (Chemical Calculations) - Revision Book 01\n\n## 1. මවුලය (Mole)\n- ද්‍රව්‍ය ප්‍රමාණය මැනීමේ SI ඒකකයයි.\n- $N_A = 6.022 \\times 10^{23} \\text{ mol}^{-1}$ (අවග්‍රැඩෝ නියතය)\n\n### මූලික සූත්‍ර:\n- මවුල ගණන ($n$) = $\\frac{N}{L}$ (මෙහි $N$ = අণু/පරමාණු ගණන, $L$ = $N_A$)\n- මවුල ගණන ($n$) = $\\frac{m}{M}$ (මෙහි $m$ = ස්කන්ධය, $M$ = මවුලික ස්කන්ධය)\n\n---\n\n## 2. මවුලික ස්කන්ධය (Molar Mass)\n- ද්‍රව්‍ය මවුල එකක ස්කන්ධයයි ($\\text{g mol}^{-1}$).\n- **උදාහරණ:**\n  - $^{14}\\text{N} = 14 \\text{ g mol}^{-1}$\n  - $^{16}\\text{O} = 16 \\text{ g mol}^{-1}$\n  - $\\text{NO}_2 = 14 + (16 \\times 2) = 46 \\text{ g mol}^{-1}$\n\n---\n\n## 3. මවුල භාගය (Mole Fraction - $X_A$)\n- රසායනික ප්‍රභේද මිශ්‍රණයක් ඇති විට, සැලකෙන සංරචකයේ මවුල ගණන මුළු මවුල ගණනට දරන අනුපාතයයි.\n- $X_A = \\frac{n_A}{n_{\\text{tot}}}$\n- මිශ්‍රණයක ඇති සංරචක සියල්ලේම මවුල භාගවල මුළු එකතුව 1 වේ:\n  $$X_P + X_Q + X_R = 1$$\n\n---\n\n## 4. ස්ටොයිකියෝමිතිය (Stoichiometry)\n- ප්‍රතික්‍රියාවක් සිදුවන අවස්ථාවේ ප්‍රතික්‍රියාකාරක හා ප්‍රතිඵල සඳහා මවුල ප්‍රමාණයන් අතර සරලම අනුපාතය ස්ටොයිකියෝමිතිය වේ.\n- **ස්ටොයිකියෝමිතිය වලංගු වන්නේ ප්‍රතික්‍රියාව සිදුවීමට පෙර හෝ පසු නොව ප්‍රතික්‍රියාව සිදුවන අවස්ථාවට පමණක් වේ.**",
      "folderId": "cc-rb-folder",
      "id": "note-9b873838-5ae8-475e-bec2-a8e6bf9ca5d8",
      "linkedResources": [],
      "pdfHighlights": [],
      "pinned": false,
      "subjectId": "al27-chemistry",
      "syllabusLinks": {
        "chapterIds": [
          "al27-chemistry-unit-03",
          "al27-chemistry-unit-03-ch2"
        ],
        "unitIds": []
      },
      "tags": [
        "Draft"
      ],
      "title": "රසායනික ගණනය කිරීම් - මවුල සංකල්ප සහ මවුල භාග",
      "updatedAt": "Just now"
    }
  ],
  "decks": [
    {
      "description": "පිප් විසින් සකස් කරන ලදී",
      "id": "deck-ae266a11-189f-45bb-b790-a0e4073672d3",
      "lastReviewed": "අලුතින් සෑදූ",
      "retentionRate": 0,
      "subjectId": "al27-chemistry",
      "title": "රසායන විද්‍යාව - තනුක කිරීම් සහ මවුල"
    },
    {
      "description": "",
      "id": "review",
      "lastReviewed": "",
      "retentionRate": 0,
      "subjectId": "",
      "title": "පොදු පුනරීක්ෂණය"
    },
    {
      "description": "පුනරීක්ෂණ පොත 1 ඇසුරින් සකස් කළ මතකපත්.",
      "id": "cc-rb1-deck",
      "lastReviewed": "අලුතින් සෑදූ",
      "retentionRate": 0,
      "subjectId": "al27-chemistry",
      "syllabusLinks": {
        "chapterIds": [
          "al27-chemistry-unit-03",
          "al27-chemistry-unit-03-ch2"
        ]
      },
      "title": "මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට"
    },
    {
      "description": "පුනරීක්ෂණ පොත 2 ඇසුරින් සකස් කළ මතකපත්.",
      "id": "cc-rb2-deck",
      "lastReviewed": "අලුතින් සෑදූ",
      "retentionRate": 0,
      "subjectId": "al27-chemistry",
      "syllabusLinks": {
        "chapterIds": [
          "al27-chemistry-unit-03-ch3"
        ]
      },
      "title": "ද්‍රාවණවල සාන්ද්‍රණය හා සංයුතිය ගණනය කිරීම"
    },
    {
      "description": "පුනරීක්ෂණ පොත 3 ඇසුරින් සකස් කළ මතකපත්.",
      "id": "cc-rb3-deck",
      "lastReviewed": "අලුතින් සෑදූ",
      "retentionRate": 0,
      "subjectId": "al27-chemistry",
      "syllabusLinks": {
        "chapterIds": [
          "al27-chemistry-unit-03-ch4"
        ]
      },
      "title": "අම්ල–භෂ්ම අනුමාපන හා කාබනේට් අන්ත ලක්ෂ්‍ය"
    }
  ],
  "flashcards": [
    {
      "back": "ද්‍රාව්‍යයේ මවුල ගණනයි. ද්‍රාවකය එකතු කළ විට මුළු පරිමාව වැඩි වේ.",
      "deckId": "deck-ae266a11-189f-45bb-b790-a0e4073672d3",
      "dueToday": false,
      "easeFactor": 2.5,
      "front": "සරල තනුක කිරීමකදී සංරක්ෂණය වන ප්‍රමාණය කුමක්ද?",
      "id": "e8999004-dc18-4fbe-b6a0-013a492aab3d",
      "intervalDays": 3,
      "lapses": 0,
      "lastReviewedAt": "2026-11-25T08:34:39.458Z",
      "mastery": "learning",
      "nextReviewDate": "2026-11-28",
      "reviewCount": 1
    },
    {
      "back": "C₂ = C₁V₁ / V₂",
      "deckId": "deck-ae266a11-189f-45bb-b790-a0e4073672d3",
      "dueToday": false,
      "easeFactor": 2.5,
      "front": "ආරම්භක සාන්ද්‍රණය C₁, ආරම්භක පරිමාව V₁ සහ අවසාන පරිමාව V₂ දන්නා විට, අවසාන සාන්ද්‍රණය C₂ සෙවීමේ සමීකරණය කුමක්ද?",
      "id": "c4218c59-c33c-48ad-be6c-875bd554b835",
      "intervalDays": 3,
      "lapses": 0,
      "lastReviewedAt": "2026-11-25T08:34:51.884Z",
      "mastery": "learning",
      "nextReviewDate": "2026-11-28",
      "reviewCount": 1
    },
    {
      "back": "Na₂CO₃ මවුල 1 කින් Na⁺ අයන 2 ක් ලැබේ.",
      "deckId": "deck-ae266a11-189f-45bb-b790-a0e4073672d3",
      "dueToday": false,
      "easeFactor": 2.65,
      "front": "Na₂CO₃ මවුල 1 කින් සෝඩියම් අයන (Na⁺) මවුල කීයක් ලබා දෙයිද?",
      "id": "23a69826-8df2-40d7-a5ae-90e3fe2fc32d",
      "intervalDays": 5,
      "lapses": 0,
      "lastReviewedAt": "2026-11-25T08:35:17.562Z",
      "mastery": "learning",
      "nextReviewDate": "2026-11-30",
      "reviewCount": 1
    },
    {
      "back": "n = C × V (මෙහි C යනු සාන්ද්‍රණය වන අතර V යනු dm³ වලින් පරිමාව වේ)",
      "deckId": "deck-ae266a11-189f-45bb-b790-a0e4073672d3",
      "dueToday": false,
      "easeFactor": 2.65,
      "front": "ද්‍රාවණයක මවුල ගණන සෙවීමට භාවිතා කරන සූත්‍රය කුමක්ද?",
      "id": "43f7cf74-88ca-4adc-bdf4-04a86ed5bf36",
      "intervalDays": 5,
      "lapses": 0,
      "lastReviewedAt": "2026-11-25T08:35:28.626Z",
      "mastery": "learning",
      "nextReviewDate": "2026-11-30",
      "reviewCount": 1
    },
    {
      "back": "විසඳුමක පරිමාව වැඩි කිරීමේදී (ජලය එකතු කිරීමේදී) ද්‍රාව්‍යයේ මවුල සංඛ්‍යාව නියතව පවතී (වෙනස් නොවේ).",
      "deckId": "deck-ae266a11-189f-45bb-b790-a0e4073672d3",
      "dueToday": false,
      "easeFactor": 2.65,
      "front": "ද්‍රාවණයක් තනුක කිරීමේදී ද්‍රාව්‍යයේ මවුල සංඛ්‍යාවට සිදුවන්නේ කුමක්ද?",
      "id": "3adfbcae-d45e-45da-bf53-cc6790be5a5d",
      "intervalDays": 5,
      "lapses": 0,
      "lastReviewedAt": "2026-11-25T08:35:40.620Z",
      "mastery": "learning",
      "nextReviewDate": "2026-11-30",
      "reviewCount": 1
    },
    {
      "back": "C₁V₁ = C₂V₂",
      "deckId": "deck-ae266a11-189f-45bb-b790-a0e4073672d3",
      "dueToday": false,
      "easeFactor": 2.65,
      "front": "තනුක කිරීමේදී භාවිතා කරන මූලික සමීකරණය කුමක්ද?",
      "id": "698ae8e8-7423-45b7-a113-3c97afaa41a7",
      "intervalDays": 5,
      "lapses": 0,
      "lastReviewedAt": "2026-11-25T08:35:52.994Z",
      "mastery": "learning",
      "nextReviewDate": "2026-11-30",
      "reviewCount": 1
    },
    {
      "back": "6.022 × 10²³ කි. අංශු වර්ගයද සඳහන් කරන්න.",
      "deckId": "cc-rb1-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "මවුලයක නිශ්චිත අංශු ගණන ආසන්න වශයෙන් කීයද?",
      "id": "cc-rb1-f0",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "මවුල 2 කි. එක් අණුවකට N පරමාණු දෙකක් ඇත.",
      "deckId": "cc-rb1-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "N₂ මවුලයක නයිට්‍රජන් පරමාණු මවුල කීයක් තිබේද?",
      "id": "cc-rb1-f1",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "සංයෝගයේ මවුලික ස්කන්ධය ආනුභවික සූත්‍රයට අදාළ මවුලික ස්කන්ධයෙන් බෙදා ලැබෙන ගුණකයෙන් සියලු යටි ලකුණු ගුණ කරන්න.",
      "deckId": "cc-rb1-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "ආනුභවික සූත්‍රයෙන් අණුක සූත්‍රය සොයන්නේ කෙසේද?",
      "id": "cc-rb1-f2",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "මුල් මවුල ගණන තුලිත සංගුණකයෙන් බෙදූ විට කුඩාම අගය ලැබෙන ප්‍රතික්‍රියකය තෝරන්න.",
      "deckId": "cc-rb1-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "සීමාකාරී ප්‍රතික්‍රියකය තෝරන්නේ කෙසේද?",
      "id": "cc-rb1-f3",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "සාම්පලය 100 g තුළ අදාළ ශුද්ධ ද්‍රව්‍යය 80 g ඇත.",
      "deckId": "cc-rb1-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "ස්කන්ධය අනුව පිරිසිදුකම 80% යන්නෙන් අදහස් වන්නේ කුමක්ද?",
      "id": "cc-rb1-f4",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "125/1000 = 0.125 dm³.",
      "deckId": "cc-rb2-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "125 cm³ ඝන ඩෙසිමීටරවලින් කීයද?",
      "id": "cc-rb2-f0",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "ද්‍රාව්‍යයේ මවුල ගණනයි. එබැවින් c₁V₁ = c₂V₂ වේ.",
      "deckId": "cc-rb2-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "ජලය එකතු කර ද්‍රාවණයක් තනුක කිරීමේදී නියතව පවතින්නේ කුමක්ද?",
      "id": "cc-rb2-f1",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "ද්‍රාව්‍යය හා ද්‍රාවකය ඇතුළු මුළු ද්‍රාවණයේ ස්කන්ධයයි.",
      "deckId": "cc-rb2-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "ස්කන්ධ ප්‍රතිශතය ගණනය කිරීමේදී හරයට ගන්නේ කුමන ස්කන්ධයද?",
      "id": "cc-rb2-f2",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "මිශ්‍රණය කිලෝග්‍රෑමයකට ද්‍රාව්‍ය මිලිග්‍රෑම් එකකි.",
      "deckId": "cc-rb2-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "ස්කන්ධ පදනමින් 1 ppm යනු කුමක්ද?",
      "id": "cc-rb2-f3",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "සියලු සංරචකවල මවුල භාග එකතු කළ විට 1 ලැබිය යුතුය.",
      "deckId": "cc-rb2-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "මවුල භාගවල එකතුවෙන් පිළිතුර පරීක්ෂා කරන්නේ කෙසේද?",
      "id": "cc-rb2-f4",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "අවසාන පාඨාංකයෙන් ආරම්භක පාඨාංකය අඩු කරන්න.",
      "deckId": "cc-rb3-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "බියුරෙට්ටුවෙන් වැය වූ පරිමාව සොයන්නේ කෙසේද?",
      "id": "cc-rb3-f0",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "මවුල 2 කි. අම්ල මවුලයකින් ලැබෙන H⁺ මවුල දෙකටම OH⁻ අවශ්‍යය.",
      "deckId": "cc-rb3-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "H₂SO₄ මවුලයක් සම්පූර්ණයෙන් උදාසීන කිරීමට NaOH මවුල කීයක් අවශ්‍යද?",
      "id": "cc-rb3-f1",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "විශ්ලේෂණයට ගන්නා ද්‍රාවණයෙන් නිවැරදිව මනින ලද පරිමා කොටසකි.",
      "deckId": "cc-rb3-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "අනුමාපනයකදී පිපෙට්ටුවෙන් ගන්නේ කුමක්ද?",
      "id": "cc-rb3-f2",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "HCO₃⁻ ය. එක් CO₃²⁻ අයනයක් එක් H⁺ අයනයක් ලබා ගනී.",
      "deckId": "cc-rb3-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "කාබනේට් අනුමාපනයේ පළමු සමතුල්‍ය ලක්ෂ්‍යයේදී සෑදෙන අයනය කුමක්ද?",
      "id": "cc-rb3-f3",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    },
    {
      "back": "පළමු අන්ත ලක්ෂ්‍යය අසලදී රෝස පැහැය නැති වී අවර්ණ වේ.",
      "deckId": "cc-rb3-deck",
      "dueToday": true,
      "easeFactor": 2.5,
      "front": "කාබනේට් ද්‍රාවණයට අම්ල එකතු කරන විට ෆීනෝල්ෆ්තලීන් දර්ශකයේ වෙනස කුමක්ද?",
      "id": "cc-rb3-f4",
      "intervalDays": 1,
      "lapses": 0,
      "mastery": "new",
      "nextReviewDate": "2026-11-26",
      "reviewCount": 0
    }
  ],
  "exams": [
    {
      "date": "2027-08-03",
      "id": "ex-1795616278426",
      "mockHistory": [],
      "prepProgress": 35,
      "room": "Main Hall",
      "subjectId": "",
      "syllabusTopics": [
        "Core Lectures",
        "Problem Sets"
      ],
      "targetGrade": "",
      "time": "",
      "title": "Advancel Level Exam",
      "weightPercent": 25
    }
  ],
  "quizzes": [
    {
      "attempts": [
        {
          "at": "2026-11-25T08:38:44.387Z",
          "id": "ecaba190-1928-4caa-a9f7-97f6acf98251",
          "review": {
            "answers": {
              "64a56c44-f3dd-4bae-a85f-afaba82a8be2": "0.125 mol dm-3"
            },
            "marks": {},
            "questions": [
              {
                "correctAnswer": "0.167 mol dm-3",
                "explanation": "භාවිතා කළ සූත්‍රය: C1V1 = C2V2. 0.5 × 100 = C2 × 300, C2 = 50 / 300 = 0.167 mol dm-3 වේ.",
                "id": "64a56c44-f3dd-4bae-a85f-afaba82a8be2",
                "options": [
                  "0.5 mol dm-3",
                  "0.167 mol dm-3",
                  "0.125 mol dm-3",
                  "0.25 mol dm-3"
                ],
                "prompt": "0.5 mol dm-3 සාන්ද්‍රණයක් සහිත Na2CO3 ද්‍රාවණයේ 100 cm3 පරිමාවකට, මුළු පරිමාව 300 cm3 වන පරිදි ආසුත ජලය එකතු කළ විට අවසාන සාන්ද්‍රණය කොපමණද?",
                "topic": "රසායනික ගණනය හා තනුක කිරීම් - පුහුණු ප්‍රශ්නාවලිය (Practice Test)",
                "type": "mcq"
              },
              {
                "correctAnswer": "200 cm3",
                "explanation": "මුල් Na+ මවුල = 0.1 mol වේ. අවසාන Na+ මවුල 0.12 mol කිරීමට එකතු කළ යුතු 0.1 mol dm-3 NaCl පරිමාව V නම්: 0.1 + (0.1 × V / 1000) = 0.12, V = 200 cm3.",
                "id": "500a1223-6f59-4ecb-b26f-6b96b92efaf5",
                "options": [
                  "100 cm3",
                  "150 cm3",
                  "200 cm3",
                  "250 cm3"
                ],
                "prompt": "ඉහත අවසාන Na2CO3 ද්‍රාවණයට 0.1 mol dm-3 NaCl ද්‍රාවණයක් එකතු කිරීමෙන් පසු Na+ අවසාන මවුල ගණන 0.12 mol විය. එකතු කළ NaCl ද්‍රාවණයේ පරිමාව කොපමණද?",
                "topic": "රසායනික ගණනය හා තනුක කිරීම් - පුහුණු ප්‍රශ්නාවලිය (Practice Test)",
                "type": "mcq"
              },
              {
                "correctAnswer": "C1V1 = C2V2",
                "explanation": "ද්‍රාවණයක් තනුක කිරීමේදී ද්‍රාව්‍යයේ මවුල සංඛ්‍යාව නියතව පවතින බැවින් C1V1 = C2V2 සම්බන්ධතාව භාවිතා වේ.",
                "id": "9c8a0da7-a746-4d55-8d0c-c29359319ce0",
                "options": [
                  "C1V1 = C2V2",
                  "PV = nRT",
                  "pH = -log[H+]",
                  "Q = mcθ"
                ],
                "prompt": "විද්‍යාගාරයේදී ද්‍රාවණයක් තනුක කිරීමේදී (Dilution) භාවිතා කරන මූලික සමීකරණය කුමක්ද?",
                "topic": "රසායනික ගණනය හා තනුක කිරීම් - පුහුණු ප්‍රශ්නාවලිය (Practice Test)",
                "type": "mcq"
              },
              {
                "correctAnswer": "2",
                "explanation": "Na2CO3 විඝටනය වීමේදී Na+ අයන 2ක් සහ CO3(2-) අයනයක් ලබා දෙයි. එබැවින් Na2CO3 මවුල 1කින් Na+ මවුල 2ක් ලැබේ.",
                "id": "43428d0b-4387-423e-9f7b-240aa28a681d",
                "options": [
                  "1",
                  "2",
                  "3",
                  "4"
                ],
                "prompt": "Na2CO3 1 අණුවකින් ජලීය ද්‍රාවණයක් තුළ සපයන සෝඩියම් අයන (Na+) සංඛ්‍යාව කීයද?",
                "topic": "රසායනික ගණනය හා තනුක කිරීම් - පුහුණු ප්‍රශ්නාවලිය (Practice Test)",
                "type": "mcq"
              },
              {
                "correctAnswer": "මවුල සංඛ්‍යාව නියතව පවතී",
                "explanation": "කිසියම් ද්‍රාවණයකට පිරිසිදු ද්‍රාවකයක් (ආසුත ජලය) පමණක් එකතු කර තනුක කළ විට, ද්‍රාව්‍ය පදාර්ථයේ මුළු මවුල සංඛ්‍යාව වෙනස් නොවේ.",
                "id": "ba71afd2-dcb1-449f-9bd5-a7b072e4504c",
                "options": [
                  "සාන්ද්‍රණය වැඩි වේ",
                  "මවුල සංඛ්‍යාව නියතව පවතී",
                  "පරිමාව අඩුවේ",
                  "ද්‍රාව්‍ය ස්කන්ධය වෙනස් වේ"
                ],
                "prompt": "ජලය එකතු කර ද්‍රාවණයක් තනුක කළ විට සිදු වන්නේ කුමක්ද?",
                "topic": "රසායනික ගණනය හා තනුක කිරීම් - පුහුණු ප්‍රශ්නාවලිය (Practice Test)",
                "type": "mcq"
              }
            ]
          },
          "score": 0
        }
      ],
      "difficulty": "Exam Level",
      "durationMinutes": 10,
      "id": "cc5f7189-3d94-4c33-a4a3-42bfca0c5894",
      "lastScore": 0,
      "questions": [
        {
          "correctAnswer": "0.167 mol dm-3",
          "explanation": "භාවිතා කළ සූත්‍රය: C1V1 = C2V2. 0.5 × 100 = C2 × 300, C2 = 50 / 300 = 0.167 mol dm-3 වේ.",
          "id": "64a56c44-f3dd-4bae-a85f-afaba82a8be2",
          "options": [
            "0.5 mol dm-3",
            "0.167 mol dm-3",
            "0.125 mol dm-3",
            "0.25 mol dm-3"
          ],
          "prompt": "0.5 mol dm-3 සාන්ද්‍රණයක් සහිත Na2CO3 ද්‍රාවණයේ 100 cm3 පරිමාවකට, මුළු පරිමාව 300 cm3 වන පරිදි ආසුත ජලය එකතු කළ විට අවසාන සාන්ද්‍රණය කොපමණද?",
          "topic": "රසායනික ගණනය හා තනුක කිරීම් - පුහුණු ප්‍රශ්නාවලිය",
          "type": "mcq"
        },
        {
          "correctAnswer": "200 cm3",
          "explanation": "මුල් Na+ මවුල = 0.1 mol වේ. අවසාන Na+ මවුල 0.12 mol කිරීමට එකතු කළ යුතු 0.1 mol dm-3 NaCl පරිමාව V නම්: 0.1 + (0.1 × V / 1000) = 0.12, V = 200 cm3.",
          "id": "500a1223-6f59-4ecb-b26f-6b96b92efaf5",
          "options": [
            "100 cm3",
            "150 cm3",
            "200 cm3",
            "250 cm3"
          ],
          "prompt": "ඉහත අවසාන Na2CO3 ද්‍රාවණයට 0.1 mol dm-3 NaCl ද්‍රාවණයක් එකතු කිරීමෙන් පසු Na+ අවසාන මවුල ගණන 0.12 mol විය. එකතු කළ NaCl ද්‍රාවණයේ පරිමාව කොපමණද?",
          "topic": "රසායනික ගණනය හා තනුක කිරීම් - පුහුණු ප්‍රශ්නාවලිය",
          "type": "mcq"
        },
        {
          "correctAnswer": "C1V1 = C2V2",
          "explanation": "ද්‍රාවණයක් තනුක කිරීමේදී ද්‍රාව්‍යයේ මවුල සංඛ්‍යාව නියතව පවතින බැවින් C1V1 = C2V2 සම්බන්ධතාව භාවිතා වේ.",
          "id": "9c8a0da7-a746-4d55-8d0c-c29359319ce0",
          "options": [
            "C1V1 = C2V2",
            "PV = nRT",
            "pH = -log[H+]",
            "Q = mcθ"
          ],
          "prompt": "විද්‍යාගාරයේදී ද්‍රාවණයක් තනුක කිරීමේදී (Dilution) භාවිතා කරන මූලික සමීකරණය කුමක්ද?",
          "topic": "රසායනික ගණනය හා තනුක කිරීම් - පුහුණු ප්‍රශ්නාවලිය",
          "type": "mcq"
        },
        {
          "correctAnswer": "2",
          "explanation": "Na2CO3 විඝටනය වීමේදී Na+ අයන 2ක් සහ CO3(2-) අයනයක් ලබා දෙයි. එබැවින් Na2CO3 මවුල 1කින් Na+ මවුල 2ක් ලැබේ.",
          "id": "43428d0b-4387-423e-9f7b-240aa28a681d",
          "options": [
            "1",
            "2",
            "3",
            "4"
          ],
          "prompt": "Na2CO3 1 අණුවකින් ජලීය ද්‍රාවණයක් තුළ සපයන සෝඩියම් අයන (Na+) සංඛ්‍යාව කීයද?",
          "topic": "රසායනික ගණනය හා තනුක කිරීම් - පුහුණු ප්‍රශ්නාවලිය",
          "type": "mcq"
        },
        {
          "correctAnswer": "මවුල සංඛ්‍යාව නියතව පවතී",
          "explanation": "කිසියම් ද්‍රාවණයකට පිරිසිදු ද්‍රාවකයක් (ආසුත ජලය) පමණක් එකතු කර තනුක කළ විට, ද්‍රාව්‍ය පදාර්ථයේ මුළු මවුල සංඛ්‍යාව වෙනස් නොවේ.",
          "id": "ba71afd2-dcb1-449f-9bd5-a7b072e4504c",
          "options": [
            "සාන්ද්‍රණය වැඩි වේ",
            "මවුල සංඛ්‍යාව නියතව පවතී",
            "පරිමාව අඩුවේ",
            "ද්‍රාව්‍ය ස්කන්ධය වෙනස් වේ"
          ],
          "prompt": "ජලය එකතු කර ද්‍රාවණයක් තනුක කළ විට සිදු වන්නේ කුමක්ද?",
          "topic": "රසායනික ගණනය හා තනුක කිරීම් - පුහුණු ප්‍රශ්නාවලිය",
          "type": "mcq"
        }
      ],
      "subjectId": "al27-chemistry",
      "title": "රසායනික ගණනය හා තනුක කිරීම් - පුහුණු ප්‍රශ්නාවලිය"
    },
    {
      "attempts": [
        {
          "at": "2026-11-26T07:10:32.966Z",
          "id": "10f310e9-617a-4e29-aa75-8fc91fd0eb38",
          "review": {
            "answers": {
              "cc-rb1-q0": "2 mol",
              "cc-rb1-q1": "C₃H₆",
              "cc-rb1-q2": "1 mol",
              "cc-rb1-q3": "0.20 mol",
              "cc-rb1-q4": "75%"
            },
            "marks": {},
            "questions": [
              {
                "correctAnswer": "2 mol",
                "explanation": "ජල මවුල ගණන 18/18 = 1 ය. එක් අණුවක H පරමාණු දෙකක් ඇති බැවින් පිළිතුර 2 mol ය.",
                "id": "cc-rb1-q0",
                "options": [
                  "1 mol",
                  "3 mol",
                  "0.5 mol",
                  "2 mol"
                ],
                "prompt": "H₂O 18 g තුළ H පරමාණු මවුල කීයක් තිබේද? (M = 18 g mol⁻¹)",
                "topic": "මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට",
                "type": "mcq"
              },
              {
                "correctAnswer": "C₃H₆",
                "explanation": "ගුණකය 42/14 = 3 බැවින් සූත්‍රය C₃H₆ ය.",
                "id": "cc-rb1-q1",
                "options": [
                  "C₃H₆",
                  "CH₂",
                  "C₂H₄",
                  "C₃H₂"
                ],
                "prompt": "ආනුභවික සූත්‍රය CH₂ වන සංයෝගයක මවුලික ස්කන්ධය 42 g mol⁻¹ ය. අණුක සූත්‍රය කුමක්ද?",
                "topic": "මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට",
                "type": "mcq"
              },
              {
                "correctAnswer": "1 mol",
                "explanation": "H₂ මවුල 4 ට O₂ මවුල 2 ක් වැය වේ. ඉතිරිය 3 − 2 = 1 mol ය.",
                "id": "cc-rb1-q2",
                "options": [
                  "3 mol",
                  "1 mol",
                  "2 mol",
                  "0 mol"
                ],
                "prompt": "2H₂ + O₂ → 2H₂O සඳහා H₂ මවුල 4 ක් හා O₂ මවුල 3 ක් ගත් විට ඉතිරි O₂ ප්‍රමාණය කීයද?",
                "topic": "මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට",
                "type": "mcq"
              },
              {
                "correctAnswer": "0.20 mol",
                "explanation": "ශුද්ධ ස්කන්ධය 25 × 0.80 = 20 g ය. මවුල ගණන 20/100 = 0.20 mol ය.",
                "id": "cc-rb1-q3",
                "options": [
                  "2.0 mol",
                  "0.80 mol",
                  "0.20 mol",
                  "0.25 mol"
                ],
                "prompt": "25 g සාම්පලයක ස්කන්ධයෙන් 80% ක් CaCO₃ ය. එහි CaCO₃ මවුල ගණන කීයද? (M = 100 g mol⁻¹)",
                "topic": "මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට",
                "type": "mcq"
              },
              {
                "correctAnswer": "75%",
                "explanation": "ලැබුණු ස්කන්ධය සෛද්ධාන්තික ස්කන්ධයෙන් බෙදා 100 න් ගුණ කරන්න. 9/12 × 100 = 75%.",
                "id": "cc-rb1-q4",
                "options": [
                  "25%",
                  "133%",
                  "90%",
                  "75%"
                ],
                "prompt": "සෛද්ධාන්තික ඵල ස්කන්ධය 12 g ය. ලැබුණු ඵල ස්කන්ධය 9 g නම් ප්‍රතිශත ඵලදාව කීයද?",
                "topic": "මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට",
                "type": "mcq"
              }
            ]
          },
          "score": 100
        }
      ],
      "difficulty": "Standard",
      "durationMinutes": 12,
      "id": "cc-rb1-test",
      "lastScore": 100,
      "questions": [
        {
          "correctAnswer": "2 mol",
          "explanation": "ජල මවුල ගණන 18/18 = 1 ය. එක් අණුවක H පරමාණු දෙකක් ඇති බැවින් පිළිතුර 2 mol ය.",
          "id": "cc-rb1-q0",
          "options": [
            "1 mol",
            "3 mol",
            "0.5 mol",
            "2 mol"
          ],
          "prompt": "H₂O 18 g තුළ H පරමාණු මවුල කීයක් තිබේද? (M = 18 g mol⁻¹)",
          "topic": "මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට",
          "type": "mcq"
        },
        {
          "correctAnswer": "C₃H₆",
          "explanation": "ගුණකය 42/14 = 3 බැවින් සූත්‍රය C₃H₆ ය.",
          "id": "cc-rb1-q1",
          "options": [
            "C₃H₆",
            "CH₂",
            "C₂H₄",
            "C₃H₂"
          ],
          "prompt": "ආනුභවික සූත්‍රය CH₂ වන සංයෝගයක මවුලික ස්කන්ධය 42 g mol⁻¹ ය. අණුක සූත්‍රය කුමක්ද?",
          "topic": "මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට",
          "type": "mcq"
        },
        {
          "correctAnswer": "1 mol",
          "explanation": "H₂ මවුල 4 ට O₂ මවුල 2 ක් වැය වේ. ඉතිරිය 3 − 2 = 1 mol ය.",
          "id": "cc-rb1-q2",
          "options": [
            "3 mol",
            "1 mol",
            "2 mol",
            "0 mol"
          ],
          "prompt": "2H₂ + O₂ → 2H₂O සඳහා H₂ මවුල 4 ක් හා O₂ මවුල 3 ක් ගත් විට ඉතිරි O₂ ප්‍රමාණය කීයද?",
          "topic": "මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට",
          "type": "mcq"
        },
        {
          "correctAnswer": "0.20 mol",
          "explanation": "ශුද්ධ ස්කන්ධය 25 × 0.80 = 20 g ය. මවුල ගණන 20/100 = 0.20 mol ය.",
          "id": "cc-rb1-q3",
          "options": [
            "2.0 mol",
            "0.80 mol",
            "0.20 mol",
            "0.25 mol"
          ],
          "prompt": "25 g සාම්පලයක ස්කන්ධයෙන් 80% ක් CaCO₃ ය. එහි CaCO₃ මවුල ගණන කීයද? (M = 100 g mol⁻¹)",
          "topic": "මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට",
          "type": "mcq"
        },
        {
          "correctAnswer": "75%",
          "explanation": "ලැබුණු ස්කන්ධය සෛද්ධාන්තික ස්කන්ධයෙන් බෙදා 100 න් ගුණ කරන්න. 9/12 × 100 = 75%.",
          "id": "cc-rb1-q4",
          "options": [
            "25%",
            "133%",
            "90%",
            "75%"
          ],
          "prompt": "සෛද්ධාන්තික ඵල ස්කන්ධය 12 g ය. ලැබුණු ඵල ස්කන්ධය 9 g නම් ප්‍රතිශත ඵලදාව කීයද?",
          "topic": "මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට",
          "type": "mcq"
        }
      ],
      "sourceNoteId": "cc-rb1-note",
      "subjectId": "al27-chemistry",
      "syllabusLinks": {
        "chapterIds": [
          "al27-chemistry-unit-03",
          "al27-chemistry-unit-03-ch2"
        ]
      },
      "title": "පුහුණු පරීක්ෂණය 1 • මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට"
    },
    {
      "attempts": [],
      "difficulty": "Standard",
      "durationMinutes": 12,
      "id": "cc-rb2-test",
      "questions": [
        {
          "correctAnswer": "1.50 M",
          "explanation": "ලවණ සාන්ද්‍රණය 0.050/0.100 = 0.50 M ය. එක් සූත්‍ර ඒකකයකට K⁺ තුනක් ඇති බැවින් [K⁺] = 1.50 M ය.",
          "id": "cc-rb2-q0",
          "options": [
            "0.15 M",
            "0.050 M",
            "1.50 M",
            "0.50 M"
          ],
          "prompt": "K₃PO₄ මවුල 0.050 ක් දියකර 100 cm³ ද්‍රාවණයක් සාදයි. පූර්ණ විඝටනයේදී [K⁺] කීයද?",
          "topic": "ද්‍රාවණවල සාන්ද්‍රණය හා සංයුතිය ගණනය කිරීම",
          "type": "mcq"
        },
        {
          "correctAnswer": "0.075 M",
          "explanation": "ද්‍රාව්‍ය මවුල නියත බැවින් නව සාන්ද්‍රණය 0.30/4 = 0.075 M ය.",
          "id": "cc-rb2-q1",
          "options": [
            "1.20 M",
            "0.100 M",
            "0.060 M",
            "0.075 M"
          ],
          "prompt": "0.30 M ද්‍රාවණයක් මුල් පරිමාව මෙන් හතර ගුණයක පරිමාවකට තනුක කළ විට සාන්ද්‍රණය කීයද?",
          "topic": "ද්‍රාවණවල සාන්ද්‍රණය හා සංයුතිය ගණනය කිරීම",
          "type": "mcq"
        },
        {
          "correctAnswer": "3 ppm",
          "explanation": "6 mg/2 kg = 3 mg kg⁻¹ = 3 ppm ය.",
          "id": "cc-rb2-q2",
          "options": [
            "3 ppm",
            "12 ppm",
            "0.3 ppm",
            "3000 ppm"
          ],
          "prompt": "මිශ්‍රණය 2 kg තුළ ද්‍රාව්‍ය 6 mg ඇත. ස්කන්ධ පදනමින් සංයුතිය ppm වලින් කීයද?",
          "topic": "ද්‍රාවණවල සාන්ද්‍රණය හා සංයුතිය ගණනය කිරීම",
          "type": "mcq"
        },
        {
          "correctAnswer": "0.40 M",
          "explanation": "මුළු මවුල ගණන 0.020 + 0.060 = 0.080 ය. පරිමාව 0.200 dm³ බැවින් පිළිතුර 0.40 M ය.",
          "id": "cc-rb2-q3",
          "options": [
            "0.04 M",
            "0.40 M",
            "0.80 M",
            "0.20 M"
          ],
          "prompt": "0.20 M KCl ද්‍රාවණය 100 cm³ හා 0.60 M KCl ද්‍රාවණය 100 cm³ මිශ්‍ර කළ විට අවසාන සාන්ද්‍රණය කීයද? පරිමා එකතු වේ යැයි ගන්න.",
          "topic": "ද්‍රාවණවල සාන්ද්‍රණය හා සංයුතිය ගණනය කිරීම",
          "type": "mcq"
        },
        {
          "correctAnswer": "9.5 g",
          "explanation": "අවශ්‍ය මවුල 0.20 × 0.500 = 0.100 ය. ස්කන්ධය 0.100 × 95 = 9.5 g ය.",
          "id": "cc-rb2-q4",
          "options": [
            "4.75 g",
            "95 g",
            "9.5 g",
            "19 g"
          ],
          "prompt": "0.20 M MgCl₂ ද්‍රාවණය 500 cm³ සෑදීමට අවශ්‍ය නිර්ජල MgCl₂ ස්කන්ධය කීයද? (M = 95 g mol⁻¹)",
          "topic": "ද්‍රාවණවල සාන්ද්‍රණය හා සංයුතිය ගණනය කිරීම",
          "type": "mcq"
        }
      ],
      "sourceNoteId": "cc-rb2-note",
      "subjectId": "al27-chemistry",
      "syllabusLinks": {
        "chapterIds": [
          "al27-chemistry-unit-03-ch3"
        ]
      },
      "title": "පුහුණු පරීක්ෂණය 2 • ද්‍රාවණවල සාන්ද්‍රණය හා සංයුතිය ගණනය කිරීම"
    },
    {
      "attempts": [],
      "difficulty": "Standard",
      "durationMinutes": 12,
      "id": "cc-rb3-test",
      "questions": [
        {
          "correctAnswer": "20.25 cm³",
          "explanation": "අවසාන පාඨාංකයෙන් මුල් අගය අඩු කරන්න. 21.60 − 1.35 = 20.25 cm³ ය.",
          "id": "cc-rb3-q0",
          "options": [
            "20.35 cm³",
            "20.25 cm³",
            "22.95 cm³",
            "21.60 cm³"
          ],
          "prompt": "බියුරෙට්ටුවේ මුල් හා අවසාන පාඨාංක 1.35 හා 21.60 cm³ ය. වැය වූ පරිමාව කීයද?",
          "topic": "අම්ල–භෂ්ම අනුමාපන හා කාබනේට් අන්ත ලක්ෂ්‍ය",
          "type": "mcq"
        },
        {
          "correctAnswer": "0.160 M",
          "explanation": "අම්ල මිලිමවුල 2.00 සඳහා KOH මිලිමවුල 4.00 ක් අවශ්‍යය. 4.00/25.0 = 0.160 M ය.",
          "id": "cc-rb3-q1",
          "options": [
            "0.040 M",
            "0.200 M",
            "0.160 M",
            "0.080 M"
          ],
          "prompt": "KOH ද්‍රාවණයක 25.0 cm³ උදාසීන කිරීමට 0.100 M H₂SO₄ ද්‍රාවණය 20.0 cm³ වැය වේ. [KOH] කීයද?",
          "topic": "අම්ල–භෂ්ම අනුමාපන හා කාබනේට් අන්ත ලක්ෂ්‍ය",
          "type": "mcq"
        },
        {
          "correctAnswer": "24.0 mL",
          "explanation": "එක් එක් පියවරේදී සමාන අම්ල ප්‍රමාණ වැය වේ. මුළු පරිමාව 12.0 + 12.0 = 24.0 cm³ ය.",
          "id": "cc-rb3-q2",
          "options": [
            "12.0 mL",
            "6.0 mL",
            "36.0 mL",
            "24.0 mL"
          ],
          "prompt": "ශුද්ධ Na₂CO₃ ද්‍රාවණයක පළමු අන්ත ලක්ෂ්‍යයට HCl ද්‍රාවණය 12.0 cm³ වැය වේ. මුල සිට දෙවන අන්ත ලක්ෂ්‍යයට වැය වන පරිමාව කීයද?",
          "topic": "අම්ල–භෂ්ම අනුමාපන හා කාබනේට් අන්ත ලක්ෂ්‍ය",
          "type": "mcq"
        },
        {
          "correctAnswer": "රෝස → අවර්ණ",
          "explanation": "මුලදී භාස්මික ද්‍රාවණය රෝස පැහැතිය. HCO₃⁻ සෑදෙද්දී රෝස පැහැය නැති වේ.",
          "id": "cc-rb3-q3",
          "options": [
            "රෝස → අවර්ණ",
            "කහ → නිල්",
            "අවර්ණ → රෝස",
            "තැඹිලි → කහ"
          ],
          "prompt": "කාබනේට් ද්‍රාවණයට අම්ල එකතු කරන විට ෆීනෝල්ෆ්තලීන් පෙන්වන පළමු අන්ත ලක්ෂ්‍යයේ වර්ණ වෙනස කුමක්ද?",
          "topic": "අම්ල–භෂ්ම අනුමාපන හා කාබනේට් අන්ත ලක්ෂ්‍ය",
          "type": "mcq"
        },
        {
          "correctAnswer": "2.0 mmol",
          "explanation": "අමතර අම්ල මිලිමවුල 1.0 මුල් CO₃²⁻ ප්‍රමාණයට සමානය. එබැවින් OH⁻ = 3.0 − 1.0 = 2.0 mmol ය.",
          "id": "cc-rb3-q4",
          "options": [
            "4.0 mmol",
            "2.0 mmol",
            "1.0 mmol",
            "3.0 mmol"
          ],
          "prompt": "කාබනේට් හා හයිඩ්‍රොක්සයිඩ් මිශ්‍රණයක පළමු අන්ත ලක්ෂ්‍යයට H⁺ මිලිමවුල 3.0 ක්ද දෙවන අන්ත ලක්ෂ්‍යයට තවත් මිලිමවුල 1.0 ක්ද වැය වේ. මුල් OH⁻ ප්‍රමාණය කීයද?",
          "topic": "අම්ල–භෂ්ම අනුමාපන හා කාබනේට් අන්ත ලක්ෂ්‍ය",
          "type": "mcq"
        }
      ],
      "sourceNoteId": "cc-rb3-note",
      "subjectId": "al27-chemistry",
      "syllabusLinks": {
        "chapterIds": [
          "al27-chemistry-unit-03-ch4"
        ]
      },
      "title": "පුහුණු පරීක්ෂණය 3 • අම්ල–භෂ්ම අනුමාපන හා කාබනේට් අන්ත ලක්ෂ්‍ය"
    }
  ],
  "focusHistory": [
    {
      "calendarSessionId": null,
      "completedAt": "2026-11-26",
      "durationMinutes": 120,
      "endedAtMs": 1795674420190,
      "id": "fh-1795674420190",
      "mode": "Custom",
      "qualityRating": 4,
      "source": "pc",
      "startedAtMs": 1795663309324,
      "subjectId": "al27-chemistry",
      "taskTitle": "රසායනික ගණනය - Chemical Calculations"
    },
    {
      "calendarSessionId": null,
      "completedAt": "2026-11-25",
      "durationMinutes": 120,
      "endedAtMs": 1795622981862,
      "id": "fh-1795622981862",
      "mode": "Custom",
      "qualityRating": 4,
      "source": "pc",
      "startedAtMs": 1795601684710,
      "subjectId": "al27-chemistry",
      "taskTitle": "Chemistry Study Session"
    },
    {
      "calendarSessionId": null,
      "completedAt": "2026-11-25",
      "durationMinutes": 120,
      "endedAtMs": 1795601593757,
      "id": "fh-1795601593757",
      "mode": "Custom",
      "qualityRating": 4,
      "source": "pc",
      "startedAtMs": 1795593745652,
      "subjectId": "al27-chemistry",
      "taskTitle": "Completing RB 2 Chemical Calculations"
    }
  ],
  "cardReviews": {
    "2026-11-25": 6
  },
  "rewardLedger": {
    "focus:fh-1795601593757": {
      "at": "2026-11-25T10:13:13.765Z",
      "kind": "focus"
    },
    "focus:fh-1795622981862": {
      "at": "2026-11-25T16:09:41.883Z",
      "kind": "focus"
    },
    "focus:fh-1795674420190": {
      "at": "2026-11-26T06:27:01.197Z",
      "kind": "focus"
    },
    "goal:al27-goal-01": {
      "at": "2026-11-25T07:58:46.173Z",
      "kind": "goal"
    },
    "review:2026-11-25:0": {
      "at": "2026-11-25T08:34:39.471Z",
      "kind": "review"
    },
    "review:2026-11-25:1": {
      "at": "2026-11-25T08:34:51.893Z",
      "kind": "review"
    },
    "review:2026-11-25:2": {
      "at": "2026-11-25T08:35:17.573Z",
      "kind": "review"
    },
    "review:2026-11-25:3": {
      "at": "2026-11-25T08:35:28.637Z",
      "kind": "review"
    },
    "review:2026-11-25:4": {
      "at": "2026-11-25T08:35:40.629Z",
      "kind": "review"
    },
    "review:2026-11-25:5": {
      "at": "2026-11-25T08:35:53.006Z",
      "kind": "review"
    },
    "task:task-AL27-class-Combined-Mathematics-Main-Revision-2026-12-08": {
      "at": "2026-11-25T13:11:18.493Z",
      "kind": "task"
    },
    "task:task-AL27-lesson-C01": {
      "at": "2026-11-25T07:58:46.173Z",
      "kind": "task"
    },
    "task:task-AL27-lesson-C02": {
      "at": "2026-11-25T13:03:11.277Z",
      "kind": "task"
    }
  },
  "xpPoints": 340
};
