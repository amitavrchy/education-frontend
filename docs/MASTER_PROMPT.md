# MASTER DEVELOPMENT PROMPT
## Complete AI-Powered SSC & HSC Learning Ecosystem
### Next.js Web + Flutter Mobile + Professional Admin Dashboard
### Frontend-Only, Production-Ready UI/UX, Fully Interactive Mock Functionality

---

# 0. YOUR ROLE AND MISSION

You are a world-class Principal Software Architect, Senior Next.js Engineer, Senior Flutter Engineer, Senior Product Designer, UX Researcher, EdTech Product Strategist, Accessibility Specialist, and QA Automation Engineer.

Your task is to **design and develop an entire professional-grade AI-powered learning ecosystem for Bangladeshi SSC and HSC students**, including:

1. Complete Next.js Student Web Application
2. Complete Flutter Student Mobile Application for Android and iOS
3. Complete Next.js Admin Dashboard
4. Complete Teacher and Content Reviewer Portal
5. Complete School and College Management Portal
6. Complete Parent/Guardian Dashboard
7. Reusable design system
8. Shared feature specifications and mock data contracts
9. Interactive frontend business logic
10. Professional documentation, testing, and future backend integration readiness

This is NOT a simple demo, a landing page, an MVP, or a small collection of disconnected UI screens.

It is a **complete frontend product implementation** that should cover all required features, navigation flows, screens, states, mock interactions, settings, and role-based experiences.

The product must look and feel like a polished commercial EdTech platform suitable for a real business.

## NON-NEGOTIABLE REQUIREMENTS

- DO NOT omit any feature specified in this prompt.
- DO NOT build only the main dashboard.
- DO NOT replace entire features with nonfunctional placeholder buttons.
- DO NOT leave navigation routes broken.
- DO NOT create disconnected screens.
- DO NOT implement only the happy path.
- DO NOT create a generic admin template with unrelated widgets.
- DO NOT use the same layout blindly across all user roles.
- DO NOT deliver a basic educational website.
- DO NOT create unnecessary backend services.
- DO NOT connect to real production AI or payment APIs.
- DO NOT hardcode mock business logic directly into presentation components.
- DO NOT silently mark unfinished work as complete.
- DO NOT remove features because the implementation is large.
- DO NOT require a complete UI redesign when real APIs are connected later.

The complete feature list is mandatory.

If the implementation requires multiple passes, maintain a persistent feature checklist and continue implementation systematically until every module is delivered.

Do not stop after scaffolding, dashboard creation, or the first functional module.

---

# 1. PRODUCT OVERVIEW

## Working Product Name

Use "EduMentor AI" as a temporary product name.

The architecture must support changing the name, logo, brand colors, illustrations, and marketing content centrally without modifying individual pages.

## Product Concept

Create a complete AI-powered personalized education platform specifically designed for students preparing for:

- SSC
- HSC
- Classes 9, 10, 11, and 12

The platform must support:

- Science
- Business Studies
- Humanities
- Bangla Version
- English Version
- General Education Boards
- Relevant paper/subject structures
- Multiple academic years
- Multiple curriculum versions
- Board examination years

The platform must accommodate future expansion into additional educational tracks without requiring a complete architectural rewrite.

## Primary Vision

"Every SSC and HSC student deserves an intelligent, personalized, accessible, and affordable private tutor."

## Main Product Pillars

1. AI Private Tutoring
2. Voice-Based Interactive Learning
3. Curriculum-Based Knowledge
4. Complete Question Banking
5. Board Examination Preparation
6. School and College Question Archives
7. Personalized Study Planning
8. Adaptive Learning
9. Smart Exam and Evaluation
10. Learning Analytics
11. Parent and Institution Collaboration
12. Comprehensive Administrative Content Management

---

# 2. DEVELOPMENT SCOPE

We are developing the complete **frontend ecosystem only**.

No real backend implementation is required at this stage.

However, the frontend architecture must be structured as if it will eventually connect to:

- NestJS Backend
- Python FastAPI AI Service
- PostgreSQL
- Prisma
- Vector Database
- Redis
- Object Storage
- Realtime Voice APIs
- Payment Services
- OCR Services
- Notification Services

All application screens must be functional with mock data and mock service adapters.

## Mock Functionality Requirements

For every feature:

1. Provide realistic mock data.
2. Implement functional UI interactions.
3. Implement meaningful state management.
4. Simulate asynchronous operations.
5. Show realistic loading states.
6. Show error states.
7. Show empty states.
8. Show success states.
9. Implement form validation.
10. Support working filters and search.
11. Support pagination where applicable.
12. Simulate CRUD operations.
13. Persist selected local data.
14. Support navigation between related workflows.
15. Keep API contracts ready for future integration.

A feature must not be considered completed merely because its screen exists.

A feature is considered completed only when its entire user journey works within the frontend mock environment.

## Mock Data Persistence

For Web:

- Use a typed mock repository layer.
- Use IndexedDB for richer browser-side persistence where appropriate.
- Use localStorage only for lightweight settings and preferences.
- Keep domain data separate from presentation components.

For Flutter:

- Use a repository abstraction.
- Use an appropriate local persistence implementation such as Hive, Isar, or Drift.
- Ensure that the selected storage package is maintained and compatible with the project environment.

For file uploads:

- Implement real file selection and validation.
- Implement upload progress simulation.
- Display file previews where practical.
- Keep file metadata and processing states.
- Support cancellation and retry.
- Clearly label OCR/RAG processing as simulated.

For authentication:

- Implement realistic mock registration, login, logout, OTP, role switching, and session behavior.
- Do not use or store real passwords as production credentials.
- Make all mock authentication behavior easily replaceable with real APIs.

For payments:

- Implement checkout UI and simulated payment states.
- Never collect or persist actual card credentials in the mock application.

---

# 3. TECHNOLOGY STACK

## A. Student Web Application

Use:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix UI
- Framer Motion or Motion
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Recharts or equivalent
- KaTeX or MathJax
- PDF.js
- IndexedDB for local mock content
- Lucide Icons

Use the stable, mutually compatible versions available in the environment.

Prefer Next.js App Router and a maintainable feature-based architecture.

## B. Admin Web Application

Use:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Table
- TanStack Query
- React Hook Form
- Zod
- Recharts
- Professional rich-text editor
- PDF preview components
- File upload components
- Role-based route guards

The Admin Dashboard should be visually consistent with the student platform while using a more information-dense professional management layout.

## C. Flutter Mobile Application

Use:

- Flutter
- Dart
- Material 3
- Riverpod
- GoRouter
- Dio-ready networking abstraction
- Freezed/json_serializable where appropriate
- Local persistence abstraction
- Flutter localization
- Responsive layout utilities
- flutter_animate or equivalent
- Math rendering
- PDF viewer
- Image picker
- File picker
- Charts
- Audio waveform and player interfaces

All packages must be compatible with the selected stable Flutter SDK.

## D. Repository Structure

Organize the workspace as:

```text
edumentor-ai/
├── apps/
│   ├── student-web/
│   ├── admin-web/
│   └── student-mobile/
│
├── packages/
│   ├── design-tokens/
│   ├── domain-contracts/
│   ├── mock-data/
│   └── api-contracts/
│
├── docs/
│   ├── architecture/
│   ├── product/
│   ├── api/
│   ├── testing/
│   └── design-system/
│
└── README.md
```

