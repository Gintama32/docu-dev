# Decision Log

## Technology Stack

### Backend
*   **Framework:** FastAPI was chosen over Flask for its modern features, high performance, built-in data validation with Pydantic, and automatic API documentation.
*   **Database:** Supabase (PostgreSQL) is used as the primary database.
*   **ORM:** SQLAlchemy for database modeling and queries.
*   **Database Migrations:** Alembic for managing database schema changes.
*   **API Structure:** Modular router-based architecture with clean separation of concerns.
*   **AI Integration:** OpenRouter for flexible model selection (GPT-4, Claude, Gemini, etc.)
*   **PDF Generation:** WeasyPrint for high-quality HTML to PDF conversion.
*   **Architecture:** Organized into routers/, services/, and core modules for maintainability.

### Frontend
*   **Framework:** React with functional components and hooks.
*   **Routing:** React Router v6 for client-side routing.
*   **Styling:** CSS with custom properties (CSS variables) for theming.
*   **State Management:** React Context API with localStorage persistence for user preferences.
*   **HTTP Client:** Fetch API with Vite proxy for development.
*   **UI Library:** Material UI icons for consistent iconography.
*   **Build Tool:** Vite for fast development and optimized production builds.

## Architectural Decisions

### Database Schema
*   **Multi-table Design:** Separated concerns into distinct tables:
    - `project_proposals`: Store proposal information and context for semantic search
    - `resumes`: Track resume generation and status
    - `experiences`: Store project experience data
    - `clients`: Manage client information
    - `contacts`: Store contact details
    - `templates`: Store resume templates
    - `resume_experience_details`: Junction table for resume-experience relationships with override capability

### Frontend Architecture
*   **Component Structure:**
    - Persistent sidebar navigation
    - Modal-based forms for data entry
    - Tab-based interfaces for complex views
    - Reusable components (Modal, Tabs, ThemeToggle)

*   **Theme System:**
    - CSS custom properties for dynamic theming
    - Support for light and dark modes
    - Theme preference persistence in localStorage
    - Automatic detection of system preference

### API Design
*   **Endpoint Structure:** `/api/{entity}` for CRUD operations
*   **Response Format:** JSON with consistent structure
*   **Error Handling:** HTTP status codes with descriptive messages

## Design Decisions

### UI/UX
*   **Modern Card-Based Design:** Clean, professional interface with proper spacing
*   **Accessibility:** High contrast ratios, keyboard navigation support
*   **Responsive Design:** Mobile-friendly layouts with breakpoints
*   **Visual Feedback:** Hover states, transitions, and loading indicators

### Data Flow
*   **Proposal-Centric Workflow:** Resumes are created from project proposals
*   **Experience Selection:** Manual selection of relevant experiences for each resume
*   **Override Capability:** Ability to customize experience descriptions per resume

## Recent Architectural Decisions

### Backend Reorganization (December 2024)
*   **Modular Structure:** Split monolithic main.py into focused router modules
*   **Service Layer:** Dedicated services/ directory for business logic
*   **OpenRouter Integration:** Replaced direct OpenAI with OpenRouter for model flexibility
*   **Async AI Service:** Implemented async/await patterns for better performance

### Frontend UX Enhancements (December 2024)
*   **Dual View System:** Card/table toggle for experience selection with optimized layouts
*   **Breadcrumb Navigation:** Consistent navigation patterns across all resume interfaces
*   **State Persistence:** localStorage integration for user preferences and selections
*   **Material Design:** Professional iconography with proper light/dark mode contrast

### Data Flow Optimization
*   **Experience Personalization:** AI-powered content generation with manual override capabilities
*   **Content Versioning:** Toggle between original, AI-generated, and custom content
*   **Bulk Operations:** Efficient batch AI processing for multiple experiences

## Future Considerations

*   **Authentication:** Will need to implement user authentication for multi-tenancy
*   **Search:** Plan to implement semantic search using embeddings  
*   **Caching:** May implement Redis for performance optimization
*   **File Storage:** Will need cloud storage for generated PDFs
*   **Model Management:** Consider implementing model selection UI for different use cases
