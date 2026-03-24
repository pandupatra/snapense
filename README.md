# Snapense

<div align="center">

![Snapense](https://img.shields.io/badge/Snapense-Expense%20Tracker-cyan)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**Minimalist expense tracking powered by AI**

[Features](#-features) • [Quick Start](#-quick-start) • [Deployment](#-deployment) • [API](#-api)

</div>

---

##  About

Snapense is a minimalist expense tracking application that leverages AI to simplify bill management. With support for manual entry, photo capture, and receipt upload via Google Gemini AI, Snapense makes tracking expenses effortless.

### Key Highlights

- **AI-Powered Receipt Scanning** - Extract bill details from images using Google Gemini
- **Multiple Input Methods** - Manual entry, photo capture, or image upload
- **Multi-Currency Support** - Track expenses in any currency
- **Google Sheets Export** - Export data directly to Google Sheets
- **CSV Import/Export** - Easy data portability
- **Dark/Light Theme** - Comfortable viewing in any environment
- **Real-time Analytics** - Visual spending charts and insights

---

##  Features

| Feature | Description |
|---------|-------------|
| **Manual Entry** | Quick form to add expenses manually |
| **Photo Mode** | Capture receipt photos with automatic AI extraction |
| **Upload Receipts** | Upload saved receipt images for processing |
| **Categories** | Organize expenses by category (Food, Transport, Shopping, etc.) |
| **Multi-Currency** | Support for IDR, USD, EUR, GBP, JPY, and more |
| **Search** | Find expenses by merchant, description, or category |
| **CSV Import/Export** | Bulk import from CSV or export your data |
| **Google Sheets** | One-click export to Google Sheets |
| **Authentication** | Secure Google OAuth login |
| **Responsive** | Works on desktop, tablet, and mobile |
| **Dark Mode** | Eye-friendly dark theme option |

---

##  Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [SQLite](https://www.sqlite.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://www.better-auth.com/) with Google OAuth
- **AI**: [Google Gemini 2.5 Flash](https://ai.google.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Animations**: [Motion](https://motion.dev/)
- **Deployment**: PM2 + Nginx (VPS)

---

##  Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pandupatra/snapense.git
   cd snapense
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file:
   ```bash
   # Better Auth Configuration
   BETTER_AUTH_URL=http://localhost:3000
   NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
   BETTER_AUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32

   # Google OAuth (get from https://console.cloud.google.com/)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

   # Google Gemini AI (get from https://ai.google.dev/)
   GEMINI_API_KEY=your-gemini-api-key
   GEMINI_MODEL=gemini-2.5-flash
   ```

4. **Run database migration**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

---

##  Deployment

### VPS Deployment (Recommended)

A deployment script is included for easy VPS setup:

```bash
# On your VPS
git clone https://github.com/pandupatra/snapense.git /var/www/snapense
cd /var/www/snapense
sudo bash deploy.sh your-domain.com your-email@example.com
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

3. **Configure Nginx** as reverse proxy to port 3000

4. **Setup SSL** with Certbot

---

##  Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://your-domain.com/api/auth/google/callback`

### Gemini AI Setup

1. Go to [Google AI Studio](https://ai.google.dev/)
2. Create an API key
3. Add to your environment variables

---

##  API Reference

### Bills API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bills` | List all bills (paginated) |
| POST | `/api/bills` | Create a new bill |
| PUT | `/api/bills/[id]` | Update a bill |
| DELETE | `/api/bills/[id]` | Delete a bill |
| GET | `/api/bills/search` | Search bills by query |

### Authentication API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | OAuth callback handler |

---

##  Project Structure

```
snapense/
├── src/
│   ├── app/
│   │   ├── actions/       # Server actions
│   │   ├── api/           # API routes
│   │   ├── globals.css    # Global styles
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Home page
│   ├── components/
│   │   ├── auth-components.tsx
│   │   ├── bill-entry-dialog.tsx
│   │   ├── category-icons.tsx
│   │   ├── theme-provider.tsx
│   │   └── ui/            # Shadcn/ui components
│   ├── db/
│   │   ├── index.ts       # Database connection
│   │   ├── migrate.ts     # Migration script
│   │   └── schema.ts      # Drizzle schema
│   ├── lib/
│   │   ├── auth.ts        # Auth configuration
│   │   ├── auth-utils.ts  # Auth utilities
│   │   ├── google-sheets.ts
│   │   └── utils.ts
│   └── types/
│       └── bill.ts        # TypeScript types
├── drizzle.config.ts
├── ecosystem.config.js    # PM2 configuration
├── deploy.sh              # Deployment script
└── update.sh              # Update script
```

---

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

##  License

This project is licensed under the MIT License.

---

##  Support

For issues and questions, please open an issue on [GitHub](https://github.com/pandupatra/snapense/issues).

---

<div align="center">
Made with  by <a href="https://github.com/pandupatra">Pandu Patra</a>
</div>