The packages may use code generation or shared JSON schemas where necessary.

Do not attempt to import TypeScript packages directly into Dart.

Instead, maintain platform-neutral schemas and generate or implement equivalent typed models for both platforms.

---

# 4. DESIGN SYSTEM — CRITICAL PRIORITY

The UI/UX must be exceptionally polished, student-friendly, professional, and visually distinctive.

It should feel like a premium combination of:

- Duolingo's approachable educational experience
- Khan Academy's learning clarity
- Modern AI chat applications
- Notion's clean information architecture
- Premium SaaS dashboard systems
- High-quality interactive learning products

Use these only as design-quality references.

Do not copy their layouts, branding, illustrations, or visual assets.

## Design Personality

The interface must communicate:

- Intelligence
- Trust
- Friendliness
- Academic credibility
- Clarity
- Focus
- Motivation
- Modern technology
- Accessibility
- Youthful energy without childish visuals

## Visual Requirements

Create a beautiful, consistent visual language using:

- Carefully designed color palette
- Neutral backgrounds
- Restrained educational accent colors
- Consistent spacing
- Premium typography
- Soft but professional shadows
- Rounded cards
- Smooth page transitions
- Refined hover effects
- Meaningful micro-interactions
- Elegant charts
- Academic illustrations
- Minimal visual clutter
- Clear information hierarchy

Avoid excessive gradients, random neon elements, distracting animations, and generic AI-generated dashboard aesthetics.

## Typography

Prioritize excellent Bangla and English readability.

Use properly licensed fonts such as:

- Hind Siliguri
- Noto Sans Bengali
- Inter
- Plus Jakarta Sans

Ensure Bangla mathematical explanations remain readable.

## Theme Support

Implement:

- Light mode
- Dark mode
- System theme
- High-contrast accessibility considerations
- Persistent appearance settings

## Responsive Requirements

The web experience must support:

- Large desktops
- Laptops
- Tablets
- Mobile browsers

Flutter must support common Android and iOS phone sizes, safe areas, landscape where useful, and tablet-adaptive layouts.

## Navigation Design

Student Web:

- Responsive sidebar
- Top search bar
- AI tutor quick-launch
- Notifications
- Profile menu
- Subject navigation
- Breadcrumbs
- Mobile bottom navigation where appropriate

Flutter:

- Bottom navigation
- Nested navigation
- Context-aware app bars
- Modal bottom sheets
- Full-screen focused learning experiences
- Smooth keyboard interactions
- Consistent back navigation

Admin:

- Collapsible sidebar
- Role-aware navigation
- Breadcrumbs
- Global search
- Filtering toolbar
- Notifications
- Quick actions
- Responsive tables and detail views

## UI States

Every major component must implement:

- Default
- Hover/focus
- Selected
- Loading
- Skeleton
- Empty
- Disabled
- Error
- Success
- Permission denied
- Offline or connectivity warning where relevant

Use the appropriate platform-native interaction patterns.

---

# 5. ALL USER ROLES

Implement complete, role-aware experiences for:

1. Student
2. Parent/Guardian
3. Teacher
4. Content Reviewer
5. Content Manager
6. School Administrator
7. College Administrator
8. Customer Support
9. Platform Administrator
10. Super Administrator

Each role must have:

- Appropriate navigation
- Role-specific dashboards
- Appropriate permissions
- Relevant feature access
- Profile management
- Settings
- Notifications
- Working mock interactions

Provide a demo role switcher for development and testing.

Do not expose the demo role switcher as a production security mechanism.

---

# 6. COMPLETE AUTHENTICATION & ONBOARDING

Implement:

- Welcome screen
- Login
- Signup
- Email login
- Phone login
- Mock OTP verification
- Password recovery UI
- Reset password UI
- Remember session
- Logout
- Session expiration simulation
- Account deletion request
- Profile editing
- Avatar upload
- Language selection
- Consent and privacy screens
- Guardian consent workflow where applicable

## Student Onboarding

Collect:

- Student name
- Class
- SSC/HSC
- Education board
- Group
- Bangla/English Version
- Academic year
- Curriculum version
- Exam year
- Institution
- Subject selection
- Optional subjects
- Target GPA
- Weak subjects
- Weak chapters
- Daily available study time
- Preferred study schedule
- Target examination date
- Preferred language
- Learning preferences

Create a beautiful multi-step onboarding wizard.

Include:

- Progress indicator
- Previous/next navigation
- Validation
- Save and resume
- Review screen
- Completion animation
- Personalized dashboard introduction

---

# 7. STUDENT DASHBOARD

Create a highly personalized student dashboard.

Required widgets:

1. Personalized greeting
2. Today's learning goal
3. Weekly study progress
4. Study streak
5. Daily recommended chapters
6. Continue learning
7. Upcoming exams
8. Quick AI tutor
9. Recent conversations
10. Weak topic alerts
11. Revision reminders
12. Upcoming study sessions
13. Subject performance
14. Chapter completion
15. Daily quiz
16. Saved questions
17. Recommended model tests
18. Learning achievements
19. Latest verified educational notices
20. Subscription status
21. Study calendar
22. Notification center
23. Recent resources
24. Today's learning summary

Implement realistic charts, progress indicators, scheduling displays, and meaningful card interactions.

Allow students to customize or reorder dashboard widgets where practical.

---

# 8. COMPLETE AI PRIVATE TUTOR

THIS IS THE MAIN PRODUCT FEATURE.

Build an advanced AI tutor frontend resembling a premium AI chat application designed specifically for education.

## Core Chat Features

- New conversation
- Conversation history
- Conversation search
- Rename conversation
- Delete conversation
- Pin conversation
- Archive conversation
- Conversation folders
- Subject-based conversation grouping
- Chapter-based conversation grouping
- Message timestamps
- Markdown rendering
- Mathematical equations
- Code blocks when needed
- Educational tables
- Structured explanations
- Message copying
- Message regeneration
- Message editing
- Follow-up suggestions
- Conversation exporting
- Bookmarking answers
- Conversation to notes
- Conversation to quiz
- Conversation to flashcards
- Conversation sharing with safe privacy defaults
- Feedback on answers
- Report incorrect answers

## Tutor Context Selection

Allow students to select:

- Education level
- Class
- Subject
- Paper
- Chapter
- Topic
- Curriculum version
- Language
- Teaching mode

The tutor interface should visually display active academic context.

Switching context must update the mock retrieval and explanation behavior.

## Teaching Modes

Implement all modes:

1. Simple Explanation
2. Private Tutor / Socratic Mode
3. Board Exam Answer Mode
4. Quick Revision
5. Step-by-Step Problem Solver
6. Deep Concept Learning
7. Practice Question Mode
8. Oral Examination Mode
9. Formula Explanation Mode
10. English Speaking Coach Mode

Each mode must have a distinctive and believable simulated interaction.

## AI Response Features

Display:

- Structured explanations
- Source references
- Book title
- Chapter
- Page reference
- Related questions
- Suggested follow-ups
- Knowledge confidence/verification indicators
- Helpful/unhelpful feedback
- Explanation difficulty adjustment
- Examples and analogies
- Quick practice suggestions

