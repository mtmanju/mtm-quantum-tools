# Quantum Tools by MTM

**Enterprise Utility Platform - Accelerate Your Workflow**

Quantum Tools is a comprehensive web-based platform providing enterprise-grade utilities for document conversion, DMN evaluation, and various development tools.

## 🚀 Features

### Currently Available:
- **Markdown to DOCX Converter** - Convert Markdown files to professional Word documents
  - Drag & drop file upload
  - Live preview and editing
  - Support for headers, bold text, lists, and more
  - Professional formatting with proper margins and spacing

### Coming Soon:
- **DMN Evaluator** - Decision Model and Notation evaluation engine
- **JSON Formatter** - Format, validate, and beautify JSON
- **Advanced Calculator** - Scientific and business calculations
- And 100+ more enterprise utilities!

## 📦 Project Structure

```
quantum-tools/
├── packages/
│   ├── web/              # React frontend application
│   ├── md-converter/     # Markdown to DOCX converter module
│   ├── common/           # Shared utilities
│   └── cli/              # CLI tools (future)
├── docs/                 # Documentation
└── README.md
```

## 🛠️ Technology Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI Components:** Lucide Icons
- **Document Processing:** docx, markdown-it
- **File Handling:** react-dropzone, file-saver
- **Build Tool:** Vite
- **Package Manager:** npm workspaces

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 9+

### Installation

```bash
# Clone the repository
cd quantum-tools

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=@mtm/web
```

## 📖 Usage

### Markdown to DOCX Converter

1. Navigate to the Markdown to DOCX tool
2. Drag and drop your `.md` file or click to browse
3. Preview and edit the content if needed
4. Click "Convert to DOCX" to download your Word document

**Supported Markdown Features:**
- ✅ Headers (H1, H2, H3)
- ✅ Bold text (`**bold**`)
- ✅ Bullet lists (`- item`)
- ✅ Horizontal rules (`---`)
- ✅ Paragraphs
- 🔄 Tables (coming soon)
- 🔄 Mermaid diagrams (coming soon)

## 🏗️ Adding New Tools

Quantum Tools is built with extensibility in mind. To add a new tool:

1. Create a new component in `packages/web/src/tools/`
2. Add the tool definition to the `tools` array in `App.tsx`
3. Implement the tool's functionality
4. Update this README

Example:
```typescript
{
  id: 'my-tool',
  name: 'My Tool',
  description: 'Description of my tool',
  icon: <MyIcon size={24} />,
  category: 'My Category',
  status: 'active',
  component: <MyToolComponent />
}
```

## 📁 Package Details

### @mtm/web
React-based web application providing the UI for all tools.

### @mtm/md-converter
Standalone markdown to DOCX conversion library.

### @mtm/common
Shared utilities, types, and helpers used across packages.

## 🤝 Contributing

This is an internal MTM project. For feature requests or bug reports, please contact the development team.

## 📝 License

MIT License - © 2025 MTM

## 🎯 Roadmap

### Phase 1 (Current)
- [x] Project setup and architecture
- [x] Markdown to DOCX converter
- [ ] Enhanced MD converter (tables, Mermaid)

### Phase 2 (Q1 2025)
- [ ] DMN Evaluator
- [ ] JSON Formatter & Validator
- [ ] Advanced Calculator
- [ ] API Client/Tester

### Phase 3 (Q2 2025)
- [ ] 20+ additional tools
- [ ] User preferences and saved configurations
- [ ] Export/Import tool configurations
- [ ] Plugin system for custom tools

### Phase 4 (Q3 2025)
- [ ] 100+ tools in marketplace
- [ ] Cloud sync
- [ ] Team collaboration features
- [ ] Enterprise SSO integration

## 📧 Contact

**Quantum Tools by MTM**  
Enterprise Utility Platform  

For support or inquiries, contact: [your-email@mtm.com]

---

**Built with ⚡ by MTM**