## Source Grounding

Implement a mock RAG retrieval layer.

The mock system should return realistic seeded textbook passages.

Each answer must be able to show:

- Referenced book
- Chapter
- Page
- Source excerpt
- Curriculum version
- Verification status

Implement a source viewer with highlighted referenced content.

Distinguish clearly between:

- Verified source-supported answer
- Partially supported answer
- General AI explanation
- Unavailable source
- Simulated AI answer

Never fabricate actual textbook citations and present them as verified real sources.

Use labeled sample textbooks and synthetic educational source fixtures for the demo.

## AI Safety & Quality

Implement interfaces for:

- Low-confidence answers
- Missing knowledge base content
- Conflicting sources
- Old curriculum warnings
- Report answer
- Request teacher review
- Answer correction history
- Academic integrity reminders
- Safe and age-appropriate interaction

## Mock Tutor Engine

Do not return the same generic answer for every question.

Create scenario-based responses for multiple subjects.

Support seeded examples involving:

- Physics
- Chemistry
- Biology
- General Mathematics
- Higher Mathematics
- Bangla
- English
- Accounting
- Finance
- Economics
- ICT
- Humanities subjects

Provide:

- Different response modes
- Relevant follow-up questions
- Source cards
- Simulated streaming text
- Loading indicators
- Retry behavior
- Error states
- Context changes

The mock tutor must feel realistic while remaining explicitly simulated.

---

# 9. COMPLETE VOICE AI TUTOR

Develop a premium conversational voice learning interface.

Required features:

1. Start voice session
2. End voice session
3. Pause/resume
4. Push-to-talk
5. Hands-free mode UI
6. Microphone permissions
7. Microphone selection where supported
8. Speaking indicator
9. Listening indicator
10. Processing indicator
11. Audio waveform visualization
12. Voice transcript
13. Student speech bubbles
14. AI speech bubbles
15. Text and voice conversation synchronization
16. Interrupt AI speaking
17. Adjust playback speed
18. Voice selection
19. Bangla voice
20. English voice
21. Mixed Bangla-English conversation
22. Oral exam mode
23. Conversation to notes
24. Conversation to summary
25. Conversation to flashcards
26. Save conversation
27. Voice usage limits
28. Network quality indicator
29. Audio permissions error
30. Voice session history

## Implementation Policy

Because no real voice AI backend is available:

- Implement a frontend-only simulated voice session.
- Optionally support browser/device speech capabilities where available.
- Include deterministic text-based demo transcripts.
- Use simulated response timing.
- Implement state transitions accurately.
- Do not claim to provide production-grade speech recognition.
- Do not pretend that a waveform alone constitutes functional voice AI.
- Clearly distinguish device-native speech features from simulated AI responses.

Architect the system so a future streaming realtime voice API can replace the mock adapter.

Design the UI for low-latency conversational interaction.

---

# 10. IMAGE QUESTION SOLVER

Implement:

- Capture photo
- Upload image
- Image preview
- Crop
- Rotate
- Retake
- Multiple image selection
- File validation
- Simulated OCR processing
- Extracted question display
- Correct OCR text
- Subject detection
- Chapter selection
- Request solution
- Step-by-step answer
- Explanation
- Save to notes
- Add to practice list
- Report OCR error

Use deterministic mock OCR examples.

Include examples for:

- Mathematics
- Physics numerical questions
- Chemistry equations
- Biology diagrams
- Bangla questions
- English grammar exercises

Include invalid image, unreadable image, and unsupported format states.

---

# 11. COMPLETE CURRICULUM & SUBJECT EXPLORER

Create a centralized curriculum browser.

Hierarchy:

Education Level
→ Curriculum Version
→ Class
→ Group
→ Subject
→ Paper
→ Chapter
→ Topic
→ Learning Outcome

Provide:

- Subject catalog
- Subject overview
- Chapter listing
- Chapter detail
- Topic listing
- Learning objectives
- Chapter description
- Estimated study duration
- Prerequisites
- Difficulty
- Completion progress
- Resource counts
- Questions count
- Examination relevance
- AI tutor shortcuts
- Start learning button
- Resume learning
- Mark completed
- Learning history

Use subject-specific illustrations and iconography.

Create realistic sample content across SSC and HSC subjects.

Do not use the same dummy chapter for every subject.

---

# 12. DIGITAL TEXTBOOK LIBRARY

Required functionality:

- Browse textbooks
- Search textbooks
- Filter by class
- Filter by subject
- Filter by curriculum
- Filter by language
- Filter by academic year
- Book detail page
- Book cover
- PDF viewer
- Chapter navigation
- Table of contents
- Page navigation
- Page zoom
- Bookmarks
- Reading history
- Continue reading
- Notes attached to pages
- Text highlights where supported
- AI explanation from selected passage
- Ask AI about page
- Related questions
- Related notes
- Chapter resources
- Download UI based on content permissions
- Offline availability indicator
- Textbook version warnings

Use licensed/sample PDF fixtures, not unauthorized textbook reproductions.

---

# 13. COMPLETE CHAPTER-BASED QUESTION BANK

Implement a comprehensive question management and study experience.

## Question Types

- Multiple-choice questions
- Short-answer questions
- Descriptive questions
- Creative questions
- CQ parts: ক, খ, গ, ঘ
- Numerical questions
- Mathematical proofs
- True/false
- Fill in the blanks
- Matching
- Definition questions
- Formula-based problems
- Diagram-related questions
- Case-based questions
- Passage-based questions
- Practical/theoretical questions where relevant

## Question Bank Features

- Browse by class
- Browse by subject
- Browse by chapter
- Browse by topic
- Browse by learning outcome
- Search
- Difficulty filtering
- Question type filtering
- Source filtering
- Year filtering
- Board filtering
- Marks filtering
- Verified status filtering
- Exam relevance filtering
- Sort by recent
- Sort by difficulty
- Sort by historical frequency
- Related questions
- Similar questions
- Answer reveal
- Detailed explanation
- Step-by-step solution
- Mark correct/incorrect
- Bookmark question
- Add to personal practice set
- Report incorrect question
- Copy question
- Print view
- Export permitted content
- Practice history
- Reattempt incorrect questions
- Topic coverage indicator

## Answer UI

Support:

- Formatted text
- Mathematics
- Images
- Tables
- Diagrams
- Structured steps
- Rubric-based answers
- Multiple valid solution methods
- Source citations

Do not show an empty answer panel.

All seeded questions should have meaningful answer data.

---

# 14. TEN-YEAR BOARD QUESTION ARCHIVE

Create a complete Board Question Explorer.

## Board Support

Support the relevant Bangladesh General Education Boards, including:

- Dhaka
- Chattogram
- Rajshahi
- Cumilla
- Jashore
- Barishal
- Sylhet
- Dinajpur
- Mymensingh

Structure the system for additional board categories if needed.

## Features

- SSC/HSC selection
- Board selection
- Year selection
- Subject selection
- Paper selection
- Curriculum version
- Examination type
- Question paper viewer
- Solved paper viewer
- MCQ answer sheet
- Creative question solutions
- Topic-based mapping
- Chapter-based mapping
- Question frequency analysis
- Similar question clustering
- Repeated concept identification
- Historical trends
- Practice full paper
- Timed previous-year examination
- Save question paper
- Bookmark questions
- Print/download permitted documents
- Compare questions from different years
- AI explanation of selected question
- Exam pattern summaries

## Authenticity Rules

Historical question data must support:

- Original source
- Board
- Examination year
- Authenticity status
- Original scan
- Verified transcript
- Solution
- Syllabus version
- Source permission metadata

If actual historical question data is unavailable, use clearly labeled synthetic sample papers.

Never label synthetic questions as actual historical board questions.

Do not invent board examinations for years when they did not occur.

---

# 15. SCHOOL & COLLEGE QUESTION ARCHIVE

Implement:

- Institution search
- Institution directory
- District filter
- Institution type
- Academic year
- Class
- Subject
- Examination category
- Question paper details
- Question scan viewer
- Verified solutions
- Institution-specific papers
- Public/private visibility
- Question bookmarks
- Related practice sets
- Teacher-uploaded papers
- Institution question collections
- Duplicate detection labels
- Content report functionality

Examination categories:

- Annual
- Half-yearly
- Pre-test
- Test
- Selection test
- Terminal
- Class test
- Model test
- Custom examination

---

# 16. COMPLETE ONLINE EXAMINATION SYSTEM

Implement the full examination experience.

## Types of Exams

1. Chapter examination
2. Topic examination
3. Subject examination
4. Full syllabus examination
5. Model test
6. Previous-year board examination
7. Daily challenge
8. Adaptive examination
9. Custom examination
10. Institution-created examination
11. Teacher-assigned examination
12. Mixed question practice
13. Oral practice assessment

## Exam Setup

Allow selection of:

- Subject
- Chapter
- Question types
- Question count
- Difficulty
- Time limit
- Total marks
- Negative marking when applicable
- Practice/exam mode
- Randomization
- Review policy

## Exam Taking UI

Implement:

- Full-screen focus mode
- Timer
- Question navigation
- Question palette
- Mark for review
- Previous/next
- Answer selection
- Written answer editor
- Handwritten answer upload
- Autosave
- Progress indicator
- Remaining questions
- Submit confirmation
- Time-expired behavior
- Session recovery simulation
- Exam instructions
- Keyboard accessibility

## Exam Results

Implement:

- Total score
- Correct answers
- Incorrect answers
- Unanswered questions
- Time spent
- Accuracy
- Question-wise analysis
- Topic-wise analysis
- Difficulty analysis
- Answer explanations
- Weak areas
- Recommended lessons
- Suggested revision
- Retake examination
- Result history
- Printable result
- Teacher feedback where relevant

All scoring logic for objective mock exams must work locally.

For descriptive AI-graded tests, clearly mark the output as simulated and non-authoritative.

---

# 17. AI HANDWRITING & ANSWER SHEET EVALUATOR

Develop complete interfaces for:

- Upload handwritten answer
- Capture answer sheet
- Multiple pages
- Page reordering
- Image preview
- Document crop
- Simulated OCR
- Extracted text correction
- Question mapping
- Answer comparison
- Rubric-based score
- Estimated marks
- Concept understanding
- Calculation accuracy
- Presentation quality
- Missing points
- Improvement suggestions
- Teacher-review request
- Evaluation history
- Before/after comparison
- Reattempt
- Export feedback

Display original handwriting alongside extracted text and evaluation.

Use realistic seeded evaluation cases.

The frontend must distinguish:

- AI estimated assessment
- Teacher-reviewed assessment
- Final official marks

---

# 18. PERSONALIZED STUDY PLANNER

Implement an intelligent study management system.

## Features

- Daily study plan
- Weekly study plan
- Monthly study plan
- Exam countdown
- Subject priority
- Chapter priority
- Target GPA
- Available hours
- Preferred study time
- Calendar
- Scheduled tasks
- Completed tasks
- Missed tasks
- Task rescheduling
- Daily reminders
- Revision scheduling
- Goal tracking
- Study plan generation simulation
- Manual editing
- Exam preparation plans
- Study recommendations
- Study habit insights
- Progress reports

Create:

- Calendar view
- Timeline view
- Task list view
- Weekly board
- Study session detail
- Study completion modal

Allow tasks to be moved or rescheduled.

---

# 19. ADAPTIVE LEARNING & WEAKNESS DETECTION

Implement a complete mock adaptive learning experience.

## Features

- Topic mastery scores
- Subject mastery scores
- Accuracy trends
- Question difficulty analysis
- Common mistake detection
- Knowledge gap mapping
- Prerequisite tracking
- Weak chapter identification
- Strong chapter identification
- Personalized practice recommendation
- Improvement trends
- Skill progression
- Weakness-to-mastery learning path
- Recommended lesson sequencing
- Revision recommendations
- Personalized study adjustment

## Visualization

Include:

- Mastery progress bars
- Subject performance charts
- Topic heatmaps
- Weekly trends
- Learning consistency graphs
- Strength/weakness comparisons
- Recommended learning roadmap

Implement deterministic mock algorithms that respond to quiz results.

Do not simply display unchanging charts.

---

# 20. FLASHCARDS & SPACED REPETITION

Implement:

- AI-generated flashcard simulation
- Manual flashcard creation
- Flashcards from chapter
- Flashcards from notes
- Flashcards from conversation
- Flashcards from incorrect questions
- Flashcard collections
- Flip-card animation
- Next/previous
- Known/unknown marking
- Easy/medium/hard rating
- Daily revision queue
- Spaced repetition scheduling
- Due cards
- Completed cards
- Flashcard statistics
- Search
- Filter
- Bookmark
- Edit/delete card
- Study mode
- Quick review mode

Use a deterministic simplified spaced repetition algorithm in the mock layer.

---

# 21. AI NOTES GENERATOR

Implement:

- Notes dashboard
- Generate from chapter
- Generate from topic
- Generate from question
- Generate from AI conversation
- Generate from uploaded content simulation
- Short notes
- Detailed notes
- Revision notes
- Formula sheets
- Definition sheets
- Key takeaways
- Important question notes
- Rich-text editing
- Folder organization
- Search
- Tags
- Favorites
- Note linking
- Export PDF
- Printable layouts
- Note preview
- Note history
- Auto-save

Use synthetic seeded educational materials.

---

# 22. ENGLISH LEARNING COACH

Implement a dedicated English learning system.

Features:

- Grammar practice
- Vocabulary practice
- Sentence correction
- Paragraph writing
- Essay writing
- Composition writing
- Email writing
- Reading comprehension
- Listening practice
- Speaking practice
- Pronunciation practice
- Mock speaking examination
- Vocabulary flashcards
- Grammar quizzes
- Writing feedback
- Error explanations
- Progress tracking
- Personalized improvement plan

Provide interactive sample exercises.

If real microphone-based evaluation is not available, provide a simulated pronunciation assessment and label it appropriately.

---

# 23. INTERACTIVE SCIENCE & MATHEMATICS LAB

Create visually rich educational interaction screens.

## Physics

- Motion visualization
- Force and acceleration
- Newton's laws
- Energy concepts
- Simple circuits
- Basic wave visualization

## Chemistry

- Atom structure
- Periodic table
- Chemical bonds
- Molecular structures
- Reaction concepts

## Biology

- Cell diagrams
- Human body systems
- Plant structures
- Biological process visualizations

## Mathematics

- Function graphs
- Equation visualizer
- Geometry interactions
- Trigonometric visualizations
- Formula explorer
- Scientific calculator

These should be real frontend interactions where practical.

For example:

- Changing mass should update a force visualization.
- Changing graph parameters should update the plotted function.
- Selecting an atomic element should update its information.
- Clicking biological diagram regions should show descriptions.

Use suitable frontend rendering tools and Flutter equivalents.

Do not replace the entire module with static images.

Include screen states for labs that are planned but not available for a specific syllabus topic.

---

# 24. AI AUDIO REVISION

Implement an audio learning center.

Features:

- Audio lesson library
- Chapter-based audio lessons
- Revision podcasts
- Play/pause
- Playback speed
- Seek bar
- Transcript
- Chapter markers
- Playlist
- Favorites
- Listening progress
- Continue listening
- Download status
- Audio history
- Generate audio lesson simulation
- Audio summary view
- Voice options UI

Use original demo audio or properly licensed sample audio where possible.

Do not falsely claim that generated audio is powered by a connected AI provider.

---

# 25. GAMIFICATION & STUDENT MOTIVATION

Implement:

- Daily streak
- Study points
- XP
- Levels
- Achievement badges
- Learning challenges
- Weekly missions
- Monthly milestones
- Chapter completion rewards
- Daily goal completion
- Study consistency visualization
- Optional leaderboards
- Friend challenges where appropriate
- Milestone celebrations
- Achievement history
- Motivational feedback
- Reward notifications

Do not design manipulative engagement patterns.

Enable students to hide competitive features.

---

# 26. OFFLINE LEARNING

Implement frontend offline interfaces and local mock functionality.

Features:

- Offline content library
- Download management
- Available offline resources
- Offline flashcards
- Downloaded notes
- Offline quizzes
- Storage usage
- Download status
- Content version
- Sync status
- Conflict resolution UI
- Connection indicator
- Retry synchronization
- Remove downloads
- Offline availability badges

For web, implement appropriate PWA caching where feasible.

For Flutter, use local storage and seeded downloadable sample content.

AI responses that require a server should display an appropriate unavailable/offline state.

---

# 27. PARENT/GUARDIAN DASHBOARD

Create a dedicated parent experience.

Features:

- Guardian onboarding
- Student linking flow
- Child overview
- Learning progress
- Study time summary
- Completed tasks
- Missed tasks
- Test scores
- Subject performance
- Weak areas
- Study calendar
- Teacher feedback
- Learning goals
- Notification preferences
- Guardian reports
- Consent management
- Subscription management
- Privacy controls
- Multiple linked students
- Report download

Design it with child privacy in mind.

Do not expose private AI conversations by default.

---

# 28. TEACHER & CONTENT REVIEWER PORTAL

Implement:

- Teacher dashboard
- Assigned subjects
- Content review queue
- Question review
- Answer verification
- Rubric management
- Suggested corrections
- Approve/reject content
- Review comments
- Question creation
- Question editing
- Create quizzes
- Create examinations
- Assign tasks
- Review student submissions
- Review handwriting evaluations
- Teacher feedback
- Student performance overview
- Review history
- Notifications
- Reviewer analytics

Content status flow:

Draft
→ Submitted
→ In Review
→ Changes Requested
→ Approved
→ Published
→ Archived

Role permissions must be simulated accurately.

---

# 29. SCHOOL & COLLEGE PORTAL

Develop a full institution administration experience.

Features:

- Institution onboarding
- Institution profile
- Academic session setup
- Class setup
- Subject setup
- Teacher management
- Student management
- Class grouping
- Question paper upload
- Private question bank
- Institution exam creation
- Assignment creation
- Assignment distribution
- Student submissions
- Exam scheduling
- Performance analytics
- Subject-level reports
- Teacher dashboard
- Student dashboard
- Institution subscription
- Institution billing UI
- Resource management
- Announcements
- Notification management
- Institution privacy settings

Use proper institution-scoped navigation.

---

# 30. COMPLETE ADMIN DASHBOARD

Create a professional enterprise-grade dashboard.

## Global Overview

Show:

- Total users
- Active students
- New registrations
- Paid users
- Subscription revenue
- AI requests
- Voice sessions
- Total questions
- Total books
- Published chapters
- Pending reviews
- Content coverage
- Failed ingestion jobs
- Reported AI answers
- System alerts
- Institution growth
- Top subjects
- Recent activities

Include charts, filters, date selectors, and drill-down views.

---

# 31. ADMIN CURRICULUM MANAGEMENT

Implement complete CRUD interfaces for:

- Education levels
- Academic years
- Exam years
- Curriculum versions
- Boards
- Groups
- Classes
- Subjects
- Papers
- Chapters
- Topics
- Learning outcomes
- Prerequisites
- Syllabus relationships
- Curriculum updates
- Version archiving
- Curriculum migration mapping

Require confirmation for destructive actions.

Support bulk operations and search.

---

# 32. ADMIN BOOK & DOCUMENT MANAGEMENT

Implement:

- Book list
- Add book
- Edit book
- Upload PDF
- Multi-file upload
- Preview
- Replace version
- Archive book
- Manage chapters
- Manage pages
- Manage metadata
- Language selection
- Publication year
- Curriculum version mapping
- Copyright/license metadata
- Upload activity
- Ingestion status
- Processing logs
- OCR preview
- Extracted text preview
- Page mapping
- Chunk preview
- Indexing status
- Retry failed processing
- Reindex
- Publish/unpublish
- Reviewer assignment
- Book audit history

Simulate a multi-stage ingestion pipeline:

Upload
→ Validate
→ Extract
→ OCR
→ Map Chapters
→ Chunk
→ Embed
→ Index
→ Quality Check
→ Review
→ Publish

Show realistic progress and errors.

---

# 33. ADMIN QUESTION MANAGEMENT

Implement:

- Question database
- Add question
- Edit question
- Delete/archive
- Rich-text question editor
- Mathematical equation editor
- Answer editor
- Explanation editor
- CQ multipart editor
- Difficulty selector
- Marks
- Source citation
- Chapter mapping
- Topic mapping
- Board mapping
- Year mapping
- Question tags
- Verification status
- Bulk upload
- CSV import
- Excel import
- Word import
- PDF import
- Image import
- Simulated question extraction
- Extraction preview
- Duplicate detection
- Similarity warning
- Reviewer assignment
- Content approval
- Bulk publish
- Version history

Make the question management experience professional enough for content operations teams.

---

# 34. ADMIN BOARD QUESTION MANAGEMENT

Implement:

- Board question archives
- Year selection
- Board selection
- Exam selection
- Question paper upload
- Paper metadata
- Paper preview
- OCR extraction preview
- Question splitting
- Chapter mapping
- Question verification
- Source authentication status
- Solved paper management
- Duplicate matching
- Related question grouping
- Historical frequency dashboard
- Curriculum relevance warnings

---

# 35. ADMIN SCHOOL/COLLEGE QUESTION MANAGEMENT

Implement:

- Institution directory
- Institution question submissions
- Submission review
- Original scan
- Extracted question preview
- Metadata validation
- Question source verification
- Public/private visibility
- Permission/license status
- Approve/reject
- Duplicate detection
- Submission history
- Institution moderation

---

# 36. ADMIN AI KNOWLEDGE BASE

Develop a dedicated AI/RAG management interface.

Features:

- Knowledge base overview
- Document collections
- Subject collections
- Curriculum collections
- Source document list
- Ingestion queues
- Indexing jobs
- Embedding status
- Chunk preview
- Metadata viewer
- Retrieval preview
- Query simulator
- Top matching chunks
- Relevance scores
- Citation preview
- Failed retrieval dashboard
- Missing source alerts
- Content coverage matrix
- Reindex controls
- Model configuration forms
- Prompt template editor
- Tutor mode settings
- AI policy settings
- Model routing configuration
- Token usage statistics
- Estimated usage costs
- AI error logs
- Feedback reports
- Incorrect answer review
- Source mismatch reports
- Quality evaluation datasets
- Version comparison
- Rollback UI

All controls must operate on a realistic local mock model.

---

# 37. ADMIN EXAM MANAGEMENT

Implement:

- Exam list
- Exam creation wizard
- Exam template library
- Chapter test creation
- Full syllabus model test
- Board pattern templates
- Question selection
- Question randomization
- Exam preview
- Marks distribution
- Duration configuration
- Negative marking rules
- Exam scheduling
- Publishing
- Draft management
- Exam analytics
- Student attempt reports
- Answer key management
- CQ marking rubrics
- Grading review
- Manual override interface
- Result publication

---

# 38. ADMIN STUDENT & USER MANAGEMENT

Implement:

- User directory
- User search
- Advanced filters
- Student profile
- Academic details
- Learning analytics
- Subscription status
- Account status
- Support history
- Role management
- Guardian links
- Institution links
- Suspend/reactivate simulation
- Permission viewer
- Consent status
- Account deletion workflow
- Audit history

Provide realistic user records without using sensitive real student data.

---

# 39. ADMIN TEACHER & REVIEWER MANAGEMENT

Implement:

- Teacher directory
- Reviewer profiles
- Subject assignment
- Role assignment
- Review queues
- Workload overview
- Approval performance
- Review history
- Quality feedback
- Teacher invitations simulation
- Access management

---

# 40. ADMIN SUBSCRIPTION & BILLING

Implement:

- Pricing plan manager
- Free plan
- Student Pro plan
- Family plan
- Institution plan
- Plan feature limits
- AI credit quotas
- Voice usage quotas
- Subscription directory
- Payment history
- Invoice list
- Coupon management
- Discounts
- Trial management
- Checkout simulator
- Payment success
- Payment failed
- Pending payment
- Refund request UI
- Cancellation flow
- Upgrade/downgrade
- Revenue analytics
- Subscription analytics

All financial numbers must be labeled as mock/demo data.

---

# 41. ADMIN ANALYTICS & BUSINESS INTELLIGENCE

Build professional charts for:

- User acquisition
- User activity
- Learning retention
- Daily active users
- Monthly active users
- Subscription conversion
- Churn
- Monthly recurring revenue
- Revenue by plan
- AI cost estimates
- Cost per active student
- Subject popularity
- Chapter completion
- Exam performance
- Average study duration
- Question coverage
- User feedback
- Voice usage
- Content moderation volume
- Institution usage
- Content quality metrics

Include:

- Date ranges
- Chart filtering
- Data table views
- CSV export
- Comparison views
- Empty states
- Drill-down interactions

---

# 42. ADMIN SECURITY, MODERATION & AUDIT LOGS

Implement:

- Role permissions management
- Permission matrix
- Content approval audit
- Admin activity log
- Account management logs
- User reports
- AI response reports
- Moderation queue
- Sensitive content review
- Privacy requests
- Data deletion requests
- Guardian consent review
- Security alerts UI
- Session management UI
- API key settings UI using mock placeholders
- System configuration
- Access denied states

Do not store actual secrets in frontend source code.

---

# 43. NOTIFICATION SYSTEM

Implement a unified notification center.

Types:

- Study reminder
- Upcoming examination
- Revision reminder
- New assignment
- Exam result
- Teacher feedback
- Subscription notice
- Payment notice
- Curriculum update
- Board announcement
- Content correction
- System notice
- Achievement notification

Features:

- Notification inbox
- Read/unread
- Mark all read
- Filter
- Delete/archive
- Notification detail
- Deep linking
- Preference settings
- Push permission UI
- Email preference UI
- In-app notification simulation

---

# 44. STUDENT PROFILE & SETTINGS

Include:

- Personal profile
- Academic profile
- Learning preferences
- Language settings
- Theme settings
- Notification preferences
- AI tutor preferences
- Voice preferences
- Study goals
- Exam target
- Subscription management
- Billing history
- Security settings
- Privacy settings
- Connected guardian
- Institution details
- Storage usage
- Offline downloads
- Help center
- Feedback
- Report problem
- Account deletion request
- Logout

---

# 45. SEARCH SYSTEM

Implement a platform-wide search experience.

Search across:

- Subjects
- Chapters
- Topics
- Questions
- Board papers
- Institution papers
- Notes
- Flashcards
- Books
- Mock exams
- Conversations
- Resources

Include:

- Global search
- Search suggestions
- Recent searches
- Popular topics
- Search filters
- Search result grouping
- Keyboard shortcuts on web
- Empty results
- Search loading
- Search history removal

Mock search must genuinely filter seeded content.

---

# 46. CONTENT COVERAGE & QUALITY SYSTEM

Create a content coverage dashboard for admins and an appropriate simplified view for students.

Track:

- Total curriculum chapters
- Published chapters
- Verified topics
- Questions per learning outcome
- Question type coverage
- Question source quality
- Subject coverage
- Board archive completeness
- Content review status
- Outdated curriculum content
- Missing learning outcomes
- Source availability
- Reported errors

Support drill-down into missing content.

---

# 47. MARKETING & PUBLIC WEBSITE

Do not forget the public-facing product website.

Develop:

- Homepage
- About platform
- AI Tutor showcase
- Voice Tutor showcase
- Question bank showcase
- Board preparation showcase
- Learning features
- Student testimonials using clearly labeled demo content
- Pricing
- For Parents
- For Teachers
- For Schools
- For Colleges
- FAQ
- Contact
- Help center
- Terms of service
- Privacy policy
- Accessibility information
- Login/signup
- Download mobile app section

Design a premium landing page with professional animation and interactive demonstrations.

Do not use fake statistics or fabricated student testimonials as authentic claims.

---

# 48. MOBILE APP FEATURE PARITY

The Flutter application must include all student-facing features.

Required mobile modules:

- Authentication
- Onboarding
- Student dashboard
- AI tutor
- Voice tutor
- Image question solver
- Curriculum browser
- Subject/chapter learning
- Textbook library
- Question bank
- Board questions
- School/college questions
- Exam center
- Model tests
- Exam results
- Handwriting evaluator
- Study planner
- Adaptive learning
- Notes
- Flashcards
- English coach
- Science/math labs
- Audio revision
- Gamification
- Offline learning
- Notifications
- Search
- Bookmarks
- Profile
- Settings
- Subscription
- Support

For teacher, parent, and institution roles:

Provide mobile-accessible experiences where appropriate and define the exact role access matrix.

The dedicated admin management interface may remain web-first, but it must be responsive on mobile browsers.

Do not silently remove student features from Flutter because the web version already contains them.

Use adaptive Flutter-specific experiences rather than directly copying desktop navigation.

---

# 49. MOCK DATA DESIGN

Create a rich mock database with realistic, educationally meaningful demo records.

Include:

- Multiple students
- Multiple guardians
- Multiple teachers
- Multiple reviewers
- Multiple institutions
- SSC/HSC classes
- All major academic groups
- Relevant subjects
- Multiple chapters per subject
- Topics and learning outcomes
- Questions of different types
- Answers with explanations
- Sample book metadata
- Mock source passages
- Board paper samples
- Institution paper samples
- Exam templates
- Exam attempts
- Learning activities
- Study plans
- Flashcards
- Notes
- Conversations
- Voice transcripts
- Achievement badges
- Subscription plans
- Mock payment records
- Admin ingestion jobs
- Review queues
- Notifications
- Audit logs
- Analytics records

## Important

Use synthetic/demo content when official content has not been obtained and licensed.

Synthetic questions must be explicitly distinguished from real board questions.

Mock data should be diverse and internally consistent.

For example:

- A student's exam result must update their learning analytics.
- A completed chapter must update their progress.
- A bookmarked question must appear in bookmarks.
- A created note must appear in notes.
- An uploaded mock book must appear in admin book management.
- Publishing approved content should update the available mock content catalog.
- A newly created mock examination should appear in the relevant exam lists.
- Subscription changes should update entitlement displays.

This application should behave like a connected product, not a set of isolated showcase screens.

---

# 50. STATE MANAGEMENT & BUSINESS LOGIC

Implement a clean architecture separating:

1. Presentation
2. Application logic
3. Domain models
4. Repository interfaces
5. Mock data sources
6. Future API adapters

Use consistent error and result handling.

Implement realistic mock asynchronous behavior without making the UI unnecessarily slow.

Provide reusable hooks/providers/controllers for:

- Authentication
- Curriculum context
- Tutor conversations
- Voice sessions
- Learning progress
- Question bank
- Exams
- Study plans
- Notes
- Flashcards
- Notifications
- Subscription entitlements
- Uploading
- Admin review workflows

Avoid duplicated business logic.

---

# 51. FUTURE BACKEND INTEGRATION CONTRACTS

Although no backend is being built now, prepare interfaces for future API integration.

Define typed API contracts for:

- Authentication
- Users
- Academic profiles
- Curriculum
- Subjects
- Chapters
- Topics
- Textbooks
- Question bank
- Board exams
- Institution questions
- AI tutor sessions
- Chat messages
- Knowledge base retrieval
- Voice sessions
- Image/OCR processing
- Exam creation
- Exam attempts
- Exam results
- Handwriting evaluations
- Study plans
- Adaptive learning
- Notes
- Flashcards
- Learning progress
- Notifications
- Schools
- Teachers
- Parents
- Subscriptions
- Billing
- Admin content review
- File uploads
- Analytics
- Audit logs

Create mock adapter interfaces so implementation can later be switched through dependency injection/configuration.

Never require changing individual UI components to replace mock repository calls with real API calls.

Document expected:

- Requests
- Responses
- Pagination
- Filtering
- Authentication
- Error codes
- Upload lifecycle
- Streaming responses
- WebSocket/realtime events
- Voice streaming events
- AI citations
- Async processing states

---

# 52. ACCESSIBILITY & INTERNATIONALIZATION

Implement:

- Bangla UI
- English UI
- Persistent language preference
- Proper Bangla numerals handling where appropriate
- Responsive Bangla typography
- Keyboard navigation
- Focus states
- Accessible forms
- Screen reader labels
- Meaningful button labels
- Semantic UI
- Color contrast
- Reduced motion support
- Text scaling
- Accessible exam navigation
- Captions/transcripts
- Alternative descriptions for educational diagrams

Target WCAG 2.2 AA where applicable.

Use translation dictionaries, not scattered hardcoded strings.

---

# 53. PRIVACY & STUDENT SAFETY

Since many users may be minors, student privacy is a core product requirement.

Implement frontend interfaces for:

- Age-appropriate onboarding
- Guardian consent
- Privacy preferences
- Data retention settings
- Consent withdrawal
- Data export request
- Account deletion request
- AI transparency labels
- AI error reporting
- Teacher escalation
- Safe interaction messages
- Content moderation reports
- Parent link permissions
- Student-controlled sharing

Do not expose private AI conversations to guardians or institutions without an appropriate policy and permission basis.

Do not implement real behavioral tracking or real sensitive-data transfers in this frontend-only project.

Document that production legal and security compliance require backend controls and independent review.

---

# 54. PERFORMANCE REQUIREMENTS

Optimize for students using budget smartphones and lower-bandwidth connections.

Requirements:

- Code splitting
- Lazy loading
- Route-level loading
- Image optimization
- Efficient lists
- Virtualized long tables
- Debounced search
- Smart caching
- Smooth scrolling
- Optimized animation
- Efficient Flutter rebuilds
- Reasonable memory usage
- Optimized PDF loading
- Controlled chart rendering
- Reduced motion mode

The interface should remain responsive with large mock question libraries.

---

# 55. TESTING REQUIREMENTS

Implement a proper testing strategy.

## Web Tests

- Unit tests
- Component tests
- Form validation tests
- Role permission tests
- Navigation tests
- Mock repository tests
- Exam scoring tests
- Study progress tests
- Search/filter tests
- End-to-end workflow tests

Use Playwright for key web user journeys.

## Flutter Tests

- Unit tests
- Widget tests
- Navigation tests
- Repository tests
- State management tests
- Integration tests for primary workflows where practical

## Important Test Journeys

Test at least:

1. Student signs up and finishes onboarding.
2. Student selects a subject and chapter.
3. Student starts an AI tutor session.
4. Student sees a relevant mock source citation.
5. Student starts and finishes a voice demo.
6. Student uploads a question image.
7. Student practices MCQs.
8. Student completes an exam.
9. Results update learning analytics.
10. Student receives a revision recommendation.
11. Student creates a study plan.
12. Student creates and reviews flashcards.
13. Student saves and edits notes.
14. Student bookmarks questions.
15. Student opens a board question paper.
16. Student views a textbook.
17. Student uses a science simulation.
18. Student changes language and theme.
19. Guardian views authorized progress.
20. Teacher reviews and approves content.
21. Institution creates a mock examination.
22. Admin uploads a mock book.
23. Admin completes a simulated ingestion workflow.
24. Admin uploads a mock question paper.
25. Admin reviews extracted questions.
26. Admin publishes approved content.
27. Admin changes a subscription plan.
28. Access restrictions work for each role.
29. Offline mode displays appropriate behavior.
30. Empty/error/loading states work correctly.

---

# 56. DEVELOPMENT PROCESS

Before writing application components:

## Step 1: Repository Inspection

Inspect the repository.

If existing code exists:

- Identify the current stack.
- Identify existing components.
- Identify implemented modules.
- Preserve working code where reasonable.
- Avoid unnecessary rewriting.
- Align new architecture with project requirements.

If the repository is empty:

- Initialize the complete workspace.
- Configure all applications.
- Configure shared design tokens.
- Configure mock contracts.
- Establish routing and state management.

## Step 2: Full Feature Inventory

Create:

`docs/product/FEATURE_MATRIX.md`

Include EVERY feature in this prompt.

Each feature must have:

- Feature ID
- Module
- User role
- Web screen
- Flutter screen when applicable
- Mock data source
- Functional interactions
- Loading/error states
- Completion status
- Test status

Do not mark a feature complete based only on screen creation.

## Step 3: Information Architecture

Create:

`docs/product/INFORMATION_ARCHITECTURE.md`

Document:

- User roles
- Navigation structure
- Screen hierarchy
- User journeys
- Permissions
- Related module interactions

## Step 4: Design System

Create reusable components before implementing large numbers of screens.

Define:

- Colors
- Typography
- Spacing
- Radius
- Elevation
- Icons
- Buttons
- Inputs
- Cards
- Tables
- Modals
- Dialogs
- Drawers
- Empty states
- Error states
- Loading states
- Chart styles
- Navigation patterns

Keep the web and Flutter experiences visually consistent.

## Step 5: Implement All Modules

Implement all requested modules systematically.

Use a dependency-aware implementation order.

Do not skip difficult features.

## Step 6: Connect Mock Workflows

Connect cross-module state changes.

Verify that related modules behave consistently.

## Step 7: Testing

Run the available test suites, static analysis, type checking, and builds.

Fix discovered issues.

## Step 8: UI/UX Review

Audit:

- Visual consistency
- Responsiveness
- Accessibility
- Navigation
- Form validation
- Interaction quality
- Error handling
- Empty states
- Data consistency
- Performance

## Step 9: Documentation

Deliver complete documentation.

---

# 57. REQUIRED DOCUMENTATION

Create:

```text
docs/
├── product/
│   ├── PRODUCT_OVERVIEW.md
│   ├── FEATURE_MATRIX.md
│   ├── USER_ROLES.md
│   ├── USER_JOURNEYS.md
│   ├── INFORMATION_ARCHITECTURE.md
│   └── SCREEN_INVENTORY.md
│
├── architecture/
│   ├── FRONTEND_ARCHITECTURE.md
│   ├── FLUTTER_ARCHITECTURE.md
│   ├── STATE_MANAGEMENT.md
│   ├── MOCK_DATA_ARCHITECTURE.md
│   └── BACKEND_INTEGRATION_PLAN.md
│
├── design-system/
│   ├── DESIGN_TOKENS.md
│   ├── COMPONENT_LIBRARY.md
│   └── ACCESSIBILITY.md
│
├── api/
│   ├── API_CONTRACTS.md
│   ├── AI_TUTOR_CONTRACT.md
│   ├── VOICE_SESSION_CONTRACT.md
│   └── UPLOAD_PIPELINE_CONTRACT.md
│
└── testing/
    ├── TEST_STRATEGY.md
    ├── QA_CHECKLIST.md
    ├── FEATURE_ACCEPTANCE_REPORT.md
    └── KNOWN_LIMITATIONS.md
```

Also provide:

- Root README
- Student web setup guide
- Admin web setup guide
- Flutter setup guide
- Environment example files
- Mock login credentials
- Demo role descriptions
- Sample data reset instructions
- Build instructions
- Test instructions

---

# 58. QUALITY ACCEPTANCE CRITERIA

The complete project must satisfy:

### Functionality

- Every required module has actual screens.
- Every important action has a meaningful result.
- All routes work.
- All forms validate.
- All CRUD workflows work with mock storage.
- Shared mock state remains consistent.
- All roles have their proper navigation.
- No unfinished placeholder sections are presented as complete.
- All mock-only functionality is clearly identifiable.

### Design

- Consistent visual identity.
- Professional typography.
- Excellent Bangla readability.
- Student-friendly learning interface.
- Premium admin dashboard.
- Excellent responsive layouts.
- Polished Flutter mobile experience.
- Accessible components.
- Smooth and restrained animation.

### Engineering

- Clean architecture.
- Reusable components.
- Typed domain models.
- Repository abstraction.
- Maintainable state management.
- Feature-based code organization.
- Future API integration readiness.
- Build success.
- Static analysis success.
- Meaningful automated tests.

### Documentation

- Every feature tracked.
- Every role mapped.
- Every major screen documented.
- Mock and real capabilities clearly distinguished.
- Integration contracts documented.
- Remaining limitations explicitly reported.

---

# 59. CRITICAL FINAL INSTRUCTIONS

I want the entire product, not a partial prototype.

Do not simplify the scope without my instruction.

Do not remove features for convenience.

Do not implement only what is easiest.

Do not skip the Flutter application.

Do not focus only on the web application.

Do not forget the complete Admin Dashboard.

Do not forget parent, teacher, reviewer, and institution workflows.

Do not forget the advanced AI tutoring experience.

Do not forget voice interaction screens.

Do not forget the complete question bank.

Do not forget board question archives.

Do not forget all chapter-based questions and answers.

Do not forget the mock exam system.

Do not forget handwriting evaluation interfaces.

Do not forget adaptive learning.

Do not forget study planning.

Do not forget notes and flashcards.

Do not forget science simulations.

Do not forget monetization.

Do not forget privacy and accessibility.

Do not forget realistic loading, error, and empty states.

Every module must have a complete interaction flow.

Every student-facing feature must be implemented in both Next.js Web and Flutter Mobile.

Every management feature must be represented within the appropriate web administration or institution portal.

This is a frontend-only implementation, but the architecture and user experience must be prepared for future production integrations.

**The goal is to avoid rebuilding the frontend architecture or redesigning the user experience when backend development begins.**

This does not mean external integrations will require zero changes. API integration, real AI quality assurance, data migration, production security, and final platform testing will still require engineering work.

---

# 60. START EXECUTION NOW

Do not respond with only an implementation plan.

Do not stop after describing the architecture.

Start by:

1. Inspecting the repository.
2. Creating the complete feature matrix.
3. Creating the project structure.
4. Establishing the design system.
5. Implementing the student web application.
6. Implementing the Flutter mobile application.
7. Implementing the admin and other role-based portals.
8. Connecting all mock data and user workflows.
9. Running automated tests.
10. Auditing every feature against the feature matrix.
11. Fixing issues.
12. Producing a final completion report.

Maintain progress documentation while implementing.

For long development sessions, work module by module, commit coherent changes when appropriate, and retain enough implementation state for subsequent sessions.

Do not claim successful tests without executing them.

Do not mark features complete if they are missing interactions, states, or necessary screens.

If the environment prevents a task from being completed, report the exact blocker and keep its status incomplete.

**SUCCESS DEFINITION:**

A professional, responsive, accessible, and fully interactive frontend ecosystem for SSC and HSC students, with complete Next.js Web, Flutter Mobile, and role-based administration experiences, covering every specified feature through realistic mock functionality, and prepared for future backend and AI integration.

BEGIN IMPLEMENTATION.
